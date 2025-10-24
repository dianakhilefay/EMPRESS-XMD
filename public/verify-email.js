// ===================================
// Email Verification JavaScript
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

  // Get email from session storage
  const pendingEmail = sessionStorage.getItem('pendingVerificationEmail');
  const pendingUsername = sessionStorage.getItem('pendingVerificationUsername');
  
  if (!pendingEmail || !pendingUsername) {
    // No pending verification, redirect to register
    window.location.href = '/register';
    return;
  }

  // Update subtitle with email
  const subtitle = document.getElementById('verifySubtitle');
  if (subtitle) {
    subtitle.textContent = `Enter the 6-digit code sent to ${pendingEmail}`;
  }

  // Verify Email Form Handler
  const verifyForm = document.getElementById('verifyForm');
  const verifyBtn = document.getElementById('verifyBtn');
  const statusDiv = document.getElementById('verifyStatus');
  const resendBtn = document.getElementById('resendBtn');
  const verificationCodeInput = document.getElementById('verificationCode');

  // Auto-format verification code input
  verificationCodeInput.addEventListener('input', function(e) {
    this.value = this.value.replace(/[^0-9]/g, '').substring(0, 6);
  });

  // Form submission
  verifyForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const verificationCode = verificationCodeInput.value;

    // Validate input
    if (!verificationCode || verificationCode.length !== 6) {
      showStatus(statusDiv, '❌ Please enter a valid 6-digit code', 'error');
      return;
    }

    // Disable button and show loading
    verifyBtn.disabled = true;
    verifyBtn.classList.add('loading');
    verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Verifying...</span>';

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: pendingEmail,
          username: pendingUsername,
          verificationCode 
        })
      });

      const data = await response.json();

      if (response.ok) {
        showStatus(statusDiv, '✅ Email verified successfully! Redirecting to login...', 'success');
        
        // Clear session storage
        sessionStorage.removeItem('pendingVerificationEmail');
        sessionStorage.removeItem('pendingVerificationUsername');
        
        // Redirect to login after short delay
        setTimeout(() => {
          window.location.href = '/login?verified=true';
        }, 2000);
      } else {
        showStatus(statusDiv, `❌ ${data.error || 'Verification failed'}`, 'error');
        verifyBtn.disabled = false;
        verifyBtn.classList.remove('loading');
        verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Verify Email</span>';
      }
    } catch (error) {
      console.error('Verification error:', error);
      showStatus(statusDiv, '❌ Network error. Please try again.', 'error');
      verifyBtn.disabled = false;
      verifyBtn.classList.remove('loading');
      verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Verify Email</span>';
    }
  });

  // Resend code handler
  resendBtn.addEventListener('click', async function() {
    resendBtn.disabled = true;
    resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: pendingEmail,
          username: pendingUsername
        })
      });

      const data = await response.json();

      if (response.ok) {
        showStatus(statusDiv, '✅ New verification code sent to your email', 'success');
        
        // Start cooldown
        let countdown = 60;
        const interval = setInterval(() => {
          countdown--;
          resendBtn.innerHTML = `<i class="fas fa-clock"></i> Resend in ${countdown}s`;
          if (countdown <= 0) {
            clearInterval(interval);
            resendBtn.disabled = false;
            resendBtn.innerHTML = '<i class="fas fa-redo"></i> Resend Code';
          }
        }, 1000);
      } else {
        showStatus(statusDiv, `❌ ${data.error || 'Failed to resend code'}`, 'error');
        resendBtn.disabled = false;
        resendBtn.innerHTML = '<i class="fas fa-redo"></i> Resend Code';
      }
    } catch (error) {
      console.error('Resend error:', error);
      showStatus(statusDiv, '❌ Network error. Please try again.', 'error');
      resendBtn.disabled = false;
      resendBtn.innerHTML = '<i class="fas fa-redo"></i> Resend Code';
    }
  });
});

// Show status message
function showStatus(element, message, type) {
  if (!element) return;
  
  element.textContent = message;
  element.className = 'status-message';
  element.classList.add(type === 'error' ? 'status-error' : 'status-success');
  element.style.display = 'block';
  
  // Auto-hide after 5 seconds for success messages
  if (type === 'success') {
    setTimeout(() => {
      element.style.display = 'none';
    }, 5000);
  }
}

// Create particles animation
function createParticles() {
  const particlesContainer = document.getElementById('particles');
  if (!particlesContainer) return;

  const particleCount = 50;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    const size = Math.random() * 4 + 1;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    
    const duration = Math.random() * 20 + 10;
    particle.style.animationDuration = duration + 's';
    
    const delay = Math.random() * 5;
    particle.style.animationDelay = delay + 's';
    
    particlesContainer.appendChild(particle);
  }
}
