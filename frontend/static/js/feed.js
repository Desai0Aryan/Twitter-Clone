document.addEventListener('DOMContentLoaded', function() {
    let currentUser = null;
    let currentPage = 1;
    let loadingPosts = false;
    let hasMorePosts = true;
    
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
            document.getElementById('profile-link').href = `/profile?username=${currentUser.username}`;
            updateUnreadCount();
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
    }
    
    // Load posts with pagination
    async function loadPosts(page = 1) {
        if (loadingPosts) return;
        loadingPosts = true;
        
        try {
            const response = await fetch(`/api/posts/?page=${page}`);
            if (!response.ok) {
                throw new Error('Failed to load posts');
            }
            
            const data = await response.json();
            const feed = document.getElementById('tweet-feed');
            if (!feed) return;
            
            if (page === 1) {
                feed.innerHTML = '';
            }
            
            data.posts.forEach(post => {
                const postElement = createPostElement(post);
                feed.appendChild(postElement);
            });
            
            hasMorePosts = data.has_next;
            currentPage = page;
        } catch (err) {
            console.error('Error loading posts:', err);
        } finally {
            loadingPosts = false;
        }
    }
    
    // Create post element
    function createPostElement(post) {
        const postElement = document.createElement('div');
        postElement.className = 'tweet';
        postElement.dataset.postId = post.id;

        // Create media content HTML
        let mediaContent = '';
        if (post.media_urls && post.media_urls.length > 0) {
            console.log('Media URLs:', post.media_urls); // Debug log
            
            if (post.media_urls.length === 1) {
                const media = post.media_urls[0];
                console.log('Single media URL:', media); // Debug log
                
                if (media.toLowerCase().endsWith('.mp4') || media.toLowerCase().endsWith('.webm') || media.toLowerCase().endsWith('.mov')) {
                    mediaContent = `
                        <div class="post-media">
                            <video controls>
                                <source src="${media}" type="video/mp4">
                                Your browser does not support the video tag.
                            </video>
                        </div>`;
                } else {
                    mediaContent = `
                        <div class="post-media">
                            <img src="${media}" alt="Post image" onclick="showMediaFullscreen('${media}')">
                        </div>`;
                }
            } else {
                const gridClass = `grid-${Math.min(post.media_urls.length, 4)}`;
                mediaContent = `
                    <div class="media-grid ${gridClass}">
                        ${post.media_urls.slice(0, 4).map(media => {
                            console.log('Grid media URL:', media); // Debug log
                            return `
                                <div class="media-item">
                                    ${media.toLowerCase().endsWith('.mp4') || media.toLowerCase().endsWith('.webm') || media.toLowerCase().endsWith('.mov')
                                        ? `<video controls><source src="${media}" type="video/mp4"></video>`
                                        : `<img src="${media}" alt="Post image" onclick="showMediaFullscreen('${media}')">`
                                    }
                                </div>
                            `;
                        }).join('')}
                    </div>`;
            }
        }

        // Don't show follow button for current user's posts
        const showFollowButton = currentUser && post.author.username !== currentUser.username;
        
        postElement.innerHTML = `
            <div class="tweet-header">
                <div class="tweet-header-left">
                    <img src="${post.author.profile_picture || '/static/images/default-avatar.png'}" 
                         alt="${post.author.username}" 
                         class="tweet-avatar">
                    <div class="tweet-author">
                        <span class="tweet-name">${post.author.name}</span>
                        <span class="tweet-username">@${post.author.username}</span>
                    </div>
                </div>
                ${showFollowButton ? `
                    <button class="follow-button ${post.author.is_followed ? 'following' : ''}"
                            onclick="toggleFollow('${post.author.username}', this)">
                        <span class="follow-text">${post.author.is_followed ? 'Following' : 'Follow'}</span>
                    </button>
                ` : ''}
            </div>
            <div class="tweet-content">
                <p>${post.content}</p>
                ${mediaContent}
            </div>
            <div class="tweet-actions">
                <button class="action-button comment-button" onclick="showComments(${post.id})">
                    <i class="fas fa-comment"></i>
                    <span class="action-count">${post.comments_count || 0}</span>
                </button>
                <button class="action-button like-button ${post.is_liked_by_current_user ? 'liked' : ''}" 
                        onclick="toggleLike(${post.id}, this)">
                    <i class="fas fa-heart"></i>
                    <span class="action-count">${post.likes_count || 0}</span>
                </button>
            </div>
        `;

        return postElement;
    }
    
    // Post form handling
    const tweetForm = document.getElementById('tweet-form');
    const tweetContent = document.getElementById('tweet-content');
    const imageUpload = document.getElementById('image-upload');
    const videoUpload = document.getElementById('video-upload');
    const mediaPreview = document.getElementById('media-preview');
    
    tweetContent.addEventListener('input', () => {
        const submitButton = tweetForm.querySelector('button[type="submit"]');
        submitButton.disabled = !tweetContent.value.trim();
    });
    
    // Media upload preview
    let uploadedFiles = [];

    function handleMediaUpload(files, type) {
        if (uploadedFiles.length + files.length > 4) {
            alert('Maximum 4 files allowed');
            return;
        }

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const mediaElement = type === 'image' 
                    ? `<img src="${e.target.result}" alt="Upload preview">` 
                    : `<video src="${e.target.result}" controls></video>`;
                
                const mediaContainer = document.createElement('div');
                mediaContainer.className = 'media-container';
                mediaContainer.innerHTML = `
                    ${mediaElement}
                    <button type="button" class="remove-media" onclick="removeMediaItem(this)">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                mediaPreview.appendChild(mediaContainer);
                uploadedFiles.push({ file, type });
            };
            reader.readAsDataURL(file);
        });

        // Update grid layout based on number of files
        const totalFiles = uploadedFiles.length;
        if (totalFiles > 1) {
            mediaPreview.className = `media-preview grid-${Math.min(totalFiles, 4)}`;
        }
    }

    function removeMediaItem(button) {
        const container = button.parentElement;
        const index = Array.from(mediaPreview.children).indexOf(container);
        uploadedFiles.splice(index, 1);
        container.remove();

        // Update grid layout
        const totalFiles = uploadedFiles.length;
        if (totalFiles > 1) {
            mediaPreview.className = `media-preview grid-${Math.min(totalFiles, 4)}`;
        } else {
            mediaPreview.className = 'media-preview';
        }
    }

    function removeAllMedia() {
        mediaPreview.innerHTML = '';
        uploadedFiles = [];
        imageUpload.value = '';
        videoUpload.value = '';
        mediaPreview.className = 'media-preview';
    }

    // Update event listeners for file inputs
    imageUpload.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleMediaUpload(e.target.files, 'image');
            videoUpload.value = ''; // Clear video upload
        }
    });

    videoUpload.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleMediaUpload(e.target.files, 'video');
            imageUpload.value = ''; // Clear image upload
        }
    });

    // Update form submission
    tweetForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('content', tweetContent.value);
        
        // Append all uploaded files
        uploadedFiles.forEach((fileData, index) => {
            const { file, type } = fileData;
            formData.append(`${type}[]`, file);
        });
        
        const submitButton = tweetForm.querySelector('button[type="submit"]');
        
        try {
            submitButton.disabled = true;
            const response = await fetch('/api/posts/create', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create tweet');
            }
            
            const data = await response.json();
            const feed = document.getElementById('tweet-feed');
            if (feed) {
                const postElement = createPostElement(data.post);
                feed.insertBefore(postElement, feed.firstChild);
            }
            
            // Reset form
            tweetForm.reset();
            removeAllMedia();
        } catch (err) {
            console.error('Error creating tweet:', err);
            alert(err.message || 'Failed to post tweet. Please try again.');
        } finally {
            submitButton.disabled = false;
        }
    });
    
    // Search functionality
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();
        
        if (!query) {
            searchResults.style.display = 'none';
            return;
        }
        
        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
                const users = await response.json();
                
                searchResults.innerHTML = users.map(user => `
                    <div class="search-result" onclick="window.location.href='/profile?username=${user.username}'">
                        <img src="${user.profile_picture}" alt="" class="avatar">
                        <div>
                            <div class="user-name">${user.name}</div>
                            <div class="user-username">@${user.username}</div>
                        </div>
                    </div>
                `).join('');
                
                searchResults.style.display = users.length ? 'block' : 'none';
            } catch (error) {
                console.error('Error searching users:', error);
            }
        }, 300);
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
    
    async function updateUnreadCount() {
        try {
            const response = await fetch('/api/messages/unread-count');
            const data = await response.json();
            const badge = document.getElementById('unread-count');
            
            if (data.unread_count > 0) {
                badge.textContent = data.unread_count;
                badge.style.display = 'inline';
            } else {
                badge.style.display = 'none';
            }
        } catch (error) {
            console.error('Error updating unread count:', error);
        }
    }
    
    // Initialize
    getCurrentUser();
    loadPosts(1);
    loadSuggestedUsers();
    
    // Update unread count periodically
    setInterval(updateUnreadCount, 60000);
    
    // Setup infinite scroll
    window.addEventListener('scroll', () => {
        if (hasMorePosts && !loadingPosts && 
            window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100) {
            loadPosts(currentPage + 1);
        }
    });
});

// Global functions for post interactions
async function toggleLike(postId, button) {
    try {
        // Determine if we're liking or unliking based on current state
        const isCurrentlyLiked = button.classList.contains('liked');
        const endpoint = `/api/posts/${postId}/${isCurrentlyLiked ? 'unlike' : 'like'}`;
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to toggle like');
        }
        
        const data = await response.json();
        
        // Find all instances of this post (in feed and modal)
        const feedPost = document.querySelector(`.tweet[data-post-id="${postId}"]`);
        const modalPost = document.querySelector('#post-content .tweet');
        
        // Update like state in feed
        if (feedPost) {
            const feedLikeButton = feedPost.querySelector('.like-button');
            const feedCountElement = feedLikeButton.querySelector('.action-count');
            
            if (data.is_liked_by_current_user) {
                feedLikeButton.classList.add('liked');
            } else {
                feedLikeButton.classList.remove('liked');
            }
            
            if (feedCountElement) {
                feedCountElement.textContent = data.likes_count;
            }
        }
        
        // Update like state in modal if it's showing the same post
        if (modalPost && modalPost.closest('#post-content')) {
            const modalLikeButton = modalPost.querySelector('.like-button');
            const modalCountElement = modalLikeButton.querySelector('.action-count');
            
            if (data.is_liked_by_current_user) {
                modalLikeButton.classList.add('liked');
            } else {
                modalLikeButton.classList.remove('liked');
            }
            
            if (modalCountElement) {
                modalCountElement.textContent = data.likes_count;
            }
        }
    } catch (err) {
        console.error('Error toggling like:', err);
        alert('Failed to update like. Please try again.');
    }
}

function showComments(postId) {
    const modal = document.getElementById('comments-modal');
    const commentsList = document.getElementById('comments-list');
    const postContent = document.getElementById('post-content');
    const commentForm = document.querySelector('.comment-form');
    const commentTextarea = commentForm.querySelector('textarea');
    const submitButton = commentForm.querySelector('button');
    
    if (!modal || !commentsList || !postContent) return;
    
    // Fetch post details
    fetch(`/api/posts/${postId}`)
        .then(res => res.json())
        .then(post => {
            const showFollowButton = currentUser && post.author.username !== currentUser.username;
            
            postContent.innerHTML = `
                <div class="tweet" data-post-id="${post.id}">
                    <div class="tweet-header">
                        <div class="tweet-header-left">
                            <img src="${post.author.profile_picture || '/static/images/default-avatar.png'}" 
                                 alt="${post.author.username}" 
                                 class="tweet-avatar">
                            <div class="tweet-author">
                                <span class="tweet-name">${post.author.name}</span>
                                <span class="tweet-username">@${post.author.username}</span>
                            </div>
                        </div>
                        ${showFollowButton ? `
                            <button class="follow-button ${post.author.is_following ? 'following' : ''}"
                                    data-username="${post.author.username}">
                                <span class="follow-text">${post.author.is_following ? 'Following' : 'Follow'}</span>
                            </button>
                        ` : ''}
                    </div>
                    <div class="tweet-content">
                        <p>${post.content}</p>
                        ${post.media_urls ? renderMediaContent(post.media_urls) : ''}
                    </div>
                    <div class="tweet-actions">
                        <button class="action-button comment-button">
                            <i class="fas fa-comment"></i>
                            <span class="action-count">${post.comments_count || 0}</span>
                        </button>
                        <button class="action-button like-button ${post.is_liked_by_current_user ? 'liked' : ''}" 
                                onclick="toggleLike(${post.id}, this)">
                            <i class="fas fa-heart"></i>
                            <span class="action-count">${post.likes_count || 0}</span>
                        </button>
                    </div>
                </div>
            `;

            // Add follow button event listeners
            if (showFollowButton) {
                const followButton = postContent.querySelector('.follow-button');
                followButton.addEventListener('click', () => toggleFollow(post.author.username, followButton));
                
                if (post.author.is_following) {
                    followButton.addEventListener('mouseenter', () => {
                        if (followButton.classList.contains('following')) {
                            followButton.querySelector('.follow-text').textContent = 'Unfollow';
                        }
                    });
                    
                    followButton.addEventListener('mouseleave', () => {
                        if (followButton.classList.contains('following')) {
                            followButton.querySelector('.follow-text').textContent = 'Following';
                        }
                    });
                }
            }
        })
        .catch(err => {
            console.error('Error fetching post:', err);
            postContent.innerHTML = '<p>Error loading post</p>';
        });
    
    // Fetch comments
    fetch(`/api/posts/${postId}/comments`)
        .then(res => res.json())
        .then(comments => {
            if (comments.length === 0) {
                commentsList.innerHTML = '<p class="no-comments">No comments yet</p>';
                return;
            }
            
            commentsList.innerHTML = comments.map(comment => {
                const showFollowButton = currentUser && comment.author.username !== currentUser.username;
                
                return `
                    <div class="comment">
                        <div class="comment-header">
                            <div class="comment-header-left">
                                <img src="${comment.author.profile_picture || '/static/images/default-avatar.png'}" 
                                     alt="${comment.author.username}" 
                                     class="comment-avatar">
                                <div class="comment-author">
                                    <span class="comment-name">${comment.author.name}</span>
                                    <span class="comment-username">@${comment.author.username}</span>
                                </div>
                            </div>
                            ${showFollowButton ? `
                                <button class="follow-button comment-follow-button ${comment.author.is_following ? 'following' : ''}"
                                        data-username="${comment.author.username}">
                                    <span class="follow-text">${comment.author.is_following ? 'Following' : 'Follow'}</span>
                                </button>
                            ` : ''}
                        </div>
                        <div class="comment-content">
                            <p>${comment.content}</p>
                        </div>
                    </div>
                `;
            }).join('');

            // Add event listeners to all follow buttons in comments
            const followButtons = commentsList.querySelectorAll('.follow-button');
            followButtons.forEach(button => {
                const username = button.dataset.username;
                button.addEventListener('click', () => toggleFollow(username, button));
                
                if (button.classList.contains('following')) {
                    button.addEventListener('mouseenter', () => {
                        if (button.classList.contains('following')) {
                            button.querySelector('.follow-text').textContent = 'Unfollow';
                        }
                    });
                    
                    button.addEventListener('mouseleave', () => {
                        if (button.classList.contains('following')) {
                            button.querySelector('.follow-text').textContent = 'Following';
                        }
                    });
                }
            });
        })
        .catch(err => {
            console.error('Error fetching comments:', err);
            commentsList.innerHTML = '<p>Error loading comments</p>';
        });
    
    // Handle comment form
    commentTextarea.addEventListener('input', () => {
        submitButton.disabled = !commentTextarea.value.trim();
    });
    
    commentForm.onsubmit = async (e) => {
        e.preventDefault();
        const content = commentTextarea.value.trim();
        if (!content) return;
        
        try {
            const response = await fetch(`/api/posts/${postId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            });
            
            if (!response.ok) {
                throw new Error('Failed to post comment');
            }
            
            // Clear form and reload comments
            commentTextarea.value = '';
            submitButton.disabled = true;
            
            // Refresh comments
            const newCommentData = await response.json();
            const commentsResponse = await fetch(`/api/posts/${postId}/comments`);
            const comments = await commentsResponse.json();
            
            if (comments.length === 0) {
                commentsList.innerHTML = '<p class="no-comments">No comments yet</p>';
            } else {
                commentsList.innerHTML = comments.map(comment => `
                    <div class="comment">
                        <img src="${comment.author.profile_picture || '/static/images/default-avatar.png'}" 
                             alt="${comment.author.username}" 
                             class="comment-avatar">
                        <div class="comment-content">
                            <div class="comment-header">
                                <span class="comment-name">${comment.author.name}</span>
                                <span class="comment-username">@${comment.author.username}</span>
                            </div>
                            <p>${comment.content}</p>
                        </div>
                    </div>
                `).join('');
            }
            
            // Update comment count in the original post and in the modal
            const countElement = document.querySelector(`[onclick="showComments(${postId})"] .action-count`);
            if (countElement) {
                const newCount = parseInt(countElement.textContent || 0) + 1;
                countElement.textContent = newCount;
                // Update the count in the modal's post content
                const modalCountElement = document.querySelector('#post-content .action-button.comment-button .action-count');
                if (modalCountElement) {
                    modalCountElement.textContent = newCount;
                }
            }
        } catch (error) {
            console.error('Error posting comment:', error);
            alert('Failed to post comment. Please try again.');
        }
    };
    
    modal.style.display = 'block';
}

