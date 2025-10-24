// ===================================
// Ticket JavaScript
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

  // Load user data and check for active ticket
  loadUserData();
  checkActiveTicket();

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
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        window.location.href = '/login';
        return;
      }
      throw new Error('Failed to load user data');
    }

    const data = await response.json();
    if (data.success && data.profile) {
      // Update profile dropdown
      const dropdownUsername = document.getElementById('dropdownUsername');
      const dropdownEmail = document.getElementById('dropdownEmail');
      
      if (dropdownUsername) dropdownUsername.textContent = data.profile.username;
      if (dropdownEmail) dropdownEmail.textContent = data.profile.email;
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

// Check for active ticket
async function checkActiveTicket() {
  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) return;

    const response = await fetch('/api/ticket/active', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to check active ticket');
    }

    const data = await response.json();
    
    if (data.success && data.activeTicket) {
      // Show active ticket section
      displayActiveTicket(data.activeTicket);
    } else {
      // Show create ticket section
      showCreateTicketSection();
    }
  } catch (error) {
    console.error('Error checking active ticket:', error);
    showCreateTicketSection();
  }
}

// Display active ticket
function displayActiveTicket(ticket) {
  const activeTicketSection = document.getElementById('activeTicketSection');
  const createTicketSection = document.getElementById('createTicketSection');
  
  if (activeTicketSection) {
    activeTicketSection.style.display = 'block';
    
    // Populate ticket details
    document.getElementById('activeTicketId').textContent = ticket.ticketId;
    document.getElementById('activeTicketReason').textContent = ticket.reason;
    document.getElementById('activeTicketStatus').textContent = ticket.status;
    document.getElementById('activeTicketMessage').textContent = ticket.message;
    
    // Format date
    const createdDate = new Date(ticket.createdAt);
    document.getElementById('activeTicketDate').textContent = createdDate.toLocaleString();
  }
  
  if (createTicketSection) {
    createTicketSection.style.display = 'none';
  }
}

// Show create ticket section
function showCreateTicketSection() {
  const activeTicketSection = document.getElementById('activeTicketSection');
  const createTicketSection = document.getElementById('createTicketSection');
  
  if (activeTicketSection) {
    activeTicketSection.style.display = 'none';
  }
  
  if (createTicketSection) {
    createTicketSection.style.display = 'block';
  }
}

// Setup event listeners
function setupEventListeners() {
  // Ticket form submission
  const ticketForm = document.getElementById('ticketForm');
  if (ticketForm) {
    ticketForm.addEventListener('submit', handleTicketSubmit);
  }

  // Profile dropdown
  const profileBtn = document.getElementById('profileBtn');
  const profileMenu = document.getElementById('profileMenu');
  
  if (profileBtn && profileMenu) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
        profileMenu.classList.remove('active');
      }
    });
  }

  // Mobile menu toggle
  const navToggle = document.getElementById('navToggle');
  const mobileSidebar = document.getElementById('mobileSidebar');
  const closeSidebar = document.getElementById('closeSidebar');

  if (navToggle && mobileSidebar) {
    navToggle.addEventListener('click', () => {
      mobileSidebar.classList.add('active');
    });
  }

  if (closeSidebar && mobileSidebar) {
    closeSidebar.addEventListener('click', () => {
      mobileSidebar.classList.remove('active');
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

// Handle ticket form submission
async function handleTicketSubmit(e) {
  e.preventDefault();

  const reasonSelect = document.getElementById('ticketReason');
  const messageTextarea = document.getElementById('ticketMessage');
  const statusDiv = document.getElementById('ticketStatus');
  const submitBtn = document.getElementById('submitTicketBtn');

  const reason = reasonSelect.value;
  const message = messageTextarea.value.trim();

  // Validate
  if (!reason) {
    showStatus(statusDiv, 'Please select a reason', 'error');
    return;
  }

  if (message.length < 10) {
    showStatus(statusDiv, 'Message must be at least 10 characters long', 'error');
    return;
  }

  // Disable button and show loading
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');
  const originalIcon = submitBtn.querySelector('i').className;
  submitBtn.querySelector('i').className = 'fas fa-spinner';

  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    const response = await fetch('/api/ticket/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason, message })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showStatus(statusDiv, data.message, 'success');
      
      // Reset form
      ticketForm.reset();
      
      // Reload to show active ticket after short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      showStatus(statusDiv, data.error || 'Failed to create ticket', 'error');
    }
  } catch (error) {
    console.error('Error creating ticket:', error);
    showStatus(statusDiv, 'An error occurred. Please try again.', 'error');
  } finally {
    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    submitBtn.querySelector('i').className = originalIcon;
  }
}

// Show status message
function showStatus(element, message, type) {
  if (!element) return;
  
  element.textContent = message;
  element.className = `status-message ${type}`;
  element.style.display = 'block';

  // Auto-hide after 5 seconds for success messages
  if (type === 'success') {
    setTimeout(() => {
      element.style.display = 'none';
    }, 5000);
  }
}

// Handle logout
async function handleLogout() {
  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    if (token) {
      await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    window.location.href = '/login';
  }
}

// Create particles background
function createParticles() {
  const particlesContainer = document.getElementById('particles');
  if (!particlesContainer) return;

  const particleCount = window.innerWidth < 768 ? 30 : 50;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    const size = Math.random() * 4 + 1;
    const xPos = Math.random() * 100;
    const delay = Math.random() * 5;
    const duration = Math.random() * 10 + 10;
    
    particle.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${xPos}%;
      animation-delay: ${delay}s;
      animation-duration: ${duration}s;
    `;
    
    particlesContainer.appendChild(particle);
  }
}
