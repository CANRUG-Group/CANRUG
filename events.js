// --- Configuration: Replace with your actual values ---
const CALENDAR_ID = 'canrugroup@gmail.com'; // Google Calendar ID
const API_KEY = 'AIzaSyB5OeElttTcYlFt52JSKJqHMXoBHtQYhdQ'; // Public API key

// --- DOM Element References ---
const upcomingContainer = document.getElementById('upcoming-events');
const pastContainer = document.getElementById('past-events');

// --- Google Calendar API endpoint ---
const EVENTS_API_URL = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`;

/**
 * Formats a date string into readable form for both event time zone and user's local time zone.
 */
function formatEventTimes(startStr, endStr, eventTimeZone) {
  const start = new Date(startStr);
  const end = new Date(endStr);

  const baseOptions = {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: true
  };

  const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const eventFormatter = new Intl.DateTimeFormat(undefined, { ...baseOptions, timeZone: eventTimeZone, timeZoneName: 'short' });
  const localFormatter = new Intl.DateTimeFormat(undefined, { ...baseOptions, timeZone: userTZ, timeZoneName: 'short' });

  const eventTZ = `${eventFormatter.format(start)} - ${eventFormatter.format(end)} (${eventTimeZone})`;
  const localTZ = `${localFormatter.format(start)} - ${localFormatter.format(end)} (${userTZ})`;

  return { eventTZ, localTZ };
}

/**
 * Decodes escaped HTML entities from Google Calendar descriptions.
 * E.g. converts \u003c to < safely once.
 */
function cleanDescription(input) {
  if (!input) return '';
  try {
    // Replace unicode escape sequences
    let decoded = input.replace(/\\u003c/gi, '<')
                       .replace(/\\u003e/gi, '>')
                       .replace(/\\u0026/gi, '&')
                       .replace(/\\u0022/gi, '"')
                       .replace(/\\u0027/gi, "'");

    // Use a textarea to decode HTML entities (like &amp;)
    const textarea = document.createElement('textarea');
    textarea.innerHTML = decoded;
    return textarea.value;
  } catch (err) {
    console.warn('Description decode failed:', err);
    return input;
  }
}

/**
 * Sanitizes the description HTML by allowing only specific tags
 * and removing invalid or nested anchor tags to prevent broken HTML.
 */
function sanitizeDescription(html) {
  const allowedTags = ['A', 'BR', 'P', 'STRONG', 'EM', 'UL', 'OL', 'LI'];

  const container = document.createElement('div');
  container.innerHTML = html;

  // Remove disallowed tags by replacing with their text content
  [...container.querySelectorAll('*')].forEach(el => {
    if (!allowedTags.includes(el.tagName)) {
      const textNode = document.createTextNode(el.textContent);
      el.parentNode.replaceChild(textNode, el);
    }
  });

  // Fix all <a> tags: ensure href is valid and attributes are safe
  container.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href');
    // Remove anchors with invalid or missing href
    if (!href || !href.startsWith('http')) {
      const textNode = document.createTextNode(a.textContent);
      a.parentNode.replaceChild(textNode, a);
      return;
    }
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer nofollow');
  });

  return container.innerHTML;
}

/**
 * Renders events into the provided container element.
 */
function renderEvents(container, events) {
  if (!events || events.length === 0) {
    container.innerHTML = '<p>No events to display.</p>';
    return;
  }

  container.innerHTML = ''; // Clear existing content

  events.forEach(event => {
    const start = event.start.dateTime || event.start.date;
    const end = event.end.dateTime || event.end.date;
    const eventTimeZone = event.start.timeZone || 'UTC';

    const { eventTZ, localTZ } = formatEventTimes(start, end, eventTimeZone);

    const article = document.createElement('article');

    // Title
    const h3 = document.createElement('h3');
    h3.textContent = event.summary || 'Untitled Event';

    // Time info
    const pWhen = document.createElement('p');
    pWhen.innerHTML = `
      <strong>When (Event Time Zone):</strong><br>${eventTZ}<br>
      <strong>Your Time:</strong><br>${localTZ}
    `;

    // Description container
    const desc = document.createElement('div');
    if (event.description) {
      const cleanDesc = cleanDescription(event.description);
      const safeDesc = sanitizeDescription(cleanDesc);
      desc.innerHTML = safeDesc;
    } else {
      desc.textContent = '(No description provided)';
    }

    article.appendChild(h3);
    article.appendChild(pWhen);
    article.appendChild(desc);

    container.appendChild(article);
  });
}

/**
 * Fetch all calendar events.
 */
async function fetchEvents() {
  const url = `${EVENTS_API_URL}?key=${API_KEY}&singleEvents=true&orderBy=startTime&maxResults=2500`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`API error: ${response.statusText}`);

  const data = await response.json();
  return data.items || [];
}

/**
 * Load events and separate into upcoming and past events.
 */
async function loadEvents() {
  try {
    const events = await fetchEvents();
    const now = new Date();

    const upcoming = events.filter(e => new Date(e.start.dateTime || e.start.date) >= now);
    const past = events.filter(e => new Date(e.start.dateTime || e.start.date) < now);

    if (upcomingContainer) renderEvents(upcomingContainer, upcoming);

    if (pastContainer) {
      past.sort((a, b) => new Date(b.start.dateTime || b.start.date) - new Date(a.start.dateTime || a.start.date));
      renderEvents(pastContainer, past);
    }
  } catch (err) {
    console.error('Error loading events:', err);
    if (upcomingContainer) upcomingContainer.innerHTML = '<p>Error loading upcoming events.</p>';
    if (pastContainer) pastContainer.innerHTML = '<p>Error loading past events.</p>';
  }
}

// Load events on page load
loadEvents();

