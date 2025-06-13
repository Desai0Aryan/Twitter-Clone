from flask import Blueprint, request, jsonify
from flask_login import current_user
from app.models.post import Post
from app.models.user import User
from sqlalchemy import func, desc
from app import db

explore_bp = Blueprint('explore', __name__)

@explore_bp.route('', methods=['GET'])
def get_explore_feed():
    page = request.args.get('page', 1, type=int)
    category = request.args.get('category', 'for-you')
    
    # Base query
    query = Post.query
    
    if category == 'trending':
        # Get posts with most likes and comments in the last 24 hours
        query = query.join(Post.liked_by)\
            .group_by(Post.id)\
            .order_by(desc(func.count(Post.liked_by)))\
            .order_by(desc(func.count(Post.comments)))
    elif category == 'news':
        # Get posts from verified users or news-related content
        query = query.filter(Post.content.ilike('%#news%'))
    elif category == 'sports':
        # Get sports-related content
        query = query.filter(Post.content.ilike('%#sports%'))
    elif category == 'entertainment':
        # Get entertainment-related content
        query = query.filter(Post.content.ilike('%#entertainment%'))
    
    # Paginate results
    posts = query.order_by(Post.created_at.desc())\
        .paginate(page=page, per_page=20, error_out=False)
    
    # Format response
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

@explore_bp.route('/trending', methods=['GET'])
def get_trending_topics():
    # Get trending hashtags from posts in the last 24 hours
    trending = db.session.query(
        func.regexp_matches(Post.content, '#\w+').label('hashtag'),
        func.count('*').label('count')
    ).group_by('hashtag')\
    .order_by(desc('count'))\
    .limit(10)\
    .all()
    
    return jsonify([{
        'tag': tag,
        'count': count
    } for tag, count in trending]) 