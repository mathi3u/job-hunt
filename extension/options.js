// Job Tracker - Options Script

(function() {
  'use strict';

  const form = document.getElementById('settings-form');
  const appUrlInput = document.getElementById('app-url');
  const messageEl = document.getElementById('message');

  // Load saved settings
  function loadSettings() {
    chrome.storage.sync.get(['appUrl'], (result) => {
      if (result.appUrl) {
        appUrlInput.value = result.appUrl;
      }
    });
  }

  // Show message
  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = 'message ' + type;
    messageEl.classList.remove('hidden');

    // Auto-hide after 3 seconds
    setTimeout(() => {
      messageEl.classList.add('hidden');
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
        showMessage('Settings saved!', 'success');
      });

    } catch (err) {
      // Still save, but warn
      chrome.storage.sync.set({ appUrl }, () => {
        showMessage('Settings saved. Make sure the app is running at ' + appUrl, 'success');
      });
    }
  });

  // Load settings on page load
  loadSettings();

})();
