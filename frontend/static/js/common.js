// Common functionality for all pages
document.addEventListener('DOMContentLoaded', function() {
    // Logout handling
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/auth/logout');
                if (response.ok) {
                    window.location.href = '/';
                } else {
                    console.error('Logout failed');
                }
            } catch (error) {
                console.error('Error logging out:', error);
            }
        });
    }
}); 