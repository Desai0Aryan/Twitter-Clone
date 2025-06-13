import os
from PIL import Image
from werkzeug.utils import secure_filename
from datetime import datetime
from flask import current_app
import pathlib
import uuid

def allowed_file(filename, allowed_extensions):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

def ensure_upload_dirs():
    """Ensure all required upload directories exist."""
    if current_app:
        # Get the base upload directory from the app config
        upload_base = os.path.join(current_app.static_folder, 'uploads')
        
        # Create all required directories
        directories = [
            upload_base,
            os.path.join(upload_base, 'posts'),
            os.path.join(upload_base, 'avatars'),
            os.path.join(upload_base, 'banners')
        ]
        
        for directory in directories:
            try:
                os.makedirs(directory, exist_ok=True)
                print(f"Ensuring directory exists: {directory}")
            except Exception as e:
                print(f"Error creating directory {directory}: {e}")

def save_image(file, folder='avatars'):
    """Save an image file and return its URL path."""
    if file:
        # Generate unique filename
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{timestamp}_{filename}"
        
        # Ensure directory exists
        upload_path = os.path.join(current_app.static_folder, 'uploads', folder)
        os.makedirs(upload_path, exist_ok=True)
        
        # Save file
        file_path = os.path.join(upload_path, unique_filename)
        file.save(file_path)
        
        # Return URL path
        return os.path.join(current_app.static_url_path, 'uploads', folder, unique_filename)
    return None

def save_video(file, folder='posts'):
    """Save a video file and return its URL path."""
    if file:
        # Generate unique filename
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{timestamp}_{filename}"
        
        # Ensure directory exists
        upload_path = os.path.join(current_app.static_folder, 'uploads', folder)
        os.makedirs(upload_path, exist_ok=True)
        
        # Save file
        file_path = os.path.join(upload_path, unique_filename)
        file.save(file_path)
        
        # Return URL path
        return os.path.join(current_app.static_url_path, 'uploads', folder, unique_filename)
    return None

def delete_file(filepath):
    """
    Delete a file from the uploads directory
    """
    if not filepath:
        return False
        
    try:
        # Convert the URL path to a filesystem path
        frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'frontend'))
        full_path = os.path.join(frontend_dir, *filepath.split('/')[1:])
        
        if os.path.exists(full_path):
            os.remove(full_path)
            return True
    except Exception as e:
        print(f"Error deleting file {filepath}: {e}")
    return False