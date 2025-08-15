#!/usr/bin/env python3
"""
Events Fetcher for CANRUG Website
Fetches calendar data from Google Calendar API and saves to events.json
"""

import os
import json
import re
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, List, Optional
import requests

# Configuration
CALENDAR_ID = 'canrugroup@gmail.com'
API_KEY = os.environ.get('GOOGLE_API_KEY')  # Must be set in GitHub Actions or local env

if not API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is required!")

EVENTS_API_URL = f"https://www.googleapis.com/calendar/v3/calendars/{urllib.parse.quote(CALENDAR_ID)}/events"

class EventsFetcher:
    def __init__(self):
        self.params = {
            'key': API_KEY,
            'singleEvents': 'true',
            'orderBy': 'startTime',
            'maxResults': '2500'
        }

    def format_event_times(self, start_str: str, end_str: str, tz: str) -> Dict[str, str]:
        try:
            start = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
            end = datetime.fromisoformat(end_str.replace('Z', '+00:00'))

            event_tz = f"{start.strftime('%b %d, %Y, %I:%M %p')} - {end.strftime('%I:%M %p')} ({tz})"
            local_tz = f"{start.strftime('%b %d, %Y, %I:%M %p')} - {end.strftime('%I:%M %p')} (UTC)"
            return {'eventTZ': event_tz, 'localTZ': local_tz}
        except Exception as e:
            print(f"Error formatting times: {e}")
            return {'eventTZ': f"{start_str} - {end_str}", 'localTZ': f"{start_str} - {end_str}"}

    def clean_description(self, description: Optional[str]) -> str:
        if not description:
            return ''
        decoded = description.replace('\\u003c', '<').replace('\\u003e', '>').replace('\\u0026', '&') \
                             .replace('\\u0022', '"').replace('\\u0027', "'")
        allowed_tags = ['a', 'br', 'p', 'strong', 'em', 'ul', 'ol', 'li']
        def replace_tag(match):
            tag = match.group(1).lower()
            return match.group(0) if tag in allowed_tags else ''
        cleaned = re.sub(r'</?([a-z][a-z0-9]*)\b[^>]*>', replace_tag, decoded, flags=re.IGNORECASE)
        return cleaned

    def make_add_to_calendar_link(self, event: Dict) -> str:
        if event.get('htmlLink'):
            return event['htmlLink']
        start = event.get('start', {}).get('dateTime') or event.get('start', {}).get('date', '')
        end = event.get('end', {}).get('dateTime') or event.get('end', {}).get('date', '')
        title = urllib.parse.quote(event.get('summary', 'Event'))
        details = urllib.parse.quote(event.get('description', ''))
        location = urllib.parse.quote(event.get('location', ''))
        try:
            start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end.replace('Z', '+00:00'))
            start_str = start_dt.strftime('%Y%m%dT%H%M%SZ')
            end_str = end_dt.strftime('%Y%m%dT%H%M%SZ')
            return f"https://www.google.com/calendar/render?action=TEMPLATE&text={title}&dates={start_str}/{end_str}&details={details}&location={location}&sf=true&output=xml"
        except Exception as e:
            print(f"Error creating calendar link: {e}")
            return f"https://www.google.com/calendar/render?action=TEMPLATE&text={title}"

    def process_event(self, event: Dict) -> Dict:
        start = event.get('start', {}).get('dateTime') or event.get('start', {}).get('date', '')
        end = event.get('end', {}).get('dateTime') or event.get('end', {}).get('date', '')
        tz = event.get('start', {}).get('timeZone', 'UTC')
        when = self.format_event_times(start, end, tz)
        return {
            'summary': event.get('summary', 'Untitled Event'),
            'start': start,
            'end': end,
            'eventTimeZone': tz,
            'whenEventTZ': when['eventTZ'],
            'whenLocalTZ': when['localTZ'],
            'description': self.clean_description(event.get('description')),
            'htmlLink': self.make_add_to_calendar_link(event),
            'location': event.get('location', '')
        }

    def fetch_events(self) -> Dict[str, List[Dict]]:
        print("Fetching events from Google Calendar API...")
        resp = requests.get(EVENTS_API_URL, params=self.params)
        if not resp.ok:
            raise Exception(f"Google API error: {resp.status_code} {resp.reason}")
        events = resp.json().get('items', [])
        print(f"Retrieved {len(events)} events from calendar")
        now = datetime.now(timezone.utc)
        upcoming, past = [], []
        for event in events:
            e = self.process_event(event)
            try:
                start_dt = datetime.fromisoformat(e['start'].replace('Z', '+00:00'))
                if start_dt >= now:
                    upcoming.append(e)
                else:
                    past.append(e)
            except Exception:
                upcoming.append(e)
        past.sort(key=lambda x: x['start'], reverse=True)
        upcoming.sort(key=lambda x: x['start'])
        print(f"Processed {len(upcoming)} upcoming and {len(past)} past events")
        return {'upcoming': upcoming, 'past': past}

    def save_events(self, events_data: Dict[str, List[Dict]], filename: str = 'events.json'):
        output_path = os.path.join(os.getcwd(), filename)
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(events_data, f, indent=2, ensure_ascii=False)
            print(f"✅ Events saved to {output_path}")
        except Exception as e:
            print(f"❌ Error saving events: {e}")
            raise

def main():
    fetcher = EventsFetcher()
    data = fetcher.fetch_events()
    fetcher.save_events(data)
    print(f"📅 Upcoming: {len(data['upcoming'])}, 📋 Past: {len(data['past'])}")

if __name__ == "__main__":
    main()
