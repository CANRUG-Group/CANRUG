// events.js

// Replace these with your actual calendar ID and API key
const CALENDAR_ID = 'canrugroup@gmail.com';
const API_KEY = 'AIzaSyB5OeElttTcYlFt52JSKJqHMXoBHtQYhdQ';

// Elements for upcoming and past events (one will exist per page)
const upcomingContainer = document.getElementById('upcoming-events');
const pastContainer = document.getElementById('past-events');

// Base URL for Google Calendar API events list endpoint
const EVENTS_API_URL = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`;

// Format date/time nicely in user's local timezone
function formatDateTime(dateStr) {
  const options = { 
    year: 'numeric', month: 'short', day: 'numeric', 
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short' 
  };
  // Convert to Date object then format using user's browser timezone
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, options);
}

// Render events into a container as HTML with proper HTML in description
function renderEvents(container, events) {
  if (!events || events.length === 0) {
    container.innerHTML = '<p>No events to display.</p>';
    return;
  }

  container.innerHTML = ''; // Clear container

  events.forEach(event => {
    const start = event.start.dateTime || event.start.date;
    const end = event.end.dateTime || event.end.date;

    // Create main article element for the event
    const article = document.createElement('article');

    // Event title
    const h3 = document.createElement('h3');
    h3.textContent = event.summary || 'Untitled Event';

    // Event timing
    const pWhen = document.createElement('p');
    pWhen.innerHTML = `<strong>When:</strong> ${formatDateTime(start)} - ${formatDateTime(end)}`;

    // Location (if exists)
    let pLocation = null;
    if (event.location) {
      pLocation = document.createElement('p');
      pLocation.innerHTML = `<strong>Location:</strong> ${event.location}`;
    }

    // Description div with HTML rendering
    const descDiv = document.createElement('div');
    if (event.description) {
      descDiv.innerHTML = event.description;
    }

    // Append all elements in order
    article.appendChild(h3);
    article.appendChild(pWhen);
    if (pLocation) article.appendChild(pLocation);
    article.appendChild(descDiv);

    container.appendChild(article);
  });
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

    const upcomingEvents = [];
    const pastEvents = [];

    const now = new Date();

    events.forEach(event => {
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
