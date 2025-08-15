#!/usr/bin/env python3
"""
Events Fetcher for CANRUG Website
Fetches calendar data from Google Calendar API and saves to events.json

This script:
1. Connects to Google Calendar API
2. Downloads all events from the specified calendar
3. Processes and cleans the event data
4. Separates events into "upcoming" and "past" categories
5. Saves everything to a JSON file for the website to use
"""

# Import statements - these bring in code libraries we need
import os              # For reading environment variables (like API keys)
import json            # For working with JSON data (reading/writing)
import re              # For regular expressions (pattern matching in text)
import urllib.parse    # For encoding URLs properly
from datetime import datetime, timezone  # For working with dates and times
from typing import Dict, List, Optional  # For type hints (makes code clearer)
import requests        # For making HTTP requests to the Google API

# Configuration - these are the settings for our calendar
CALENDAR_ID = 'canrugroup@gmail.com'  # The email address of the Google Calendar
API_KEY = os.environ.get('GOOGLE_API_KEY')  # Get the API key from environment variables

# Build the URL for the Google Calendar API
# We use urllib.parse.quote to make sure special characters in the email are encoded properly
EVENTS_API_URL = f"https://www.googleapis.com/calendar/v3/calendars/{urllib.parse.quote(CALENDAR_ID)}/events"

