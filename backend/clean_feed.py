from app import create_app, db
from app.models.post import Post
from app.models.user import User
from datetime import datetime, timedelta
import random

def clean_feed():
    app = create_app()
    with app.app_context():
        # Delete all existing posts
        try:
            num_deleted = Post.query.delete()
            db.session.commit()
            print(f"Deleted {num_deleted} posts")
        except Exception as e:
            print(f"Error deleting posts: {e}")
            db.session.rollback()

        # Get all users
        users = User.query.all()
        if not users:
            print("No users found. Please create some users first.")
            return

        # Sample content for posts
        sample_contents = [
            "Just finished building a new feature! 🚀 #coding #webdev",
            "Beautiful sunset today! 🌅 Nature never fails to amaze me.",
            "Working on my Twitter clone project. Making great progress! 💻",
            "Had an amazing brainstorming session today. Ideas flowing! 💡",
            "Learning new technologies is always exciting! 📚 #learning #tech",
            "Coffee break with some coding. Perfect combination! ☕️ #developer",
            "Just deployed my latest update. Everything working smoothly! 🎉",
            "Debugging session turned into a feature discovery. Love when that happens! 🐛✨",
            "Code reviews are so important for quality. Always learn something new! 👨‍💻",
            "Taking a break from coding to enjoy some fresh air! 🌳 #worklifebalance",
            "Started working on the UI improvements. Looking good so far! 🎨",
            "API integration complete! Backend is now more powerful 💪 #backend",
            "Database optimization day! Making things faster ⚡️ #performance",
            "Just fixed that tricky bug that's been bothering me for days! 🎯",
            "New responsive design looking great on all devices! 📱 #frontend"
        ]

        # Create new posts
        try:
            # Create posts over the last 7 days
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=7)
            
            for i in range(30):  # Create 30 posts
                user = random.choice(users)
                content = random.choice(sample_contents)
                post_date = start_date + timedelta(
                    seconds=random.randint(0, int((end_date - start_date).total_seconds()))
                )
                
                post = Post(
                    content=content,
                    author_id=user.id,
                    created_at=post_date
                )
                db.session.add(post)
            
            db.session.commit()
            print("Successfully created new sample posts!")
            
        except Exception as e:
            print(f"Error creating posts: {e}")
            db.session.rollback()

if __name__ == "__main__":
    clean_feed() 