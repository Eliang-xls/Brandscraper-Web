import { initDatabase, loadStoredBrands, saveBrands, clearAllBrands } from './db.js';
import { updateUI, log, addAlert, updateScheduleStatus, initCharts, initScheduleModal, initExportModal, renderTable } from './ui.js';

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
}

initializeApp();

// Expose state for debugging
window.appState = state;