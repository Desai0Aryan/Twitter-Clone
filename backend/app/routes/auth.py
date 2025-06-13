from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from flask_login import login_user, logout_user, login_required, current_user
from app.models.user import User
from app import db
import os
import shutil
from app.utils.helpers import save_image
import re

auth_bp = Blueprint('auth', __name__)

def is_valid_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def is_valid_username(username):
    pattern = r'^[a-zA-Z0-9_]{3,20}$'
    return re.match(pattern, username) is not None

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data or 'username' not in data or 'password' not in data:
            return jsonify({'error': 'Missing username or password'}), 400

        user = User.query.filter_by(username=data['username']).first()
        
        if user and user.check_password(data['password']):
            login_user(user)
            return jsonify(user.to_dict(include_email=True))
        
        return jsonify({'error': 'Invalid username or password'}), 401
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': 'An error occurred during login'}), 500

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not data or 'username' not in data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Missing required fields'}), 400

        # Validate username
        if not is_valid_username(data['username']):
            return jsonify({'error': 'Invalid username. Use 3-20 characters, letters, numbers, and underscore only.'}), 400

        # Validate email
        if not is_valid_email(data['email']):
            return jsonify({'error': 'Invalid email address'}), 400

        # Check existing username
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400
            
        # Check existing email
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # Create default avatar path
        default_avatar = os.path.join('frontend', 'static', 'images', 'default-avatar.png')
        avatar_dir = os.path.join('frontend', 'static', 'uploads', 'avatars')
        os.makedirs(avatar_dir, exist_ok=True)
        
        # Create unique filename for the user's avatar
        avatar_filename = f"avatar_{data['username']}.png"
        avatar_path = os.path.join(avatar_dir, avatar_filename)
        
        # Copy default avatar to user's avatar
        if os.path.exists(default_avatar):
            shutil.copy(default_avatar, avatar_path)
            avatar_url = f"/static/uploads/avatars/{avatar_filename}"
        else:
            avatar_url = "/static/images/default-avatar.png"
        
        user = User(
            username=data['username'],
            email=data['email'],
            profile_picture=avatar_url,
            name=data.get('name', data['username'])
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        login_user(user)
        return jsonify(user.to_dict(include_email=True))
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({'error': 'An error occurred during registration'}), 500

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'})

@auth_bp.route('/me')
@login_required
def get_current_user():
    return jsonify(current_user.to_dict(include_email=True))

@auth_bp.route('/check-username/<username>')
def check_username(username):
    user = User.query.filter_by(username=username).first()
    return jsonify({'available': user is None})

@auth_bp.route('/check-email/<email>')
def check_email(email):
    user = User.query.filter_by(email=email).first()
    return jsonify({'available': user is None})