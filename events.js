// events.js

// Replace these with your actual calendar ID and API key
const CALENDAR_ID = 'canrugroup@gmail.com';
const API_KEY = 'AIzaSyB5OeElttTcYlFt52JSKJqHMXoBHtQYhdQ';

// ISO date/time now, used for filtering
const nowISO = new Date().toISOString();

// Elements for upcoming and past events (one will exist per page)
const upcomingContainer = document.getElementById('upcoming-events');
const pastContainer = document.getElementById('past-events');

// Base URL for Google Calendar API events list endpoint
const EVENTS_API_URL = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`;

// Convert ISO date string to readable format with time zone
function formatDateTime(dateStr) {
  const options = {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  };
  return new Date(dateStr).toLocaleString(undefined, options);
}

// Strip invalid HTML and linkify URLs
function linkifyText(text) {
  if (!text) return '';

  // Remove broken HTML tags that may be present in raw Google Calendar description
  const cleanText = text.replace(/<\/?[^>]+(>|$)/g, '');

  // Replace URLs with anchor tags
  return cleanText.replace(/(https?:\/\/[^\s]+)/g, url =>
    `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  );
}

// Format multi-paragraph plain text into paragraph-wrapped HTML with linkified URLs
function formatDescription(text) {
  if (!text) return '';
  const paragraphs = text.trim().split(/\n{2,}/);
  return paragraphs.map(p =>
    `<p>${linkifyText(p.replace(/\n/g, ' '))}</p>`
  ).join('');
}

// Render a list of events into a container
function renderEvents(container, events) {
  if (!events || events.length === 0) {
    container.innerHTML = '<p>No events to display.</p>';
    return;
  }

  const html = events.map(event => {
    const start = event.start.dateTime || event.start.date;
    const end = event.end.dateTime || event.end.date;
    const location = event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : '';
    const description = formatDescription(event.description || '');

    return `
      <article>
        <h3>${event.summary || 'Untitled Event'}</h3>
        <p><strong>When:</strong> ${formatDateTime(start)} - ${formatDateTime(end)}</p>
        ${location}
        ${description}
      </article>
    `;
  }).join('');

  container.innerHTML = html;
}

// Fetch all events from the Google Calendar API (max 2500 events)
async function fetchEvents() {
  const url = `${EVENTS_API_URL}?key=${API_KEY}&singleEvents=true&orderBy=startTime&maxResults=2500`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Calendar API error: ${response.statusText}`);
  }
  const data = await response.json();
  return data.items || [];
}

// Main logic: Fetch, separate, and render events
async function loadEvents() {
  try {
    const events = await fetchEvents();
    const now = new Date();

    const upcomingEvents = [];
    const pastEvents = [];

    events.forEach(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date);
      if (eventDate >= now) {
        upcomingEvents.push(event);
      } else {
        pastEvents.push(event);
      }
    });

    if (upcomingContainer) {
      renderEvents(upcomingContainer, upcomingEvents);
    }

    if (pastContainer) {
      pastEvents.sort((a, b) =>
        new Date(b.start.dateTime || b.start.date) - new Date(a.start.dateTime || a.start.date)
      );
      renderEvents(pastContainer, pastEvents);
    }
  } catch (error) {
    console.error('Error loading events:', error);
    if (upcomingContainer) upcomingContainer.innerHTML = `<p>Error loading upcoming events.</p>`;
    if (pastContainer) pastContainer.innerHTML = `<p>Error loading past events.</p>`;
  }
}

// Run the script
loadEvents();
