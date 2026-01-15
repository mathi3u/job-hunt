// Job Tracker - Background Service Worker

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open options page on first install
    chrome.runtime.openOptionsPage();
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveJob') {
    saveJobToServer(message.data)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (message.action === 'getConfig') {
    chrome.storage.sync.get(['appUrl'], (result) => {
      sendResponse(result);
    });
    return true;
  }
});

// Save job via local server
async function saveJobToServer(jobData) {
  const config = await new Promise((resolve) => {
    chrome.storage.sync.get(['appUrl'], resolve);
  });

  const appUrl = config.appUrl || 'http://localhost:5173';

  const response = await fetch(`${appUrl}/api/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(jobData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

// Context menu for quick save (optional feature)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-job',
    title: 'Save to Job Tracker',
    contexts: ['page'],
    documentUrlPatterns: [
      '*://*.linkedin.com/jobs/*',
      '*://*.greenhouse.io/*',
      '*://*.lever.co/*',
      '*://*.ashbyhq.com/*',
      '*://*.workday.com/*',
      '*://*.myworkdayjobs.com/*',
      '*://*.welcometothejungle.com/*'
    ]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-job') {
    // Send message to content script to extract and save
    chrome.tabs.sendMessage(tab.id, { action: 'extractAndSave' });
  }
});
