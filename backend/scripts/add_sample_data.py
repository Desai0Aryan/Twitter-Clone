import os
import sys

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import User, Post
from datetime import datetime, timedelta
import random

def add_sample_data():
    app = create_app()
    with app.app_context():
        # Create sample users
        users = [
            {
                'username': 'techie_sarah',
                'email': 'sarah@example.com',
                'name': 'Sarah Chen',
                'bio': 'Software Engineer | AI Enthusiast | Coffee Lover ☕',
                'profile_picture': '/static/images/default-avatar.png'
            },
            {
                'username': 'travel_mike',
                'email': 'mike@example.com',
                'name': 'Mike Rodriguez',
                'bio': 'Travel photographer 📸 | Adventure seeker 🌎',
                'profile_picture': '/static/images/default-avatar.png'
            },
            {
                'username': 'foodie_emma',
                'email': 'emma@example.com',
                'name': 'Emma Thompson',
                'bio': 'Food blogger 🍜 | Recipe developer 👩‍🍳',
                'profile_picture': '/static/images/default-avatar.png'
            }
        ]

        created_users = []
        for user_data in users:
            user = User(**user_data)
            user.set_password('password123')
            db.session.add(user)
            db.session.flush()  # This will assign the ID to the user
            created_users.append(user)

        # Sample posts for each user
        posts_data = {
            'techie_sarah': [
                "Just deployed my first machine learning model! 🤖 #AI #coding",
                "Working on a new open-source project. Can't wait to share it! 💻 #opensource",
                "TIL: The importance of code reviews. They really do make your code better! 📚",
                "Coffee + Coding = Perfect Sunday morning ☕️ #developerlife",
            ],
            'travel_mike': [
                "Sunrise at Mount Fuji was absolutely breathtaking! 🗻 #Japan #travel",
                "Street photography in the rain has a special kind of magic ☔️ #photography",
                "Planning my next adventure! Should I go to Iceland or New Zealand? 🤔",
                "The colors of Marrakech markets are just incredible! 🎨 #Morocco",
            ],
            'foodie_emma': [
                "Just perfected my grandmother's pasta recipe! 🍝 #homemade #cooking",
                "Market fresh ingredients for today's recipe testing 🥬 #foodie",
                "Who else loves trying street food in every city they visit? 🌮 #streetfood",
                "Baking day! Making sourdough bread from scratch 🍞 #baking",
            ]
        }

        # Create posts with random timestamps within the last week
        now = datetime.utcnow()
        for user in created_users:
            posts = posts_data[user.username]
            for post_content in posts:
                # Random timestamp within the last week
                random_hours = random.randint(1, 168)  # Within last week (7 * 24 = 168 hours)
                timestamp = now - timedelta(hours=random_hours)
                
                post = Post(
                    content=post_content,
                    author_id=user.id,
                    media_urls=[],
                    created_at=timestamp
                )
                db.session.add(post)

        # Commit all changes
        db.session.commit()
        print("Successfully added sample users and posts!")

if __name__ == '__main__':
    add_sample_data() 