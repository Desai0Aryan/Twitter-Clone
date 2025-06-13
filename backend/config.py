import os
from datetime import timedelta

class Config:
    # Generate a secure secret key
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-please-change-in-production'
    
    # Database configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///app.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Upload configuration
    UPLOAD_FOLDER = os.path.join('frontend', 'static', 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    
    # Allowed file extensions
    ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'webm', 'mov'}
    
    # Session configuration
    PERMANENT_SESSION_LIFETIME = timedelta(days=31)
    SESSION_COOKIE_SECURE = False  # Set to True in production
    SESSION_COOKIE_HTTPONLY = True