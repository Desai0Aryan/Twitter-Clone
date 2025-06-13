from app import db
from datetime import datetime
from sqlalchemy import Index

# Association table for likes
likes = db.Table('likes',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    db.Column('post_id', db.Integer, db.ForeignKey('posts.id', ondelete='CASCADE'), primary_key=True),
    db.Column('created_at', db.DateTime, default=datetime.utcnow),
    extend_existing=True
)

# Add indexes for better query performance
db.Index('idx_likes_user', likes.c.user_id)
db.Index('idx_likes_post', likes.c.post_id)
db.Index('idx_likes_created', likes.c.created_at)

# Association table for followers
followers = db.Table('followers',
    db.Column('follower_id', db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    db.Column('followed_id', db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    db.Column('created_at', db.DateTime, default=datetime.utcnow),
    extend_existing=True
)

# Add indexes for better query performance
db.Index('idx_followers_follower', followers.c.follower_id)
db.Index('idx_followers_followed', followers.c.followed_id)
db.Index('idx_followers_created', followers.c.created_at)