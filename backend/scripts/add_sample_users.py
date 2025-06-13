import os
import sys

# Add the backend directory to the Python path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, backend_dir)

from app import create_app, db
from app.models.user import User

def add_sample_users():
    app = create_app()
    with app.app_context():
        # Sample users data
        users = [
            {
                'username': 'techguru',
                'email': 'tech@example.com',
                'password': 'password123',
                'name': 'Tech Guru',
                'bio': 'Tech enthusiast and software developer 👨‍💻',
                'profile_picture': '/static/images/default-avatar.png'
            },
            {
                'username': 'foodielover',
                'email': 'food@example.com',
                'password': 'password123',
                'name': 'Foodie Explorer',
                'bio': 'Food blogger and culinary adventurer 🍜',
                'profile_picture': '/static/images/default-avatar.png'
            },
            {
                'username': 'travelbug',
                'email': 'travel@example.com',
                'password': 'password123',
                'name': 'Travel Bug',
                'bio': 'Exploring the world one country at a time ✈️',
                'profile_picture': '/static/images/default-avatar.png'
            },
            {
                'username': 'fitnessjunkie',
                'email': 'fitness@example.com',
                'password': 'password123',
                'name': 'Fitness Junkie',
                'bio': 'Personal trainer and wellness advocate 💪',
                'profile_picture': '/static/images/default-avatar.png'
            },
            {
                'username': 'artcreator',
                'email': 'art@example.com',
                'password': 'password123',
                'name': 'Art Creator',
                'bio': 'Digital artist and creative soul 🎨',
                'profile_picture': '/static/images/default-avatar.png'
            }
        ]

        for user_data in users:
            # Check if user already exists
            if not User.query.filter_by(username=user_data['username']).first():
                user = User(
                    username=user_data['username'],
                    email=user_data['email'],
                    name=user_data['name'],
                    bio=user_data['bio'],
                    profile_picture=user_data['profile_picture']
                )
                user.set_password(user_data['password'])
                db.session.add(user)
        
        db.session.commit()
        print("Sample users added successfully!")

if __name__ == '__main__':
    add_sample_users() 