// ===================================
// Dashboard JavaScript
// ===================================

document.addEventListener("DOMContentLoaded", function() {
  // Initialize
  init();

  // Check authentication
  checkAuth();

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

  // Setup event listeners
  setupEventListeners();

  // Initialize Socket.IO
  const socket = io();
  
  // Listen for session updates
  socket.on('linked', (data) => {
    handleSessionConnected(data);
  });

  socket.on('unlinked', (data) => {
    handleSessionDisconnected(data);
  });
  
  // Listen for new notifications
  socket.on('new-notification', (data) => {
    // Check if this notification is for current user
    const username = localStorage.getItem('username') || sessionStorage.getItem('username');
    if (data.userId === username) {
      updateNotificationCount();
      // Show a toast notification
      showToast(data.title, 'info');
    }
  });
  
  // Handle socket connection
  socket.on('connect', () => {
    console.log('Socket connected to server');
  });
  
  socket.on('disconnect', () => {
    console.log('Socket disconnected from server');
  });

  // Load user data
  loadUserData();
  
  // Load dashboard data
  loadDashboardData();
  
  // Load activities from localStorage
  loadActivities();
  
  // Load settings for quick settings sync
  loadQuickSettings();

  // Update activity times every minute
  setInterval(updateActivityTimes, 60000);
  
  // Reload dashboard stats every 10 seconds
  setInterval(loadDashboardData, 10000);
  
  // Update credit info (balance and time estimate) every 10 seconds
  setInterval(updateCreditInfo, 10000);
});

// Initialize function
function init() {
  console.log('Dashboard initialized');
  
  // Load current session info
  loadSessionInfo();
  
  // Load notifications
  loadNotifications();
  
  // Load notification count
  updateNotificationCount();
}

// Load current session information
async function loadSessionInfo() {
  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    const response = await fetch('/api/session/info', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.session) {
        // Check if session is paused or connected
        if (data.session.paused) {
          // Session is paused, show it in paused state
          handleSessionDisconnected({ paused: true, sessionId: data.session.sessionId });
        } else if (data.session.connected) {
          // Session is connected, show it as online
          handleSessionConnected(data.session);
        }
      }
    }
  } catch (error) {
    console.error('Error loading session info:', error);
  }
}

// Check authentication
function checkAuth() {
  // Check for OAuth token in URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('token');
  const oauthProvider = urlParams.get('oauth');
  
  if (tokenFromUrl) {
    // Store OAuth token
    localStorage.setItem('authToken', tokenFromUrl);
    
    // Show success message if from OAuth
    if (oauthProvider) {
      console.log(`✅ Logged in successfully via ${oauthProvider}`);
      // Remove token from URL
      window.history.replaceState({}, document.title, '/dashboard');
    }
  }
  
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  
  if (!token) {
    console.log('No auth token found, redirecting to login...');
    window.location.href = '/login';
    return false;
  }
  return true;
}

