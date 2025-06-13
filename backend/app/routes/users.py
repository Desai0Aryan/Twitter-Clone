from flask import Blueprint, request, jsonify
from flask_login import current_user, login_required
from app.models.user import User
from app.models.post import Post
from app.models.comment import Comment
from app.utils.helpers import save_image
from app import db
from sqlalchemy.sql import func

users_bp = Blueprint('users', __name__)

@users_bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    return jsonify(current_user.to_dict(include_email=True))

@users_bp.route('/me', methods=['PATCH'])
@login_required
def update_profile():
    try:
        # Handle profile picture upload
        if 'profile_picture' in request.files:
            file = request.files['profile_picture']
            if file:
                image_url = save_image(file, 'avatars')
                if image_url:
                    current_user.profile_picture = image_url

        # Handle banner upload
        if 'banner' in request.files:
            file = request.files['banner']
            if file:
                image_url = save_image(file, 'banners')
                if image_url:
                    current_user.banner = image_url

        # Handle other profile updates
        if request.form:
            if 'name' in request.form:
                current_user.name = request.form['name']
            if 'bio' in request.form:
                current_user.bio = request.form['bio']
        
        # Handle JSON updates
        if request.is_json:
            data = request.get_json()
            if 'name' in data:
                current_user.name = data['name']
            if 'bio' in data:
                current_user.bio = data['bio']

        db.session.commit()
        return jsonify(current_user.to_dict(include_email=True))
    except Exception as e:
        print(f"Error updating profile: {e}")
        return jsonify({'error': 'Failed to update profile'}), 500

@users_bp.route('/<username>')
@login_required
def get_user(username):
    user = User.query.filter_by(username=username).first_or_404()
    return jsonify(user.to_dict())

@users_bp.route('/<username>/follow', methods=['POST'])
@login_required
def follow_user(username):
    user = User.query.filter_by(username=username).first_or_404()
    if user.id == current_user.id:
        return jsonify({'error': "You can't follow yourself"}), 400
    
    current_user.follow(user)
    db.session.commit()
    return jsonify({
        'message': f'You are now following {username}',
        'followers_count': user.followers.count()
    })

@users_bp.route('/<username>/unfollow', methods=['POST'])
@login_required
def unfollow_user(username):
    user = User.query.filter_by(username=username).first_or_404()
    if user.id == current_user.id:
        return jsonify({'error': "You can't unfollow yourself"}), 400
    
    current_user.unfollow(user)
    db.session.commit()
    return jsonify({
        'message': f'You have unfollowed {username}',
        'followers_count': user.followers.count()
    })

@users_bp.route('/search')
@login_required
def search_users():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([])
    
    # Search for users by name or username
    users = User.query.filter(
        (User.username.ilike(f'%{query}%') | User.name.ilike(f'%{query}%')) &
        (User.id != current_user.id)  # Exclude current user
    ).limit(10).all()
    
    return jsonify([{
        'id': user.id,
        'username': user.username,
        'name': user.name or user.username,
        'profile_picture': user.profile_picture or '/static/images/default-avatar.png'
    } for user in users])

@users_bp.route('/<username>/posts')
def get_user_posts(username):
    user = User.query.filter_by(username=username).first_or_404()
    page = request.args.get('page', 1, type=int)
    media_only = request.args.get('media', '').lower() == 'true'
    
    query = Post.query.filter_by(author_id=user.id)
    
    # Filter for media posts if requested
    if media_only:
        query = query.filter(Post.media_urls != None, Post.media_urls != '[]')
    
    posts = query.order_by(Post.created_at.desc())\
        .paginate(page=page, per_page=20, error_out=False)
    
    posts_dict = []
    for post in posts.items:
        post_dict = post.to_dict()
        if current_user.is_authenticated:
            post_dict['is_liked_by_current_user'] = current_user in post.liked_by
        posts_dict.append(post_dict)
    
    return jsonify({
        'posts': posts_dict,
        'has_next': posts.has_next
    })

@users_bp.route('/<username>/replies')
@login_required
def get_user_replies(username):
    user = User.query.filter_by(username=username).first_or_404()
    page = request.args.get('page', 1, type=int)
    
    # Get comments (replies) by the user with their associated posts
    replies = db.session.query(Comment, Post)\
        .join(Post, Comment.post_id == Post.id)\
        .filter(Comment.author_id == user.id)\
        .order_by(Comment.created_at.desc())\
        .paginate(page=page, per_page=20, error_out=False)
    
    posts_dict = []
    for reply, post in replies.items:
        # Convert post to dict
        post_dict = post.to_dict()
        # Add reply information
        post_dict['reply'] = {
            'id': reply.id,
            'content': reply.content,
            'created_at': reply.created_at.isoformat(),
            'author': {
                'id': user.id,
                'username': user.username,
                'name': user.name,
                'profile_picture': user.profile_picture
            }
        }
        if current_user.is_authenticated:
            post_dict['is_liked_by_current_user'] = current_user in post.liked_by
        posts_dict.append(post_dict)
    
    return jsonify({
        'posts': posts_dict,
        'has_next': replies.has_next
    })

@users_bp.route('/<username>/likes')
@login_required
def get_user_likes(username):
    user = User.query.filter_by(username=username).first_or_404()
    page = request.args.get('page', 1, type=int)
    
    # Get posts that the user has liked
    liked_posts = Post.query.join(Post.liked_by)\
        .filter(User.id == user.id)\
        .order_by(Post.created_at.desc())\
        .paginate(page=page, per_page=20, error_out=False)
    
    posts_dict = []
    for post in liked_posts.items:
        post_dict = post.to_dict()
        post_dict['is_liked_by_current_user'] = True  # Since these are liked posts
        posts_dict.append(post_dict)
    
    return jsonify({
        'posts': posts_dict,
        'has_next': liked_posts.has_next
    })

@users_bp.route('/suggested', methods=['GET'])
@login_required
def get_suggested_users():
    # Get users that the current user is not following
    following_ids = [user.id for user in current_user.following]
    following_ids.append(current_user.id)  # Exclude current user
    
    # Get random users
    suggested_users = User.query.filter(
        ~User.id.in_(following_ids)
    ).order_by(func.random()).limit(3).all()
    
    # If we don't have enough suggestions, get some users the current user is following
    if len(suggested_users) < 3:
        following_users = User.query.filter(
            User.id.in_([user.id for user in current_user.following])
        ).order_by(func.random()).limit(3 - len(suggested_users)).all()
        suggested_users.extend(following_users)
    
    return jsonify([{
        'id': user.id,
        'username': user.username,
        'name': user.name,
        'profile_picture': user.profile_picture or '/static/images/default-avatar.png',
        'is_following': user in current_user.following
    } for user in suggested_users])