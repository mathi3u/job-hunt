// Job Tracker - Options Script

(function() {
  'use strict';

  const form = document.getElementById('settings-form');
  const appUrlInput = document.getElementById('app-url');
  const messageEl = document.getElementById('message');

  // Profile form elements
  const profileForm = document.getElementById('profile-form');
  const profileMessageEl = document.getElementById('profile-message');
  const profileFields = {
    name: document.getElementById('user-name'),
    role: document.getElementById('user-role'),
    company: document.getElementById('user-company'),
    background: document.getElementById('user-background'),
    linkedin: document.getElementById('user-linkedin')
  };

  // Load saved settings
  function loadSettings() {
    chrome.storage.sync.get(['appUrl', 'userProfile'], (result) => {
      if (result.appUrl) {
        appUrlInput.value = result.appUrl;
      }
      if (result.userProfile) {
        profileFields.name.value = result.userProfile.name || '';
        profileFields.role.value = result.userProfile.role || '';
        profileFields.company.value = result.userProfile.company || '';
        profileFields.background.value = result.userProfile.background || '';
        profileFields.linkedin.value = result.userProfile.linkedin || '';
      }
    });
  }

  // Show message
  function showMessage(el, text, type) {
    el.textContent = text;
    el.className = 'message ' + type;
    el.classList.remove('hidden');

    // Auto-hide after 3 seconds
    setTimeout(() => {
      el.classList.add('hidden');
    }, 3000);
  }

  // Save settings
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const appUrl = appUrlInput.value.trim() || 'http://localhost:5173';

    // Test connection to the app
    try {
      const response = await fetch(`${appUrl}/api/jobs`, {
        method: 'OPTIONS'
      });

      // Save settings (even if OPTIONS fails, the server might not support it)
      chrome.storage.sync.set({ appUrl }, () => {
        showMessage(messageEl, 'Settings saved!', 'success');
      });

    } catch (err) {
      // Still save, but warn
      chrome.storage.sync.set({ appUrl }, () => {
        showMessage(messageEl, 'Settings saved. Make sure the app is running at ' + appUrl, 'success');
      });
    }
  });

  // Save profile
  profileForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const userProfile = {
      name: profileFields.name.value.trim(),
      role: profileFields.role.value.trim(),
      company: profileFields.company.value.trim(),
      background: profileFields.background.value.trim(),
      linkedin: profileFields.linkedin.value.trim()
    };

    chrome.storage.sync.set({ userProfile }, () => {
      showMessage(profileMessageEl, 'Profile saved!', 'success');
    });
  });

  // Load settings on page load
  loadSettings();

})();