// Setup event listeners
function setupEventListeners() {
  // Notification button
  const notificationBtn = document.getElementById('notificationBtn');
  const notificationPanel = document.getElementById('notificationPanel');
  const closeNotifications = document.getElementById('closeNotifications');
  const markAllReadBtn = document.getElementById('markAllReadBtn');

  if (notificationBtn && notificationPanel) {
    notificationBtn.addEventListener('click', () => {
      notificationPanel.classList.toggle('active');
      if (notificationPanel.classList.contains('active')) {
        loadNotifications();
      }
    });
  }

  if (closeNotifications && notificationPanel) {
    closeNotifications.addEventListener('click', () => {
      notificationPanel.classList.remove('active');
    });
  }

  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', markAllNotificationsAsRead);
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

  // Mobile sidebar
  const navToggle = document.getElementById('navToggle');
  const mobileSidebar = document.getElementById('mobileSidebar');
  const closeSidebar = document.getElementById('closeSidebar');

  if (navToggle && mobileSidebar) {
    navToggle.addEventListener('click', () => {
      mobileSidebar.classList.toggle('active');
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

  // Connect button
  const connectBtn = document.getElementById('connectBtn');
  if (connectBtn) {
    connectBtn.addEventListener('click', handleConnect);
  }

  // Phone number input - sanitize to only allow numbers
  const phoneNumber = document.getElementById('phoneNumber');
  if (phoneNumber) {
    phoneNumber.addEventListener('input', (e) => {
      // Remove all non-numeric characters
      e.target.value = e.target.value.replace(/\D/g, '');
    });
  }

  // Session control buttons
  const stopBtn = document.getElementById('stopBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const startBtn = document.getElementById('startBtn');

  if (stopBtn) {
    stopBtn.addEventListener('click', () => handleSessionControl('stop'));
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => handleSessionControl('delete'));
  }

  if (startBtn) {
    startBtn.addEventListener('click', () => handleSessionControl('start'));
  }

  // Settings toggles
  const autoStatusView = document.getElementById('autoStatusView');
  const autoStatusLike = document.getElementById('autoStatusLike');
  const botMode = document.getElementById('botMode');

  if (autoStatusView) {
    autoStatusView.addEventListener('change', (e) => {
      updateSetting('autoStatusView', e.target.checked);
    });
  }

  if (autoStatusLike) {
    autoStatusLike.addEventListener('change', (e) => {
      updateSetting('autoStatusLike', e.target.checked);
    });
  }

  if (botMode) {
    botMode.addEventListener('change', (e) => {
      updateSetting('botMode', e.target.value);
    });
  }
}

// Load user data
async function loadUserData() {
  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
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
      const welcomeUsername = document.getElementById('welcomeUsername');
      const dropdownUsername = document.getElementById('dropdownUsername');
      const dropdownEmail = document.getElementById('dropdownEmail');
      const accountType = document.getElementById('accountType');
      const accountBadge = document.getElementById('accountBadge');
      const sessionPhone = document.getElementById('sessionPhone');

      if (welcomeUsername) welcomeUsername.textContent = userData.username;
      if (dropdownUsername) dropdownUsername.textContent = userData.username;
      if (dropdownEmail) dropdownEmail.textContent = userData.email;
      if (accountType) accountType.textContent = userData.accountType.charAt(0).toUpperCase() + userData.accountType.slice(1);
      
      if (accountBadge && userData.accountType === 'premium') {
        accountBadge.classList.add('premium');
      }
      
      // If user has a phone number and session is active, show it
      if (userData.phoneNumber && userData.sessionActive && sessionPhone) {
        sessionPhone.textContent = userData.phoneNumber;
      }

      // Update balance and referral information
      updateBalanceCard(userData);
    }
  } catch (error) {
    console.error('Error loading user data:', error);
    // Use fallback data
    const welcomeUsername = document.getElementById('welcomeUsername');
    if (welcomeUsername) welcomeUsername.textContent = 'User';
  }
}

// Load dashboard data
async function loadDashboardData() {
  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    const response = await fetch('/api/dashboard/stats', {
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
      throw new Error('Failed to load dashboard data');
    }
    
    const data = await response.json();

    if (data.success) {
      updateDashboardStats(data.stats);
      
      // Update session display if bot is connected or paused
      if (data.stats.activeSessions > 0 && (data.stats.botStatus === 'online' || data.stats.botStatus === 'paused')) {
        const noSession = document.getElementById('noSession');
        const sessionDetails = document.getElementById('sessionDetails');
        const sessionStatusBadge = document.getElementById('sessionStatusBadge');
        
        if (noSession) noSession.style.display = 'none';
        if (sessionDetails) sessionDetails.style.display = 'flex';
        
        // Update status badge based on bot status
        if (sessionStatusBadge) {
          if (data.stats.botStatus === 'online') {
            sessionStatusBadge.textContent = 'Connected';
            sessionStatusBadge.className = 'status-badge connected';
          } else if (data.stats.botStatus === 'paused') {
            sessionStatusBadge.textContent = 'Paused';
            sessionStatusBadge.className = 'status-badge paused';
          }
        }
      }
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    // Use fallback data
    updateDashboardStats({
      activeSessions: 0,
      botStatus: 'offline'
    });
  }
}

// Load quick settings to sync with /settings page
async function loadQuickSettings() {
  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    const response = await fetch('/api/user/settings', {
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
      throw new Error('Failed to load settings');
    }
    
    const data = await response.json();

    if (data.success) {
      const settings = data.settings;

      // Apply settings to quick settings UI
      const autoStatusView = document.getElementById('autoStatusView');
      const autoStatusLike = document.getElementById('autoStatusLike');
      const botMode = document.getElementById('botMode');
      
      if (autoStatusView) autoStatusView.checked = settings.autoStatusView;
      if (autoStatusLike) autoStatusLike.checked = settings.autoStatusReact; // Map to autoStatusReact from backend
      if (botMode) botMode.value = settings.botMode || 'public';
    }
  } catch (error) {
    console.error('Error loading quick settings:', error);
  }
}

// Update dashboard stats
function updateDashboardStats(data) {
  const activeSessions = document.getElementById('activeSessions');
  const botStatus = document.getElementById('botStatus');

  if (activeSessions) activeSessions.textContent = data.activeSessions || 0;
  
  if (botStatus) {
    // Handle online, paused, and offline states
    if (data.botStatus === 'online') {
      botStatus.textContent = 'Online';
      botStatus.style.color = 'var(--success)';
    } else if (data.botStatus === 'paused') {
      botStatus.textContent = 'Paused';
      botStatus.style.color = 'var(--warning)';
    } else {
      botStatus.textContent = 'Offline';
      botStatus.style.color = 'var(--error)';
    }
  }
}

// Handle connect
async function handleConnect() {
  const phoneNumber = document.getElementById('phoneNumber');
  const connectBtn = document.getElementById('connectBtn');
  const connectForm = document.getElementById('connectForm');
  const qrContainer = document.getElementById('qrContainer');

  if (!phoneNumber || !phoneNumber.value) {
    showNotification('Please enter your phone number', 'error');
    return;
  }

  // Validate phone number (only numbers, 8-15 digits)
  const sanitizedNumber = phoneNumber.value.replace(/\D/g, '');
  if (sanitizedNumber.length < 8 || sanitizedNumber.length > 15) {
    showNotification('Please enter a valid phone number (8-15 digits)', 'error');
    return;
  }

  // Disable button
  connectBtn.disabled = true;
  connectBtn.classList.add('loading');
  connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Generating Code...</span>';

  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    const response = await fetch('/api/pair', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        number: sanitizedNumber 
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid, redirect to login
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        window.location.href = '/login';
        return;
      }
      throw new Error('Failed to generate pairing code');
    }

    const data = await response.json();

    if (data.success && data.pairingCode) {
      // Hide form, show professional pairing code display
      connectForm.style.display = 'none';
      qrContainer.style.display = 'block';
      
      // Format code with spaces for better readability
      const formattedCode = data.pairingCode.toString().split('').join(' ');
      
      qrContainer.innerHTML = `
        <div class="pairing-display">
          <div class="pairing-header">
            <i class="fas fa-check-circle"></i>
            <h3>Pairing Code Generated!</h3>
          </div>
          <div class="pairing-code-container">
            <div class="pairing-code" id="pairingCodeDisplay">${formattedCode}</div>
            <button class="copy-code-btn" id="copyCodeBtn">
              <i class="fas fa-copy"></i>
              <span>Copy Code</span>
            </button>
          </div>
          <div class="pairing-instructions">
            <p><strong>How to connect:</strong></p>
            <ol>
              <li>Open WhatsApp on your phone</li>
              <li>Tap <strong>Menu</strong> or <strong>Settings</strong></li>
              <li>Tap <strong>Linked Devices</strong></li>
              <li>Tap <strong>Link a Device</strong></li>
              <li>Enter the code above</li>
            </ol>
          </div>
          <div class="pairing-status">
            <div class="spinner"></div>
            <p>Waiting for connection...</p>
          </div>
        </div>
      `;
      
      // Add copy functionality
      const copyBtn = document.getElementById('copyCodeBtn');
      const pairingCodeDisplay = document.getElementById('pairingCodeDisplay');
      
      if (copyBtn && pairingCodeDisplay) {
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(data.pairingCode);
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i><span>Copied!</span>';
            copyBtn.style.background = 'var(--success)';
            
            setTimeout(() => {
              copyBtn.innerHTML = originalHTML;
              copyBtn.style.background = '';
            }, 2000);
          } catch (err) {
            console.error('Failed to copy:', err);
          }
        });
      }
      
      addActivity('Pairing code generated successfully', 'success');
    } else {
      showNotification(`Error: ${data.error || 'Failed to generate pairing code'}`, 'error');
      addActivity('Failed to generate pairing code', 'error');
    }
  } catch (error) {
    console.error('Connection error:', error);
    showNotification('Failed to connect. Please try again.', 'error');
    addActivity('Connection failed', 'error');
  } finally {
    connectBtn.disabled = false;
    connectBtn.classList.remove('loading');
    connectBtn.innerHTML = '<i class="fas fa-link"></i><span>Connect WhatsApp</span>';
  }
}

