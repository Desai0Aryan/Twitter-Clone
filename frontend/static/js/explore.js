let currentUser = null;
let currentPage = 1;
let loadingPosts = false;
let hasMorePosts = true;
let currentCategory = 'for-you';

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
    } catch (error) {
        console.error('Error fetching current user:', error);
    }
}

// Load explore feed
async function loadExploreFeed(page = 1) {
    if (loadingPosts) return;
    loadingPosts = true;
    
    try {
        const response = await fetch(`/api/explore?page=${page}&category=${currentCategory}`);
        if (!response.ok) {
            throw new Error('Failed to load posts');
        }
        
        const data = await response.json();
        const feed = document.getElementById('explore-feed');
        
        if (page === 1) {
            feed.innerHTML = '';
        }
        
        data.posts.forEach(post => {
            const postElement = createPostElement(post);
            feed.appendChild(postElement);
        });
        
        hasMorePosts = data.has_next;
        currentPage = page;
    } catch (error) {
        console.error('Error loading explore feed:', error);
    } finally {
        loadingPosts = false;
    }
}

// Load trending topics
async function loadTrendingTopics() {
    try {
        const response = await fetch('/api/explore/trending');
        if (!response.ok) {
            throw new Error('Failed to load trending topics');
        }
        
        const topics = await response.json();
        const container = document.getElementById('trending-topics');
        
        container.innerHTML = topics.map(topic => `
            <div class="trending-topic">
                <span class="topic-tag">${topic.tag}</span>
                <span class="topic-count">${topic.count} tweets</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading trending topics:', error);
    }
}

// Handle category switching
document.querySelectorAll('.category').forEach(category => {
    category.addEventListener('click', () => {
        document.querySelector('.category.active').classList.remove('active');
        category.classList.add('active');
        currentCategory = category.dataset.category;
        currentPage = 1;
        hasMorePosts = true;
        loadExploreFeed(1);
        if (currentCategory === 'trending') {
            loadTrendingTopics();
        }
    });
});

// Handle search
const searchInput = document.getElementById('explore-search');
let searchTimeout;

searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const query = searchInput.value.trim();
        if (query) {
            currentCategory = 'search';
            currentPage = 1;
            hasMorePosts = true;
            loadExploreFeed(1);
        }
    }, 300);
});

// Load more posts on scroll
window.addEventListener('scroll', () => {
    if (hasMorePosts && !loadingPosts &&
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1000) {
        loadExploreFeed(currentPage + 1);
    }
});

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    getCurrentUser();
    loadExploreFeed(1);
    loadSuggestedUsers();
}); 