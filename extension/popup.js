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
    error: document.getElementById('error'),
    contactPreview: document.getElementById('contact-preview'),
    contactSuccess: document.getElementById('contact-success')
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

  // Contact fields
  const contactFields = {
    name: document.getElementById('contact-name'),
    role: document.getElementById('contact-role'),
    company: document.getElementById('contact-company'),
    summary: document.getElementById('contact-summary'),
    commonalities: document.getElementById('contact-commonalities'),
    outreachMessage: document.getElementById('outreach-message'),
    talkingPoints: document.getElementById('talking-points'),
    relationship: document.getElementById('contact-relationship'),
    url: document.getElementById('contact-url'),
    notes: document.getElementById('contact-notes')
  };

  const duplicateWarning = document.getElementById('duplicate-warning');
  const duplicateMessage = document.getElementById('duplicate-message');
  const openExistingBtn = document.getElementById('open-existing-btn');

  const buttons = {
    openOptions: document.getElementById('open-options'),
    save: document.getElementById('save-btn'),
    saveOpen: document.getElementById('save-open-btn'),
    openApp: document.getElementById('open-app'),
    retry: document.getElementById('retry-btn'),
    saveContact: document.getElementById('save-contact-btn'),
    saveContactOpen: document.getElementById('save-contact-open-btn'),
    copyMessage: document.getElementById('copy-message-btn')
  };

  const actions = {
    apply: document.getElementById('action-apply'),
    contacts: document.getElementById('action-contacts'),
    research: document.getElementById('action-research'),
    sendMessage: document.getElementById('action-send-message'),
    viewContacts: document.getElementById('action-view-contacts')
  };

  let appUrl = 'http://localhost:5173';
  let userProfile = null;

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
      chrome.storage.sync.get(['appUrl', 'userProfile'], (result) => {
        appUrl = result.appUrl || 'http://localhost:5173';
        userProfile = result.userProfile || null;
        resolve(true); // Always configured - just uses default localhost
      });
    });
  }

  // Detect page type (job vs profile)
  async function detectPageType() {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const tab = tabs[0];
        if (!tab) {
          reject(new Error('No active tab'));
          return;
        }

        try {
          // Inject content script
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });

          await new Promise(r => setTimeout(r, 300));

          // Ask content script to detect page type
          chrome.tabs.sendMessage(tab.id, { action: 'detectPageType' }, (resp) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (resp && resp.success) {
              resolve({ site: resp.site, pageType: resp.pageType, url: tab.url });
            } else {
              reject(new Error('Failed to detect page type'));
            }
          });
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  // Extract contact data from LinkedIn profile
  async function extractContactData() {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const tab = tabs[0];
        if (!tab) {
          reject(new Error('No active tab'));
          return;
        }

        try {
          // Get profile content
          const response = await new Promise((res, rej) => {
            chrome.tabs.sendMessage(tab.id, { action: 'extractProfile' }, (resp) => {
              if (chrome.runtime.lastError) {
                rej(new Error(chrome.runtime.lastError.message));
              } else if (resp && resp.success) {
                res(resp.data);
              } else {
                rej(new Error(resp?.error || 'Failed to extract profile'));
              }
            });
          });

          console.log('Got profile content, sending to AI server...');

          // Send to backend for AI processing
          const aiResponse = await fetch(`${appUrl}/api/extract-contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pageTitle: response.pageTitle,
              pageText: response.pageText,
              url: response.url,
              userProfile: userProfile
            })
          });

          if (!aiResponse.ok) {
            const error = await aiResponse.text();
            throw new Error('AI extraction failed: ' + error);
          }

          const extractedData = await aiResponse.json();
          console.log('AI extracted contact:', extractedData);
          resolve(extractedData);

        } catch (err) {
          console.error('Contact extraction error:', err);
          reject(err);
        }
      });
    });
  }

  // Populate contact form
  function populateContactForm(data) {
    contactFields.name.value = data.name || '';
    contactFields.role.value = data.role || '';
    contactFields.company.value = data.company || '';
    contactFields.url.value = data.url || '';

    // Summary
    if (data.summary) {
      contactFields.summary.textContent = data.summary;
    }

    // Commonalities
    if (data.commonalities && data.commonalities.length > 0) {
      contactFields.commonalities.innerHTML = data.commonalities
        .map(c => `<li>${c}</li>`)
        .join('');
    } else {
      document.getElementById('commonalities-section').style.display = 'none';
    }

    // Outreach message
    if (data.outreach_message && data.outreach_message.body) {
      contactFields.outreachMessage.value = data.outreach_message.body;
    }

    // Talking points
    if (data.talking_points && data.talking_points.length > 0) {
      contactFields.talkingPoints.innerHTML = data.talking_points
        .map(t => `<li>${t}</li>`)
        .join('');
    }

    // Relationship type
    if (data.relationship_type) {
      contactFields.relationship.value = data.relationship_type;
    }

    // Store full data
    window._extractedContactData = data;

    showState('contactPreview');
  }

  // Save contact
  async function saveContact(openAfter = false) {
    buttons.saveContact.disabled = true;
    buttons.saveContactOpen.disabled = true;
    buttons.saveContact.textContent = 'Saving...';

    const contactData = {
      name: contactFields.name.value,
      role: contactFields.role.value,
      company: contactFields.company.value,
      linkedin_url: contactFields.url.value,
      relationship: contactFields.relationship.value || null,
      notes: contactFields.notes.value || null
    };

    try {
      const response = await fetch(`${appUrl}/api/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const result = await response.json();

      // Set up action buttons
      if (contactFields.url.value) {
        actions.sendMessage.href = contactFields.url.value;
      }
      actions.viewContacts.href = `${appUrl}/contacts`;

      showState('contactSuccess');

      if (openAfter) {
        chrome.tabs.create({ url: `${appUrl}/contacts` });
      }
    } catch (err) {
      console.error('Save contact failed:', err);
      document.getElementById('error-message').textContent = 'Failed to save: ' + err.message;
      showState('error');
    }
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

      const result = await response.json();
      window._savedOpportunityId = result.opportunity_id;

      // Set up action buttons with URLs
      const applyUrl = jobData.company_url || jobData.url;
      if (applyUrl) {
        actions.apply.href = applyUrl;
        actions.apply.style.display = 'flex';
      } else {
        actions.apply.style.display = 'none';
      }

      if (jobData.company) {
        actions.contacts.href = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(jobData.company)}&origin=GLOBAL_SEARCH_HEADER`;
        actions.research.href = `https://www.google.com/search?q=${encodeURIComponent(jobData.company + ' company culture reviews')}`;
      }

      showState('success');

      if (openAfter && result.opportunity_id) {
        chrome.tabs.create({ url: `${appUrl}/pipeline?open=${result.opportunity_id}` });
      } else if (openAfter) {
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

      // Set up button to open existing job
      if (job.opportunity_id) {
        openExistingBtn.style.display = 'block';
        openExistingBtn.onclick = () => {
          chrome.tabs.create({ url: `${appUrl}/pipeline?open=${job.opportunity_id}` });
        };
      } else {
        openExistingBtn.style.display = 'none';
      }
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
    const opportunityId = window._savedOpportunityId;
    if (opportunityId) {
      chrome.tabs.create({ url: `${appUrl}/pipeline?open=${opportunityId}` });
    } else {
      chrome.tabs.create({ url: `${appUrl}/pipeline` });
    }
  });

  buttons.retry.addEventListener('click', () => {
    init();
  });

  // Contact button handlers
  if (buttons.saveContact) {
    buttons.saveContact.addEventListener('click', () => saveContact(false));
  }
  if (buttons.saveContactOpen) {
    buttons.saveContactOpen.addEventListener('click', () => saveContact(true));
  }
  if (buttons.copyMessage) {
    buttons.copyMessage.addEventListener('click', () => {
      const message = contactFields.outreachMessage.value;
      navigator.clipboard.writeText(message).then(() => {
        buttons.copyMessage.textContent = 'Copied!';
        setTimeout(() => {
          buttons.copyMessage.textContent = 'Copy';
        }, 2000);
      });
    });
  }

  // Initialize
  async function init() {
    showState('loading');

    // Check config
    const hasConfig = await loadConfig();
    if (!hasConfig) {
      showState('notConfigured');
      return;
    }

    try {
      // First detect page type
      const { site, pageType, url } = await detectPageType();
      console.log('Detected:', site, pageType);

      if (pageType === 'profile') {
        // LinkedIn profile - extract contact
        document.querySelector('.header h1').textContent = 'Save Contact';
        const data = await extractContactData();
        populateContactForm(data);
      } else if (pageType === 'job') {
        // Job posting - extract job
        const data = await extractJobData();
        await populateForm(data);
      } else {
        // Not a supported page
        showState('notJobPage');
      }
    } catch (err) {
      console.error('Extraction error:', err);
      if (err.message === 'not_job_page') {
        showState('notJobPage');
      } else {
        document.getElementById('error-message').textContent = err.message;
        showState('error');
      }
    }
  }

  // Start
  init();

})();