// Handle session connected
function handleSessionConnected(data) {
  console.log('Session connected:', data);
  
  const noSession = document.getElementById('noSession');
  const sessionDetails = document.getElementById('sessionDetails');
  const sessionPhone = document.getElementById('sessionPhone');
  const sessionTime = document.getElementById('sessionTime');
  const botStatus = document.getElementById('botStatus');
  const connectForm = document.getElementById('connectForm');
  const qrContainer = document.getElementById('qrContainer');
  const activeSessions = document.getElementById('activeSessions');

  if (noSession) noSession.style.display = 'none';
  if (sessionDetails) sessionDetails.style.display = 'flex';
  
  if (sessionPhone) sessionPhone.textContent = data.sessionId || 'Connected';
  if (sessionTime) {
    // Use the actual connection time from the server if available
    if (data.connectedAt) {
      const connectedDate = new Date(data.connectedAt);
      sessionTime.textContent = connectedDate.toLocaleString();
    } else {
      sessionTime.textContent = new Date().toLocaleString();
    }
  }
  if (botStatus) {
    botStatus.textContent = 'Online';
    botStatus.style.color = 'var(--success)';
  }
  
  // Update status badge to show connected
  const sessionStatusBadge = document.getElementById('sessionStatusBadge');
  if (sessionStatusBadge) {
    sessionStatusBadge.textContent = 'Connected';
    sessionStatusBadge.className = 'status-badge connected';
  }
  
  // Update active sessions count
  if (activeSessions) activeSessions.textContent = '1';

  // Update session control buttons - show stop, hide delete and start
  const stopBtn = document.getElementById('stopBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const startBtn = document.getElementById('startBtn');
  
  if (stopBtn) stopBtn.style.display = 'inline-flex';
  if (deleteBtn) deleteBtn.style.display = 'none';
  if (startBtn) startBtn.style.display = 'none';

  // Reset connect form to normal state
  if (connectForm) connectForm.style.display = 'block';
  if (qrContainer) {
    qrContainer.style.display = 'none';
    qrContainer.innerHTML = '';
  }
  
  const phoneInput = document.getElementById('phoneNumber');
  if (phoneInput) phoneInput.value = '';

  // Show success notification
  showNotification('Bot connected successfully! 🎉', 'success');
  
  // Add activity
  addActivity('Bot connected successfully', 'success');
}

// Handle session disconnected
function handleSessionDisconnected(data) {
  console.log('Session disconnected:', data);
  
  const noSession = document.getElementById('noSession');
  const sessionDetails = document.getElementById('sessionDetails');
  const botStatus = document.getElementById('botStatus');
  const activeSessions = document.getElementById('activeSessions');
  const sessionStatusBadge = document.getElementById('sessionStatusBadge');

  if (data.paused) {
    // When paused, keep session details visible with paused status
    if (noSession) noSession.style.display = 'none';
    if (sessionDetails) sessionDetails.style.display = 'flex';
    
    // Update status badge to show paused
    if (sessionStatusBadge) {
      sessionStatusBadge.textContent = 'Paused';
      sessionStatusBadge.className = 'status-badge paused';
    }
    
    // Keep active sessions count as 1 (session is still active, just paused)
    if (activeSessions) activeSessions.textContent = '1';
  } else {
    // When truly disconnected, hide session details
    if (noSession) noSession.style.display = 'flex';
    if (sessionDetails) sessionDetails.style.display = 'none';
    
    // Update active sessions count to 0
    if (activeSessions) activeSessions.textContent = '0';
  }
  
  if (botStatus) {
    // Update status text based on paused state
    if (data.paused) {
      botStatus.textContent = 'Paused';
      botStatus.style.color = 'var(--warning)';
    } else {
      botStatus.textContent = 'Offline';
      botStatus.style.color = 'var(--error)';
    }
  }
  
  // Update session control buttons based on paused state
  const stopBtn = document.getElementById('stopBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const startBtn = document.getElementById('startBtn');
  
  if (data.paused) {
    // When paused, show start and delete buttons
    if (stopBtn) stopBtn.style.display = 'none';
    if (deleteBtn) deleteBtn.style.display = 'inline-flex';
    if (startBtn) startBtn.style.display = 'inline-flex';
  } else {
    // When disconnected (deleted), show only start button
    if (stopBtn) stopBtn.style.display = 'none';
    if (deleteBtn) deleteBtn.style.display = 'none';
    if (startBtn) startBtn.style.display = 'inline-flex';
  }

  // Add activity with appropriate message
  if (data.paused) {
    addActivity('Bot paused (auth preserved)', 'info');
  } else {
    addActivity('Bot disconnected', 'error');
  }
}

// Handle session control
async function handleSessionControl(action) {
  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    if (!token) {
      alert('Please login first');
      window.location.href = '/login';
      return;
    }
    
    // Confirm deletion
    if (action === 'delete') {
      const confirmed = confirm('Are you sure you want to delete this session? This will permanently remove all session data and you will need to pair again.');
      if (!confirmed) {
        return;
      }
    }
    
    // Show loading state
    const actionBtn = document.getElementById(`${action}Btn`);
    if (actionBtn) {
      actionBtn.disabled = true;
      actionBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${action.charAt(0).toUpperCase() + action.slice(1)}ing...`;
    }
    
    console.log(`Session ${action} requested`);
    
    const response = await fetch(`/api/session/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      addActivity(`Session ${action}ed successfully`, 'success');
      
      // Update UI based on action
      if (action === 'stop') {
        // Will be handled by socket event 'unlinked'
      } else if (action === 'start' || action === 'restart') {
        // Will be handled by socket event 'linked'
      } else if (action === 'delete') {
        // Will be handled by socket event 'unlinked' with deleted flag
      }
    } else {
      throw new Error(data.error || data.message || `Failed to ${action} session`);
    }
    
  } catch (error) {
    console.error('Session control error:', error);
    addActivity(`Failed to ${action} session: ${error.message}`, 'error');
    alert(`Failed to ${action} session: ${error.message}`);
  } finally {
    // Reset button states
    resetSessionControlButtons();
  }
}

// Reset session control buttons to normal state
function resetSessionControlButtons() {
  const stopBtn = document.getElementById('stopBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const startBtn = document.getElementById('startBtn');
  
  if (stopBtn) {
    stopBtn.disabled = false;
    stopBtn.innerHTML = '<i class="fas fa-stop"></i> <span>Stop</span>';
  }
  
  if (deleteBtn) {
    deleteBtn.disabled = false;
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> <span>Delete</span>';
  }
  
  if (startBtn) {
    startBtn.disabled = false;
    startBtn.innerHTML = '<i class="fas fa-play"></i> <span>Start</span>';
  }
}

// Update setting
async function updateSetting(setting, value) {
  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const settings = {};
    settings[setting] = value;

    const response = await fetch('/api/user/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(settings)
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid, redirect to login
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        window.location.href = '/login';
        return;
      }
      throw new Error('Failed to update setting');
    }

    const data = await response.json();

    if (data.success) {
      addActivity(`Updated ${setting}`, 'success');
    }
  } catch (error) {
    console.error('Settings update error:', error);
    addActivity(`Failed to update ${setting}`, 'error');
  }
}

