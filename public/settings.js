// ===================================
// Settings JavaScript
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

  // Load settings
  loadSettings();

  // Setup event listeners
  setupEventListeners();
});

// Load settings
async function loadSettings() {
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

      // Apply settings to UI
      document.getElementById('autoStatusView').checked = settings.autoStatusView;
      document.getElementById('autoStatusReact').checked = settings.autoStatusReact;
      document.getElementById('autoStatusReply').checked = settings.autoStatusReply;
      document.getElementById('statusMessage').value = settings.statusMessage;
      document.getElementById('botMode').value = settings.botMode;
      document.getElementById('commandPrefix').value = settings.commandPrefix;
      document.getElementById('autoRead').checked = settings.autoRead;

      // Load authorized users
      loadAuthorizedUsers(settings.authorizedUsers || []);

      // Show/hide private mode settings based on bot mode
      togglePrivateModeSettings(settings.botMode);

      // Show status message section if auto reply is enabled
      if (settings.autoStatusReply) {
        document.getElementById('statusMessageSection').style.display = 'flex';
      }
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus(document.getElementById('settingsStatus'), '❌ Failed to load settings. Please try again.', 'error');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Save settings button
  const saveBtn = document.getElementById('saveSettings');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveSettings);
  }

  // Auto status reply toggle
  const autoStatusReply = document.getElementById('autoStatusReply');
  const statusMessageSection = document.getElementById('statusMessageSection');
  
  if (autoStatusReply && statusMessageSection) {
    autoStatusReply.addEventListener('change', (e) => {
      if (e.target.checked) {
        statusMessageSection.style.display = 'flex';
      } else {
        statusMessageSection.style.display = 'none';
      }
    });
  }

  // Validate prefix input (only single character)
  const prefixInput = document.getElementById('commandPrefix');
  if (prefixInput) {
    prefixInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.slice(0, 1);
    });
  }

  // Real-time setting updates (optional)
  const toggles = document.querySelectorAll('.toggle-switch input');
  toggles.forEach(toggle => {
    toggle.addEventListener('change', () => {
      showUnsavedChanges();
    });
  });

  const selects = document.querySelectorAll('.setting-select');
  selects.forEach(select => {
    select.addEventListener('change', () => {
      showUnsavedChanges();
    });
  });

  const inputs = document.querySelectorAll('.prefix-input, .form-textarea');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      showUnsavedChanges();
    });
  });

  // Bot mode change handler
  const botModeSelect = document.getElementById('botMode');
  if (botModeSelect) {
    botModeSelect.addEventListener('change', (e) => {
      togglePrivateModeSettings(e.target.value);
      showUnsavedChanges();
    });
  }

  // Add user button
  const addUserBtn = document.getElementById('addUserBtn');
  if (addUserBtn) {
    addUserBtn.addEventListener('click', addAuthorizedUser);
  }

  // Add user on Enter key
  const newUserInput = document.getElementById('newAuthorizedUser');
  if (newUserInput) {
    newUserInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addAuthorizedUser();
      }
    });
  }
}

// Toggle private mode settings visibility
function togglePrivateModeSettings(mode) {
  const privateModeSettings = document.getElementById('privateModeSettings');
  if (privateModeSettings) {
    privateModeSettings.style.display = mode === 'private' ? 'block' : 'none';
  }
}

// Load authorized users into the list
function loadAuthorizedUsers(users) {
  const usersList = document.getElementById('authorizedUsersList');
  if (!usersList) return;

  usersList.innerHTML = '';

  if (users.length === 0) {
    usersList.innerHTML = '<div class="empty-list">No additional authorized users</div>';
    return;
  }

  users.forEach((user, index) => {
    const userItem = document.createElement('div');
    userItem.className = 'authorized-item';
    userItem.innerHTML = `
      <div class="authorized-info">
        <i class="fas fa-user"></i>
        <span class="authorized-text">${user}</span>
      </div>
      <button class="remove-btn" onclick="removeAuthorizedUser(${index})" title="Remove user">
        <i class="fas fa-times"></i>
      </button>
    `;
    usersList.appendChild(userItem);
  });
}

