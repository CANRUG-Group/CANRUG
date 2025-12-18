#!/usr/bin/env python3
"""
Fetches events from Google Calendar API and saves them to events.json.
Generates HTML includes for upcoming and past events.
"""

import os
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
import urllib.request
import urllib.parse
import urllib.error

# Configuration from environment variables
API_KEY = os.environ.get('GOOGLE_CALENDAR_API_KEY', '')
CALENDAR_ID = os.environ.get('CALENDAR_ID', '')

# File paths
EVENTS_JSON = Path('events.json')
INCLUDES_DIR = Path('_includes')
UPCOMING_HTML = INCLUDES_DIR / 'events-upcoming.html'
PAST_HTML = INCLUDES_DIR / 'events-past.html'


def fetch_calendar_events(api_key, calendar_id):
    """Fetch all events from Google Calendar API."""
    if not api_key or not calendar_id:
        print("ERROR: GOOGLE_CALENDAR_API_KEY and CALENDAR_ID must be set")
        sys.exit(1)
    
    # Encode calendar ID for URL
    encoded_calendar_id = urllib.parse.quote(calendar_id, safe='')
    
    # API endpoint
    base_url = f'https://www.googleapis.com/calendar/v3/calendars/{encoded_calendar_id}/events'
    
    # Parameters
    params = {
        'key': api_key,
        'maxResults': 2500,
        'singleEvents': 'true',
        'orderBy': 'startTime'
    }
    
    url = f"{base_url}?{urllib.parse.urlencode(params)}"
    
    try:
        print(f"Fetching events from Google Calendar API...")
        with urllib.request.urlopen(url) as response:
            data = response.read()
            events_data = json.loads(data)
            print(f"Successfully fetched {len(events_data.get('items', []))} events")
            return events_data
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.reason}")
        print(e.read().decode())
        sys.exit(1)
    except Exception as e:
        print(f"Error fetching events: {e}")
        sys.exit(1)


def categorize_events(events_data):
    """Categorize events into upcoming and past based on current UTC time."""
    now = datetime.now(timezone.utc)
    upcoming = []
    past = []
    
    for event in events_data.get('items', []):
        # Get event start time
        start = event.get('start', {})
        start_str = start.get('dateTime') or start.get('date')
        
        if not start_str:
            continue
        
        # Parse the datetime
        try:
            if 'T' in start_str:
                event_dt = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
            else:
                # All-day event
                event_dt = datetime.fromisoformat(start_str + 'T00:00:00+00:00')
            
            if event_dt >= now:
                upcoming.append(event)
            else:
                past.append(event)
        except Exception as e:
            print(f"Warning: Could not parse date for event: {event.get('summary', 'Unknown')} - {e}")
    
    return upcoming, past


def generate_event_html(event):
    """Generate HTML for a single event."""
    summary = event.get('summary', 'Untitled Event')
    description = event.get('description', '')
    location = event.get('location', '')
    
    # Get start and end times
    start = event.get('start', {})
    end = event.get('end', {})
    
    start_dt = start.get('dateTime') or start.get('date')
    end_dt = end.get('dateTime') or end.get('date')
    
    # Default timezone display
    timezone_str = start.get('timeZone', 'UTC')
    
    html = '<article class="event-card">\n'
    html += f'    <h3>{escape_html(summary)}</h3>\n'
    
    if start_dt and end_dt:
        # Format for display (original timezone)
        try:
            if 'T' in start_dt:
                start_obj = datetime.fromisoformat(start_dt.replace('Z', '+00:00'))
                end_obj = datetime.fromisoformat(end_dt.replace('Z', '+00:00'))
                
                # Original timezone display
                date_str = start_obj.strftime('%B %d, %Y')
                time_str = f"{start_obj.strftime('%I:%M %p')} - {end_obj.strftime('%I:%M %p')}"
                
                html += f'    <p><strong>Date:</strong> {date_str}</p>\n'
                html += f'    <p><strong>Time:</strong> {time_str} ({timezone_str})</p>\n'
                html += f'    <p><strong>Your Local Time:</strong> <span class="js-local-time" data-start="{start_dt}" data-end="{end_dt}">Loading...</span></p>\n'
            else:
                # All-day event
                date_obj = datetime.fromisoformat(start_dt)
                date_str = date_obj.strftime('%B %d, %Y')
                html += f'    <p><strong>Date:</strong> {date_str} (All day)</p>\n'
        except Exception as e:
            print(f"Warning: Could not format date for event: {summary} - {e}")
            html += f'    <p><strong>Time:</strong> {start_dt}</p>\n'
    
    if location:
        html += f'    <p><strong>Location:</strong> {escape_html(location)}</p>\n'
    
    if description:
        # Convert newlines to <br> and preserve links
        desc_html = escape_html(description).replace('\n', '<br>')
        html += f'    <div class="event-description">{desc_html}</div>\n'
    
    html += '</article>\n'
    
    return html


def escape_html(text):
    """Escape HTML special characters."""
    return (text
            .replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;')
            .replace('"', '&quot;')
            .replace("'", '&#39;'))


def save_events_json(events_data):
    """Save raw events data to events.json."""
    EVENTS_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(EVENTS_JSON, 'w', encoding='utf-8') as f:
        json.dump(events_data, f, indent=2, ensure_ascii=False)
    print(f"Saved events data to {EVENTS_JSON}")


def generate_html_includes(upcoming, past):
    """Generate HTML include files for upcoming and past events."""
    INCLUDES_DIR.mkdir(parents=True, exist_ok=True)
    
    # Generate upcoming events HTML
    if upcoming:
        upcoming_html = ''.join(generate_event_html(event) for event in upcoming)
    else:
        upcoming_html = '<p>No upcoming events at this time. Check back soon!</p>\n'
    
    with open(UPCOMING_HTML, 'w', encoding='utf-8') as f:
        f.write(upcoming_html)
    print(f"Generated {UPCOMING_HTML} with {len(upcoming)} events")
    
    # Generate past events HTML (reverse chronological)
    if past:
        past.reverse()  # Most recent first
        past_html = ''.join(generate_event_html(event) for event in past)
    else:
        past_html = '<p>No past events recorded.</p>\n'
    
    with open(PAST_HTML, 'w', encoding='utf-8') as f:
        f.write(past_html)
    print(f"Generated {PAST_HTML} with {len(past)} events")


def main():
    """Main execution flow."""
    print("=" * 60)
    print("CANRUG Event Fetcher")
    print("=" * 60)
    
    # Fetch events from Google Calendar
    events_data = fetch_calendar_events(API_KEY, CALENDAR_ID)
    
    # Save raw JSON
    save_events_json(events_data)
    
    # Categorize events
    upcoming, past = categorize_events(events_data)
    print(f"Categorized: {len(upcoming)} upcoming, {len(past)} past")
    
    # Generate HTML includes
    generate_html_includes(upcoming, past)
    
    print("=" * 60)
    print("✓ Event fetch and generation complete!")
    print("=" * 60)


if __name__ == '__main__':
    main()
