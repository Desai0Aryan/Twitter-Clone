from app import db
from datetime import datetime
from sqlalchemy import Index

class Comment(db.Model):
    __tablename__ = 'comments'
    
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.String(280), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
    
    # Nested replies support
    parent_id = db.Column(db.Integer, db.ForeignKey('comments.id', ondelete='CASCADE'), nullable=True)
    reply_count = db.Column(db.Integer, default=0)
    
    # Relationships
    replies = db.relationship('Comment',
                            backref=db.backref('parent', remote_side=[id]),
                            lazy='dynamic',
                            cascade='all, delete-orphan')
    
    # Indexes for better query performance
    __table_args__ = (
        Index('idx_comments_post_created', 'post_id', 'created_at'),
        Index('idx_comments_parent', 'parent_id'),
        Index('idx_comments_author', 'author_id'),
    )

    def __init__(self, **kwargs):
        super(Comment, self).__init__(**kwargs)
        if not self.content:
            raise ValueError("Content is required")
        if len(self.content) > 280:
            raise ValueError("Content cannot exceed 280 characters")

    def to_dict(self, current_user_id=None, include_replies=False, max_replies=3):
        data = {
            'id': self.id,
            'content': self.content,
            'created_at': self.created_at.isoformat(),
            'author': self.author.to_dict(),
            'post_id': self.post_id,
            'reply_count': self.reply_count,
            'is_reply': bool(self.parent_id)
        }
        
        if include_replies:
            replies = self.replies.order_by(Comment.created_at.desc()).limit(max_replies).all()
            data['replies'] = [reply.to_dict(current_user_id) for reply in replies]
            
        return data

    def increment_reply_count(self):
        self.reply_count += 1
        db.session.commit()

    def decrement_reply_count(self):
        if self.reply_count > 0:
            self.reply_count -= 1
            db.session.commit()