// Add activity to list
function addActivity(text, type = 'info') {
  const activityList = document.getElementById('activityList');
  if (!activityList) return;

  const activityItem = document.createElement('div');
  activityItem.className = 'activity-item';
  
  const icon = type === 'success' ? 'check-circle' : 
               type === 'error' ? 'times-circle' : 
               'info-circle';
  
  const now = Date.now();
  const timeString = getTimeAgo(now);
  
  activityItem.innerHTML = `
    <div class="activity-icon">
      <i class="fas fa-${icon}"></i>
    </div>
    <div class="activity-content">
      <div class="activity-text">${text}</div>
      <div class="activity-time" data-timestamp="${now}">${timeString}</div>
    </div>
  `;

  activityList.insertBefore(activityItem, activityList.firstChild);

  // Keep only last 5 activities in display
  while (activityList.children.length > 5) {
    activityList.removeChild(activityList.lastChild);
  }
  
  // Save activity to localStorage
  saveActivity(text, type, now);
}

// Save activity to localStorage with 24-hour expiry
function saveActivity(text, type, timestamp) {
  try {
    let activities = JSON.parse(localStorage.getItem('dashboardActivities') || '[]');
    
    // Add new activity
    activities.unshift({ text, type, timestamp });
    
    // Filter out activities older than 24 hours
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    activities = activities.filter(activity => activity.timestamp > twentyFourHoursAgo);
    
    // Keep only last 50 activities
    activities = activities.slice(0, 50);
    
    localStorage.setItem('dashboardActivities', JSON.stringify(activities));
  } catch (error) {
    console.error('Error saving activity:', error);
  }
}

