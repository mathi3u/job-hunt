// Job Tracker - Popup Script

(function() {
  'use strict';

  // DOM Elements
  const states = {
    loading: document.getElementById('loading'),
    notConfigured: document.getElementById('not-configured'),
    notJobPage: document.getElementById('not-job-page'),
    preview: document.getElementById('preview'),
    success: document.getElementById('success'),
    error: document.getElementById('error')
  };

  const fields = {
    role: document.getElementById('role'),
    company: document.getElementById('company'),
    location: document.getElementById('location'),
    portal: document.getElementById('portal'),
    job_content: document.getElementById('job_content'),
    url: document.getElementById('url'),
    company_url: document.getElementById('company_url'),
    contentLength: document.getElementById('content-length')
  };

  const duplicateWarning = document.getElementById('duplicate-warning');
  const duplicateMessage = document.getElementById('duplicate-message');

  const buttons = {
    openOptions: document.getElementById('open-options'),
    save: document.getElementById('save-btn'),
    saveOpen: document.getElementById('save-open-btn'),
    openApp: document.getElementById('open-app'),
    retry: document.getElementById('retry-btn')
  };

  let appUrl = 'http://localhost:5173';

  // Show a specific state, hide others
  function showState(stateName) {
    Object.entries(states).forEach(([name, el]) => {
      if (name === stateName) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
  }

  // Load config from storage
  async function loadConfig() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['appUrl'], (result) => {
        appUrl = result.appUrl || 'http://localhost:5173';
        resolve(true); // Always configured - just uses default localhost
      });
    });
  }

  // Extract page content and send to AI server for processing
  async function extractJobData() {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const tab = tabs[0];
        console.log('Current tab:', tab?.url);

        if (!tab) {
          reject(new Error('No active tab'));
          return;
        }

        // Check if we're on a supported job site
        const supportedPatterns = [
          /linkedin\.com\/jobs/,
          /linkedin\.com\/job/,
          /greenhouse\.io/,
          /lever\.co/,
          /ashbyhq\.com/,
          /workday\.com/,
          /myworkdayjobs\.com/,
          /welcometothejungle\.com/
        ];

        const isJobSite = supportedPatterns.some(pattern => pattern.test(tab.url));
        console.log('Is job site:', isJobSite);

        if (!isJobSite) {
          reject(new Error('not_job_page'));
          return;
        }

        try {
          // Inject content script
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          console.log('Content script injected');

          // Wait for script to initialize
          await new Promise(r => setTimeout(r, 300));

          // Get raw page content
          const response = await new Promise((res, rej) => {
            chrome.tabs.sendMessage(tab.id, { action: 'extractPageContent' }, (resp) => {
              if (chrome.runtime.lastError) {
                rej(new Error(chrome.runtime.lastError.message));
              } else if (resp && resp.success) {
                res(resp.data);
              } else {
                rej(new Error('Failed to extract page content'));
              }
            });
          });

          console.log('Got page content, sending to AI server...');
          console.log('Text length:', response.pageText.length);

          // Send to backend for AI processing
          const aiResponse = await fetch(`${appUrl}/api/extract`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pageTitle: response.pageTitle,
              pageText: response.pageText,
              url: response.url,
              portal: response.portal
            })
          });

          if (!aiResponse.ok) {
            const error = await aiResponse.text();
            throw new Error('AI extraction failed: ' + error);
          }

          const extractedData = await aiResponse.json();
          console.log('AI extracted data:', extractedData);

          resolve(extractedData);

        } catch (err) {
          console.error('Extraction error:', err);
          reject(err);
        }
      });
    });
  }

  // Check for duplicate jobs
  async function checkDuplicate(url, company, role) {
    try {
      const response = await fetch(`${appUrl}/api/check-duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, company, role })
      });

      if (!response.ok) return null;

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Duplicate check failed:', err);
      return null;
    }
  }

  // Save job via local server
  async function saveJob(openAfter = false) {
    buttons.save.disabled = true;
    buttons.saveOpen.disabled = true;
    buttons.save.textContent = 'Saving...';

    const extraData = window._extractedData || {};

    const jobData = {
      company: fields.company.value,
      role: fields.role.value,
      location: fields.location.value,
      url: fields.url.value,
      company_url: fields.company_url.value || null,
      portal: fields.portal.value,
      job_content: fields.job_content.value,
      hiring_team: extraData.hiring_team || '',
      date_posted: extraData.date_posted || null
    };

    try {
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

      showState('success');

      if (openAfter) {
        chrome.tabs.create({ url: `${appUrl}/pipeline` });
      }
    } catch (err) {
      console.error('Save failed:', err);
      document.getElementById('error-message').textContent = 'Failed to save: ' + err.message;
      showState('error');
    }
  }

  // Populate form with extracted data
  async function populateForm(data) {
    console.log('Populating form with:', data);

    fields.role.value = data.role || '';
    fields.company.value = data.company || '';
    fields.location.value = data.location || '';
    fields.portal.value = data.portal || '';
    fields.job_content.value = data.job_content || '';
    fields.url.value = data.url || '';
    fields.company_url.value = '';  // User fills this in manually

    // Update content length indicator
    const len = (data.job_content || '').length;
    fields.contentLength.textContent = len > 0 ? `${len} chars` : 'No description found';

    // Show TLDR if available
    const tldrEl = document.getElementById('tldr');
    if (tldrEl && data.tldr) {
      tldrEl.textContent = data.tldr;
      tldrEl.parentElement.classList.remove('hidden');
    }

    // Show key skills if available
    const skillsEl = document.getElementById('key-skills');
    if (skillsEl && data.key_skills && data.key_skills.length > 0) {
      skillsEl.textContent = data.key_skills.join(', ');
      skillsEl.parentElement.classList.remove('hidden');
    }

    // Store extra fields for saving
    window._extractedData = data;

    // Check for duplicates
    const duplicateResult = await checkDuplicate(data.url, data.company, data.role);
    if (duplicateResult && duplicateResult.isDuplicate) {
      const job = duplicateResult.existingJob;
      let message = 'You may have already saved this job';
      if (job.status) {
        message += ` (Status: ${job.status})`;
      }
      duplicateMessage.textContent = message;
      duplicateWarning.classList.remove('hidden');
    } else {
      duplicateWarning.classList.add('hidden');
    }

    showState('preview');
  }

  // Update content length on textarea change
  fields.job_content.addEventListener('input', () => {
    const len = fields.job_content.value.length;
    fields.contentLength.textContent = len > 0 ? `${len} chars` : '';
  });

  // Button handlers
  buttons.openOptions.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  buttons.save.addEventListener('click', () => saveJob(false));
  buttons.saveOpen.addEventListener('click', () => saveJob(true));

  buttons.openApp.addEventListener('click', () => {
    chrome.tabs.create({ url: `${appUrl}/pipeline` });
  });

  buttons.retry.addEventListener('click', () => {
    init();
  });

  // Initialize
  async function init() {
    showState('loading');

    // Check config
    const hasConfig = await loadConfig();
    if (!hasConfig) {
      showState('notConfigured');
      return;
    }

    // Try to extract job data
    try {
      const data = await extractJobData();
      await populateForm(data);
    } catch (err) {
      if (err.message === 'not_job_page') {
        showState('notJobPage');
      } else {
        console.error('Extraction error:', err);
        document.getElementById('error-message').textContent = err.message;
        showState('error');
      }
    }
  }

  // Start
  init();

})();
