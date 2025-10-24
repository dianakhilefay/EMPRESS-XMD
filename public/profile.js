// ===================================
// Profile JavaScript
// ===================================

document.addEventListener("DOMContentLoaded", function() {
  // Set current year
  const yearElement = document.getElementById('year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // Hide splash screen after load
  setTimeout(() => {
    const splashScreen = document.getElementById('splashScreen');
    if (splashScreen) {
      splashScreen.classList.add('hidden');
    }
  }, 1500);

  // Create particles
  createParticles();

  // Load user data
  loadUserData();

  // Setup event listeners
  setupEventListeners();
});

// Load user data
async function loadUserData() {
  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    if (!token) {
      window.location.href = '/login';
      return;
    }

    const response = await fetch('/api/user/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid, redirect to login
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        window.location.href = '/login';
        return;
      }
      throw new Error('Failed to load user data');
    }

    const data = await response.json();

    if (data.success) {
      const userData = data.profile;

      // Update UI with user data
      document.getElementById('profileName').textContent = userData.username;
      document.getElementById('profileEmail').textContent = userData.email;
      document.getElementById('infoUsername').textContent = userData.username;
      document.getElementById('infoEmail').textContent = userData.email;
      document.getElementById('infoAccountType').textContent = userData.accountType.charAt(0).toUpperCase() + userData.accountType.slice(1);
      
      const profileBadge = document.getElementById('profileBadge');
      if (userData.accountType === 'premium') {
        profileBadge.classList.add('premium');
        profileBadge.innerHTML = '<i class="fas fa-crown"></i><span>Premium Account</span>';
      }
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Email form
  const emailForm = document.getElementById('emailForm');
  if (emailForm) {
    emailForm.addEventListener('submit', handleEmailChange);
  }

  // Password form
  const passwordForm = document.getElementById('passwordForm');
  if (passwordForm) {
    passwordForm.addEventListener('submit', handlePasswordChange);
  }

  // Password validation
  const newPassword = document.getElementById('newPassword');
  const confirmPassword = document.getElementById('confirmPassword');
  
  if (newPassword && confirmPassword) {
    newPassword.addEventListener('input', validatePassword);
    confirmPassword.addEventListener('input', validatePassword);
  }

  // Delete account modal
  const deleteAccountBtn = document.getElementById('deleteAccountBtn');
  const deleteAccountModal = document.getElementById('deleteAccountModal');
  const closeDeleteModal = document.getElementById('closeDeleteModal');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', () => {
      deleteAccountModal.classList.add('active');
    });
  }

  if (closeDeleteModal) {
    closeDeleteModal.addEventListener('click', () => {
      deleteAccountModal.classList.remove('active');
      document.getElementById('deletePassword').value = '';
      document.getElementById('deleteStatus').style.display = 'none';
    });
  }

  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', () => {
      deleteAccountModal.classList.remove('active');
      document.getElementById('deletePassword').value = '';
      document.getElementById('deleteStatus').style.display = 'none';
    });
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', handleAccountDeletion);
  }

  // Close modal on outside click
  if (deleteAccountModal) {
    deleteAccountModal.addEventListener('click', (e) => {
      if (e.target === deleteAccountModal) {
        deleteAccountModal.classList.remove('active');
        document.getElementById('deletePassword').value = '';
        document.getElementById('deleteStatus').style.display = 'none';
      }
    });
  }
}

// Validate password
function validatePassword() {
  const newPassword = document.getElementById('newPassword');
  const confirmPassword = document.getElementById('confirmPassword');
  const reqLength = document.getElementById('req-length');
  const reqMatch = document.getElementById('req-match');

  if (!newPassword || !confirmPassword) return;

  // Check length
  if (newPassword.value.length >= 8) {
    reqLength.classList.add('valid');
  } else {
    reqLength.classList.remove('valid');
  }

  // Check match
  if (confirmPassword.value && newPassword.value === confirmPassword.value) {
    reqMatch.classList.add('valid');
  } else {
    reqMatch.classList.remove('valid');
  }
}

