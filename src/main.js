import { loadStoredBrands, saveBrands } from './db.js';
import { updateUI, log, addAlert, updateScheduleStatus, initCharts, initScheduleModal, initExportModal } from './ui.js';
import { fetchBrandsFromWikipedia } from './datasources/wikipedia.js';
import { fetchBrandsFromBaidu } from './datasources/baidu.js';

// --- App State ---
export let state = {
    isScraping: false,
    timerInterval: null,
    elapsedSeconds: 0,
    allBrands: [],
    stats: {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        brandsBySource: {}
    },
    currentRunBrandCount: 0,
    targetBrandCount: 0,
    scheduleFrequency: 'manual',
    isScheduled: false,
    scrapeInterval: null,
    dbInitialized: false,
    lastSyncTime: null,
    isStoppingRequested: false,
    error: null,
};

let stopRequested = false;

// --- Main App Initialization ---
async function initializeApp() {
    updateUI(state); // Show initializing state
    log("Initializing database...");
    try {
        const storedBrands = await loadStoredBrands();
        state.allBrands = storedBrands;
        state.dbInitialized = true;
    } catch (error) {
        state.error = error;
        addAlert("Storage error: " + error, "error");
    }
    log("Dashboard initialized successfully.");
    initCharts(state);
    initScheduleModal(state);
    initExportModal(state);
    updateUI(state);
    updateScheduleStatus(state);
    setupEventListeners();
}

initializeApp();

// --- Event Listeners Setup ---
function setupEventListeners() {
    const startBtn = document.getElementById('startButton');
    const stopBtn = document.getElementById('stopButton');
    if (startBtn) startBtn.addEventListener('click', startScraping);
    if (stopBtn) stopBtn.addEventListener('click', stopScraping);

    // Clean tab switching logic - only here (not duplicated)
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.nav-tab').forEach(b => {
                b.classList.remove('tab-active');
                b.classList.add('tab-inactive');
            });
            this.classList.add('tab-active');
            this.classList.remove('tab-inactive');
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
            const sel = this.getAttribute('data-tab');
            document.getElementById(sel)?.classList.remove('hidden');
        });
    });
}

// --- Scraping Logic (NO LOGO fetching) ---
async function startScraping() {
    if (state.isScraping) return;
    state.isScraping = true;
    state.isStoppingRequested = false;
    state.error = null;
    state.currentRunBrandCount = 0;
    state.elapsedSeconds = 0;
    state.stats.totalRuns++;
    stopRequested = false;
    updateUI(state);
    log('Started scraping process.', 'success');

    setButtonStates(true);

    state.timerInterval = setInterval(() => {
        state.elapsedSeconds++;
        updateElapsedTime();
    }, 1000);

    try {
        // 1. Scrape brands from Wikipedia and Baidu
        log('Fetching brands from Wikipedia...', 'info');
        let wikiBrands = [];
        try {
            wikiBrands = await fetchBrandsFromWikipedia();
            log(`Fetched ${wikiBrands.length} brands from Wikipedia.`, 'success');
        } catch (e) {
            log(`Wikipedia fetch failed: ${e}`, 'error');
        }

        log('Fetching brands from Baidu...', 'info');
        let baiduBrands = [];
        try {
            baiduBrands = await fetchBrandsFromBaidu();
            log(`Fetched ${baiduBrands.length} brands from Baidu.`, 'success');
        } catch (e) {
            log(`Baidu fetch failed: ${e}`, 'error');
        }

        // Combine (dedupe by name)
        let allScrapedBrands = [...wikiBrands, ...baiduBrands];
        const seen = new Set();
        allScrapedBrands = allScrapedBrands.filter(b => {
            if (seen.has(b.name)) return false;
            seen.add(b.name);
            return true;
        });

        let count = 0;
        for (const brand of allScrapedBrands) {
            if (stopRequested) break;
            if (state.allBrands.some(b => b.name.toLowerCase() === brand.name.toLowerCase())) continue;
            const storedBrand = {
                name: brand.name,
                founder: brand.founder || "",
                classification: brand.classification || "",
                source: brand.source,
                logo: "" // Intentionally left blank for step 1
            };
            state.allBrands.push(storedBrand);
            state.currentRunBrandCount++;
            state.stats.successfulRuns++;
            state.stats.brandsBySource[storedBrand.source] = (state.stats.brandsBySource[storedBrand.source] || 0) + 1;
            await saveBrands(state.allBrands);
            updateUI(state);
            log(`Added brand: ${storedBrand.name} (${storedBrand.source})`, 'info');
            count++;
            await sleep(300); // Throttle to avoid flooding UI
        }
        log(`Scraping complete. Added ${count} new brands.`, 'success');
    } catch (err) {
        log(`Scraping error: ${err}`, 'error');
        state.error = err;
        state.stats.failedRuns++;
    } finally {
        stopScraping(true);
    }
}

function stopScraping(isAuto = false) {
    if (!state.isScraping) return;
    stopRequested = true;
    state.isScraping = false;
    state.isStoppingRequested = !isAuto;
    clearInterval(state.timerInterval);

    setButtonStates(false);

    log(isAuto ? 'Scraping finished.' : 'Scraping stopped by user.', isAuto ? 'success' : 'warning');
    updateUI(state);
}

function setButtonStates(isScraping) {
    const startBtn = document.getElementById('startButton');
    const stopBtn = document.getElementById('stopButton');
    if (startBtn) startBtn.disabled = isScraping;
    if (stopBtn) stopBtn.disabled = !isScraping;
}

// --- Utilities ---
function updateElapsedTime() {
    const elapsed = state.elapsedSeconds;
    const min = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const sec = String(elapsed % 60).padStart(2, '0');
    const el = document.getElementById('elapsedTime');
    if (el) el.textContent = `${min}:${sec}`;
}

function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
}

// Expose state for debugging
window.appState = state;
window.saveBrands = saveBrands;