from app import db
from flask_login import UserMixin
from datetime import datetime
from .associations import likes, followers
from werkzeug.security import generate_password_hash, check_password_hash

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    name = db.Column(db.String(100))
    profile_picture = db.Column(db.String(200))
    banner = db.Column(db.String(200))
    bio = db.Column(db.String(160))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    posts = db.relationship('Post', backref='author', lazy=True,
                          cascade='all, delete-orphan')
    comments = db.relationship('Comment', backref='author', lazy=True,
                             cascade='all, delete-orphan')
    
    # Message relationships with proper backrefs
    sent_messages = db.relationship('Message',
                                  foreign_keys='Message.sender_id',
                                  backref=db.backref('sender_user', lazy=True),
                                  lazy=True,
                                  cascade='all, delete-orphan')
    received_messages = db.relationship('Message',
                                      foreign_keys='Message.recipient_id',
                                      backref=db.backref('recipient_user', lazy=True),
                                      lazy=True,
                                      cascade='all, delete-orphan')
    
    # Many-to-Many relationships
    liked_posts = db.relationship('Post',
                                secondary=likes,
                                backref=db.backref('liked_by', lazy=True))
    
    following = db.relationship('User', 
                              secondary=followers,
                              primaryjoin=(followers.c.follower_id == id),
                              secondaryjoin=(followers.c.followed_id == id),
                              backref=db.backref('followers', lazy='dynamic'),
                              lazy='dynamic')

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

    def follow(self, user):
        if not self.is_following(user):
            self.following.append(user)

    def unfollow(self, user):
        if self.is_following(user):
            self.following.remove(user)

    def is_following(self, user):
        return self.following.filter(
            followers.c.followed_id == user.id).count() > 0

    def to_dict(self, include_email=False):
        data = {
            'id': self.id,
            'username': self.username,
            'name': self.name or self.username,
            'profile_picture': self.profile_picture,
            'banner': self.banner,
            'bio': self.bio,
            'created_at': self.created_at.isoformat(),
            'followers_count': self.followers.count(),
            'following_count': self.following.count()
        }
        if include_email:
            data['email'] = self.email
        return data