# CANRUG Website

Official website for the Canadian Regional User Group (CANRUG) - an Ex Libris user group for libraries across Canada.

## Quick Start

### Local Testing

1. **Install dependencies:**
   ```bash
   pip install requests python-dotenv
   ```

2. **Set up your API key (optional):**
   ```bash
   cp .env.example .env
   # Edit .env and add your Google Calendar API key
   ```

3. **Run the test script:**
   ```bash
   # On macOS/Linux
   ./test-local.sh
   
   # On Windows
   test-local.bat
   ```

4. **Open your browser to:** `http://localhost:8000`

### GitHub Actions Setup

1. Add your Google Calendar API key to GitHub Secrets:
   - Go to: Settings → Secrets and variables → Actions
   - Name: `GOOGLE_API_KEY`
   - Value: Your API key

2. The workflow runs automatically:
   - Daily at 6 AM UTC
   - On every push to main branch
   - Manually via Actions tab

## Project Structure

```
.
├── .github/workflows/
│   └── update-events.yml    # GitHub Actions workflow
├── _includes/               # Generated HTML snippets
│   ├── events-upcoming.html
│   └── events-past.html
├── _site/                   # Built site (generated)
├── fetch-events.py          # Fetch from Google Calendar
├── build-local.py           # Build static site
├── test-local.sh           # Local testing script (Unix)
├── test-local.bat          # Local testing script (Windows)
├── index.html              # Main page
├── pastevents.html         # Past events page
├── simple.css              # Stylesheet
├── events.json             # Cached events data
└── .env.example            # API key template
```

## How It Works

1. **fetch-events.py** queries Google Calendar API
2. Events are split into upcoming/past and saved to **events.json**
3. HTML snippets are generated in **_includes/**
4. **build-local.py** builds final HTML files in **_site/**
5. GitHub Actions commits changes back to the repo
6. GitHub Pages serves the **_site/** folder

## Documentation

See `README-LOCAL-TESTING.md` for detailed local testing instructions.

## License

© 2024 CANRUG