// Load activities from localStorage
function loadActivities() {
  const activityList = document.getElementById('activityList');
  if (!activityList) return;
  
  try {
    let activities = JSON.parse(localStorage.getItem('dashboardActivities') || '[]');
    
    // Filter out activities older than 24 hours
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    activities = activities.filter(activity => activity.timestamp > twentyFourHoursAgo);
    
    // Save filtered activities back
    localStorage.setItem('dashboardActivities', JSON.stringify(activities));
    
    // Clear current display
    activityList.innerHTML = '';
    
    // Display up to 5 most recent activities
    const displayActivities = activities.slice(0, 5);
    
    if (displayActivities.length === 0) {
      // Show default message if no activities
      activityList.innerHTML = `
        <div class="activity-item">
          <div class="activity-icon">
            <i class="fas fa-info-circle"></i>
          </div>
          <div class="activity-content">
            <div class="activity-text">No recent activity</div>
            <div class="activity-time">Start using the dashboard to see activities</div>
          </div>
        </div>
      `;
      return;
    }
    
    displayActivities.forEach(activity => {
      const icon = activity.type === 'success' ? 'check-circle' : 
                   activity.type === 'error' ? 'times-circle' : 
                   'info-circle';
      
      const timeString = getTimeAgo(activity.timestamp);
      
      const activityItem = document.createElement('div');
      activityItem.className = 'activity-item';
      activityItem.innerHTML = `
        <div class="activity-icon">
          <i class="fas fa-${icon}"></i>
        </div>
        <div class="activity-content">
          <div class="activity-text">${activity.text}</div>
          <div class="activity-time" data-timestamp="${activity.timestamp}">${timeString}</div>
        </div>
      `;
      activityList.appendChild(activityItem);
    });
  } catch (error) {
    console.error('Error loading activities:', error);
  }
}

