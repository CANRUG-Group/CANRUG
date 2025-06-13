// events.js

// Replace these with your actual calendar ID and API key
const CALENDAR_ID = 'your_calendar_id@group.calendar.google.com';
const API_KEY = 'YOUR_GOOGLE_API_KEY';

// ISO date/time now, used for filtering
const nowISO = new Date().toISOString();

// Elements for upcoming and past events (one will exist per page)
const upcomingContainer = document.getElementById('upcoming-events');
const pastContainer = document.getElementById('past-events');

// Base URL for Google Calendar API events list endpoint
const EVENTS_API_URL = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`;

// Common function to format date/time nicely
function formatDateTime(dateStr) {
  const options = { 
    year: 'numeric', month: 'short', day: 'numeric', 
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short' 
  };
  return new Date(dateStr).toLocaleString(undefined, options);
}

// Render events into a container as HTML
function renderEvents(container, events) {
  if (!events || events.length === 0) {
    container.innerHTML = '<p>No events to display.</p>';
    return;
  }

  // Build HTML list of events
  const html = events.map(event => {
    const start = event.start.dateTime || event.start.date; // all-day or dateTime
    const end = event.end.dateTime || event.end.date;
    const location = event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : '';
    const description = event.description ? `<p>${event.description}</p>` : '';
    
    // Registration link if present in event description or a custom extended property?
    // For simplicity, check if description contains a URL (basic regex)
    let registrationLink = '';
    if (event.description) {
      const urlMatch = event.description.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        registrationLink = `<p><a href="${urlMatch[0]}" target="_blank" rel="noopener noreferrer">Register Here</a></p>`;
      }
    }

    return `
      <article>
        <h3>${event.summary}</h3>
        <p><strong>When:</strong> ${formatDateTime(start)} - ${formatDateTime(end)}</p>
        ${location}
        ${description}
        ${registrationLink}
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

// Main function to load and render events based on page
async function loadEvents() {
  try {
    const events = await fetchEvents();

    // Separate upcoming and past
    const upcomingEvents = [];
    const pastEvents = [];

    const now = new Date();

    events.forEach(event => {
      // Use start.dateTime or start.date for comparison
      let eventDate = event.start.dateTime || event.start.date; 
      eventDate = new Date(eventDate);

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
      // Sort past events descending (most recent first)
      pastEvents.sort((a, b) => new Date(b.start.dateTime || b.start.date) - new Date(a.start.dateTime || a.start.date));
      renderEvents(pastContainer, pastEvents);
    }
  } catch (error) {
    console.error(error);
    if (upcomingContainer) upcomingContainer.innerHTML = `<p>Error loading upcoming events.</p>`;
    if (pastContainer) pastContainer.innerHTML = `<p>Error loading past events.</p>`;
  }
}

// Run the script
loadEvents();
