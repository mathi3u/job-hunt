// Job Tracker - Content Script
// Extracts job posting data from various job sites

(function() {
  'use strict';

  // Detect which site we're on
  function detectSite() {
    const hostname = window.location.hostname;

    if (hostname.includes('linkedin.com')) return 'linkedin';
    if (hostname.includes('greenhouse.io')) return 'greenhouse';
    if (hostname.includes('lever.co')) return 'lever';
    if (hostname.includes('ashbyhq.com')) return 'ashby';
    if (hostname.includes('workday.com') || hostname.includes('myworkdayjobs.com')) return 'workday';
    if (hostname.includes('welcometothejungle.com')) return 'wttj';

    return 'generic';
  }

  // Detect page type on LinkedIn (job posting vs profile)
  function detectLinkedInPageType() {
    const url = window.location.href;
    const pathname = window.location.pathname;

    if (pathname.startsWith('/in/')) return 'profile';
    if (pathname.startsWith('/jobs/') || pathname.includes('/job/')) return 'job';
    if (pathname.startsWith('/company/')) return 'company';

    return 'other';
  }

  // Extract LinkedIn profile data
  function extractLinkedInProfile() {
    console.log('Extracting LinkedIn profile...');

    const url = window.location.href;
    const pageText = document.body.innerText || '';
    const pageTitle = document.title || '';

    // Parse page title: "Name - Role - Company | LinkedIn" or "Name | LinkedIn"
    let name = '';
    let role = '';
    let company = '';

    const titleParts = pageTitle.replace(' | LinkedIn', '').split(' - ');
    if (titleParts.length >= 1) {
      name = titleParts[0].trim();
    }
    if (titleParts.length >= 2) {
      role = titleParts[1].trim();
    }
    if (titleParts.length >= 3) {
      company = titleParts[2].trim();
    }

    // Try DOM selectors as fallback/override
    const h1 = document.querySelector('h1');
    if (h1 && h1.textContent?.trim()) {
      name = h1.textContent.trim();
    }

    // LinkedIn headline selectors (try multiple)
    const headlineSelectors = [
      '.text-body-medium.break-words',
      '.text-body-medium',
      '[data-generated-suggestion-target]',
      '.pv-text-details__left-panel .text-body-medium',
      'div.mt2 .text-body-medium'
    ];

    for (const selector of headlineSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent?.trim() && el.textContent.trim().length > 2) {
        const headline = el.textContent.trim();
        // Headline often contains "Role at Company" format
        if (headline.includes(' at ')) {
          const parts = headline.split(' at ');
          if (!role) role = parts[0].trim();
          if (!company) company = parts[1].trim();
        } else if (!role) {
          role = headline;
        }
        break;
      }
    }

    // Location selectors
    let location = '';
    const locationSelectors = [
      '.text-body-small.inline.t-black--light.break-words',
      '.pv-text-details__left-panel .text-body-small',
      'span.text-body-small'
    ];

    for (const selector of locationSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent?.trim()) {
        const text = el.textContent.trim();
        // Skip if it looks like a link count or connection count
        if (!text.match(/^\d+/) && text.length > 2 && text.length < 100) {
          location = text;
          break;
        }
      }
    }

    // Try to extract company from experience section
    if (!company) {
      const expSection = document.querySelector('#experience') ||
                         document.querySelector('section:has(#experience)') ||
                         document.querySelector('[id*="experience"]');
      if (expSection) {
        // Look for company names in the experience section
        const spans = expSection.querySelectorAll('span[aria-hidden="true"]');
        for (const span of spans) {
          const text = span.textContent?.trim();
          if (text && text.length > 2 && text.length < 80 && !text.includes('·')) {
            company = text;
            break;
          }
        }
      }
    }

    console.log('LinkedIn profile extraction:', { name, role, company, location });

    return {
      type: 'profile',
      url,
      name,
      role,
      company,
      location,
      pageText,
      pageTitle,
      extractedAt: new Date().toISOString()
    };
  }

  // LinkedIn extractor - updated for current LinkedIn layout
  function extractLinkedIn() {
    console.log('Starting LinkedIn extraction...');

    // Parse page title: "Job Title | Company | LinkedIn"
    const pageTitle = document.title || '';
    const titleParts = pageTitle.split(' | ');
    let role = '';
    let company = '';

    if (titleParts.length >= 2) {
      role = titleParts[0].trim();
      company = titleParts[1].trim();
    }

    // Fallback: Look for company links
    if (!company) {
      const companyLinks = document.querySelectorAll('a[href*="/company/"]');
      for (const link of companyLinks) {
        const text = link.textContent?.trim();
        if (text && text.length > 1 && text.length < 100) {
          company = text;
          break;
        }
      }
    }

    // Location - search all text for location patterns
    let location = '';
    const bodyText = document.body.innerText || '';

    // Look for common location patterns
    const locationPatterns = [
      /(?:Paris|London|New York|San Francisco|Remote|Hybrid|On-site)[^,\n]*(?:,\s*[A-Za-z\s]+)?/gi,
      /\b[A-Z][a-z]+(?:,\s*[A-Z]{2})?\s*(?:\((?:Remote|Hybrid|On-site)\))?/g
    ];

    // Try to find location near the top of the visible content
    const firstChunk = bodyText.substring(0, 2000);
    for (const pattern of locationPatterns) {
      const match = firstChunk.match(pattern);
      if (match && match[0].length > 3 && match[0].length < 100) {
        location = match[0].trim();
        break;
      }
    }

    // Posted date
    let postedDate = '';
    const postedMatch = bodyText.match(/(Posted|Reposted)\s+(today|\d+\s+(hour|day|week|month)s?\s+ago)/i);
    if (postedMatch) {
      postedDate = postedMatch[0];
    }

    // Job description - get the main content area
    let job_content = '';

    // Method 1: Find by ID
    const jobDetailsById = document.getElementById('job-details');
    if (jobDetailsById) {
      job_content = jobDetailsById.innerText?.trim() || '';
    }

    // Method 2: Look for the largest text block that looks like a description
    if (!job_content || job_content.length < 100) {
      // Find all elements and get the one with the most text that's not navigation
      const allElements = document.querySelectorAll('div, section, article');
      let bestMatch = { el: null, score: 0 };

      for (const el of allElements) {
        const text = el.innerText?.trim() || '';
        // Score based on length and description-like keywords
        const hasKeywords = /responsibilities|requirements|qualifications|experience|skills|about the|we are|you will|what you|join our/i.test(text);
        const score = hasKeywords ? text.length * 2 : text.length;

        if (score > bestMatch.score && text.length > 200 && text.length < 50000) {
          // Make sure it's not the whole page
          const isWholeBody = el.tagName === 'BODY' || el.querySelector('nav, header');
          if (!isWholeBody) {
            bestMatch = { el, score };
          }
        }
      }

      if (bestMatch.el) {
        job_content = bestMatch.el.innerText?.trim() || '';
      }
    }

    // Hiring team - look for recruiter/hiring manager info
    let hiringTeam = '';
    const hiringKeywords = /(hiring manager|recruiter|posted by|meet the)/i;
    const allDivs = document.querySelectorAll('div');
    for (const div of allDivs) {
      const text = div.innerText?.trim() || '';
      if (hiringKeywords.test(text) && text.length < 500) {
        hiringTeam = text;
        break;
      }
    }

    const result = {
      role,
      company,
      location,
      job_content,
      hiring_team: hiringTeam,
      date_posted: postedDate
    };

    console.log('LinkedIn extraction result:', {
      role: result.role,
      company: result.company,
      location: result.location,
      job_content_length: result.job_content.length,
      hiring_team: result.hiring_team?.substring(0, 50),
      date_posted: result.date_posted
    });

    return result;
  }

  // Greenhouse extractor
  function extractGreenhouse() {
    const role = document.querySelector('.app-title')?.textContent?.trim() ||
                 document.querySelector('h1.heading')?.textContent?.trim() ||
                 document.querySelector('h1')?.textContent?.trim() || '';

    const company = document.querySelector('.company-name')?.textContent?.trim() ||
                    document.querySelector('meta[property="og:site_name"]')?.content || '';

    const location = document.querySelector('.location')?.textContent?.trim() ||
                     document.querySelector('[class*="location"]')?.textContent?.trim() || '';

    const descriptionEl = document.querySelector('#content') ||
                          document.querySelector('.content') ||
                          document.querySelector('.job-post-content');

    const job_content = descriptionEl?.innerText?.trim() || '';

    return { role, company, location, job_content };
  }

  // Lever extractor
  function extractLever() {
    const role = document.querySelector('.posting-headline h2')?.textContent?.trim() ||
                 document.querySelector('h2[data-qa="posting-name"]')?.textContent?.trim() ||
                 document.querySelector('h1')?.textContent?.trim() || '';

    const company = document.querySelector('.main-header-logo img')?.alt ||
                    document.querySelector('meta[property="og:site_name"]')?.content || '';

    const location = document.querySelector('.posting-categories .location')?.textContent?.trim() ||
                     document.querySelector('.workplaceTypes')?.textContent?.trim() ||
                     document.querySelector('[class*="location"]')?.textContent?.trim() || '';

    const descriptionEl = document.querySelector('[data-qa="job-description"]') ||
                          document.querySelector('.posting-page') ||
                          document.querySelector('.content');

    const job_content = descriptionEl?.innerText?.trim() || '';

    return { role, company, location, job_content };
  }

  // Ashby extractor
  function extractAshby() {
    const role = document.querySelector('h1[data-testid="job-title"]')?.textContent?.trim() ||
                 document.querySelector('h1')?.textContent?.trim() || '';

    const company = document.querySelector('meta[property="og:site_name"]')?.content ||
                    document.querySelector('[data-testid="company-name"]')?.textContent?.trim() || '';

    const location = document.querySelector('[data-testid="job-location"]')?.textContent?.trim() ||
                     document.querySelector('[class*="location"]')?.textContent?.trim() || '';

    const descriptionEl = document.querySelector('[data-testid="job-description"]') ||
                          document.querySelector('.job-description') ||
                          document.querySelector('main');

    const job_content = descriptionEl?.innerText?.trim() || '';

    return { role, company, location, job_content };
  }

  // Workday extractor
  function extractWorkday() {
    const role = document.querySelector('[data-automation-id="jobPostingHeader"]')?.textContent?.trim() ||
                 document.querySelector('h2[data-automation-id="jobTitle"]')?.textContent?.trim() ||
                 document.querySelector('h1')?.textContent?.trim() || '';

    const company = document.querySelector('meta[property="og:site_name"]')?.content || '';

    const location = document.querySelector('[data-automation-id="locations"]')?.textContent?.trim() ||
                     document.querySelector('[data-automation-id="location"]')?.textContent?.trim() || '';

    const descriptionEl = document.querySelector('[data-automation-id="jobPostingDescription"]') ||
                          document.querySelector('.job-description');

    const job_content = descriptionEl?.innerText?.trim() || '';

    return { role, company, location, job_content };
  }

  // Welcome to the Jungle extractor
  function extractWTTJ() {
    const role = document.querySelector('h1[data-testid="job-title"]')?.textContent?.trim() ||
                 document.querySelector('h1')?.textContent?.trim() || '';

    const company = document.querySelector('[data-testid="company-name"]')?.textContent?.trim() ||
                    document.querySelector('meta[property="og:site_name"]')?.content || '';

    const location = document.querySelector('[data-testid="job-location"]')?.textContent?.trim() ||
                     document.querySelector('[class*="location"]')?.textContent?.trim() || '';

    const descriptionEl = document.querySelector('[data-testid="job-section-description"]') ||
                          document.querySelector('.job-description') ||
                          document.querySelector('article');

    const job_content = descriptionEl?.innerText?.trim() || '';

    return { role, company, location, job_content };
  }

  // Generic extractor (fallback)
  function extractGeneric() {
    // Try common patterns
    const role = document.querySelector('h1.job-title')?.textContent?.trim() ||
                 document.querySelector('h1[class*="title"]')?.textContent?.trim() ||
                 document.querySelector('h1')?.textContent?.trim() ||
                 document.title.split(' - ')[0].split(' | ')[0].trim() || '';

    const company = document.querySelector('meta[property="og:site_name"]')?.content ||
                    document.querySelector('.company-name')?.textContent?.trim() ||
                    document.querySelector('[class*="company"]')?.textContent?.trim() || '';

    const location = document.querySelector('.job-location')?.textContent?.trim() ||
                     document.querySelector('[class*="location"]')?.textContent?.trim() ||
                     document.querySelector('[itemprop="jobLocation"]')?.textContent?.trim() || '';

    const descriptionEl = document.querySelector('.job-description') ||
                          document.querySelector('[class*="description"]') ||
                          document.querySelector('article') ||
                          document.querySelector('main');

    const job_content = descriptionEl?.innerText?.trim() || '';

    return { role, company, location, job_content };
  }

  // Simple extraction - just grab page text and metadata
  // AI on the server will do the heavy lifting
  function extractPageContent() {
    const site = detectSite();

    // Get page title (often contains job title + company)
    const pageTitle = document.title || '';

    // Get all visible text from the page
    const pageText = document.body.innerText || '';

    // Get the URL
    const url = window.location.href;

    // Get the portal name
    const portal = getPortalName(site);

    return {
      pageTitle,
      pageText,
      url,
      portal,
      extractedAt: new Date().toISOString()
    };
  }

  // Legacy extraction function (kept for fallback)
  function extractJobData() {
    const site = detectSite();
    let data;

    switch (site) {
      case 'linkedin':
        data = extractLinkedIn();
        break;
      case 'greenhouse':
        data = extractGreenhouse();
        break;
      case 'lever':
        data = extractLever();
        break;
      case 'ashby':
        data = extractAshby();
        break;
      case 'workday':
        data = extractWorkday();
        break;
      case 'wttj':
        data = extractWTTJ();
        break;
      default:
        data = extractGeneric();
    }

    // Add common fields
    data.url = window.location.href;
    data.portal = getPortalName(site);
    data.extractedAt = new Date().toISOString();

    return data;
  }

  function getPortalName(site) {
    const names = {
      'linkedin': 'LinkedIn',
      'greenhouse': 'Greenhouse',
      'lever': 'Lever',
      'ashby': 'Ashby',
      'workday': 'Workday',
      'wttj': 'Welcome to the Jungle',
      'generic': window.location.hostname.replace('www.', '')
    };
    return names[site] || site;
  }

  // Listen for messages from popup or background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Detect page type (job vs profile vs other)
    if (request.action === 'detectPageType') {
      const site = detectSite();
      let pageType = 'other';

      if (site === 'linkedin') {
        pageType = detectLinkedInPageType();
      } else if (['greenhouse', 'lever', 'ashby', 'workday', 'wttj'].includes(site)) {
        pageType = 'job';
      }

      sendResponse({ success: true, site, pageType });
    }

    // Extract LinkedIn profile data for contact capture
    if (request.action === 'extractProfile') {
      const site = detectSite();
      if (site === 'linkedin') {
        const data = extractLinkedInProfile();
        sendResponse({ success: true, data });
      } else {
        sendResponse({ success: false, error: 'Profile extraction only supported on LinkedIn' });
      }
    }

    // New: Extract raw page content for AI processing
    if (request.action === 'extractPageContent') {
      const data = extractPageContent();
      console.log('Extracted page content:', {
        titleLength: data.pageTitle.length,
        textLength: data.pageText.length,
        url: data.url
      });
      sendResponse({ success: true, data });
    }

    // Legacy: Extract job data using DOM selectors
    if (request.action === 'extractJob') {
      const data = extractJobData();
      sendResponse({ success: true, data });
    }

    if (request.action === 'extractAndSave') {
      const data = extractJobData();
      // Send to background script to save
      chrome.runtime.sendMessage({
        action: 'saveJob',
        data: {
          company: data.company,
          role: data.role,
          location: data.location,
          url: data.url,
          portal: data.portal,
          job_content: data.job_content
        }
      }, (response) => {
        if (response && response.success) {
          showNotification('Job saved to tracker!', 'success');
        } else {
          showNotification('Failed to save job: ' + (response?.error || 'Unknown error'), 'error');
        }
      });
    }

    return true; // Keep channel open for async response
  });

  // Show a notification on the page
  function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.id = 'job-tracker-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 999999;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    // Remove existing notification
    document.getElementById('job-tracker-notification')?.remove();
    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);

    // Add animation styles if not present
    if (!document.getElementById('job-tracker-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'job-tracker-notification-styles';
      style.textContent = `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
      `;
      document.head.appendChild(style);
    }
  }

  // Auto-inject save button on job pages (optional)
  function injectSaveButton() {
    // Check if button already exists
    if (document.getElementById('job-tracker-save-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'job-tracker-save-btn';
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>
      Save to Job Tracker
    `;
    btn.onclick = () => {
      chrome.runtime.sendMessage({ action: 'openPopup' });
    };

    // Try to find a good place to insert the button
    const targets = [
      '.jobs-apply-button',
      '.jobs-unified-top-card__content--two-pane',
      '.posting-headline',
      '.job-header',
      'h1'
    ];

    for (const selector of targets) {
      const target = document.querySelector(selector);
      if (target) {
        target.parentElement.insertBefore(btn, target.nextSibling);
        break;
      }
    }
  }

  // Inject button after page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(injectSaveButton, 1000);
    });
  } else {
    setTimeout(injectSaveButton, 1000);
  }

})();
