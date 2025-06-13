from app import create_app, db
from app.models import User, Post, Comment
from werkzeug.security import generate_password_hash
import os

def init_db():
    app = create_app()
    with app.app_context():
        # Drop all tables
        db.drop_all()
        
        # Create all tables
        db.create_all()
        
        # Create test user
        test_user = User(
            username='desai0aryan',
            email='desai0aryan@example.com',
            name='Aryan Desai',
            profile_picture='/static/images/default-avatar.png'
        )
        test_user.set_password('password123')
        db.session.add(test_user)
        
        # Create some test posts
        posts = [
            Post(
                content='Hello Twitter! This is my first tweet! 🚀',
                author_id=1,
                media_urls=[]
            ),
            Post(
                content='Just learned about Flask and SQLAlchemy. Building a Twitter clone! 💻',
                author_id=1,
                media_urls=[]
            ),
            Post(
                content='Beautiful sunset today! 🌅',
                author_id=1,
                media_urls=['/static/uploads/posts/sunset.jpg']
            ),
            Post(
                content='Working on some new features for the app! Stay tuned! 🛠️',
                author_id=1,
                media_urls=[]
            ),
            Post(
                content='Happy coding everyone! 🎉',
                author_id=1,
                media_urls=[]
            )
        ]
        
        for post in posts:
            db.session.add(post)
        
        # Create upload directories if they don't exist
        upload_dirs = [
            os.path.join('frontend', 'static', 'uploads'),
            os.path.join('frontend', 'static', 'uploads', 'posts'),
            os.path.join('frontend', 'static', 'uploads', 'avatars')
        ]
        for directory in upload_dirs:
            os.makedirs(directory, exist_ok=True)
        
        # Commit changes
        db.session.commit()

if __name__ == '__main__':
    init_db()