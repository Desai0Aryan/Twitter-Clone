from app import db
from datetime import datetime
from sqlalchemy import Index

class Post(db.Model):
    __tablename__ = 'posts'
    
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.String(280), nullable=False)
    media_urls = db.Column(db.JSON, default=list)  # Store multiple media URLs
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Relationships
    comments = db.relationship('Comment', backref='post', lazy=True,
                             cascade='all, delete-orphan')
    
    # Indexes for better query performance
    __table_args__ = (
        Index('idx_posts_author_created', 'author_id', 'created_at'),
        Index('idx_posts_created', 'created_at'),
    )

    def __init__(self, **kwargs):
        super(Post, self).__init__(**kwargs)
        if not self.content:
            raise ValueError("Content is required")
        if len(self.content) > 280:
            raise ValueError("Content cannot exceed 280 characters")
        if not isinstance(self.media_urls, list):
            self.media_urls = []

    def to_dict(self, current_user_id=None):
        # Get author data
        author_data = self.author.to_dict()
        
        # Add follow status if current user is provided
        if current_user_id:
            author_data['is_followed'] = any(follower.id == current_user_id for follower in self.author.followers)
        
        data = {
            'id': self.id,
            'content': self.content,
            'media_urls': self.media_urls or [],
            'created_at': self.created_at.isoformat(),
            'author': author_data,
            'likes_count': len(self.liked_by),
            'comments_count': len(self.comments),
            'is_liked_by_current_user': False
        }
        
        if current_user_id:
            data['is_liked_by_current_user'] = any(like.id == current_user_id for like in self.liked_by)
            
        return data

    def increment_retweet_count(self):
        self.retweet_count += 1
        db.session.commit()

    def decrement_retweet_count(self):
        if self.retweet_count > 0:
            self.retweet_count -= 1
            db.session.commit()