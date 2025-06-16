// events.js

const CALENDAR_ID = 'canrugroup@gmail.com';
const API_KEY = 'AIzaSyB5OeElttTcYlFt52JSKJqHMXoBHtQYhdQ';

const upcomingContainer = document.getElementById('upcoming-events');
const pastContainer = document.getElementById('past-events');

const EVENTS_API_URL = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`;

function formatDateTime(dateStr) {
  const options = {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZoneName: 'short'
  };
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, options);
}

function renderEvents(container, events) {
  if (!events || events.length === 0) {
    container.innerHTML = '<p>No events to display.</p>';
    return;
  }

  container.innerHTML = ''; // Clear previous content

  events.forEach(event => {
    const start = event.start.dateTime || event.start.date;
    const end = event.end.dateTime || event.end.date;

    const article = document.createElement('article');

    // Title
    const h3 = document.createElement('h3');
    h3.textContent = event.summary || 'Untitled Event';

    // Time
    const pWhen = document.createElement('p');
    pWhen.innerHTML = `<strong>When:</strong> ${formatDateTime(start)} - ${formatDateTime(end)}`;

    // Location (optional)
    let pLocation = null;
    if (event.location) {
      pLocation = document.createElement('p');
      pLocation.innerHTML = `<strong>Location:</strong> ${event.location}`;
    }

    // Description (supports embedded HTML from Google Calendar)
    const descDiv = document.createElement('div');
    if (event.description) {
      descDiv.innerHTML = event.description; // This will render HTML correctly
    }

    // Compose
    article.appendChild(h3);
    article.appendChild(pWhen);
    if (pLocation) article.appendChild(pLocation);
    article.appendChild(descDiv);

    container.appendChild(article);
  });
}

async function fetchEvents() {
  const url = `${EVENTS_API_URL}?key=${API_KEY}&singleEvents=true&orderBy=startTime&maxResults=2500`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API error: ${response.statusText}`);
  const data = await response.json();
  return data.items || [];
}

async function loadEvents() {
  try {
    const events = await fetchEvents();
    const upcoming = [];
    const past = [];
    const now = new Date();

    events.forEach(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date);
      if (eventDate >= now) {
        upcoming.push(event);
      } else {
        past.push(event);
      }
    });

    if (upcomingContainer) {
      renderEvents(upcomingContainer, upcoming);
    }

    if (pastContainer) {
      past.sort((a, b) => new Date(b.start.dateTime || b.start.date) - new Date(a.start.dateTime || a.start.date));
      renderEvents(pastContainer, past);
    }

  } catch (error) {
    console.error('Error loading events:', error);
    if (upcomingContainer) upcomingContainer.innerHTML = '<p>Could not load upcoming events.</p>';
    if (pastContainer) pastContainer.innerHTML = '<p>Could not load past events.</p>';
  }
}

loadEvents();