// Handle email change
async function handleEmailChange(e) {
  e.preventDefault();

  const currentPassword = document.getElementById('currentPassword');
  const newEmail = document.getElementById('newEmail');
  const statusDiv = document.getElementById('emailStatus');
  const submitBtn = e.target.querySelector('button[type="submit"]');

  // Validate fields
  if (!currentPassword.value || !newEmail.value) {
    showStatus(statusDiv, 'Please fill in all fields', 'error');
    return;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail.value)) {
    showStatus(statusDiv, 'Please enter a valid email address', 'error');
    return;
  }

  // Disable button and show loading
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');

  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    const response = await fetch('/api/user/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword: currentPassword.value,
        newEmail: newEmail.value
      })
    });

    const data = await response.json();

    if (data.success) {
      showStatus(statusDiv, 'Email updated successfully!', 'success');
      
      // Update displayed email
      document.getElementById('profileEmail').textContent = newEmail.value;
      document.getElementById('infoEmail').textContent = newEmail.value;
      
      // Clear form
      currentPassword.value = '';
      newEmail.value = '';
    } else {
      showStatus(statusDiv, data.error || 'Failed to update email', 'error');
    }
  } catch (error) {
    console.error('Email change error:', error);
    showStatus(statusDiv, 'Failed to update email. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
  }
}

// Handle password change
async function handlePasswordChange(e) {
  e.preventDefault();

  const currentPassword = document.getElementById('currentPasswordForChange');
  const newPassword = document.getElementById('newPassword');
  const confirmPassword = document.getElementById('confirmPassword');
  const statusDiv = document.getElementById('passwordStatus');
  const submitBtn = e.target.querySelector('button[type="submit"]');

  // Validate fields
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    showStatus(statusDiv, 'Please fill in all fields', 'error');
    return;
  }

  // Validate password length
  if (newPassword.value.length < 8) {
    showStatus(statusDiv, 'Password must be at least 8 characters', 'error');
    return;
  }

  // Validate password match
  if (newPassword.value !== confirmPassword.value) {
    showStatus(statusDiv, 'Passwords do not match', 'error');
    return;
  }

  // Disable button and show loading
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');

  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    const response = await fetch('/api/user/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword: currentPassword.value,
        newPassword: newPassword.value
      })
    });

    const data = await response.json();

    if (data.success) {
      showStatus(statusDiv, 'Password updated successfully!', 'success');
      
      // Clear form
      currentPassword.value = '';
      newPassword.value = '';
      confirmPassword.value = '';
      
      // Reset validation indicators
      document.getElementById('req-length').classList.remove('valid');
      document.getElementById('req-match').classList.remove('valid');
    } else {
      showStatus(statusDiv, data.error || 'Failed to update password', 'error');
    }
  } catch (error) {
    console.error('Password change error:', error);
    showStatus(statusDiv, 'Failed to update password. Please check your current password.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
  }
}

// Show status message
function showStatus(element, message, type) {
  if (!element) return;

  element.textContent = message;
  element.className = `status-message ${type}`;
  element.style.display = 'block';

  // Hide after 5 seconds
  setTimeout(() => {
    element.style.display = 'none';
  }, 5000);
}

// Handle account deletion
async function handleAccountDeletion() {
  const deletePassword = document.getElementById('deletePassword');
  const statusDiv = document.getElementById('deleteStatus');
  const confirmBtn = document.getElementById('confirmDeleteBtn');

  if (!deletePassword.value) {
    showStatus(statusDiv, 'Please enter your password to confirm', 'error');
    return;
  }

  // Disable button and show loading
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    const response = await fetch('/api/user/account', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        password: deletePassword.value
      })
    });

    const data = await response.json();

    if (data.success) {
      showStatus(statusDiv, 'Account deleted successfully. Redirecting...', 'success');
      
      // Clear all auth data
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } else {
      showStatus(statusDiv, data.error || 'Failed to delete account', 'error');
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Yes, Delete My Account';
    }
  } catch (error) {
    console.error('Account deletion error:', error);
    showStatus(statusDiv, 'Failed to delete account. Please try again.', 'error');
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Yes, Delete My Account';
  }
}

// Create particles
function createParticles() {
  const particlesContainer = document.getElementById('particles');
  if (!particlesContainer) return;

  const particleCount = 50;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 20 + 's';
    particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
    particlesContainer.appendChild(particle);
  }
}
