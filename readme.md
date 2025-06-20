# Available Ferry Ticket Scanner-Chooser

A browser userscript to automatically refresh a ferry ticket page and click the 'Vali' (Choose) button for your selected departure times as soon as they become available.

## Features
- Runs directly in your browser via Tampermonkey or similar userscript manager
- Simple UI for setting refresh rate and a list of desired departure times (multi-line textarea, pre-filled with 23 times)
- Scans dynamic lists (e.g. <article> elements) for the correct trip using robust matching
- Automatically clicks the first available and truly enabled 'Vali' button for any of your selected times
- Plays a strong audio notification when a spot is found and clicked
- Persists state and resumes after page reloads (auto-continues if running)
- Start/Stop control from the UI
- Visual feedback and troubleshooting logs in the browser console

## Usage
1. Install [Tampermonkey](https://www.tampermonkey.net/) or a similar userscript manager in your browser.
2. Add the `ferry-finder.user.js` script to Tampermonkey.
3. Navigate to the ferry booking page with the list of trips.
4. Use the floating 'Ferry Fisher' panel to set your desired refresh rate and list of departure times (one per line).
5. Click **Start**. The script will refresh the page and click the 'Vali' button as soon as it becomes available for any of your selected times.
6. Click **Stop** to cancel at any time.

## Notes
- The script is designed to work with pages where each trip is an <article> element and the departure time is in a hidden `.sr-only` element.
- Only truly enabled 'Vali' buttons (not disabled by attribute, class, or aria-disabled) will be clicked.
- If the structure of the page changes, you may need to adjust the selector logic in the script.
- For troubleshooting, open the browser console to see detailed logs prefixed with `[FerryFisher]`.

---

For questions or improvements, open an issue or edit the userscript as needed.