class EventsFetcher:
    """
    A class to handle fetching and processing calendar events.
    
    Classes are like blueprints - they group related functions together.
    This class contains all the methods (functions) needed to:
    - Fetch events from Google Calendar
    - Process and clean the data
    - Save it to a file
    """
    
    def __init__(self):
        """
        Constructor - this runs when we create a new EventsFetcher object.
        It sets up the initial configuration and checks that we have an API key.
        """
        # Check if we have an API key - if not, stop the program
        if not API_KEY:
            raise ValueError("GOOGLE_API_KEY environment variable is required")
        
        # Set up the parameters we'll send to the Google Calendar API
        self.params = {
            'key': API_KEY,                # Our API key for authentication
            'singleEvents': 'true',        # Expand recurring events into individual events
            'orderBy': 'startTime',        # Sort events by when they start
            'maxResults': '2500'           # Maximum number of events to fetch
        }
    
    def format_event_times(self, start_str: str, end_str: str, event_timezone: str) -> Dict[str, str]:
        """
        Takes raw date/time strings from Google Calendar and formats them nicely.
        
        Parameters:
        - start_str: When the event starts (e.g. "2024-12-01T10:00:00Z")
        - end_str: When the event ends (e.g. "2024-12-01T11:00:00Z") 
        - event_timezone: The timezone of the event (e.g. "America/Toronto")
        
        Returns:
        - Dictionary with formatted time strings for display
        """
        try:
            # Convert the string dates into Python datetime objects
            # The .replace('Z', '+00:00') converts 'Z' (which means UTC) to the format Python expects
            start = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
            end = datetime.fromisoformat(end_str.replace('Z', '+00:00'))
            
            # Format the dates for the event timezone
            # strftime() formats dates - %b = short month, %d = day, %Y = year, etc.
            event_tz_start = start.strftime('%b %d, %Y, %I:%M %p')  # "Dec 01, 2024, 10:00 AM"
            event_tz_end = end.strftime('%I:%M %p')                 # "11:00 AM"
            event_tz = f"{event_tz_start} - {event_tz_end} ({event_timezone})"
            
            # Format the dates for local timezone (we use UTC for server simplicity)
            local_tz_start = start.strftime('%b %d, %Y, %I:%M %p')
            local_tz_end = end.strftime('%I:%M %p')
            local_tz = f"{local_tz_start} - {local_tz_end} (UTC)"
            
            # Return both formatted strings
            return {
                'eventTZ': event_tz,
                'localTZ': local_tz
            }
        except Exception as e:
            # If something goes wrong with date formatting, just return the original strings
            print(f"Error formatting times: {e}")
            return {
                'eventTZ': f"{start_str} - {end_str}",
                'localTZ': f"{start_str} - {end_str}"
            }
    
    def clean_description(self, description: Optional[str]) -> str:
        """
        Cleans up event descriptions that might contain messy HTML or encoded characters.
        
        Google Calendar sometimes returns descriptions with:
        - Escaped characters like \\u003c instead of <
        - HTML tags that might not be safe
        - Other formatting issues
        
        This function cleans all that up.
        """
        # If there's no description, return empty string
        if not description:
            return ''
        
        # First, decode common escaped characters
        # Google sometimes escapes HTML characters like < > & " '
        decoded = description.replace('\\u003c', '<') \
                            .replace('\\u003e', '>') \
                            .replace('\\u0026', '&') \
                            .replace('\\u0022', '"') \
                            .replace('\\u0027', "'")
        
        # Define which HTML tags we want to keep (these are safe for display)
        allowed_tags = ['a', 'br', 'p', 'strong', 'em', 'ul', 'ol', 'li']
        
        def replace_tag(match):
            """
            Helper function for the regex below.
            If the HTML tag is in our allowed list, keep it.
            If not, remove it.
            """
            tag = match.group(1).lower()  # Get the tag name (like 'div' from '<div>')
            return match.group(0) if tag in allowed_tags else ''
        
        # Use regular expressions to find HTML tags and filter them
        # This pattern matches things like <div>, </div>, <a href="...">, etc.
        cleaned = re.sub(r'</?([a-z][a-z0-9]*)\b[^>]*>', replace_tag, decoded, flags=re.IGNORECASE)
        
        return cleaned
    
    def make_add_to_calendar_link(self, event: Dict) -> str:
        """
        Creates a link that people can click to add the event to their own Google Calendar.
        
        If Google already provided a link, we use that.
        Otherwise, we build our own using Google's calendar template URL format.
        """
        # If Google already gave us a link, use it
        if event.get('htmlLink'):
            return event['htmlLink']
        
        # Extract the event details we need for the link
        start = event.get('start', {}).get('dateTime') or event.get('start', {}).get('date', '')
        end = event.get('end', {}).get('dateTime') or event.get('end', {}).get('date', '')
        
        # URL-encode the event details so they're safe to put in a URL
        # urllib.parse.quote() converts spaces to %20, etc.
        title = urllib.parse.quote(event.get('summary', 'Event'))
        details = urllib.parse.quote(event.get('description', ''))
        location = urllib.parse.quote(event.get('location', ''))
        
        try:
            # Convert the start and end times to the format Google Calendar expects
            # Google wants: YYYYMMDDTHHMMSSZ (like 20241201T100000Z)
            start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end.replace('Z', '+00:00'))
            
            start_str = start_dt.strftime('%Y%m%dT%H%M%SZ')
            end_str = end_dt.strftime('%Y%m%dT%H%M%SZ')
            
            # Build the Google Calendar template URL
            return f"https://www.google.com/calendar/render?action=TEMPLATE&text={title}&dates={start_str}/{end_str}&details={details}&location={location}&sf=true&output=xml"
        
        except Exception as e:
            # If date parsing fails, return a simple link with just the title
            print(f"Error creating calendar link: {e}")
            return f"https://www.google.com/calendar/render?action=TEMPLATE&text={title}"
    
    def process_event(self, event: Dict) -> Dict:
        """
        Takes a raw event from Google Calendar API and processes it into our format.
        
        This function:
        1. Extracts the important information from the Google event
        2. Formats the dates nicely
        3. Cleans up the description
        4. Creates an add-to-calendar link
        5. Returns a clean, standardized event object
        """
        # Extract start and end times from the Google event
        # Events can have either 'dateTime' (for timed events) or 'date' (for all-day events)
        start = event.get('start', {}).get('dateTime') or event.get('start', {}).get('date', '')
        end = event.get('end', {}).get('dateTime') or event.get('end', {}).get('date', '')
        event_timezone = event.get('start', {}).get('timeZone', 'UTC')
        
        # Format the times for display
        when = self.format_event_times(start, end, event_timezone)
        
        # Clean up the description
        clean_desc = self.clean_description(event.get('description'))
        
        # Generate a link to add this event to someone's calendar
        add_to_cal_link = self.make_add_to_calendar_link(event)
        
        # Return a clean, standardized event object
        return {
            'summary': event.get('summary', 'Untitled Event'),    # Event title
            'start': start,                                        # Start time (ISO format)
            'end': end,                                           # End time (ISO format)
            'eventTimeZone': event_timezone,                      # Timezone
            'whenEventTZ': when['eventTZ'],                       # Formatted time in event timezone
            'whenLocalTZ': when['localTZ'],                       # Formatted time in local timezone
            'description': clean_desc,                            # Cleaned description
            'htmlLink': add_to_cal_link,                         # Add-to-calendar link
            'location': event.get('location', '')                # Event location
        }
    
    def fetch_events(self) -> Dict[str, List[Dict]]:
        """
        The main function that fetches events from Google Calendar and organizes them.
        
        This function:
        1. Makes an HTTP request to Google Calendar API
        2. Processes each event
        3. Separates events into "upcoming" and "past" categories
        4. Sorts them appropriately
        5. Returns the organized data
        """
        try:
            print("Fetching events from Google Calendar API...")
            
            # Make the HTTP GET request to Google Calendar API
            # We pass our parameters (API key, etc.) that we set up in __init__
            response = requests.get(EVENTS_API_URL, params=self.params)
            
            # Check if the request was successful
            if not response.ok:
                raise Exception(f"Google API error: {response.status_code} {response.reason}")
            
            # Convert the JSON response to a Python dictionary
            data = response.json()
            events = data.get('items', [])  # Get the list of events, or empty list if none
            
            print(f"Retrieved {len(events)} events from calendar")
            
            # Get the current time so we can separate upcoming vs past events
            now = datetime.now(timezone.utc)
            
            # Initialize empty lists for our two categories
            upcoming = []
            past = []
            
            # Process each event from Google Calendar
            for event in events:
                # Clean and standardize the event data
                processed_event = self.process_event(event)
                
                # Determine if this event is in the future or past
                try:
                    # Parse the start time of the event
                    start_dt = datetime.fromisoformat(processed_event['start'].replace('Z', '+00:00'))
                    
                    # Compare with current time
                    if start_dt >= now:
                        upcoming.append(processed_event)  # Event hasn't happened yet
                    else:
                        past.append(processed_event)      # Event already happened
                        
                except Exception as e:
                    print(f"Error parsing event date: {e}")
                    # If we can't parse the date, assume it's upcoming to be safe
                    upcoming.append(processed_event)
            
            # Sort the events
            # Past events: most recent first (reverse chronological order)
            past.sort(key=lambda x: x['start'], reverse=True)
            
            # Upcoming events: earliest first (chronological order)
            upcoming.sort(key=lambda x: x['start'])
            
            print(f"Processed {len(upcoming)} upcoming events and {len(past)} past events")
            
            # Return the organized data
            return {
                'upcoming': upcoming,
                'past': past
            }
            
        except requests.RequestException as e:
            # Handle network-related errors (no internet, API down, etc.)
            print(f"Network error fetching events: {e}")
            raise
        except Exception as e:
            # Handle any other errors
            print(f"Error processing events: {e}")
            raise
    
    def save_events(self, events_data: Dict[str, List[Dict]], filename: str = 'events.json'):
        """
        Saves the processed events data to a JSON file.
        
        Parameters:
        - events_data: The dictionary containing 'upcoming' and 'past' events
        - filename: What to name the output file (defaults to 'events.json')
        """
        try:
            # Open the file for writing
            # 'w' means write mode, 'encoding=utf-8' ensures proper character encoding
            with open(filename, 'w', encoding='utf-8') as f:
                # Convert the Python dictionary to JSON and write it to the file
                # indent=2 makes the JSON pretty and readable
                # ensure_ascii=False allows non-English characters
                json.dump(events_data, f, indent=2, ensure_ascii=False)
            
            print(f"Events data saved to {filename}")
            
        except Exception as e:
            print(f"Error saving events to {filename}: {e}")
            raise

def main():
    """
    The main function that orchestrates everything.
    
    This is what runs when the script is executed. It:
    1. Creates an EventsFetcher object
    2. Fetches the events from Google Calendar
    3. Saves them to a JSON file
    4. Prints a summary of what was done
    """
    try:
        # Create an instance of our EventsFetcher class
        fetcher = EventsFetcher()
        
        # Fetch and process all the events
        events_data = fetcher.fetch_events()
        
        # Save the events to a JSON file
        fetcher.save_events(events_data)
        
        # Print a nice summary of what we accomplished
        upcoming_count = len(events_data['upcoming'])
        past_count = len(events_data['past'])
        
        print(f"\n✅ Successfully processed calendar events:")
        print(f"   📅 Upcoming events: {upcoming_count}")
        print(f"   📋 Past events: {past_count}")
        print(f"   💾 Saved to: events.json")
        
    except Exception as e:
        # If anything goes wrong, print the error and exit with an error code
        print(f"\n❌ Error: {e}")
        exit(1)  # Exit code 1 tells the system that the program failed

# This special check ensures that main() only runs when this script is executed directly
# (not when it's imported as a module by another script)
if __name__ == "__main__":
    main()