// Close modal when clicking the close button or outside the modal
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('comments-modal');
    const closeBtn = modal.querySelector('.close');
    
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }
    
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }
});

// Load suggested users
async function loadSuggestedUsers() {
    try {
        const response = await fetch('/api/users/suggested');
        const users = await response.json();
        
        const container = document.getElementById('suggested-users');
        container.innerHTML = '';
        
        if (users.length === 0) {
            container.innerHTML = '<p class="no-suggestions">No suggestions available</p>';
            return;
        }
        
        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'suggested-user';
            userElement.innerHTML = `
                <div class="suggested-user-left">
                    <img src="${user.profile_picture || '/static/images/default-avatar.png'}" 
                         alt="${user.username}" 
                         class="suggested-avatar">
                    <div class="suggested-user-info">
                        <span class="suggested-name">${user.name}</span>
                        <span class="suggested-username">@${user.username}</span>
                    </div>
                </div>
                <button class="follow-button ${user.is_following ? 'following' : ''}"
                        onclick="toggleFollow('${user.username}', this)">
                    <span class="follow-text">${user.is_following ? 'Following' : 'Follow'}</span>
                </button>
            `;
            
            // Add hover effect for unfollow
            const button = userElement.querySelector('.follow-button');
            const followText = button.querySelector('.follow-text');
            
            if (user.is_following) {
                button.addEventListener('mouseenter', () => {
                    if (button.classList.contains('following')) {
                        followText.textContent = 'Unfollow';
                    }
                });
                
                button.addEventListener('mouseleave', () => {
                    if (button.classList.contains('following')) {
                        followText.textContent = 'Following';
                    }
                });
            }
            
            container.appendChild(userElement);
        });
    } catch (error) {
        console.error('Error loading suggested users:', error);
    }
}

