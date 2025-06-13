document.addEventListener('DOMContentLoaded', function() {
    let currentUser = null;
    let currentChat = null;
    let messagePollingInterval = null;
    
    // Get current user info
    async function getCurrentUser() {
        try {
            const response = await fetch('/api/auth/me');
            if (!response.ok) {
                window.location.href = '/';
                return;
            }
            currentUser = await response.json();
            loadConversations();
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
    }
    
    // Load conversations
    async function loadConversations() {
        try {
            const response = await fetch('/api/messages/conversations');
            const conversations = await response.json();
            
            const conversationsContainer = document.getElementById('conversations');
            conversationsContainer.innerHTML = conversations.map(conv => {
                const hasUnread = !conv.last_message.is_read && 
                                conv.last_message.recipient.username === currentUser.username;
                return `
                    <div class="conversation ${hasUnread ? 'unread' : ''}" 
                         data-username="${conv.user.username}"
                         data-has-unread="${hasUnread}"
                         onclick="selectConversation('${conv.user.username}')">
                        <img src="${conv.user.profile_picture}" alt="" class="avatar">
                        <div class="conversation-info">
                            <div class="conversation-header">
                                <span class="conversation-name">
                                    ${conv.user.name}
                                    ${hasUnread ? '<span class="unread-indicator"></span>' : ''}
                                </span>
                                <span class="conversation-time">
                                    ${formatDate(conv.last_message.created_at)}
                                </span>
                            </div>
                            <div class="conversation-preview">
                                ${conv.last_message.content}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }
    
    // Mark messages as read
    async function markMessagesAsRead(username) {
        try {
            const response = await fetch(`/api/messages/${username}/read`, {
                method: 'POST'
            });
            
            if (response.ok) {
                // Update conversation unread status in UI
                const conversationEl = document.querySelector(`.conversation[data-username="${username}"]`);
                if (conversationEl) {
                    conversationEl.classList.remove('unread');
                    const indicator = conversationEl.querySelector('.unread-indicator');
                    if (indicator) {
                        indicator.remove();
                    }
                }
                
                // Update message unread status in UI
                const unreadMessages = document.querySelectorAll('.message.unread');
                unreadMessages.forEach(message => {
                    message.classList.remove('unread');
                });
            }
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }
    
    // Select conversation
    window.selectConversation = async function(username) {
        currentChat = username;
        
        // Update UI
        document.querySelectorAll('.conversation').forEach(conv => {
            conv.classList.remove('active');
            if (conv.dataset.username === username) {
                conv.classList.add('active');
            }
        });
        
        // Show message thread
        const threadContainer = document.querySelector('.conversation-container');
        threadContainer.style.display = 'flex';
        document.querySelector('.no-messages-selected').style.display = 'none';
        
        // Load user info and messages
        try {
            const response = await fetch(`/api/users/${username}`);
            const user = await response.json();
            
            document.getElementById('thread-avatar').src = user.profile_picture;
            document.getElementById('thread-name').textContent = user.name;
            
            // Load messages
            await loadMessages();
            
            // Mark messages as read immediately when conversation is selected
            await markMessagesAsRead(username);
            
            // Start polling for new messages
            if (messagePollingInterval) clearInterval(messagePollingInterval);
            messagePollingInterval = setInterval(async () => {
                await loadMessages();
                // If there are any unread messages, mark them as read
                const hasUnread = document.querySelector('.message.unread');
                if (hasUnread) {
                    await markMessagesAsRead(username);
                }
            }, 5000);
            
            // On mobile, hide conversations list
            if (window.innerWidth <= 992) {
                document.querySelector('.conversations-list').classList.add('hidden');
                document.querySelector('.message-thread').classList.add('active');
            }
        } catch (error) {
            console.error('Error loading user:', error);
        }
    };
    
    // Load messages
    async function loadMessages() {
        if (!currentChat) return;
        
        try {
            const response = await fetch(`/api/messages/${currentChat}`);
            const messages = await response.json();
            
            const messagesContainer = document.getElementById('messages');
            const wasScrolledToBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop === messagesContainer.clientHeight;
            
            messagesContainer.innerHTML = messages.map(message => {
                const isReceived = message.sender.username !== currentUser.username;
                const isUnread = isReceived && !message.is_read;
                return `
                    <div class="message ${isReceived ? 'received' : 'sent'} ${isUnread ? 'unread' : ''}"
                         data-message-id="${message.id}">
                        <div class="message-content">${message.content}</div>
                        <div class="message-time">${formatDate(message.created_at)}</div>
                    </div>
                `;
            }).join('');
            
            // Maintain scroll position
            if (wasScrolledToBottom) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            
            // If there are unread messages and we're at the bottom, mark them as read
            const unreadMessages = document.querySelectorAll('.message.unread');
            if (unreadMessages.length > 0 && wasScrolledToBottom) {
                await markMessagesAsRead(currentChat);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }
    
    // Send message
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    
    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const content = messageInput.value.trim();
        if (!currentChat || !content) return;
        
        try {
            const response = await fetch(`/api/messages/${currentChat}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: content
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to send message');
            }
            
            // Clear input and reload messages
            messageInput.value = '';
            await loadMessages();
            await loadConversations(); // Update conversation preview
            
            // Auto resize textarea
            messageInput.style.height = 'auto';
        } catch (error) {
            console.error('Error sending message:', error);
        }
    });
    
    // Auto resize message input
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // New message modal
    const newMessageBtn = document.getElementById('new-message-btn');
    const newMessageModal = document.getElementById('new-message-modal');
    const closeModalBtn = document.querySelector('.close');
    const userSearch = document.getElementById('user-search');
    const searchResults = document.getElementById('user-search-results');
    
    newMessageBtn.addEventListener('click', () => {
        newMessageModal.style.display = 'block';
        userSearch.value = '';
        searchResults.innerHTML = '';
        userSearch.focus(); // Auto focus the search input
    });
    
    closeModalBtn.addEventListener('click', () => {
        newMessageModal.style.display = 'none';
        userSearch.value = '';
        searchResults.innerHTML = '';
    });
    
    let searchTimeout;
    userSearch.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const query = userSearch.value.trim();
        
        if (!query) {
            searchResults.style.display = 'none';
            return;
        }
        
        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
                if (!response.ok) {
                    throw new Error('Failed to search users');
                }
                
                const users = await response.json();
                
                if (users.length === 0) {
                    searchResults.innerHTML = '<div class="no-results">No users found</div>';
                    searchResults.style.display = 'block';
                    return;
                }
                
                searchResults.innerHTML = users.map(user => `
                    <div class="search-result" onclick="startConversation('${user.username}')">
                        <img src="${user.profile_picture}" alt="" class="avatar">
                        <div class="user-info">
                            <div class="user-name">${user.name}</div>
                            <div class="user-username">@${user.username}</div>
                        </div>
                    </div>
                `).join('');
                searchResults.style.display = 'block';
            } catch (error) {
                console.error('Error searching users:', error);
                searchResults.innerHTML = '<div class="error">Failed to search users</div>';
                searchResults.style.display = 'block';
            }
        }, 300);
    });
    
    // Start new conversation
    window.startConversation = function(username) {
        newMessageModal.style.display = 'none';
        userSearch.value = '';
        searchResults.innerHTML = '';
        selectConversation(username);
    };
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === newMessageModal) {
            newMessageModal.style.display = 'none';
            userSearch.value = '';
            searchResults.innerHTML = '';
        }
    });
    
    // Handle back button on mobile
    document.querySelector('.thread-header').addEventListener('click', () => {
        if (window.innerWidth <= 992) {
            document.querySelector('.conversations-list').classList.remove('hidden');
            document.querySelector('.message-thread').classList.remove('active');
        }
    });
    
    // Initialize
    getCurrentUser();
    
    // Cleanup on page unload
    window.addEventListener('unload', () => {
        if (messagePollingInterval) clearInterval(messagePollingInterval);
    });
});

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff/60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h`;
    if (diff < 604800000) return `${Math.floor(diff/86400000)}d`;
    
    return date.toLocaleDateString();
}