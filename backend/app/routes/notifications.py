from flask import Blueprint, request, jsonify
from flask_login import current_user, login_required
from app.models.notification import Notification
from app import db, socketio
from datetime import datetime

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('', methods=['GET'])
@login_required
def get_notifications():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    notification_type = request.args.get('type')
    
    query = Notification.query.filter_by(user_id=current_user.id)
    
    if notification_type:
        query = query.filter_by(type=notification_type)
    
    notifications = query.order_by(Notification.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'notifications': [n.to_dict() for n in notifications.items],
        'has_next': notifications.has_next
    })

@notifications_bp.route('/unread-count', methods=['GET'])
@login_required
def get_unread_count():
    count = Notification.query.filter_by(
        user_id=current_user.id,
        read=False
    ).count()
    return jsonify({'count': count})

@notifications_bp.route('/mark-read', methods=['POST'])
@login_required
def mark_notifications_read():
    notification_ids = request.json.get('notification_ids', [])
    
    if notification_ids:
        Notification.query.filter(
            Notification.id.in_(notification_ids),
            Notification.user_id == current_user.id
        ).update({'read': True}, synchronize_session=False)
    else:
        # Mark all as read if no specific IDs provided
        Notification.query.filter_by(
            user_id=current_user.id,
            read=False
        ).update({'read': True}, synchronize_session=False)
    
    db.session.commit()
    return jsonify({'message': 'Notifications marked as read'})

def create_notification(user_id, actor_id, type, post_id=None, comment_id=None):
    """Helper function to create a notification and emit via WebSocket"""
    notification = Notification(
        user_id=user_id,
        actor_id=actor_id,
        type=type,
        post_id=post_id,
        comment_id=comment_id
    )
    db.session.add(notification)
    db.session.commit()
    
    # Emit notification via WebSocket
    socketio.emit(
        'notification',
        notification.to_dict(),
        room=f'user_{user_id}'
    ) 