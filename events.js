// --- Configuration: Replace with your actual values ---
const CALENDAR_ID = 'canrugroup@gmail.com'; // Google Calendar ID
const API_KEY = 'AIzaSyB5OeElttTcYlFt52JSKJqHMXoBHtQYhdQ'; // Public API key

// --- DOM Element References ---
const upcomingContainer = document.getElementById('upcoming-events');
const pastContainer = document.getElementById('past-events');

// --- Google Calendar API endpoint ---
const EVENTS_API_URL = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`;

/**
 * Formats a date string into readable form for a given time zone and user's local time zone.
 * Returns both representations.
 */
function formatEventTimes(startStr, endStr, eventTimeZone) {
  const start = new Date(startStr);
  const end = new Date(endStr);

  const eventOptions = {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: eventTimeZone,
    timeZoneName: 'short'
  };

  const localOptions = { ...eventOptions, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };

  const eventTZ = `${start.toLocaleString(undefined, eventOptions)} - ${end.toLocaleString(undefined, eventOptions)}`;
  const localTZ = `${start.toLocaleString(undefined, localOptions)} - ${end.toLocaleString(undefined, localOptions)}`;

  return { eventTZ, localTZ };
}

/**
 * Cleans up and decodes Google Calendar's HTML description content.
 */
function cleanDescription(input) {
  try {
    // Step 1: Replace unicode escape sequences (e.g. \u003c)
    const unicodeDecoded = input
      .replace(/\\u003c/g, '<')
      .replace(/\\u003e/g, '>')
      .replace(/\\u0026/g, '&');

    // Step 2: Decode HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = unicodeDecoded;
    const htmlDecoded = textarea.value;

    // Step 3: Create wrapper div and fix malformed <a><a>
    const wrapper = document.createElement('div');
    wrapper.innerHTML = htmlDecoded;

    // Remove nested <a><a>
    wrapper.querySelectorAll('a a').forEach(nested => {
      const parent = nested.parentElement;
      if (parent) parent.replaceWith(nested);
    });

    return wrapper.innerHTML;
  } catch (e) {
    console.warn('Description decoding error:', e);
    return input;
  }
}

/**
 * Renders events to the given container.
 */
function renderEvents(container, events) {
  if (!events || events.length === 0) {
    container.innerHTML = '<p>No events to display.</p>';
    return;
  }

  container.innerHTML = ''; // Clear previous content

  events.forEach(event => {
    const start = event.start.dateTime || event.start.date;
    const end = event.end.dateTime || event.end.date;
    const eventTimeZone = event.start.timeZone || 'UTC';

    const { eventTZ, localTZ } = formatEventTimes(start, end, eventTimeZone);

    const article = document.createElement('article');

    // Title
    const h3 = document.createElement('h3');
    h3.textContent = event.summary || 'Untitled Event';

    // Time
    const pWhen = document.createElement('p');
    pWhen.innerHTML = `<strong>When:</strong> ${eventTZ}<br><em>(Your Time Zone: ${localTZ})</em>`;

    // Description
    const desc = document.createElement('p');
    if (event.description) {
      desc.innerHTML = cleanDescription(event.description);
    }

    // Append content
    article.appendChild(h3);
    article.appendChild(pWhen);
    article.appendChild(desc);

    container.appendChild(article);
  });
}

/**
 * Fetch all calendar events (up to 2500 max).
 */
async function fetchEvents() {
  const url = `${EVENTS_API_URL}?key=${API_KEY}&singleEvents=true&orderBy=startTime&maxResults=2500`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`API error: ${response.statusText}`);

  const data = await response.json();
  return data.items || [];
}

/**
 * Main: Load and categorize events.
 */
async function loadEvents() {
  try {
    const events = await fetchEvents();
    const now = new Date();

    const upcoming = events.filter(e => new Date(e.start.dateTime || e.start.date) >= now);
    const past = events.filter(e => new Date(e.start.dateTime || e.start.date) < now);

    if (upcomingContainer) {
      renderEvents(upcomingContainer, upcoming);
    }

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

// Load on page load
loadEvents();
