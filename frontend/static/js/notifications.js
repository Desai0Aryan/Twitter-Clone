let currentUser = null;
let currentPage = 1;
let loadingNotifications = false;
let hasMoreNotifications = true;
let currentCategory = 'all';
let socket = io();

// Get current user info
async function getCurrentUser() {
    try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
            window.location.href = '/';
            return;
        }
        currentUser = await response.json();
        document.getElementById('user-avatar').src = currentUser.profile_picture;
        document.getElementById('user-name').textContent = currentUser.name;
        document.getElementById('user-handle').textContent = `@${currentUser.username}`;
        
        // Join user's notification room
        socket.emit('join', { room: `user_${currentUser.id}` });
    } catch (error) {
        console.error('Error fetching current user:', error);
    }
}

// Load notifications
async function loadNotifications(page = 1) {
    if (loadingNotifications) return;
    loadingNotifications = true;
    
    try {
        const response = await fetch(
            `/api/notifications?page=${page}&type=${currentCategory === 'all' ? '' : currentCategory}`
        );
        if (!response.ok) {
            throw new Error('Failed to load notifications');
        }
        
        const data = await response.json();
        const feed = document.getElementById('notifications-feed');
        
        if (page === 1) {
            feed.innerHTML = '';
        }
        
        data.notifications.forEach(notification => {
            feed.appendChild(createNotificationElement(notification));
        });
        
        hasMoreNotifications = data.has_next;
        currentPage = page;
        
        // Mark loaded notifications as read
        const notificationIds = data.notifications.map(n => n.id);
        if (notificationIds.length > 0) {
            markNotificationsRead(notificationIds);
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    } finally {
        loadingNotifications = false;
    }
}

// Create notification element
function createNotificationElement(notification) {
    const element = document.createElement('div');
    element.className = `notification ${notification.read ? 'read' : 'unread'}`;
    
    let content = '';
    switch (notification.type) {
        case 'like':
            content = `
                <i class="fas fa-heart notification-icon like"></i>
                <div class="notification-content">
                    <img src="${notification.actor.profile_picture}" alt="${notification.actor.username}" class="notification-avatar">
                    <p>
                        <strong>${notification.actor.name}</strong> liked your tweet:
                        <span class="tweet-preview">${notification.post.content}</span>
                    </p>
                </div>
            `;
            break;
        case 'comment':
            content = `
                <i class="fas fa-comment notification-icon comment"></i>
                <div class="notification-content">
                    <img src="${notification.actor.profile_picture}" alt="${notification.actor.username}" class="notification-avatar">
                    <p>
                        <strong>${notification.actor.name}</strong> commented on your tweet:
                        <span class="comment-preview">${notification.comment.content}</span>
                    </p>
                </div>
            `;
            break;
        case 'follow':
            content = `
                <i class="fas fa-user notification-icon follow"></i>
                <div class="notification-content">
                    <img src="${notification.actor.profile_picture}" alt="${notification.actor.username}" class="notification-avatar">
                    <p>
                        <strong>${notification.actor.name}</strong> followed you
                    </p>
                </div>
            `;
            break;
    }
    
    element.innerHTML = content;
    return element;
}

// Mark notifications as read
async function markNotificationsRead(notificationIds) {
    try {
        await fetch('/api/notifications/mark-read', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notification_ids: notificationIds })
        });
    } catch (error) {
        console.error('Error marking notifications as read:', error);
    }
}

// Handle category switching
document.querySelectorAll('.category').forEach(category => {
    category.addEventListener('click', () => {
        document.querySelector('.category.active').classList.remove('active');
        category.classList.add('active');
        currentCategory = category.dataset.category;
        currentPage = 1;
        hasMoreNotifications = true;
        loadNotifications(1);
    });
});

// Load more notifications on scroll
window.addEventListener('scroll', () => {
    if (hasMoreNotifications && !loadingNotifications &&
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1000) {
        loadNotifications(currentPage + 1);
    }
});

// Handle real-time notifications
socket.on('notification', (notification) => {
    const feed = document.getElementById('notifications-feed');
    feed.insertBefore(createNotificationElement(notification), feed.firstChild);
    
    // Update notification count
    const badge = document.getElementById('notification-count');
    const currentCount = parseInt(badge.textContent || '0');
    badge.textContent = currentCount + 1;
    badge.style.display = 'inline';
});

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    getCurrentUser();
    loadNotifications(1);
    loadSuggestedUsers();
}); 