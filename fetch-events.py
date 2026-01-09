#!/usr/bin/env python3
"""
Fetch events from Google Calendar API, save to events.json, and generate HTML.
"""

import os
import json
from datetime import datetime, timezone
import html
import re
import subprocess
import sys

def install_package(package):
    print(f"Installing {package}...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    install_package("python-dotenv")
    from dotenv import load_dotenv
    load_dotenv()

try:
    import requests
except ImportError:
    install_package("requests")
    import requests

# Configuration
CALENDAR_ID = 'canrugroup@gmail.com'
API_KEY = os.environ.get('GOOGLE_API_KEY')

def clean_description(description):
    if not description: return ''
    decoded = description.replace('\\u003c', '<').replace('\\u003e', '>').replace('\\u0026', '&').replace('\\u0022', '"').replace('\\u0027', "'")
    allowed_tags = ['a', 'br', 'p', 'strong', 'em', 'ul', 'ol', 'li']
    def replace_tag(match):
        tag = match.group(1).lower()
        return match.group(0) if tag in allowed_tags else ''
    return re.sub(r'</?([a-z][a-z0-9]*)\b[^>]*>', replace_tag, decoded, flags=re.IGNORECASE)

def format_event_html(event):
    summary = html.escape(event.get('summary', 'Untitled Event'))
    description = event.get('description', '(No description provided)')
    
    # Use the event's timezone
    event_tz = event.get('timeZone', 'UTC')
    display_tz = event_tz.split('/')[-1].replace('_', ' ')

    # Use the raw ISO strings directly for the data attributes
    start_iso = event['start']
    end_iso = event['end']
    
    # Format the original "Event Time" for display
    start_dt = datetime.fromisoformat(start_iso.replace('Z', '+00:00'))
    end_dt = datetime.fromisoformat(end_iso.replace('Z', '+00:00'))
    event_time_display = f"{start_dt.strftime('%b %d, %Y, %I:%M %p')} - {end_dt.strftime('%I:%M %p')}"
    
    # Build HTML with no leading/trailing whitespace
    html_output = '<article>'
    html_output += f'<h3>{summary}</h3>'
    
    # Output placeholder that JavaScript will fill in
    html_output += '<p><strong>Time:</strong> '
    html_output += f'<span class="js-local-time" data-start="{start_iso}" data-end="{end_iso}">—</span></p>'
    
    html_output += f'<div>{description}</div>'
    html_output += '</article>\n'
    return html_output

def fetch_from_google_calendar():
    if not API_KEY:
        print("⚠️ GOOGLE_API_KEY not set.")
        return None
    try:
        url = f'https://www.googleapis.com/calendar/v3/calendars/{CALENDAR_ID}/events'
        params = {'key': API_KEY, 'singleEvents': 'true', 'orderBy': 'startTime', 'maxResults': 2500}
        response = requests.get(url, params=params)
        if response.status_code != 200:
            print(f"❌ API request failed with status {response.status_code}")
            return None
        
        data = response.json()
        processed = []
        for item in data.get('items', []):
            start_node = item.get('start', {})
            end_node = item.get('end', {})
            start_val = start_node.get('dateTime') or start_node.get('date')
            end_val = end_node.get('dateTime') or end_node.get('date')
            if not start_val: continue
            
            processed.append({
                'summary': item.get('summary', 'Untitled Event'),
                'start': start_val,
                'end': end_val,
                'timeZone': start_node.get('timeZone', 'UTC'),
                'description': clean_description(item.get('description', ''))
            })
        return processed
    except Exception as e:
        print(f"Error: {e}")
        return None

def generate_files():
    # Attempt to fetch from Google, fall back to current events.json if API fails
    events = fetch_from_google_calendar()
    if not events:
        print("⚠️ Failed to fetch from API, checking for local events.json...")
        if os.path.exists('events.json'):
            with open('events.json', 'r') as f:
                data = json.load(f)
                events = data.get('upcoming', []) + data.get('past', [])
        else:
            print("❌ No events found anywhere.")
            return

    now = datetime.now(timezone.utc)
    upcoming, past = [], []
    
    for e in events:
        dt = datetime.fromisoformat(e['start'].replace('Z', '+00:00'))
        if dt >= now:
            upcoming.append(e)
        else:
            past.append(e)
    
    past.sort(key=lambda x: x['start'], reverse=True)

    # Save to events.json
    with open('events.json', 'w', encoding='utf-8') as f:
        json.dump({'upcoming': upcoming, 'past': past}, f, indent=2)
    print("✓ Updated events.json")

    # Generate HTML snippets
    os.makedirs('_includes', exist_ok=True)
    
    with open('_includes/events-upcoming.html', 'w', encoding='utf-8') as f:
        if upcoming:
            for e in upcoming:
                f.write(format_event_html(e))
        else:
            f.write('<p>No upcoming events at this time.</p>\n')
    print("✓ Generated _includes/events-upcoming.html")
        
    with open('_includes/events-past.html', 'w', encoding='utf-8') as f:
        if past:
            for e in past:
                f.write(format_event_html(e))
        else:
            f.write('<p>No past events to display.</p>\n')
    print("✓ Generated _includes/events-past.html")

if __name__ == '__main__':
    generate_files()
