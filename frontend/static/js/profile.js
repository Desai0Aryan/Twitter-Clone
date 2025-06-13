document.addEventListener('DOMContentLoaded', function() {
    let currentUser = null;
    let profileUser = null;
    let currentPage = 1;
    let loadingPosts = false;
    let hasMorePosts = true;
    let currentTab = 'tweets';
    
    // Get query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');
    
    // Handle banner upload
    const editBannerBtn = document.getElementById('edit-banner-btn');
    const bannerInput = document.createElement('input');
    bannerInput.type = 'file';
    bannerInput.accept = 'image/*';
    bannerInput.style.display = 'none';
    document.body.appendChild(bannerInput);

    editBannerBtn.addEventListener('click', () => {
        bannerInput.click();
    });

    bannerInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append('banner', file);

            try {
                const response = await fetch('/api/users/me', {
                    method: 'PATCH',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Failed to update banner');
                }

                const data = await response.json();
                const bannerDiv = document.querySelector('.profile-banner');
                bannerDiv.style.backgroundImage = `url(${data.banner})`;
            } catch (error) {
                console.error('Error updating banner:', error);
            }
        }
    });

    // Handle avatar upload
    const editAvatarBtn = document.getElementById('edit-avatar-btn');
    const avatarInput = document.createElement('input');
    avatarInput.type = 'file';
    avatarInput.accept = 'image/*';
    avatarInput.style.display = 'none';
    document.body.appendChild(avatarInput);

    editAvatarBtn.addEventListener('click', () => {
        avatarInput.click();
    });

    avatarInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append('profile_picture', file);

            try {
                const response = await fetch('/api/users/me', {
                    method: 'PATCH',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Failed to update profile picture');
                }

                const data = await response.json();
                document.getElementById('profile-picture').src = data.profile_picture;
                // Also update the navbar avatar if it exists
                const navbarAvatar = document.getElementById('navbar-avatar');
                if (navbarAvatar) {
                    navbarAvatar.src = data.profile_picture;
                }
            } catch (error) {
                console.error('Error updating profile picture:', error);
            }
        }
    });

    // Create post element
    function createPostElement(post) {
        const postElement = document.createElement('div');
        postElement.className = 'tweet';
        postElement.dataset.postId = post.id;

        // Create media content HTML
        let mediaContent = '';
        if (post.media_urls && post.media_urls.length > 0) {
            if (post.media_urls.length === 1) {
                const media = post.media_urls[0];
                if (media.endsWith('.mp4')) {
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
                            <img src="${media}" alt="Post image">
                        </div>`;
                }
            } else {
                const gridClass = `grid-${Math.min(post.media_urls.length, 4)}`;
                mediaContent = `
                    <div class="media-grid ${gridClass}">
                        ${post.media_urls.slice(0, 4).map(media => `
                            <div class="media-item">
                                ${media.endsWith('.mp4') 
                                    ? `<video controls><source src="${media}" type="video/mp4"></video>`
                                    : `<img src="${media}" alt="Post image">`
                                }
                            </div>
                        `).join('')}
                    </div>`;
            }
        }

        // Check if the post author is not the current user
        const showFollowButton = currentUser && currentUser.username !== post.author.username;
        
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
                    <button class="follow-button tweet-follow-button ${post.author.is_following ? 'following' : ''}"
                            data-username="${post.author.username}">
                        <span class="follow-text">${post.author.is_following ? 'Following' : 'Follow'}</span>
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

        // Add event listeners for follow button if it exists
        if (showFollowButton) {
            const followButton = postElement.querySelector('.follow-button');
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

        return postElement;
    }

    // Toggle like function
    async function toggleLike(postId, button) {
        try {
            const action = button.classList.contains('liked') ? 'unlike' : 'like';
            const response = await fetch(`/api/posts/${postId}/${action}`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('Failed to toggle like');
            }
            
            const data = await response.json();
            button.classList.toggle('liked');
            button.querySelector('.action-count').textContent = data.likes_count;
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    }

    // Show comments function
    async function showComments(postId) {
        const modal = document.getElementById('comments-modal');
        const postContent = document.getElementById('post-content');
        const commentsList = document.getElementById('comments-list');
        
        try {
            // Get post details
            const postResponse = await fetch(`/api/posts/${postId}`);
            const post = await postResponse.json();
            
            // Get comments
            const commentsResponse = await fetch(`/api/posts/${postId}/comments`);
            const comments = await commentsResponse.json();
            
            // Display post
            postContent.innerHTML = '';
            postContent.appendChild(createPostElement(post));
            
            // Display comments
            commentsList.innerHTML = comments.map(comment => `
                <div class="comment">
                    <div class="comment-header">
                        <img src="${comment.author.profile_picture || '/static/images/default-avatar.png'}" 
                             alt="${comment.author.username}" 
                             class="comment-avatar">
                        <div class="comment-author">
                            <span class="comment-name">${comment.author.name}</span>
                            <span class="comment-username">@${comment.author.username}</span>
                        </div>
                    </div>
                    <div class="comment-content">
                        <p>${comment.content}</p>
                    </div>
                </div>
            `).join('');
            
            modal.style.display = 'block';
            
            // Handle comment form submission
            const commentForm = modal.querySelector('.comment-form');
            const commentTextarea = commentForm.querySelector('textarea');
            const submitButton = commentForm.querySelector('button');
            
            commentTextarea.value = '';
            submitButton.disabled = true;
            
            commentTextarea.oninput = () => {
                submitButton.disabled = !commentTextarea.value.trim();
            };
            
            commentForm.onsubmit = async (e) => {
                e.preventDefault();
                
                try {
                    const response = await fetch(`/api/posts/${postId}/comments`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            content: commentTextarea.value.trim()
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to post comment');
                    }
                    
                    const comment = await response.json();
                    
                    // Add new comment to list
                    const commentElement = document.createElement('div');
                    commentElement.className = 'comment';
                    commentElement.innerHTML = `
                        <div class="comment-header">
                            <img src="${comment.author.profile_picture || '/static/images/default-avatar.png'}" 
                                 alt="${comment.author.username}" 
                                 class="comment-avatar">
                            <div class="comment-author">
                                <span class="comment-name">${comment.author.name}</span>
                                <span class="comment-username">@${comment.author.username}</span>
                            </div>
                        </div>
                        <div class="comment-content">
                            <p>${comment.content}</p>
                        </div>
                    `;
                    commentsList.insertBefore(commentElement, commentsList.firstChild);
                    
                    // Update comment count
                    const countElement = postContent.querySelector('.comment-button .action-count');
                    countElement.textContent = parseInt(countElement.textContent) + 1;
                    
                    // Reset form
                    commentTextarea.value = '';
                    submitButton.disabled = true;
                } catch (error) {
                    console.error('Error posting comment:', error);
                }
            };
        } catch (error) {
            console.error('Error showing comments:', error);
        }
    }

    // Get current user info
    async function getCurrentUser() {
        try {
            const response = await fetch('/api/auth/me');
            if (!response.ok) {
                window.location.href = '/';
                return;
            }
            currentUser = await response.json();
            
            // Only load profile data if we don't have it yet
            if (!profileUser) {
            loadProfileData();
            }
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
    }
    
    // Function to update follow counts
    function updateFollowCounts(counts) {
        const followersCountElement = document.getElementById('followers-count');
        const followingCountElement = document.getElementById('following-count');
        
        if (followersCountElement && typeof counts.followers_count !== 'undefined') {
            followersCountElement.textContent = counts.followers_count;
            const statsLabel = followersCountElement.parentElement.querySelector('.stats-label');
            if (statsLabel) {
                statsLabel.textContent = counts.followers_count === 1 ? 'Follower' : 'Followers';
            }
            followersCountElement.parentElement.classList.add('count-updated');
            setTimeout(() => {
                followersCountElement.parentElement.classList.remove('count-updated');
            }, 300);
        }
        
        if (followingCountElement && typeof counts.following_count !== 'undefined') {
            followingCountElement.textContent = counts.following_count;
            followingCountElement.parentElement.classList.add('count-updated');
            setTimeout(() => {
                followingCountElement.parentElement.classList.remove('count-updated');
            }, 300);
        }
    }

    // Load profile data
    async function loadProfileData() {
        try {
            const response = await fetch(username ? `/api/users/${username}` : '/api/users/me');
            if (!response.ok) {
                throw new Error('Failed to load profile');
            }
            
            const newProfileData = await response.json();
            
            // If we already have profile data, preserve the follow state
            if (profileUser) {
                newProfileData.is_following = profileUser.is_following;
            }
            
            // Update profile information
            document.getElementById('profile-name').textContent = newProfileData.name;
            document.getElementById('profile-username').textContent = `@${newProfileData.username}`;
            document.getElementById('profile-bio').textContent = newProfileData.bio || '';
            
            // Update profile picture
            const profilePicture = document.getElementById('profile-picture');
            if (profilePicture) {
                profilePicture.src = newProfileData.profile_picture || '/static/images/default-avatar.png';
            }
            
            // Update banner
            const profileBanner = document.querySelector('.profile-banner');
            if (profileBanner) {
                if (newProfileData.banner) {
                    profileBanner.style.backgroundImage = `url(${newProfileData.banner})`;
                } else {
                    profileBanner.style.backgroundImage = '';
                }
            }
            
            // Show/hide edit buttons based on whether this is the current user's profile
            const isCurrentUser = !username || (currentUser && currentUser.username === username);
            const editProfileBtn = document.getElementById('edit-profile-btn');
            const followBtn = document.getElementById('follow-btn');
            const editAvatarBtn = document.getElementById('edit-avatar-btn');
            const editBannerBtn = document.getElementById('edit-banner-btn');
            
            if (editProfileBtn) editProfileBtn.style.display = isCurrentUser ? 'block' : 'none';
            if (followBtn) followBtn.style.display = isCurrentUser ? 'none' : 'block';
            if (editAvatarBtn) editAvatarBtn.style.display = isCurrentUser ? 'block' : 'none';
            if (editBannerBtn) editBannerBtn.style.display = isCurrentUser ? 'block' : 'none';
            
            // Update follow button state if not current user's profile
            if (!isCurrentUser && currentUser && followBtn) {
                followBtn.className = `follow-button ${newProfileData.is_following ? 'following' : ''}`;
                followBtn.innerHTML = `<span class="follow-text">${newProfileData.is_following ? 'Following' : 'Follow'}</span>`;
                followBtn.setAttribute('data-username', newProfileData.username);
                
                // Add hover effect for unfollow
                if (newProfileData.is_following) {
                    followBtn.addEventListener('mouseenter', () => {
                        if (followBtn.classList.contains('following')) {
                            followBtn.querySelector('.follow-text').textContent = 'Unfollow';
                        }
                    });
                    
                    followBtn.addEventListener('mouseleave', () => {
                        if (followBtn.classList.contains('following')) {
                            followBtn.querySelector('.follow-text').textContent = 'Following';
                        }
                    });
                }
            }
            
            // Only update counts if we don't have them yet
            if (!profileUser) {
                updateFollowCounts({
                    followers_count: newProfileData.followers_count,
                    following_count: newProfileData.following_count
                });
            }
            
            // Update the profile user object
            profileUser = newProfileData;
            
            // Load initial posts
            loadPosts();
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }
    
    // Load posts based on current tab
    async function loadPosts(page = 1) {
        if (loadingPosts || (!hasMorePosts && page > 1)) return;
        loadingPosts = true;
        
        try {
            let endpoint = `/api/users/${profileUser.username}/posts`;
            
            // Set the appropriate endpoint based on the current tab
            switch (currentTab) {
                case 'tweets':
                    endpoint = `/api/users/${profileUser.username}/posts?page=${page}`;
                    break;
                case 'replies':
                    endpoint = `/api/users/${profileUser.username}/replies?page=${page}`;
                    break;
                case 'media':
                    endpoint = `/api/users/${profileUser.username}/posts?media=true&page=${page}`;
                    break;
                case 'likes':
                endpoint = `/api/users/${profileUser.username}/likes?page=${page}`;
                    break;
            }
            
            const response = await fetch(endpoint);
            const data = await response.json();
            
            const posts = data.posts;
            hasMorePosts = data.has_next;
            
            const tweetFeed = document.getElementById('tweet-feed');
            
            // Clear feed if loading first page
            if (page === 1) {
                tweetFeed.innerHTML = '';
            }
            
            // Display posts
            posts.forEach(post => {
                const postElement = createPostElement(post);
                
                // Add reply context if it's a reply
                if (currentTab === 'replies' && post.reply) {
                    const replyContext = document.createElement('div');
                    replyContext.className = 'reply-context';
                    replyContext.innerHTML = `
                        <div class="reply-header">
                            <i class="fas fa-reply"></i>
                            <span>Replied to @${post.author.username}</span>
                        </div>
                        <div class="reply-content">
                            <p>${post.reply.content}</p>
                            <span class="reply-date">${formatDate(post.reply.created_at)}</span>
                        </div>
                    `;
                    postElement.insertBefore(replyContext, postElement.firstChild);
                }
                
                tweetFeed.appendChild(postElement);
            });
            
            // Show/hide load more button
            document.getElementById('load-more').style.display = hasMorePosts ? 'block' : 'none';
            
            // Show empty state if no posts
            if (posts.length === 0 && page === 1) {
                const emptyState = document.createElement('div');
                emptyState.className = 'empty-state';
                let emptyStateMessage = '';
                
                switch (currentTab) {
                    case 'tweets':
                        emptyStateMessage = 'No tweets yet';
                        break;
                    case 'replies':
                        emptyStateMessage = 'No replies yet';
                        break;
                    case 'media':
                        emptyStateMessage = 'No media tweets yet';
                        break;
                    case 'likes':
                        emptyStateMessage = 'No liked tweets yet';
                        break;
                }
                
                emptyState.innerHTML = `
                    <div class="empty-state-icon">
                        <i class="fas ${getEmptyStateIcon(currentTab)}"></i>
                    </div>
                    <p>${emptyStateMessage}</p>
                `;
                tweetFeed.appendChild(emptyState);
            }
            
        } catch (error) {
            console.error('Error loading posts:', error);
        } finally {
            loadingPosts = false;
        }
    }
    
    // Helper function to get empty state icon
    function getEmptyStateIcon(tab) {
        switch (tab) {
            case 'tweets':
                return 'fa-comment-slash';
            case 'replies':
                return 'fa-reply-all';
            case 'media':
                return 'fa-images';
            case 'likes':
                return 'fa-heart';
            default:
                return 'fa-comment-slash';
        }
    }
    
    // Helper function to format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        // Less than 1 minute
        if (diff < 60000) {
            return 'just now';
        }
        
        // Less than 1 hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes}m`;
        }
        
        // Less than 24 hours
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours}h`;
        }
        
        // Less than 7 days
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `${days}d`;
        }
        
        // More than 7 days
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }
    
    // Handle tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.tab-btn.active').classList.remove('active');
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            currentPage = 1;
            hasMorePosts = true;
            loadPosts(1);
        });
    });
    
    // Handle load more button
    document.getElementById('load-more').addEventListener('click', () => {
        if (!loadingPosts && hasMorePosts) {
            currentPage++;
            loadPosts(currentPage);
        }
    });
    
    // Handle follow/unfollow
    document.getElementById('follow-btn').addEventListener('click', async () => {
        try {
            const action = profileUser.is_following ? 'unfollow' : 'follow';
            const response = await fetch(`/api/users/${profileUser.username}/${action}`, {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error);
            }
            
            // Update UI
            profileUser.is_following = !profileUser.is_following;
            document.getElementById('follow-btn').textContent = profileUser.is_following ? 'Unfollow' : 'Follow';
            document.getElementById('followers-count').textContent = data.followers_count;
        } catch (error) {
            console.error('Error updating follow status:', error);
        }
    });
    
    // Handle profile editing
    const editProfileModal = document.getElementById('edit-profile-modal');
    const editProfileForm = document.getElementById('edit-profile-form');
    
    document.getElementById('edit-profile-btn').addEventListener('click', () => {
        // Pre-fill form
        document.getElementById('edit-name').value = profileUser.name;
        document.getElementById('edit-bio').value = profileUser.bio || '';
        editProfileModal.style.display = 'block';
    });
    
    // Close modal when clicking the close button or outside the modal
    document.querySelector('.close').addEventListener('click', () => {
        editProfileModal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === editProfileModal) {
            editProfileModal.style.display = 'none';
        }
    });
    
    editProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const response = await fetch('/api/users/me', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: document.getElementById('edit-name').value,
                    bio: document.getElementById('edit-bio').value
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update profile');
            }
            
            // Close modal and reload profile
            editProfileModal.style.display = 'none';
            loadProfileData();
        } catch (error) {
            console.error('Error updating profile:', error);
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

    // Handle search
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    let searchTimeout;

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();
        
        if (query) {
            searchTimeout = setTimeout(async () => {
                try {
                    const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
                    const users = await response.json();
                    
                    searchResults.innerHTML = '';
                    if (users.length === 0) {
                        searchResults.innerHTML = '<p class="no-results">No users found</p>';
                        return;
                    }
                    
                    users.forEach(user => {
                        const userElement = document.createElement('div');
                        userElement.className = 'search-result';
                        userElement.innerHTML = `
                            <a href="/profile?username=${user.username}" class="user-link">
                                <img src="${user.profile_picture}" alt="${user.username}" class="result-avatar">
                                <div class="result-user-info">
                                    <span class="result-name">${user.name}</span>
                                    <span class="result-username">@${user.username}</span>
                                </div>
                            </a>
                        `;
                        searchResults.appendChild(userElement);
                    });
                    
                    searchResults.style.display = 'block';
                } catch (error) {
                    console.error('Error searching users:', error);
                }
            }, 300);
        } else {
            searchResults.innerHTML = '';
            searchResults.style.display = 'none';
        }
    });

    // Hide search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });

    // Toggle follow function
    async function toggleFollow(username, button) {
        try {
            const isFollowing = button.classList.contains('following');
            const action = isFollowing ? 'unfollow' : 'follow';
            
            // Get current counts before any changes
            const followersCountElement = document.getElementById('followers-count');
            const followingCountElement = document.getElementById('following-count');
            const currentFollowersCount = followersCountElement ? parseInt(followersCountElement.textContent || '0') : 0;
            const currentFollowingCount = followingCountElement ? parseInt(followingCountElement.textContent || '0') : 0;
            
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
            
            // Update counts immediately
            if (profileUser) {
                const newCounts = {
                    followers_count: currentFollowersCount + (isFollowing ? -1 : 1),
                    following_count: currentFollowingCount + (isFollowing ? -1 : 1)
                };
                
                if (profileUser.username === username) {
                    updateFollowCounts({
                        followers_count: newCounts.followers_count,
                        following_count: profileUser.following_count
                    });
                    profileUser.followers_count = newCounts.followers_count;
                }
                
                if (currentUser && currentUser.username === profileUser.username) {
                    updateFollowCounts({
                        followers_count: profileUser.followers_count,
                        following_count: newCounts.following_count
                    });
                    profileUser.following_count = newCounts.following_count;
                }
            }
            
            // Make the API call
            const response = await fetch(`/api/users/${username}/${action}`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('Failed to update follow status');
            }
            
            const data = await response.json();
            
            // Update the profile user object with the server data
            if (profileUser) {
                if (profileUser.username === username) {
                    profileUser.followers_count = data.followers_count;
                    profileUser.is_following = !isFollowing;
                }
                if (currentUser && currentUser.username === profileUser.username) {
                    profileUser.following_count = data.following_count;
                }
            }
            
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
            
            // Revert button state
            button.classList.toggle('following');
            const followText = button.querySelector('.follow-text');
            if (followText) {
                followText.textContent = !button.classList.contains('following') ? 'Follow' : 'Following';
            } else {
                button.textContent = !button.classList.contains('following') ? 'Follow' : 'Following';
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
            
            // Revert counts
            if (profileUser) {
                if (profileUser.username === username) {
                    updateFollowCounts({
                        followers_count: currentFollowersCount,
                        following_count: profileUser.following_count
                    });
                    profileUser.followers_count = currentFollowersCount;
                    profileUser.is_following = isFollowing;
                }
                
                if (currentUser && currentUser.username === profileUser.username) {
                    updateFollowCounts({
                        followers_count: profileUser.followers_count,
                        following_count: currentFollowingCount
                    });
                    profileUser.following_count = currentFollowingCount;
                }
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

    // Handle profile follow updates from other pages
    function handleProfileFollowUpdate(username, isFollowing) {
        const followersCountElement = document.getElementById('followers-count');
        const followingCountElement = document.getElementById('following-count');
        
        // If we're on the profile page of the user being followed/unfollowed
        if (profileUser && username === profileUser.username) {
            const followersCount = parseInt(followersCountElement.textContent);
            updateFollowCounts({
                followers_count: isFollowing ? followersCount + 1 : followersCount - 1,
                following_count: profileUser.following_count
            });
        }
        
        // If we're on the profile page of the current user
        if (currentUser && username === currentUser.username) {
            const followingCount = parseInt(followingCountElement.textContent);
            updateFollowCounts({
                followers_count: profileUser.followers_count,
                following_count: isFollowing ? followingCount + 1 : followingCount - 1
            });
        }
    }

    // Make functions globally available
    window.handleProfileFollowUpdate = handleProfileFollowUpdate;
    window.toggleFollow = toggleFollow;
    window.toggleLike = toggleLike;
    window.showComments = showComments;
    
    // Initialize
    getCurrentUser().then(() => {
        loadProfileData().then(() => {
            loadPosts();
            loadSuggestedUsers();
        });
    });
});