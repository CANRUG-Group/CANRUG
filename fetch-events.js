const fetch = require('node-fetch');
const fs = require('fs');

const CALENDAR_ID = 'canrugroup@gmail.com';
const API_KEY = process.env.GOOGLE_API_KEY;

const EVENTS_API_URL = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?key=${API_KEY}&singleEvents=true&orderBy=startTime&maxResults=2500`;

(async () => {
  try {
    const res = await fetch(EVENTS_API_URL);
    if (!res.ok) throw new Error(`API error: ${res.statusText}`);

    const data = await res.json();

    fs.writeFileSync('events.json', JSON.stringify(data.items || [], null, 2));
    console.log('Events saved to events.json');
  } catch (err) {
    console.error('Fetch failed:', err);
    process.exit(1);
  }
})();
