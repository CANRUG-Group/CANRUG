/**
 * Events Loader for CANRUG Website
 * 
 * This JavaScript file loads calendar events from the events.json file
 * (created by events-fetcher.py) and displays them on the website.
 * 
 * It handles both upcoming and past events, formatting them nicely
 * and making them accessible to users.
 */

/**
 * Sanitizes HTML content to prevent security issues.
 * 
 * This function takes potentially unsafe HTML and makes it safe to display.
 * It uses the browser's built-in HTML parser to clean the content.
 * 
 * @param {string} html - The HTML content to sanitize
 * @returns {string} - Safe HTML content
 * 
 * How it works:
 * 1. Creates a temporary div element in memory
 * 2. Sets its innerHTML to the input HTML
 * 3. The browser automatically parses and sanitizes it
 * 4. Returns the cleaned HTML
 */
function sanitizeDescription(html) {
  // Create a temporary div element that exists only in memory (not visible on page)
  const temp = document.createElement('div');
  
  // Set the HTML content - the browser will automatically parse and clean it
  temp.innerHTML = html;
  
  // Return the sanitized HTML
  return temp.innerHTML;
}

/**
 * Formats a date range for display.
 * 
 * Takes start and end date strings and formats them in a human-readable way.
 * For example: "Dec 1, 2024, 10:00 AM - 11:00 AM"
 * 
 * @param {string} startStr - ISO date string for event start (e.g., "2024-12-01T10:00:00Z")
 * @param {string} endStr - ISO date string for event end (e.g., "2024-12-01T11:00:00Z")
 * @returns {string} - Formatted date range string
 */
function formatDateRange(startStr, endStr) {
  // Convert the ISO date strings into JavaScript Date objects
  const start = new Date(startStr);
  const end = new Date(endStr);
  
  // Define how we want the dates formatted
  const options = {
    year: 'numeric',        // Show full year (2024)
    month: 'short',         // Show abbreviated month (Dec)
    day: 'numeric',         // Show day number (1)
    hour: '2-digit',        // Show hour with 2 digits (10)
    minute: '2-digit',      // Show minute with 2 digits (00)
    hour12: true           // Use 12-hour format with AM/PM
  };
  
  // Format both dates using the user's local timezone and language settings
  // toLocaleString() automatically uses the visitor's browser settings
  const startFormatted = start.toLocaleString(undefined, options);
  const endFormatted = end.toLocaleString(undefined, options);
  
  // Return the formatted range
  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Renders a list of events into a specified HTML container.
 * 
 * This function takes an array of event objects and creates HTML elements
 * to display them nicely on the webpage.
 * 
 * @param {HTMLElement} container - The DOM element where events should be displayed
 * @param {Array} events - Array of event objects from the JSON file
 */
function renderEvents(container, events) {
  // Check if there are any events to display
  if (!events.length) {
    // If no events, show a message instead
    container.innerHTML = '<p>No events to display.</p>';
    return; // Exit the function early
  }

  // Clear any existing content in the container
  container.innerHTML = '';

  // Loop through each event and create HTML for it
  events.forEach(event => {
    // Create an <article> element for each event
    // <article> is semantic HTML that represents a standalone piece of content
    const article = document.createElement('article');

    // Create the event title as an <h3> heading
    const h3 = document.createElement('h3');
    h3.textContent = event.summary || 'Untitled Event'; // Use event title or fallback

    // Create a paragraph for the event timing
    const pWhen = document.createElement('p');
    // Use innerHTML here because we want to include the <strong> tag for styling
    pWhen.innerHTML = `<strong>When:</strong> ${formatDateRange(event.start, event.end)}`;

    // Create a div for the event description
    const desc = document.createElement('div');
    if (event.description) {
      // If there's a description, sanitize it and display it
      desc.innerHTML = sanitizeDescription(event.description);
    } else {
      // If no description, show a placeholder message
      desc.textContent = '(No description provided)';
    }

    // Create a paragraph with a link to add the event to Google Calendar
    const calendarLink = document.createElement('p');
    calendarLink.innerHTML = `<a href="${event.htmlLink}" target="_blank" rel="noopener noreferrer nofollow">➕ Add to Google Calendar</a>`;
    
    // Explanation of link attributes:
    // - target="_blank": Opens link in new tab
    // - rel="noopener": Security feature to prevent new tab from accessing the original page
    // - rel="noreferrer": Prevents the new page from knowing where the visitor came from
    // - rel="nofollow": Tells search engines not to follow this link for SEO purposes

    // Assemble the complete event HTML by adding all pieces to the article
    article.appendChild(h3);           // Add title
    article.appendChild(pWhen);        // Add timing
    article.appendChild(desc);         // Add description
    article.appendChild(calendarLink); // Add calendar link

    // Add the completed event article to the container
    container.appendChild(article);
  });
}

/**
 * Loads events from the events.json file and displays them on the page.
 * 
 * This is the main function that:
 * 1. Fetches the events.json file created by our Python script
 * 2. Parses the JSON data
 * 3. Finds the appropriate containers on the page
 * 4. Renders the events in those containers
 * 
 * This function is async because it needs to wait for the file to download.
 */
async function loadEvents() {
  try {
    // Fetch the events.json file from the server
    console.log('Loading events from events.json...');
    const response = await fetch('events.json');
    
    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`Failed to load events.json: ${response.status} ${response.statusText}`);
    }
    
    // Parse the JSON data into a JavaScript object
    const data = await response.json();
    console.log('Events loaded successfully:', data);

    // Find the HTML containers where we want to display events
    const upcomingContainer = document.getElementById('upcoming-events');
    const pastContainer = document.getElementById('past-events');

    // Render upcoming events if we found the container
    if (upcomingContainer) {
      console.log(`Rendering ${data.upcoming?.length || 0} upcoming events`);
      renderEvents(upcomingContainer, data.upcoming || []);
    } else {
      console.log('No upcoming events container found on this page');
    }

    // Render past events if we found the container
    if (pastContainer) {
      console.log(`Rendering ${data.past?.length || 0} past events`);
      renderEvents(pastContainer, data.past || []);
    } else {
      console.log('No past events container found on this page');
    }

  } catch (err) {
    // If anything goes wrong, log the error and show user-friendly messages
    console.error('Error loading events:', err);
    
    // Show error message in upcoming events container if it exists
    const upcomingContainer = document.getElementById('upcoming-events');
    if (upcomingContainer) {
      upcomingContainer.innerHTML = '<p>Error loading upcoming events. Please try refreshing the page.</p>';
    }

    // Show error message in past events container if it exists
    const pastContainer = document.getElementById('past-events');
    if (pastContainer) {
      pastContainer.innerHTML = '<p>Error loading past events. Please try refreshing the page.</p>';
    }
  }
}

/**
 * Initialize the events loading when the script runs.
 * 
 * This line actually executes the loadEvents function when the script is loaded.
 * Since this script is included at the bottom of the HTML pages, the DOM
 * should be ready when this runs.
 */
console.log('Events loader script started');
loadEvents();