// Toggle follow function
async function toggleFollow(username, button) {
    try {
        const isFollowing = button.classList.contains('following');
        const endpoint = `/api/users/${username}/${isFollowing ? 'unfollow' : 'follow'}`;
        
        // Update button state immediately
        button.classList.toggle('following');
        const followText = button.querySelector('.follow-text');
        if (followText) {
            followText.textContent = isFollowing ? 'Follow' : 'Following';
        } else {
            button.textContent = isFollowing ? 'Follow' : 'Following';
        }
        
        // Update all other buttons for this user on the page
        const allUserButtons = document.querySelectorAll(`button[data-username="${username}"]`);
        allUserButtons.forEach(btn => {
            if (btn !== button) {
                btn.classList.toggle('following');
                const btnText = btn.querySelector('.follow-text');
                if (btnText) {
                    btnText.textContent = isFollowing ? 'Follow' : 'Following';
                } else {
                    btn.textContent = isFollowing ? 'Follow' : 'Following';
                }
            }
        });

        // Update counts in profile if they exist
        const followersCountElement = document.getElementById('followers-count');
        const followingCountElement = document.getElementById('following-count');
        
        if (followersCountElement || followingCountElement) {
            // If we're on a profile page, let the profile.js handle it
            if (typeof window.handleProfileFollowUpdate === 'function') {
                window.handleProfileFollowUpdate(username, isFollowing);
            }
        }
        
        const response = await fetch(endpoint, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to update follow status');
        }
        
        const data = await response.json();
        
        // Add hover effect for the new state
        if (!isFollowing) {
            const handleMouseEnter = () => {
                if (button.classList.contains('following')) {
                    const text = button.querySelector('.follow-text');
                    if (text) text.textContent = 'Unfollow';
                }
            };
            
            const handleMouseLeave = () => {
                if (button.classList.contains('following')) {
                    const text = button.querySelector('.follow-text');
                    if (text) text.textContent = 'Following';
                }
            };
            
            button.addEventListener('mouseenter', handleMouseEnter);
            button.addEventListener('mouseleave', handleMouseLeave);
        }
    } catch (error) {
        console.error('Error toggling follow:', error);
        // Revert button state on error
        button.classList.toggle('following');
        const followText = button.querySelector('.follow-text');
        if (followText) {
            followText.textContent = button.classList.contains('following') ? 'Following' : 'Follow';
        } else {
            button.textContent = button.classList.contains('following') ? 'Following' : 'Follow';
        }

        // Revert other buttons
        const allUserButtons = document.querySelectorAll(`button[data-username="${username}"]`);
        allUserButtons.forEach(btn => {
            if (btn !== button) {
                btn.classList.toggle('following');
                const btnText = btn.querySelector('.follow-text');
                if (btnText) {
                    btnText.textContent = !btn.classList.contains('following') ? 'Follow' : 'Following';
                } else {
                    btn.textContent = !btn.classList.contains('following') ? 'Follow' : 'Following';
                }
            }
        });

        // Revert counts in profile if they exist
        if (typeof window.handleProfileFollowUpdate === 'function') {
            window.handleProfileFollowUpdate(username, !isFollowing);
        }
    }
}

// Refresh suggestions
document.getElementById('refresh-suggestions').addEventListener('click', function() {
    this.classList.add('rotating');
    loadSuggestedUsers().then(() => {
        setTimeout(() => {
            this.classList.remove('rotating');
        }, 500);
    });
});

// Make functions globally available
window.toggleFollow = toggleFollow;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTweets();
    loadSuggestedUsers();
});

// Add function to show media in fullscreen
function showMediaFullscreen(mediaUrl) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.innerHTML = `
        <div class="modal-content" style="background: transparent; box-shadow: none; max-width: 90%; max-height: 90%;">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <img src="${mediaUrl}" alt="Full size image" style="max-width: 100%; max-height: 90vh; object-fit: contain;">
        </div>
    `;
    document.body.appendChild(modal);

    modal.onclick = function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    };
}