// Add authorized user
function addAuthorizedUser() {
  const input = document.getElementById('newAuthorizedUser');
  let phoneNumber = input.value.trim();

  if (!phoneNumber) {
    showStatus(document.getElementById('settingsStatus'), 'Please enter a valid phone number', 'error');
    return;
  }

  // Remove + if present and keep only digits
  phoneNumber = phoneNumber.replace(/^\+/, '').replace(/\D/g, '');

  if (!phoneNumber || phoneNumber.length < 10) {
    showStatus(document.getElementById('settingsStatus'), 'Please enter a valid phone number (format: 1305xxxx)', 'error');
    return;
  }

  // Get current authorized users
  const currentUsers = getCurrentAuthorizedUsers();
  
  if (currentUsers.includes(phoneNumber)) {
    showStatus(document.getElementById('settingsStatus'), 'User is already authorized', 'error');
    return;
  }

  currentUsers.push(phoneNumber);
  loadAuthorizedUsers(currentUsers);
  input.value = '';
  showUnsavedChanges();
}

// Remove authorized user
function removeAuthorizedUser(index) {
  const currentUsers = getCurrentAuthorizedUsers();
  currentUsers.splice(index, 1);
  loadAuthorizedUsers(currentUsers);
  showUnsavedChanges();
}

// Get current authorized users from the DOM
function getCurrentAuthorizedUsers() {
  const userItems = document.querySelectorAll('#authorizedUsersList .authorized-text');
  return Array.from(userItems).map(item => item.textContent);
}

// Show unsaved changes indicator
function showUnsavedChanges() {
  const saveBtn = document.getElementById('saveSettings');
  if (saveBtn && !saveBtn.classList.contains('has-changes')) {
    saveBtn.classList.add('has-changes');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i><span>Save Changes</span>';
  }
}

// Save settings
async function saveSettings() {
  const saveBtn = document.getElementById('saveSettings');
  const statusDiv = document.getElementById('settingsStatus');

  // Collect settings
  const settings = {
    autoStatusView: document.getElementById('autoStatusView').checked,
    autoStatusReact: document.getElementById('autoStatusReact').checked,
    autoStatusReply: document.getElementById('autoStatusReply').checked,
    statusMessage: document.getElementById('statusMessage').value,
    botMode: document.getElementById('botMode').value,
    commandPrefix: document.getElementById('commandPrefix').value,
    authorizedUsers: getCurrentAuthorizedUsers(),
    autoRead: document.getElementById('autoRead').checked
  };

  // Validate prefix
  if (!settings.commandPrefix || settings.commandPrefix.length !== 1) {
    showStatus(statusDiv, 'Please enter a single character for the command prefix', 'error');
    return;
  }

  // Disable button and show loading
  saveBtn.disabled = true;
  saveBtn.classList.add('loading');

  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
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
      throw new Error('Failed to save settings');
    }

    const data = await response.json();

    if (data.success) {
      showStatus(statusDiv, '✅ Settings saved successfully! Changes take effect immediately.', 'success');
      
      // Remove unsaved changes indicator
      saveBtn.classList.remove('has-changes');
      saveBtn.innerHTML = '<i class="fas fa-check"></i><span>Settings Saved</span>';
      
      // Reset button after 2 seconds
      setTimeout(() => {
        saveBtn.innerHTML = '<i class="fas fa-save"></i><span>Save All Settings</span>';
      }, 2000);
    } else {
      showStatus(statusDiv, `❌ ${data.error || 'Failed to save settings'}`, 'error');
    }
  } catch (error) {
    console.error('Settings save error:', error);
    showStatus(statusDiv, '❌ Failed to save settings. Please try again.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.classList.remove('loading');
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
