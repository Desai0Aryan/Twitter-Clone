from app import db
from datetime import datetime

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(20), nullable=False)  # 'like', 'comment', 'follow'
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    actor_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id', ondelete='CASCADE'), nullable=True)
    comment_id = db.Column(db.Integer, db.ForeignKey('comments.id', ondelete='CASCADE'), nullable=True)
    read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='notifications')
    actor = db.relationship('User', foreign_keys=[actor_id])
    post = db.relationship('Post', backref='notifications')
    comment = db.relationship('Comment', backref='notifications')
    
    def to_dict(self):
        data = {
            'id': self.id,
            'type': self.type,
            'actor': self.actor.to_dict(),
            'read': self.read,
            'created_at': self.created_at.isoformat()
        }
        
        if self.post:
            data['post'] = self.post.to_dict()
        if self.comment:
            data['comment'] = self.comment.to_dict()
            
        return data 