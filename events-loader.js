// Utility: format dates nicely (local timezone)
function formatDateRange(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);

  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };

  return `${start.toLocaleString(undefined, options)} - ${end.toLocaleString(undefined, options)}`;
}

// Sanitize description (very basic, can be improved)
function sanitizeDescription(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  // Remove scripts or unwanted tags here if needed
  return temp.innerHTML;
}

// Render events to a container
function renderEvents(container, events) {
  if (!events.length) {
    container.innerHTML = '<p>No events to display.</p>';
    return;
  }

  container.innerHTML = ''; // Clear existing

  events.forEach(event => {
    const article = document.createElement('article');

    // Title
    const h3 = document.createElement('h3');
    h3.textContent = event.summary || 'Untitled Event';

    // When
    const pWhen = document.createElement('p');
    pWhen.innerHTML = `<strong>When:</strong> ${formatDateRange(event.start, event.end)}`;

    // Description
    const desc = document.createElement('div');
    if (event.description) {
      desc.innerHTML = sanitizeDescription(event.description);
    } else {
      desc.textContent = '(No description provided)';
    }

    // Add to Google Calendar link
    const calendarLink = document.createElement('p');
    calendarLink.innerHTML = `<a href="${event.htmlLink}" target="_blank" rel="noopener noreferrer nofollow">➕ Add to Google Calendar</a>`;

    article.appendChild(h3);
    article.appendChild(pWhen);
    article.appendChild(desc);
    article.appendChild(calendarLink);

    container.appendChild(article);
  });
}

// Fetch events.json and split upcoming/past by current date
async function loadEvents() {
  try {
    const response = await fetch('events.json');
    if (!response.ok) throw new Error('Failed to load events.json');
    const events = await response.json();

    const now = new Date();

    // Separate upcoming and past
    const upcoming = events.filter(e => new Date(e.start) >= now);
    const past = events.filter(e => new Date(e.start) < now).sort((a, b) => new Date(b.start) - new Date(a.start));

    const upcomingContainer = document.getElementById('upcoming-events');
    if (upcomingContainer) renderEvents(upcomingContainer, upcoming);

    const pastContainer = document.getElementById('past-events');
    if (pastContainer) renderEvents(pastContainer, past);

  } catch (err) {
    console.error(err);
    const upcomingContainer = document.getElementById('upcoming-events');
    if (upcomingContainer) upcomingContainer.innerHTML = '<p>Error loading upcoming events.</p>';

    const pastContainer = document.getElementById('past-events');
    if (pastContainer) pastContainer.innerHTML = '<p>Error loading past events.</p>';
  }
}

loadEvents();
