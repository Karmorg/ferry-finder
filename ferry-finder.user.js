// ==UserScript==
// @name         Ferry Ticket Auto-Chooser
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Refreshes the ferry ticket page and clicks the 'Choose' button for your selected departure time as soon as it becomes available. UI for refresh rate, departure time, and stop/start control.
// @author       You
// @match        *://*/*
// @grant        none
// @inject-into  content
// ==/UserScript==

(function() {
    'use strict';

    // --- UI Elements ---
    const panel = document.createElement('div');
    panel.style.position = 'fixed';
    panel.style.top = '10px';
    panel.style.right = '10px';
    panel.style.background = 'white';
    panel.style.border = '1px solid #888';
    panel.style.padding = '12px';
    panel.style.zIndex = 99999;
    panel.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    panel.innerHTML = `
        <b>Ferry Finder</b><br>
        Refresh rate (sec): <input type="number" id="ff-interval" value="5" min="1" style="width:40px;"> <br>
        Departure time: <input type="text" id="ff-departure" placeholder="e.g. 14:30" style="width:80px;"> <br>
        <button id="ff-start" style="background:#28a745;color:#fff;border:none;padding:4px 12px;margin-right:4px;border-radius:3px;cursor:pointer;">Start</button>
        <button id="ff-stop" style="background:#dc3545;color:#fff;border:none;padding:4px 12px;border-radius:3px;cursor:pointer;">Stop</button>
        <div id="ff-status" style="margin-top:6px;color:#333;font-size:12px;"></div>
    `;
    document.body.appendChild(panel);

    let timeoutId = null;
    let running = false;

    // Restore state from localStorage
    if (localStorage.getItem('ff-running') === 'true') {
        document.getElementById('ff-interval').value = localStorage.getItem('ff-interval') || '5';
        document.getElementById('ff-departure').value = localStorage.getItem('ff-departure') || '';
        running = false; // <-- allow startAuto to run after reload
        waitForTripsAndStart();
    }

    function setStatus(msg) {
        document.getElementById('ff-status').textContent = msg;
    }

    function normalizeText(text) {
        return text.replace(/\u00A0/g, ' ') // replace non-breaking spaces
            .replace(/\s+/g, ' ') // collapse whitespace
            .trim();
    }

    // --- Updated selector logic for <article> structure ---
    function findTripRow(departureTime) {
        // Looks for <article> elements with a child .sr-only[id^='title'] containing the departure time (flexible match)
        const rows = document.querySelectorAll('article');
        const targetTime = normalizeText(departureTime);
        const timeRegex = new RegExp(`\\b${targetTime.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`);
        for (const row of rows) {
            const srElem = row.querySelector(".sr-only[id^='title']");
            if (srElem) {
                const normText = normalizeText(srElem.textContent);
                if (timeRegex.test(normText)) {
                    return row;
                }
            }
        }
        return null;
    }

    function tryClick() {
        const departure = document.getElementById('ff-departure').value.trim();
        if (!departure) {
            setStatus('Please enter a departure time.');
            return false;
        }
        const row = findTripRow(departure);
        if (!row) {
            setStatus('Matching departure not found!');
            return false;
        }
        // Find the first visible and enabled button, input[type=button], or <a> inside the article
        const chooseBtn = row.querySelector('button:not([disabled]), input[type="button"]:not([disabled]), a:not([disabled])');
        if (chooseBtn && chooseBtn.offsetParent !== null) {
            chooseBtn.click();
            setStatus('Button clicked!');
            stopAuto();
            return true;
        } else {
            setStatus('No available spots on that trip yet.');
            return false;
        }
    }

    // Add input event to enable/disable Start button based on departure time
    const departureInput = document.getElementById('ff-departure');
    const startBtn = document.getElementById('ff-start');
    function updateStartButtonState() {
        const isDisabled = !departureInput.value.trim();
        startBtn.disabled = isDisabled;
        if (isDisabled) {
            startBtn.style.background = '#cccccc';
            startBtn.style.color = '#888888';
            startBtn.style.cursor = 'not-allowed';
            startBtn.style.opacity = '0.7';
        } else {
            startBtn.style.background = '#28a745';
            startBtn.style.color = '#fff';
            startBtn.style.cursor = 'pointer';
            startBtn.style.opacity = '1';
        }
    }
    departureInput.addEventListener('input', updateStartButtonState);
    updateStartButtonState();

    function startAuto() {
        if (running) return;
        const departure = document.getElementById('ff-departure').value.trim();
        if (!departure) {
            setStatus('Please enter a departure time.');
            return;
        }
        running = true;
        const interval = Math.max(1, parseInt(document.getElementById('ff-interval').value, 10)) * 1000;
        // Persist state
        localStorage.setItem('ff-running', 'true');
        localStorage.setItem('ff-interval', interval / 1000);
        localStorage.setItem('ff-departure', departure);
        setStatus('Started. Waiting for button...');
        function cycle() {
            if (!running) return;
            const found = tryClick();
            if (!found && running) {
                timeoutId = setTimeout(() => {
                    location.reload();
                }, interval);
            }
        }
        cycle();
    }

    function stopAuto() {
        running = false;
        if (timeoutId) clearTimeout(timeoutId);
        setStatus('Stopped.');
        // Clear state
        localStorage.removeItem('ff-running');
        localStorage.removeItem('ff-interval');
        localStorage.removeItem('ff-departure');
    }

    function waitForTripsAndStart() {
        // Wait for at least one <article> with .sr-only[id^='title']
        const check = () => {
            const found = document.querySelector("article .sr-only[id^='title']");
            if (found) {
                setStatus('Ready.');
                document.getElementById('ff-start').disabled = false;
                document.getElementById('ff-stop').disabled = false;
                if (localStorage.getItem('ff-running') === 'true') {
                    setTimeout(startAuto, 100); // Start if needed
                }
            } else {
                setStatus('Waiting for trips to load...');
                document.getElementById('ff-start').disabled = true;
                document.getElementById('ff-stop').disabled = true;
                setTimeout(check, 300);
            }
        };
        check();
    }

    document.getElementById('ff-start').onclick = startAuto;
    document.getElementById('ff-stop').onclick = stopAuto;
})();