// Get time ago string
function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// Update activity times every minute
function updateActivityTimes() {
  const activityTimes = document.querySelectorAll('.activity-time[data-timestamp]');
  activityTimes.forEach(timeEl => {
    const timestamp = parseInt(timeEl.getAttribute('data-timestamp'));
    timeEl.textContent = getTimeAgo(timestamp);
  });
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `toast-notification ${type}`;
  
  const icon = type === 'success' ? 'check-circle' : 
               type === 'error' ? 'exclamation-circle' : 
               'info-circle';
  
  notification.innerHTML = `
    <i class="fas fa-${icon}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(notification);
  
  // Trigger animation
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Remove after 4 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 4000);
}

// Handle logout
async function handleLogout() {
  if (!confirm('Are you sure you want to logout?')) {
    return;
  }

  try {
    // Clear auth tokens
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');

    // Redirect to login
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout error:', error);
    alert('Failed to logout. Please try again.');
  }
}

// Create particles (from existing scripts.js)
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

// ===================================
// Session Carousel Functionality
// ===================================

let currentSessionIndex = 0;
let totalSessionCount = 1;

function initSessionCarousel() {
  const prevBtn = document.getElementById('sessionPrevBtn');
  const nextBtn = document.getElementById('sessionNextBtn');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => navigateSession(-1));
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => navigateSession(1));
  }
  
  // Add touch support for mobile swipe
  const carousel = document.getElementById('sessionCarousel');
  if (carousel) {
    let touchStartX = 0;
    let touchEndX = 0;
    
    carousel.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    carousel.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
      const swipeThreshold = 50;
      const diff = touchStartX - touchEndX;
      
      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          // Swipe left - next
          navigateSession(1);
        } else {
          // Swipe right - previous
          navigateSession(-1);
        }
      }
    }
  }
}

function navigateSession(direction) {
  const newIndex = currentSessionIndex + direction;
  
  if (newIndex < 0 || newIndex >= totalSessionCount) {
    return;
  }
  
  currentSessionIndex = newIndex;
  updateCarouselPosition();
  updateCarouselControls();
}

function updateCarouselPosition() {
  const track = document.getElementById('sessionCarouselTrack');
  if (track) {
    const offset = -currentSessionIndex * 100;
    track.style.transform = `translateX(${offset}%)`;
  }
  
  updateSessionDots();
}

function updateCarouselControls() {
  const prevBtn = document.getElementById('sessionPrevBtn');
  const nextBtn = document.getElementById('sessionNextBtn');
  const counter = document.getElementById('sessionCounter');
  const currentIndexEl = document.getElementById('currentSessionIndex');
  
  if (prevBtn) {
    prevBtn.disabled = currentSessionIndex === 0;
  }
  
  if (nextBtn) {
    nextBtn.disabled = currentSessionIndex === totalSessionCount - 1;
  }
  
  if (currentIndexEl) {
    currentIndexEl.textContent = currentSessionIndex + 1;
  }
  
  // Show/hide controls based on session count
  if (totalSessionCount > 1) {
    if (prevBtn) prevBtn.style.display = 'flex';
    if (nextBtn) nextBtn.style.display = 'flex';
    if (counter) counter.style.display = 'flex';
  } else {
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
    if (counter) counter.style.display = 'none';
  }
}

function updateSessionDots() {
  const dotsContainer = document.getElementById('sessionDots');
  if (!dotsContainer) return;
  
  if (totalSessionCount <= 1) {
    dotsContainer.style.display = 'none';
    return;
  }
  
  dotsContainer.style.display = 'flex';
  dotsContainer.innerHTML = '';
  
  for (let i = 0; i < totalSessionCount; i++) {
    const dot = document.createElement('div');
    dot.className = `session-dot ${i === currentSessionIndex ? 'active' : ''}`;
    dot.addEventListener('click', () => {
      currentSessionIndex = i;
      updateCarouselPosition();
      updateCarouselControls();
    });
    dotsContainer.appendChild(dot);
  }
}

function updateSessionCount(count) {
  totalSessionCount = count || 1;
  const totalSessionsEl = document.getElementById('totalSessions');
  
  if (totalSessionsEl) {
    totalSessionsEl.textContent = totalSessionCount;
  }
  
  updateCarouselControls();
  updateSessionDots();
}

// Initialize carousel on page load
document.addEventListener('DOMContentLoaded', () => {
  initSessionCarousel();
  initBalanceFeatures();
});

// ===================================
// Balance & Referral Features
// ===================================

// Update credit info including time estimate
async function updateCreditInfo() {
  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    const response = await fetch('/api/user/credits/info', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success) {
        // Update balance
        const balanceAmount = document.getElementById('userBalance');
        if (balanceAmount) {
          balanceAmount.textContent = data.credits || 0;
        }
        
        // Update time estimate if available
        if (data.timeEstimate) {
          const timeEstimateElement = document.getElementById('creditTimeEstimate');
          if (timeEstimateElement) {
            const { days, hours, minutes } = data.timeEstimate;
            let estimateText = '';
            
            if (days > 0) {
              estimateText = `${days}d ${hours}h ${minutes}m`;
            } else if (hours > 0) {
              estimateText = `${hours}h ${minutes}m`;
            } else if (minutes > 0) {
              estimateText = `${minutes}m`;
            } else {
              estimateText = 'Low balance';
            }
            
            timeEstimateElement.textContent = estimateText;
          }
        }
      }
    }
  } catch (error) {
    console.error('Error updating credit info:', error);
  }
}

// Update balance card with user data
async function updateBalanceCard(userData) {
  try {
    const balanceAmount = document.getElementById('userBalance');
    const referralCode = document.getElementById('userReferralCode');
    const referralLinkInput = document.getElementById('referralLinkInput');
    
    // Update balance without animation (for better performance)
    if (balanceAmount) {
      balanceAmount.textContent = userData.credits || 0;
    }
    
    // Also update credit info with time estimate
    updateCreditInfo();

    // Update referral code
    if (referralCode) {
      referralCode.textContent = userData.referralCode || 'N/A';
    }

    // Get domain and update referral link
    const domainResponse = await fetch('/api/domain');
    if (domainResponse.ok) {
      const domainData = await domainResponse.json();
      const domain = domainData.domain;
      const referralLink = `${domain}/register?ref=${userData.referralCode || ''}`;
      
      if (referralLinkInput) {
        referralLinkInput.value = referralLink;
      }
    }

    // Fetch and display real referral stats
    const referralCount = document.getElementById('referralCount');
    const earnedCredits = document.getElementById('earnedCredits');
    
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const statsResponse = await fetch('/api/user/referral-stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success && statsData.stats) {
          if (referralCount) {
            referralCount.textContent = statsData.stats.referralCount;
          }
          if (earnedCredits) {
            earnedCredits.textContent = statsData.stats.earnedCredits;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching referral stats:', error);
      // Keep default values on error
      if (referralCount) {
        referralCount.textContent = '0';
      }
      if (earnedCredits) {
        earnedCredits.textContent = '0';
      }
    }

  } catch (error) {
    console.error('Error updating balance card:', error);
  }
}

// Animate number changes
function animateValue(element, start, end, duration) {
  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;
  
  const timer = setInterval(() => {
    current += increment;
    if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
      current = end;
      clearInterval(timer);
    }
    element.textContent = Math.floor(current);
  }, 16);
}

// Initialize balance features
function initBalanceFeatures() {
  // Add Credits Button
  const addCreditsBtn = document.getElementById('addCreditsBtn');
  const creditsModal = document.getElementById('creditsModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
  
  let selectedPackage = null;

  // Open modal
  if (addCreditsBtn) {
    addCreditsBtn.addEventListener('click', () => {
      if (creditsModal) {
        creditsModal.classList.add('active');
        loadPayPalPackages();
      }
    });
  }

  // Close modal
  const closeModal = () => {
    if (creditsModal) {
      creditsModal.classList.remove('active');
      selectedPackage = null;
      // Deselect all packages
      document.querySelectorAll('.package-card').forEach(pkg => {
        pkg.classList.remove('selected');
      });
      if (confirmPaymentBtn) {
        confirmPaymentBtn.disabled = true;
      }
    }
  };

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }

  if (cancelModalBtn) {
    cancelModalBtn.addEventListener('click', closeModal);
  }

  // Click outside modal to close
  if (creditsModal) {
    creditsModal.addEventListener('click', (e) => {
      if (e.target === creditsModal) {
        closeModal();
      }
    });
  }

  // Package selection
  document.addEventListener('click', (e) => {
    const packageCard = e.target.closest('.package-card');
    if (packageCard) {
      // Deselect all packages
      document.querySelectorAll('.package-card').forEach(pkg => {
        pkg.classList.remove('selected');
      });
      
      // Select clicked package
      packageCard.classList.add('selected');
      selectedPackage = packageCard.dataset.package;
      
      // Enable confirm button
      if (confirmPaymentBtn) {
        confirmPaymentBtn.disabled = false;
      }
    }
  });

  // Confirm payment button
  if (confirmPaymentBtn) {
    confirmPaymentBtn.addEventListener('click', async () => {
      if (!selectedPackage) {
        showToast('Please select a package', 'error');
        return;
      }

      try {
        // Disable button to prevent double clicks
        confirmPaymentBtn.disabled = true;
        confirmPaymentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Processing...</span>';

        // Create PayPal order
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const response = await fetch('/api/paypal/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ packageId: selectedPackage })
        });

        const data = await response.json();

        if (data.success && data.approvalUrl) {
          // Redirect to PayPal for payment
          window.location.href = data.approvalUrl;
        } else {
          throw new Error(data.error || 'Failed to create PayPal order');
        }
      } catch (error) {
        console.error('Payment error:', error);
        showToast('Payment failed: ' + error.message, 'error');
        
        // Re-enable button
        confirmPaymentBtn.disabled = false;
        confirmPaymentBtn.innerHTML = '<i class="fab fa-paypal"></i> <span>Pay with PayPal</span>';
      }
    });
  }

  // Check for payment result in URL
  checkPaymentResult();

  // Copy referral link
  const copyReferralBtn = document.getElementById('copyReferralBtn');
  if (copyReferralBtn) {
    copyReferralBtn.addEventListener('click', () => {
      const referralLinkInput = document.getElementById('referralLinkInput');
      if (referralLinkInput) {
        referralLinkInput.select();
        document.execCommand('copy');
        
        // Update button icon
        const icon = copyReferralBtn.querySelector('i');
        if (icon) {
          icon.className = 'fas fa-check';
          showToast('Referral link copied!', 'success');
          
          setTimeout(() => {
            icon.className = 'fas fa-copy';
          }, 2000);
        }
      }
    });
  }

  // Share referral link
  const shareReferralBtn = document.getElementById('shareReferralBtn');
  if (shareReferralBtn) {
    shareReferralBtn.addEventListener('click', async () => {
      const referralLinkInput = document.getElementById('referralLinkInput');
      if (referralLinkInput && navigator.share) {
        try {
          await navigator.share({
            title: 'Join Void V4 WhatsApp Bot',
            text: 'Sign up using my referral link and get started!',
            url: referralLinkInput.value
          });
        } catch (error) {
          console.log('Share cancelled or failed:', error);
        }
      } else {
        // Fallback: copy to clipboard
        if (referralLinkInput) {
          referralLinkInput.select();
          document.execCommand('copy');
          showToast('Referral link copied!', 'success');
        }
      }
    });
  }
}

// Load PayPal packages (optional - for dynamic loading)
async function loadPayPalPackages() {
  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const response = await fetch('/api/paypal/packages', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.mode === 'sandbox') {
        // Show sandbox indicator
        console.log('PayPal running in SANDBOX mode');
      }
    }
  } catch (error) {
    console.error('Error loading PayPal packages:', error);
  }
}

// Check payment result from URL parameters
function checkPaymentResult() {
  const urlParams = new URLSearchParams(window.location.search);
  const payment = urlParams.get('payment');
  const coins = urlParams.get('coins');
  const reason = urlParams.get('reason');

  if (payment === 'success' && coins) {
    showToast(`🎉 Payment successful! ${coins} coins added to your account.`, 'success');
    
    // Reload user data to update balance
    setTimeout(() => {
      loadUserData();
      updateCreditInfo();
    }, 1000);

    // Clean URL
    window.history.replaceState({}, document.title, '/dashboard');
  } else if (payment === 'error') {
    const errorMessages = {
      'missing_order_id': 'Payment error: Missing order information',
      'invalid_order': 'Payment error: Invalid order',
      'capture_failed': 'Payment capture failed. Please try again.',
      'capture_exception': 'Payment processing error. Please contact support.'
    };
    
    const message = errorMessages[reason] || 'Payment failed. Please try again.';
    showToast(message, 'error');

    // Clean URL
    window.history.replaceState({}, document.title, '/dashboard');
  }
}

// Show toast notification
function showToast(message, type = 'info') {
  // Remove existing toast if any
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;
  
  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-check-circle';
  if (type === 'error') icon = 'fa-exclamation-circle';
  
  toast.innerHTML = `
    <i class="fas ${icon}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// ===================================
// Notification Functions
// ===================================

// Load notifications from server
async function loadNotifications() {
  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    const response = await fetch('/api/notifications', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        displayNotifications(data.notifications);
        updateNotificationBadge(data.unreadCount);
      }
    } else {
      console.error('Failed to load notifications');
    }
  } catch (error) {
    console.error('Error loading notifications:', error);
  }
}

