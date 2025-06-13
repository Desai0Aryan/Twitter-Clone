from flask import Flask, render_template, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS
from config import Config
import os
from flask_migrate import Migrate
from flask_socketio import SocketIO

# Initialize extensions
db = SQLAlchemy()
login_manager = LoginManager()
migrate = Migrate()
socketio = SocketIO()

@login_manager.user_loader
def load_user(user_id):
    from app.models.user import User
    return User.query.get(int(user_id))

def create_app(config_class=Config):
    app = Flask(__name__, 
                template_folder='../../frontend/templates',
                static_folder='../../frontend/static',
                static_url_path='/static')
    app.config.from_object(config_class)
    
    # Configure file upload settings
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
    app.config['ALLOWED_IMAGE_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif'}
    app.config['ALLOWED_VIDEO_EXTENSIONS'] = {'mp4', 'mov', 'avi'}
    app.config['UPLOAD_FOLDER'] = os.path.join(app.static_folder, 'uploads')
    
    # Ensure upload directories exist
    from app.utils.helpers import ensure_upload_dirs
    ensure_upload_dirs()
    
    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    socketio.init_app(app)
    CORS(app, supports_credentials=True)
    
    # Set up login manager
    login_manager.login_view = 'auth.login'
    
    # Import blueprints
    from app.routes.auth import auth_bp
    from app.routes.posts import posts_bp
    from app.routes.users import users_bp
    from app.routes.messages import messages_bp
    from app.routes.notifications import notifications_bp
    from app.routes.explore import explore_bp
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(posts_bp, url_prefix='/api/posts')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(messages_bp, url_prefix='/api/messages')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(explore_bp, url_prefix='/api/explore')

    # Register main routes
    @app.route('/')
    def index():
        return render_template('login.html')

    @app.route('/register')
    def register():
        return render_template('register.html')

    @app.route('/feed')
    def feed():
        return render_template('feed.html')

    @app.route('/explore')
    def explore():
        return render_template('explore.html')

    @app.route('/notifications')
    def notifications():
        return render_template('notifications.html')

    @app.route('/profile')
    def profile():
        return render_template('profile.html')

    @app.route('/messages')
    def messages():
        return render_template('messages.html')

    # Custom static file serving for uploads
    @app.route('/static/uploads/<path:filename>')
    def serve_upload(filename):
        return send_from_directory(os.path.join(app.static_folder, 'uploads'), filename)

    # WebSocket event handlers
    @socketio.on('join')
    def on_join(data):
        room = data['room']
        socketio.join_room(room)

    @socketio.on('leave')
    def on_leave(data):
        room = data['room']
        socketio.leave_room(room)

    # Create upload directories with absolute paths
    upload_base = os.path.abspath(os.path.join(app.static_folder, 'uploads'))
    os.makedirs(os.path.join(upload_base, 'posts'), exist_ok=True)
    os.makedirs(os.path.join(upload_base, 'avatars'), exist_ok=True)

    # Print debug information
    print(f"Static folder: {app.static_folder}")
    print(f"Upload folder: {upload_base}")
    print(f"Static URL path: {app.static_url_path}")

    return app