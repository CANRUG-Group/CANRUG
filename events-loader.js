// Sanitize description safely (basic)
function sanitizeDescription(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.innerHTML;
}

// Format date range (local timezone)
function formatDateRange(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
  return `${start.toLocaleString(undefined, options)} - ${end.toLocaleString(undefined, options)}`;
}

// Render a list of events into a container
function renderEvents(container, events) {
  if (!events.length) {
    container.innerHTML = '<p>No events to display.</p>';
    return;
  }

  container.innerHTML = '';

  events.forEach(event => {
    const article = document.createElement('article');

    const h3 = document.createElement('h3');
    h3.textContent = event.summary || 'Untitled Event';

    const pWhen = document.createElement('p');
    pWhen.innerHTML = `<strong>When:</strong> ${formatDateRange(event.start, event.end)}`;

    const desc = document.createElement('div');
    if (event.description) {
      desc.innerHTML = sanitizeDescription(event.description);
    } else {
      desc.textContent = '(No description provided)';
    }

    const calendarLink = document.createElement('p');
    calendarLink.innerHTML = `<a href="${event.htmlLink}" target="_blank" rel="noopener noreferrer nofollow">➕ Add to Google Calendar</a>`;

    article.appendChild(h3);
    article.appendChild(pWhen);
    article.appendChild(desc);
    article.appendChild(calendarLink);

    container.appendChild(article);
  });
}

// Fetch events.json and render upcoming & past
async function loadEvents() {
  try {
    const response = await fetch('events.json');
    if (!response.ok) throw new Error('Failed to load events.json');
    const data = await response.json();

    const upcomingContainer = document.getElementById('upcoming-events');
    const pastContainer = document.getElementById('past-events');

    if (upcomingContainer) renderEvents(upcomingContainer, data.upcoming || []);
    if (pastContainer) renderEvents(pastContainer, data.past || []);

  } catch (err) {
    console.error(err);
    const upcomingContainer = document.getElementById('upcoming-events');
    if (upcomingContainer) upcomingContainer.innerHTML = '<p>Error loading upcoming events.</p>';

    const pastContainer = document.getElementById('past-events');
    if (pastContainer) pastContainer.innerHTML = '<p>Error loading past events.</p>';
  }
}

loadEvents();
