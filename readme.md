# Ferry Finder

A browser userscript to automatically refresh a ferry ticket page and click the 'Choose' button for your desired trip as soon as it becomes available.

## Features
- Runs directly in your browser via Tampermonkey or similar userscript manager
- Simple UI for setting refresh rate and desired departure time
- Scans dynamic lists (e.g. <article> elements) for the correct trip
- Automatically clicks the 'Choose' button when available
- Persists state and resumes after page reloads
- Start/Stop control from the UI

## Usage
1. Install [Tampermonkey](https://www.tampermonkey.net/) or a similar userscript manager in your browser.
2. Add the `ferry-finder.user.js` script to Tampermonkey.
3. Navigate to the ferry booking page with the list of trips.
4. Use the floating 'Ferry Finder' panel to set your desired refresh rate and departure time.
5. Click **Start**. The script will refresh the page and click the 'Choose' button as soon as it becomes available.
6. Click **Stop** to cancel at any time.

## Notes
- The script is designed to work with pages where each trip is an <article> element and the departure time is a visible text node.
- If the structure of the page changes, you may need to adjust the selector logic in the script.

---

For questions or improvements, open an issue or edit the userscript as needed.

