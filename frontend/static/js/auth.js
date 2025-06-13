document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    // Login form handling
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorElement = document.getElementById('login-error');
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: e.target.username.value,
                        password: e.target.password.value,
                    }),
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Login failed');
                }
                
                // Redirect to feed on successful login
                window.location.href = '/feed';
            } catch (error) {
                errorElement.textContent = error.message;
            }
        });
    }
    
    // Register form handling
    if (registerForm) {
        const usernameInput = document.getElementById('username');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirm-password');
        const errorElement = document.getElementById('register-error');
        
        // Username availability check
        let usernameTimeout;
        usernameInput.addEventListener('input', () => {
            clearTimeout(usernameTimeout);
            const username = usernameInput.value;
            const statusElement = document.getElementById('username-status');
            
            if (username.length < 3) {
                statusElement.textContent = '';
                return;
            }
            
            usernameTimeout = setTimeout(async () => {
                try {
                    const response = await fetch(`/api/auth/check-username/${username}`);
                    const data = await response.json();
                    
                    statusElement.textContent = data.available ? '✓ Username is available' : '✗ Username is taken';
                    statusElement.className = `input-status ${data.available ? 'available' : 'taken'}`;
                } catch (error) {
                    console.error('Error checking username:', error);
                }
            }, 500);
        });
        
        // Email availability check
        let emailTimeout;
        emailInput.addEventListener('input', () => {
            clearTimeout(emailTimeout);
            const email = emailInput.value;
            const statusElement = document.getElementById('email-status');
            
            if (!email.includes('@')) {
                statusElement.textContent = '';
                return;
            }
            
            emailTimeout = setTimeout(async () => {
                try {
                    const response = await fetch(`/api/auth/check-email/${email}`);
                    const data = await response.json();
                    
                    statusElement.textContent = data.available ? '✓ Email is available' : '✗ Email is taken';
                    statusElement.className = `input-status ${data.available ? 'available' : 'taken'}`;
                } catch (error) {
                    console.error('Error checking email:', error);
                }
            }, 500);
        });
        
        // Password strength checker
        function checkPasswordStrength(password) {
            let strength = 0;
            if (password.length >= 8) strength++;
            if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
            if (password.match(/[0-9]/)) strength++;
            return strength;
        }
        
        passwordInput.addEventListener('input', () => {
            const strength = checkPasswordStrength(passwordInput.value);
            const strengthBar = document.querySelector('.password-strength-bar');
            
            if (strengthBar) {
                strengthBar.className = 'password-strength-bar';
                if (strength === 1) strengthBar.classList.add('strength-weak');
                else if (strength === 2) strengthBar.classList.add('strength-medium');
                else if (strength === 3) strengthBar.classList.add('strength-strong');
            }
        });
        
        // Form submission
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Validate password match
            if (passwordInput.value !== confirmPasswordInput.value) {
                errorElement.textContent = 'Passwords do not match';
                return;
            }
            
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: usernameInput.value,
                        email: emailInput.value,
                        password: passwordInput.value,
                    }),
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Registration failed');
                }
                
                // Redirect to feed on successful registration
                window.location.href = '/feed';
            } catch (error) {
                errorElement.textContent = error.message;
            }
        });
    }
});