// Display notifications in the panel
function displayNotifications(notifications) {
  const notificationList = document.getElementById('notificationList');
  if (!notificationList) return;
  
  // Clear loading state
  notificationList.innerHTML = '';
  
  if (notifications.length === 0) {
    notificationList.innerHTML = `
      <div class="notification-empty">
        <i class="fas fa-bell-slash"></i>
        <p>No notifications yet</p>
      </div>
    `;
    return;
  }
  
  notifications.forEach(notification => {
    const notifElement = createNotificationElement(notification);
    notificationList.appendChild(notifElement);
  });
}

// Create a notification element
function createNotificationElement(notification) {
  const div = document.createElement('div');
  div.className = `notification-item ${notification.read ? '' : 'unread'}`;
  div.dataset.notificationId = notification._id || notification.id;
  
  // Determine icon based on type
  let iconClass = 'fa-info-circle';
  let iconType = notification.type || 'info';
  
  if (notification.type === 'referral') {
    iconClass = 'fa-user-plus';
  } else if (notification.type === 'system') {
    iconClass = 'fa-cog';
  }
  
  div.innerHTML = `
    <div class="notification-icon ${iconType}">
      <i class="fas ${iconClass}"></i>
    </div>
    <div class="notification-content">
      <div class="notification-title">${escapeHtml(notification.title)}</div>
      <div class="notification-text">${escapeHtml(notification.message)}</div>
      <div class="notification-time">${getTimeAgo(notification.createdAt)}</div>
    </div>
  `;
  
  // Click to mark as read
  if (!notification.read) {
    div.addEventListener('click', () => {
      markNotificationAsRead(notification._id || notification.id);
    });
    div.style.cursor = 'pointer';
  }
  
  return div;
}

