// events.js

// === Configuration: Set your calendar ID and public API key ===
const CALENDAR_ID = 'canrugroup@gmail.com';
const API_KEY = 'AIzaSyB5OeElttTcYlFt52JSKJqHMXoBHtQYhdQ';

// === DOM elements to populate (optional per page) ===
const upcomingContainer = document.getElementById('upcoming-events');
const pastContainer = document.getElementById('past-events');

// === Google Calendar Events API endpoint ===
const EVENTS_API_URL = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`;

/**
 * Format a date string in a given time zone.
 * 
 * @param {string} dateStr - The ISO date/time string.
 * @param {string|undefined} timeZone - IANA time zone string (e.g., 'America/New_York'), or undefined for user's local.
 * @param {string} label - Text label to prefix the time, e.g. "Event Time", "Your Time".
 * @returns {string} - Formatted label + time string in specified time zone.
 */
function formatDateInTimeZone(dateStr, timeZone, label) {
  const date = new Date(dateStr);
  const options = {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZoneName: 'short',
    timeZone: timeZone
  };
  const formatted = date.toLocaleString(undefined, options);
  return `<strong>${label}:</strong> ${formatted}`;
}

/**
 * Attempts to clean and decode Google Calendar HTML descriptions.
 * Addresses double-encoded or broken <a> tags.
 */
function cleanDescription(html) {
  try {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = html;
    const decoded = textarea.value;

    // Fallback to <pre> if we see nested <a> tags, indicating broken markup
    if (decoded.match(/<a[^>]*><a[^>]*>/)) {
      return `<pre>${decoded}</pre>`;
    }

    return decoded;
  } catch (e) {
    return html; // In case decoding fails, return raw HTML
  }
}

/**
 * Render a list of events to the specified container as <article> blocks.
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

    const eventTimeZone = event.start.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    // --- Main article for the event ---
    const article = document.createElement('article');

    // Event title
    const h3 = document.createElement('h3');
    h3.textContent = event.summary || 'Untitled Event';

    // Event time in both event time zone and local time zone
    const pWhen = document.createElement('p');
    pWhen.innerHTML = `
      ${formatDateInTimeZone(start, eventTimeZone, 'Event Time')} - ${formatDateInTimeZone(end, eventTimeZone, '')}<br>
      ${formatDateInTimeZone(start, undefined, 'Your Time')} - ${formatDateInTimeZone(end, undefined, '')}
    `;

    // Location, if available
    let pLocation = null;
    if (event.location) {
      pLocation = document.createElement('p');
      pLocation.innerHTML = `<strong>Location:</strong> ${event.location}`;
    }

    // Event description with HTML support
    const descDiv = document.createElement('div');
    if (event.description) {
      descDiv.innerHTML = cleanDescription(event.description);
    }

    // Append components to the article
    article.appendChild(h3);
    article.appendChild(pWhen);
    if (pLocation) article.appendChild(pLocation);
    article.appendChild(descDiv);

    // Add article to the container
    container.appendChild(article);
  });
}

/**
 * Fetches all events (up to 2500) from Google Calendar.
 */
async function fetchEvents() {
  const url = `${EVENTS_API_URL}?key=${API_KEY}&singleEvents=true&orderBy=startTime&maxResults=2500`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Main logic: Fetch events, split them into upcoming/past, and render each set.
 */
async function loadEvents() {
  try {
    const events = await fetchEvents();
    const now = new Date();

    // Filter based on whether event is upcoming or past
    const upcoming = events.filter(e => new Date(e.start.dateTime || e.start.date) >= now);
    const past = events.filter(e => new Date(e.start.dateTime || e.start.date) < now);

    // Render upcoming
    if (upcomingContainer) {
      renderEvents(upcomingContainer, upcoming);
    }

    // Render past (sorted most recent first)
    if (pastContainer) {
      past.sort((a, b) =>
        new Date(b.start.dateTime || b.start.date) - new Date(a.start.dateTime || a.start.date)
      );
      renderEvents(pastContainer, past);
    }

  } catch (error) {
    console.error('Error loading events:', error);

    if (upcomingContainer) {
      upcomingContainer.innerHTML = '<p>Error loading upcoming events.</p>';
    }
    if (pastContainer) {
      pastContainer.innerHTML = '<p>Error loading past events.</p>';
    }
  }
}

// === Run the script once loaded ===
loadEvents();
