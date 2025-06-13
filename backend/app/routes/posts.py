from flask import Blueprint, request, jsonify, current_app
from flask_login import current_user, login_required
from app.models.post import Post
from app.models.comment import Comment
from app.utils.helpers import save_image, save_video
from app import db
import traceback
import sys
import os
from werkzeug.utils import secure_filename
from datetime import datetime

posts_bp = Blueprint('posts', __name__)

@posts_bp.route('', methods=['GET'])
@posts_bp.route('/', methods=['GET'])
def get_posts():
    page = request.args.get('page', 1, type=int)
    posts = Post.query.order_by(Post.created_at.desc()).paginate(
        page=page, per_page=20, error_out=False)
    
    # Check if posts are liked by current user
    posts_dict = []
    current_user_id = current_user.id if current_user.is_authenticated else None
    
    for post in posts.items:
        post_dict = post.to_dict(current_user_id=current_user_id)
        posts_dict.append(post_dict)
    
    return jsonify({
        'posts': posts_dict,
        'has_next': posts.has_next
    })

@posts_bp.route('/create', methods=['POST'])
@login_required
def create_post():
    try:
        content = request.form.get('content', '').strip()
        if not content:
            return jsonify({'error': 'Content is required'}), 400

        # Handle media uploads
        media_urls = []
        allowed_image_types = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        allowed_video_types = {'mp4', 'webm', 'mov'}
        max_file_size = 10 * 1024 * 1024  # 10MB limit
        max_files = 4  # Maximum 4 files per post

        # Function to check file type
        def is_allowed_file(filename, allowed_types):
            return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_types

        # Handle multiple files
        files = request.files.getlist('image[]') + request.files.getlist('video[]')
        
        if len(files) > max_files:
            return jsonify({'error': f'Maximum {max_files} files allowed per post'}), 400

        for file in files:
            if file and file.filename:
                # Check file size
                file.seek(0, 2)  # Seek to end of file
                size = file.tell()
                file.seek(0)  # Reset file pointer
                
                if size > max_file_size:
                    return jsonify({'error': f'File {file.filename} is too large. Maximum size is 10MB'}), 400

                filename = secure_filename(file.filename)
                file_ext = filename.rsplit('.', 1)[1].lower()
                
                # Validate file type
                if not (is_allowed_file(filename, allowed_image_types) or 
                       is_allowed_file(filename, allowed_video_types)):
                    return jsonify({'error': f'File type {file_ext} is not allowed'}), 400

                # Save file
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                filename = f"{timestamp}_{filename}"
                
                # Use absolute paths for file saving
                upload_path = os.path.join(current_app.static_folder, 'uploads', 'posts')
                os.makedirs(upload_path, exist_ok=True)
                filepath = os.path.join(upload_path, filename)
                
                try:
                    file.save(filepath)
                    # Store the URL path
                    media_urls.append(os.path.join(current_app.static_url_path, 'uploads', 'posts', filename))
                except Exception as e:
                    return jsonify({'error': f'Failed to save file {filename}: {str(e)}'}), 500

        # Create post
        post = Post(
            content=content,
            author_id=current_user.id,
            media_urls=media_urls
        )
        db.session.add(post)
        db.session.commit()

        # Return the post with author information
        post_dict = post.to_dict()
        post_dict['author'] = {
            'id': current_user.id,
            'username': current_user.username,
            'name': current_user.name,
            'profile_picture': current_user.profile_picture
        }
        post_dict['is_liked_by_current_user'] = False
        post_dict['comments_count'] = 0
        post_dict['likes_count'] = 0

        return jsonify({
            'message': 'Post created successfully',
            'post': post_dict
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error creating post: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@posts_bp.route('/<int:post_id>', methods=['DELETE'])
@login_required
def delete_post(post_id):
    post = Post.query.get_or_404(post_id)
    if post.author_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
        
    db.session.delete(post)
    db.session.commit()
    return jsonify({'message': 'Post deleted'})

@posts_bp.route('/<int:post_id>/like', methods=['POST'])
@login_required
def like_post(post_id):
    post = Post.query.get_or_404(post_id)
    if current_user not in post.liked_by:
        post.liked_by.append(current_user)
        db.session.commit()
    return jsonify({
        'likes_count': len(post.liked_by),
        'is_liked_by_current_user': True
    })

@posts_bp.route('/<int:post_id>/unlike', methods=['POST'])
@login_required
def unlike_post(post_id):
    post = Post.query.get_or_404(post_id)
    if current_user in post.liked_by:
        post.liked_by.remove(current_user)
        db.session.commit()
    return jsonify({
        'likes_count': len(post.liked_by),
        'is_liked_by_current_user': False
    })

@posts_bp.route('/<int:post_id>/comments', methods=['GET'])
def get_comments(post_id):
    post = Post.query.get_or_404(post_id)
    comments = Comment.query.filter_by(post_id=post_id)\
        .order_by(Comment.created_at.desc()).all()
    return jsonify([comment.to_dict() for comment in comments])

@posts_bp.route('/<int:post_id>/comments', methods=['POST'])
@login_required
def create_comment(post_id):
    post = Post.query.get_or_404(post_id)
    
    data = request.get_json()
    if not data or 'content' not in data:
        return jsonify({'error': 'Content is required'}), 400
        
    comment = Comment(
        content=data['content'],
        author_id=current_user.id,
        post_id=post_id
    )
    
    db.session.add(comment)
    db.session.commit()
    
    return jsonify(comment.to_dict())

@posts_bp.route('/<int:post_id>', methods=['GET'])
def get_post(post_id):
    post = Post.query.get_or_404(post_id)
    post_dict = post.to_dict()
    if current_user.is_authenticated:
        post_dict['is_liked_by_current_user'] = current_user in post.liked_by
    return jsonify(post_dict)