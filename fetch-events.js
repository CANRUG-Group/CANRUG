const fetch = require('node-fetch');
const fs = require('fs');

const CALENDAR_ID = 'canrugroup@gmail.com';
const API_KEY = process.env.GOOGLE_API_KEY;

const EVENTS_API_URL = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?key=${API_KEY}&singleEvents=true&orderBy=startTime&maxResults=2500`;

// Helper: Format date string like your frontend
function formatEventTimes(startStr, endStr, eventTimeZone) {
  const start = new Date(startStr);
  const end = new Date(endStr);

  // Format options - simplified (no timeZoneName because Node lacks Intl full support)
  const baseOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };

  // Use Intl.DateTimeFormat with event timezone
  const eventFormatter = new Intl.DateTimeFormat('en-US', { ...baseOptions, timeZone: eventTimeZone });
  const localFormatter = new Intl.DateTimeFormat('en-US', { ...baseOptions, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });

  const eventTZ = `${eventFormatter.format(start)} - ${eventFormatter.format(end)} (${eventTimeZone})`;
  const localTZ = `${localFormatter.format(start)} - ${localFormatter.format(end)} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`;

  return { eventTZ, localTZ };
}

// Clean and sanitize description (basic)
function cleanDescription(input) {
  if (!input) return '';

  // Basic decoding of common escaped chars (same as your JS)
  let decoded = input.replace(/\\u003c/gi, '<')
                     .replace(/\\u003e/gi, '>')
                     .replace(/\\u0026/gi, '&')
                     .replace(/\\u0022/gi, '"')
                     .replace(/\\u0027/gi, "'");
  // Strip all tags except allowed ones (a, br, p, strong, em, ul, ol, li)
  // Since no DOM, do basic regex replace here (warning: crude but works for simple cases)
  const allowedTags = ['a','br','p','strong','em','ul','ol','li'];
  // Remove tags not allowed
  decoded = decoded.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag) => {
    return allowedTags.includes(tag.toLowerCase()) ? match : '';
  });
  return decoded;
}

function makeAddToCalendarLink(event) {
  if (event.htmlLink) return event.htmlLink;

  const start = event.start.dateTime || event.start.date;
  const end = event.end.dateTime || event.end.date;

  const title = encodeURIComponent(event.summary || 'Event');
  const details = encodeURIComponent(event.description || '');
  const location = encodeURIComponent(event.location || '');

  const startStr = new Date(start).toISOString().replace(/-|:|\.\d\d\d/g, '');
  const endStr = new Date(end).toISOString().replace(/-|:|\.\d\d\d/g, '');

  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}&sf=true&output=xml`;
}

async function main() {
  try {
    const res = await fetch(EVENTS_API_URL);
    if (!res.ok) throw new Error(`Google API error: ${res.statusText}`);

    const data = await res.json();
    const events = data.items || [];

    const now = new Date();

    // Separate upcoming and past
    const upcoming = [];
    const past = [];

    for (const event of events) {
      const start = event.start.dateTime || event.start.date;
      const eventTimeZone = event.start.timeZone || 'UTC';

      const when = formatEventTimes(start, event.end.dateTime || event.end.date, eventTimeZone);
      const cleanDesc = cleanDescription(event.description || '');
      const addToCalLink = makeAddToCalendarLink(event);

      // Build your processed event object, matching your frontend needs
      const processedEvent = {
        summary: event.summary || 'Untitled Event',
        start,
        end: event.end.dateTime || event.end.date,
        eventTimeZone,
        whenEventTZ: when.eventTZ,
        whenLocalTZ: when.localTZ,
        description: cleanDesc,
        htmlLink: addToCalLink,
        location: event.location || ''
      };

      // Sort based on date
      if (new Date(start) >= now) {
        upcoming.push(processedEvent);
      } else {
        past.push(processedEvent);
      }
    }

    // Sort past events descending by start date (latest first)
    past.sort((a,b) => new Date(b.start) - new Date(a.start));

    // Final JSON structure
    const output = {
      upcoming,
      past
    };

    // Save to events.json
    fs.writeFileSync('events.json', JSON.stringify(output, null, 2), 'utf-8');
    console.log('Events processed and saved to events.json');
  } catch (err) {
    console.error('Error fetching or processing events:', err);
    process.exit(1);
  }
}

main();
