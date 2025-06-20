// ==UserScript==
// @name         Available Ferry Ticket Scanner-Chooser
// @namespace    http://tampermonkey.net/
// @version      1.6
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
        <b>Ferry Fisher</b><br>
        Refresh rate (sec): <input type="number" id="ff-interval" value="5" min="1" style="width:40px;"> <br>
        Departure times (one per line):<br>
        <textarea id="ff-departure" rows="10" style="width:80px;resize:vertical;">22:50\n22:15\n21:40\n21:05\n20:30\n19:55\n19:20\n18:45\n18:10\n17:35\n17:00\n16:25\n15:50\n15:15\n14:40\n14:05\n13:30\n12:55\n12:00\n11:25\n10:50\n10:15\n09:40</textarea><br>
        <button id="ff-start" style="background:#28a745;color:#fff;border:none;padding:4px 12px;margin-right:4px;border-radius:3px;cursor:pointer;">Start</button>
        <button id="ff-stop" style="background:#dc3545;color:#fff;border:none;padding:4px 12px;border-radius:3px;cursor:pointer;">Stop</button>
        <div id="ff-status" style="margin-top:6px;color:#333;font-size:12px;"></div>
    `;
    document.body.appendChild(panel);

    let timeoutId = null;
    let running = false;

    function setStatus(msg) {
        document.getElementById('ff-status').textContent = msg;
        console.log('[FerryFisher]', msg);
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

    function getDepartureTimes() {
        // Get all non-empty, trimmed lines from textarea
        return document.getElementById('ff-departure').value
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line);
    }

    function isTrulyEnabled(btn) {
        // Not disabled by attribute, class, or aria-disabled, and visible
        if (btn.offsetParent === null) return false;
        if (btn.disabled) return false;
        if (btn.classList.contains('disabled')) return false;
        if (btn.getAttribute('aria-disabled') === 'true') return false;
        // Check pointer-events (optional, for extra robustness)
        const style = window.getComputedStyle(btn);
        if (style.pointerEvents === 'none') return false;
        return true;
    }

    function playNotificationSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.value = 880;
            o.connect(g);
            g.connect(ctx.destination);
            g.gain.value = 0.2;
            o.start();
            setTimeout(() => { o.frequency.value = 440; }, 200);
            setTimeout(() => { g.gain.value = 0; o.stop(); ctx.close(); }, 600);
        } catch (e) {
            console.log('[FerryFisher] Audio notification failed:', e);
        }
    }

    function tryClick() {
        const departures = getDepartureTimes();
        console.log('[FerryFisher] looking for availabilies on departures:', departures);
        if (!departures.length) {
            setStatus('Please enter at least one departure time.');
            return false;
        }
        for (const departure of departures) {
            const row = findTripRow(departure);
            console.log('[FerryFisher] Checking row for', departure, '->', !!row);
            if (row) {
                // Find all visible and truly enabled buttons/links with text/value 'Vali'
                const candidates = Array.from(row.querySelectorAll('button, input[type="button"], a'));
                console.log('[FerryFisher] Candidates for Vali:', candidates.length);
                const valiBtn = candidates.find(btn => {
                    let label = '';
                    if (btn.tagName === 'INPUT') label = btn.value || '';
                    else label = btn.textContent || '';
                    return label.trim().toLowerCase() === 'vali' && isTrulyEnabled(btn);
                });
                console.log('[FerryFisher] Availability found:', !!valiBtn);
                if (valiBtn) {
                    valiBtn.click();
                    setStatus(`Button clicked for ${departure}!`);
                    playNotificationSound();
                    stopAuto();
                    return true;
                }
            }
        }
        setStatus('No available spots on any listed trip yet.');
        return false;
    }

    // Add input event to enable/disable Start button based on departure time
    const departureInput = document.getElementById('ff-departure');
    const startBtn = document.getElementById('ff-start');
    function updateStartButtonState() {
        const isDisabled = getDepartureTimes().length === 0;
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
        const departures = getDepartureTimes();
        console.log('[FerryFisher] startAuto, departures:', departures);
        if (!departures.length) {
            setStatus('Please enter at least one departure time.');
            return;
        }
        running = true;
        const interval = Math.max(1, parseInt(document.getElementById('ff-interval').value, 10)) * 1000;
        // Persist state
        localStorage.setItem('ff-running', 'true');
        localStorage.setItem('ff-interval', interval / 1000);
        localStorage.setItem('ff-departure', document.getElementById('ff-departure').value);
        setStatus('Started. Waiting for button...');
        function cycle() {
            if (!running) return;
            console.log('[FerryFisher] cycle()');
            const found = tryClick();
            if (!found && running) {
                console.log('[FerryFisher] No match, scheduling reload in', interval, 'ms');
                timeoutId = setTimeout(() => {
                    console.log('[FerryFisher] Reloading page');
                    location.reload();
                }, interval);
            }
        }
        // Wait for trips to load, then start cycle
        waitForTripsAndStart(() => cycle());
    }

    function stopAuto() {
        running = false;
        if (timeoutId) clearTimeout(timeoutId);
        setStatus('Stopped.');
        console.log('[FerryFisher] Stopped');
        // Clear state
        localStorage.removeItem('ff-running');
        localStorage.removeItem('ff-interval');
        localStorage.removeItem('ff-departure');
    }

    function waitForTripsAndStart(callback) {
        // Wait for at least one <article> with .sr-only[id^='title']
        const check = () => {
            const found = document.querySelector("article .sr-only[id^='title']");
            console.log('[FerryFisher] waitForTripsAndStart check:', !!found);
            if (found) {
                setStatus('Ready.');
                document.getElementById('ff-start').disabled = false;
                document.getElementById('ff-stop').disabled = false;
                if (typeof callback === 'function') callback();
            } else {
                setStatus('Waiting for trips to load...');
                document.getElementById('ff-start').disabled = true;
                document.getElementById('ff-stop').disabled = true;
                setTimeout(check, 300);
            }
        };
        check();
    }

    function autoResumeIfNeeded() {
        if (localStorage.getItem('ff-running') === 'true') {
            document.getElementById('ff-interval').value = localStorage.getItem('ff-interval') || '5';
            document.getElementById('ff-departure').value = localStorage.getItem('ff-departure') || '';
            running = true;
            const interval = Math.max(1, parseInt(document.getElementById('ff-interval').value, 10)) * 1000;
            function cycle() {
                if (!running) return;
                console.log('[FerryFisher] autoResume cycle()');
                const found = tryClick();
                if (!found && running) {
                    console.log('[FerryFisher] No match, scheduling reload in', interval, 'ms');
                    timeoutId = setTimeout(() => {
                        console.log('[FerryFisher] Reloading page');
                        location.reload();
                    }, interval);
                }
            }
            waitForTripsAndStart(() => cycle());
        }
    }

    // Call autoResumeIfNeeded on script load
    autoResumeIfNeeded();

    document.getElementById('ff-start').onclick = startAuto;
    document.getElementById('ff-stop').onclick = stopAuto;
})();
