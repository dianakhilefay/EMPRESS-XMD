// ===================================
// Auth Page JavaScript
// ===================================

document.addEventListener("DOMContentLoaded", function() {
  // Set current year
  const yearElement = document.getElementById('year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // Mobile navigation toggle
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.querySelector('.nav-links');
  
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      navToggle.innerHTML = navLinks.classList.contains('active') ?
        '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
    });

    // Close mobile menu when clicking on links
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        navToggle.innerHTML = '<i class="fas fa-bars"></i>';
      });
    });
  }

  // Create particles
  createParticles();

  // Login Form Handler
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    // Toggle password visibility
    if (togglePassword && passwordInput) {
      togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        const icon = this.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
      });
    }

    // Form submission
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const keepSignedIn = document.getElementById('keepSignedIn').checked;
      const statusDiv = document.getElementById('loginStatus');
      const loginBtn = document.getElementById('loginBtn');

      // Validate input
      if (!username || !password) {
        showStatus(statusDiv, '❌ Please fill in all fields', 'error');
        return;
      }

      // Disable button and show loading
      loginBtn.disabled = true;
      loginBtn.classList.add('loading');
      loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Signing in...</span>';

      try {
        // TODO: Replace with actual API call
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password, keepSignedIn })
        });

        const data = await response.json();

        if (response.ok) {
          showStatus(statusDiv, '✅ Login successful! Redirecting...', 'success');
          
          // Store auth token if provided
          if (data.token) {
            if (keepSignedIn) {
              localStorage.setItem('authToken', data.token);
            } else {
              sessionStorage.setItem('authToken', data.token);
            }
          }
          
          // Redirect after short delay
          setTimeout(() => {
            window.location.href = data.redirectUrl || '/dashboard';
          }, 1500);
        } else if (data.requiresVerification) {
          // User needs to verify email
          showStatus(statusDiv, `❌ ${data.error || 'Email not verified'}`, 'error');
          
          // Store email and username for verification page
          if (data.email && data.username) {
            sessionStorage.setItem('pendingVerificationEmail', data.email);
            sessionStorage.setItem('pendingVerificationUsername', data.username);
          }
          
          loginBtn.disabled = false;
          loginBtn.classList.remove('loading');
          loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>Sign In</span>';
          
          // Show verification link
          setTimeout(() => {
            const verifyLink = document.createElement('a');
            verifyLink.href = '/verify-email';
            verifyLink.textContent = 'Click here to verify your email';
            verifyLink.style.display = 'block';
            verifyLink.style.marginTop = '10px';
            verifyLink.style.color = 'var(--primary)';
            verifyLink.style.textDecoration = 'underline';
            statusDiv.appendChild(verifyLink);
          }, 500);
        } else {
          showStatus(statusDiv, `❌ ${data.error || 'Login failed'}`, 'error');
          loginBtn.disabled = false;
          loginBtn.classList.remove('loading');
          loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>Sign In</span>';
        }
      } catch (error) {
        console.error('Login error:', error);
        showStatus(statusDiv, '❌ Network error. Please try again.', 'error');
        loginBtn.disabled = false;
        loginBtn.classList.remove('loading');
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>Sign In</span>';
      }
    });
  }

  // Register Form Handler
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    // Show referral notice if referral code is in URL
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('ref');
    if (referralCode) {
      const referralNotice = document.getElementById('referralNotice');
      const referralNoticeText = document.getElementById('referralNoticeText');
      if (referralNotice && referralNoticeText) {
        referralNoticeText.textContent = `Registering with referral code: ${referralCode}`;
        referralNotice.style.display = 'block';
      }
    }
    
    // Toggle password visibility
    if (togglePassword && passwordInput) {
      togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        const icon = this.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
      });
    }

    if (toggleConfirmPassword && confirmPasswordInput) {
      toggleConfirmPassword.addEventListener('click', function() {
        const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        confirmPasswordInput.setAttribute('type', type);
        
        const icon = this.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
      });
    }

    // Username validation
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
      usernameInput.addEventListener('input', function() {
        const value = this.value;
        const hint = this.nextElementSibling;
        
        if (value.length > 0 && value.length < 6) {
          this.classList.add('invalid');
          if (hint) hint.style.color = 'var(--error)';
        } else if (value.length >= 6) {
          this.classList.remove('invalid');
          this.classList.add('valid');
          if (hint) hint.style.color = 'var(--success)';
        } else {
          this.classList.remove('invalid', 'valid');
          if (hint) hint.style.color = '';
        }
      });
    }

    // Password match validation
    if (confirmPasswordInput) {
      confirmPasswordInput.addEventListener('input', function() {
        if (this.value && passwordInput.value) {
          if (this.value === passwordInput.value) {
            this.classList.remove('invalid');
            this.classList.add('valid');
          } else {
            this.classList.remove('valid');
            this.classList.add('invalid');
          }
        }
      });
    }

    // Form submission
    registerForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const agreeTerms = document.getElementById('agreeTerms').checked;
      const statusDiv = document.getElementById('registerStatus');
      const registerBtn = document.getElementById('registerBtn');

      // Validate input
      if (!email || !username || !password || !confirmPassword) {
        showStatus(statusDiv, '❌ Please fill in all fields', 'error');
        return;
      }

      if (username.length < 6) {
        showStatus(statusDiv, '❌ Username must be at least 6 characters', 'error');
        return;
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showStatus(statusDiv, '❌ Username can only contain letters, numbers and underscores', 'error');
        return;
      }

      if (password.length < 8) {
        showStatus(statusDiv, '❌ Password must be at least 8 characters', 'error');
        return;
      }

      if (password !== confirmPassword) {
        showStatus(statusDiv, '❌ Passwords do not match', 'error');
        return;
      }

      if (!agreeTerms) {
        showStatus(statusDiv, '❌ Please agree to the Terms of Service', 'error');
        return;
      }

      // Disable button and show loading
      registerBtn.disabled = true;
      registerBtn.classList.add('loading');
      registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Creating account...</span>';

      try {
        // Get referral code from URL if present
        const urlParams = new URLSearchParams(window.location.search);
        const referralCode = urlParams.get('ref');

        // TODO: Replace with actual API call
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email, 
            username, 
            password,
            referralCode: referralCode || undefined
          })
        });

        const data = await response.json();

        if (response.ok) {
          if (data.requiresVerification) {
            showStatus(statusDiv, '✅ Account created! Redirecting to verification...', 'success');
            
            // Store email and username in session storage for verification page
            sessionStorage.setItem('pendingVerificationEmail', email);
            sessionStorage.setItem('pendingVerificationUsername', username);
            
            // Redirect to verification page after short delay
            setTimeout(() => {
              window.location.href = '/verify-email';
            }, 1500);
          } else {
            showStatus(statusDiv, '✅ Account created! Redirecting to login...', 'success');
            
            // Redirect to login page after short delay
            setTimeout(() => {
              window.location.href = '/login';
            }, 1500);
          }
        } else {
          showStatus(statusDiv, `❌ ${data.error || 'Registration failed'}`, 'error');
          registerBtn.disabled = false;
          registerBtn.classList.remove('loading');
          registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> <span>Create Account</span>';
        }
      } catch (error) {
        console.error('Registration error:', error);
        showStatus(statusDiv, '❌ Network error. Please try again.', 'error');
        registerBtn.disabled = false;
        registerBtn.classList.remove('loading');
        registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> <span>Create Account</span>';
      }
    });
  }
});

// Helper function to show status messages
function showStatus(element, message, type) {
  if (!element) return;
  
  element.textContent = message;
  element.className = `form-status ${type}`;
  element.style.display = 'block';
  
  // Auto-hide success messages after 5 seconds
  if (type === 'success') {
    setTimeout(() => {
      element.style.display = 'none';
    }, 5000);
  }
}

// Create particle effect
function createParticles() {
  const particlesContainer = document.getElementById('particles');
  if (!particlesContainer) return;

  const particleCount = window.innerWidth > 768 ? 50 : 30;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Random position
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    
    // Random size
    const size = Math.random() * 4 + 2;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    
    // Random animation duration
    particle.style.animationDuration = (Math.random() * 20 + 10) + 's';
    particle.style.animationDelay = (Math.random() * 5) + 's';
    
    particlesContainer.appendChild(particle);
  }
}

// Add button hover effects
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-2px)';
    });
    
    button.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
    });
  });

  // Social login button handlers
  const googleBtns = document.querySelectorAll('.google-btn');
  const githubBtns = document.querySelectorAll('.github-btn');

  googleBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      window.location.href = '/api/auth/google';
    });
  });

  githubBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      window.location.href = '/api/auth/github';
    });
  });
});
