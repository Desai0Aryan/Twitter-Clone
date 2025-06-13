from flask import Blueprint, request, jsonify
from flask_login import current_user, login_required
from app.models.message import Message
from app.models.user import User
from app import db
from datetime import datetime
from sqlalchemy import or_, desc

messages_bp = Blueprint('messages', __name__)

@messages_bp.route('/conversations')
@login_required
def get_conversations():
    # Get all users that current user has exchanged messages with
    sent_to = db.session.query(Message.recipient_id)\
        .filter(Message.sender_id == current_user.id)\
        .distinct().all()
    received_from = db.session.query(Message.sender_id)\
        .filter(Message.recipient_id == current_user.id)\
        .distinct().all()
    
    user_ids = set([id for (id,) in sent_to + received_from])
    users = User.query.filter(User.id.in_(user_ids)).all()
    
    conversations = []
    for user in users:
        # Get last message
        last_message = Message.query.filter(
            or_(
                (Message.sender_id == current_user.id) & 
                (Message.recipient_id == user.id),
                (Message.sender_id == user.id) & 
                (Message.recipient_id == current_user.id)
            )
        ).order_by(Message.created_at.desc()).first()
        
        if last_message:
            conversations.append({
                'user': user.to_dict(),
                'last_message': last_message.to_dict()
            })
    
    # Sort conversations by last message timestamp
    conversations.sort(key=lambda x: x['last_message']['created_at'], reverse=True)
    
    return jsonify(conversations)

@messages_bp.route('/<username>')
@login_required
def get_messages(username):
    other_user = User.query.filter_by(username=username).first_or_404()
    
    messages = Message.query.filter(
        or_(
            (Message.sender_id == current_user.id) & 
            (Message.recipient_id == other_user.id),
            (Message.sender_id == other_user.id) & 
            (Message.recipient_id == current_user.id)
        )
    ).order_by(Message.created_at.desc()).limit(50).all()
    
    # Mark messages as read
    for message in messages:
        if message.recipient_id == current_user.id and not message.read_at:
            message.read_at = datetime.utcnow()
    
    db.session.commit()
    
    # Return messages in chronological order (oldest first)
    return jsonify([message.to_dict() for message in reversed(messages)])

@messages_bp.route('/<username>/read', methods=['POST'])
@login_required
def mark_messages_as_read(username):
    other_user = User.query.filter_by(username=username).first_or_404()
    
    # Mark all unread messages from the other user as read
    unread_messages = Message.query.filter(
        Message.sender_id == other_user.id,
        Message.recipient_id == current_user.id,
        Message.read_at == None
    ).all()
    
    for message in unread_messages:
        message.read_at = datetime.utcnow()
    
    db.session.commit()
    return jsonify({'success': True})

@messages_bp.route('/<username>', methods=['POST'])
@login_required
def send_message(username):
    recipient = User.query.filter_by(username=username).first_or_404()
    
    data = request.get_json()
    if not data or 'content' not in data:
        return jsonify({'error': 'Message content is required'}), 400
    
    message = Message(
        content=data['content'].strip(),
        sender_id=current_user.id,
        recipient_id=recipient.id
    )
    
    db.session.add(message)
    db.session.commit()
    
    return jsonify(message.to_dict())

@messages_bp.route('/unread-count')
@login_required
def get_unread_count():
    count = Message.query.filter_by(
        recipient_id=current_user.id,
        read_at=None
    ).count()
    return jsonify({'unread_count': count})