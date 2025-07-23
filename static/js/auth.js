// auth.js
// Form submission handlers for login and signup pages

document.addEventListener('DOMContentLoaded', () => {
    // Handle login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = loginForm.querySelector('#email').value.trim();
            const password = loginForm.querySelector('#password').value.trim();
            
            // Client-side validation
            if (!validateEmail(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }
            if (!validatePassword(password)) {
                showNotification('Password must be at least 6 characters long', 'error');
                return;
            }
            
            // Show loading state
            const btn = loginForm.querySelector('.btn');
            const btnText = btn.querySelector('.btn-text');
            const btnLoader = btn.querySelector('.btn-loader');
            btn.classList.add('loading');
            btnText.style.opacity = '0';
            btnLoader.style.opacity = '1';
            
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showNotification(result.message, 'success');
                    // Redirect to dashboard after a short delay
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 1000);
                } else {
                    showNotification(result.message, 'error');
                }
            } catch (error) {
                showNotification('Error during login. Please try again.', 'error');
            } finally {
                // Hide loading state
                btn.classList.remove('loading');
                btnText.style.opacity = '1';
                btnLoader.style.opacity = '0';
            }
        });
    }
    
    // Handle signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = signupForm.querySelector('#name').value.trim();
            const email = signupForm.querySelector('#email').value.trim();
            const password = signupForm.querySelector('#password').value.trim();
            
            // Client-side validation
            if (!name) {
                showNotification('Please enter your full name', 'error');
                return;
            }
            if (!validateEmail(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }
            if (!validatePassword(password)) {
                showNotification('Password must be at least 6 characters long', 'error');
                return;
            }
            
            // Show loading state
            const btn = signupForm.querySelector('.btn');
            const btnText = btn.querySelector('.btn-text');
            const btnLoader = btn.querySelector('.btn-loader');
            btn.classList.add('loading');
            btnText.style.opacity = '0';
            btnLoader.style.opacity = '1';
            
            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email, password })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showNotification(result.message, 'success');
                    // Redirect to login page after a short delay
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 1000);
                } else {
                    showNotification(result.message, 'error');
                }
            } catch (error) {
                showNotification('Error during registration. Please try again.', 'error');
            } finally {
                // Hide loading state
                btn.classList.remove('loading');
                btnText.style.opacity = '1';
                btnLoader.style.opacity = '0';
            }
        });
    }
});