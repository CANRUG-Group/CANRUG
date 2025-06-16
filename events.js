// --- Configuration: Replace with your actual values ---
const CALENDAR_ID = 'canrugroup@gmail.com'; // Google Calendar ID
const API_KEY = 'AIzaSyB5OeElttTcYlFt52JSKJqHMXoBHtQYhdQ'; // Public API key for accessing the calendar

// --- DOM Element References ---
const upcomingContainer = document.getElementById('upcoming-events'); // Where upcoming events will render
const pastContainer = document.getElementById('past-events');         // Where past events will render

// --- Google Calendar API URL ---
const EVENTS_API_URL = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`;

/**
 * Formats two date strings into readable representations:
 * 1. In the event's time zone
 * 2. In the user's local time zone
 * 
 * Returns both as strings to be displayed
 */
function formatEventTimes(startStr, endStr, eventTimeZone) {
  const start = new Date(startStr);
  const end = new Date(endStr);

  const baseOptions = {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZoneName: 'short'
  };

  const eventOptions = { ...baseOptions, timeZone: eventTimeZone };
  const localOptions = { ...baseOptions, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };

  const eventTZ = `${start.toLocaleString(undefined, eventOptions)} - ${end.toLocaleString(undefined, eventOptions)}`;
  const localTZ = `${start.toLocaleString(undefined, localOptions)} - ${end.toLocaleString(undefined, localOptions)}`;

  return { eventTZ, localTZ };
}

/**
 * Cleans up and decodes description HTML from Google Calendar:
 * - Fixes escaped unicode characters (\u003c = "<", etc.)
 * - Decodes HTML entities (&lt;, &gt;, &amp;)
 * - Fixes nested/escaped anchor tags
 */
function cleanDescription(input) {
  try {
    // Step 1: Replace encoded unicode characters like \u003c for "<"
    const unicodeDecoded = input
      .replace(/\\u003c/g, '<')
      .replace(/\\u003e/g, '>')
      .replace(/\\u0026/g, '&');

    // Step 2: Decode HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = unicodeDecoded;
    const htmlDecoded = textarea.value;

    // Step 3: Fix malformed nested <a><a> tags
    const wrapper = document.createElement('div');
    wrapper.innerHTML = htmlDecoded;

    // Unwrap double <a><a> structures
    wrapper.querySelectorAll('a a').forEach(nested => {
      const parent = nested.parentElement;
      if (parent) parent.replaceWith(nested);
    });

    return wrapper.innerHTML;
  } catch (e) {
    console.warn('Description decoding error:', e);
    return input; // fallback: return unprocessed input
  }
}

/**
 * Renders a list of events into a given DOM container.
 * Each event includes title, time, and cleaned description.
 */
function renderEvents(container, events) {
  if (!events || events.length === 0) {
    container.innerHTML = '<p>No events to display.</p>';
    return;
  }

  container.innerHTML = ''; // Clear old content

  events.forEach(event => {
    const start = event.start.dateTime || event.start.date; // Support all-day or timed
    const end = event.end.dateTime || event.end.date;
    const eventTimeZone = event.start.timeZone || 'UTC';

    const { eventTZ, localTZ } = formatEventTimes(start, end, eventTimeZone);

    // Create article for each event
    const article = document.createElement('article');

    // Title
    const h3 = document.createElement('h3');
    h3.textContent = event.summary || 'Untitled Event';

    // Time (event time zone and user's time zone)
    const pWhen = document.createElement('p');
    pWhen.innerHTML = `<strong>When:</strong> ${eventTZ}<br><em>(Your Time Zone: ${localTZ})</em>`;

    // Description (decoded and cleaned)
    const desc = document.createElement('div');
    if (event.description) {
      desc.innerHTML = cleanDescription(event.description);
    }

    // Assemble article
    article.appendChild(h3);
    article.appendChild(pWhen);
    article.appendChild(desc);

    // Add to the container
    container.appendChild(article);
  });
}

/**
 * Fetch all events (up to 2500) from the Google Calendar API.
 * Returns an array of event objects.
 */
async function fetchEvents() {
  const url = `${EVENTS_API_URL}?key=${API_KEY}&singleEvents=true&orderBy=startTime&maxResults=2500`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`API error: ${response.statusText}`);

  const data = await response.json();
  return data.items || [];
}

/**
 * Loads all events and categorizes them as upcoming or past.
 * Displays each category in its associated container.
 */
async function loadEvents() {
  try {
    const events = await fetchEvents();
    const now = new Date();

    // Categorize by current time
    const upcoming = events.filter(e => new Date(e.start.dateTime || e.start.date) >= now);
    const past = events.filter(e => new Date(e.start.dateTime || e.start.date) < now);

    // Render upcoming events
    if (upcomingContainer) {
      renderEvents(upcomingContainer, upcoming);
    }

    // Render past events, most recent first
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

// --- Load events when the script is loaded ---
loadEvents();