// Mark a notification as read
async function markNotificationAsRead(notificationId) {
  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    const response = await fetch('/api/notifications/read', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notificationIds: [notificationId] })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        updateNotificationBadge(data.unreadCount);
        // Update UI - remove unread class
        const notifElement = document.querySelector(`[data-notification-id="${notificationId}"]`);
        if (notifElement) {
          notifElement.classList.remove('unread');
          notifElement.style.cursor = 'default';
        }
      }
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

// Mark all notifications as read
async function markAllNotificationsAsRead() {
  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    const response = await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        updateNotificationBadge(0);
        // Update UI - remove all unread classes
        document.querySelectorAll('.notification-item.unread').forEach(item => {
          item.classList.remove('unread');
          item.style.cursor = 'default';
        });
        showToast('All notifications marked as read', 'success');
      }
    }
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    showToast('Failed to mark notifications as read', 'error');
  }
}

// Update notification count badge
async function updateNotificationCount() {
  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    const response = await fetch('/api/notifications/count', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        updateNotificationBadge(data.unreadCount);
      }
    }
  } catch (error) {
    console.error('Error updating notification count:', error);
  }
}

// Update notification badge display
function updateNotificationBadge(count) {
  const badge = document.getElementById('notificationBadge');
  if (!badge) return;
  
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Get time ago string
function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}
