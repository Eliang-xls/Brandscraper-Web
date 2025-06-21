import { initDatabase, loadStoredBrands, saveBrands, clearAllBrands } from './db.js';
import { updateUI, log, addAlert, updateScheduleStatus, initCharts, initScheduleModal, initExportModal, renderTable } from './ui.js';
import { fetchBrandsFromWikipedia } from './datasources/wikipedia.js';
import { fetchBrandsFromBaidu } from './datasources/baidu.js';
import { fetchBrandFromAPI } from './brandfetch.js';

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
    lastSyncTime: null
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
}

// --- Scraping Logic ---
async function startScraping() {
    if (state.isScraping) return;
    state.isScraping = true;
    state.currentRunBrandCount = 0;
    state.elapsedSeconds = 0;
    state.stats.totalRuns++;
    stopRequested = false;
    updateUI(state);
    log('Started scraping process.', 'success');

    document.getElementById('startButton').disabled = true;
    document.getElementById('stopButton').disabled = false;

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

        // 2. For each, fetch logo from Brandfetch using company name
        // Prompt for API key if not present
        let apiKey = localStorage.getItem("brandfetch_api_key");
        if (!apiKey) {
            apiKey = prompt("Enter your Brandfetch API key to fetch logos:");
            if (apiKey) localStorage.setItem("brandfetch_api_key", apiKey);
        }
        let count = 0;
        for (const brand of allScrapedBrands) {
            if (stopRequested) break;
            // Optionally, skip if already present in state
            if (state.allBrands.some(b => b.name.toLowerCase() === brand.name.toLowerCase())) continue;
            let logoData = null;
            if (apiKey) {
                // Use brand name for Brandfetch (usually expects domain, but will fallback if none)
                logoData = await fetchBrandFromAPI(brand.name, apiKey);
            }
            const mergedBrand = {
                name: brand.name,
                founder: brand.founder || "",
                classification: brand.classification || "",
                source: brand.source,
                logo: logoData && logoData.logo ? logoData.logo : ""
            };
            state.allBrands.push(mergedBrand);
            state.currentRunBrandCount++;
            state.stats.successfulRuns++;
            state.stats.brandsBySource[mergedBrand.source] = (state.stats.brandsBySource[mergedBrand.source] || 0) + 1;
            await saveBrands(state.allBrands);
            updateUI(state);
            log(`Added brand: ${mergedBrand.name} (${mergedBrand.source})`, 'info');
            count++;
            await sleep(1200); // Throttle to avoid API rate limits
        }
        log(`Scraping complete. Added ${count} new brands.`, 'success');
    } catch (err) {
        log(`Scraping error: ${err}`, 'error');
        state.stats.failedRuns++;
    } finally {
        stopScraping(true);
    }
}

function stopScraping(isAuto = false) {
    if (!state.isScraping) return;
    stopRequested = true;
    state.isScraping = false;
    clearInterval(state.timerInterval);
    document.getElementById('startButton').disabled = false;
    document.getElementById('stopButton').disabled = true;
    log(isAuto ? 'Scraping finished.' : 'Scraping stopped by user.', isAuto ? 'success' : 'warning');
    updateUI(state);
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
