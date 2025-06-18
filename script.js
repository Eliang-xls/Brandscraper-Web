import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, setDoc, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- Firebase Configuration ---
// IMPORTANT: Replace with your actual Firebase project configuration.
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// --- App Initialization ---
let app, db, auth, userId;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
} catch (e) {
    console.error("Firebase initialization failed. Please provide your Firebase config.", e);
    document.body.innerHTML = `<div class="p-8 text-red-600 bg-red-100"><strong>Error:</strong> Firebase not configured. Please add your Firebase project configuration in the script.js file to use the application.</div>`;
}


// --- DOM Elements ---
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const scheduleButton = document.getElementById('scheduleButton');
const statusLabel = document.getElementById('statusLabel');
const statusDot = document.getElementById('statusDot');
const brandsCountEl = document.getElementById('brandsCount');
const currentTargetEl = document.getElementById('currentTarget');
const elapsedTimeEl = document.getElementById('elapsedTime');
const brandsTableBody = document.getElementById('brandsTableBody');
const logsContainer = document.getElementById('logsContainer');
const alertsContainer = document.getElementById('alertsContainer');
const totalRunsEl = document.getElementById('totalRuns');
const successfulRunsEl = document.getElementById('successfulRuns');
const failedRunsEl = document.getElementById('failedRuns');
const avgBrandsEl = document.getElementById('avgBrands');

// --- State ---
let isScraping = false;
let timerInterval;
let seconds = 0;
let brandsCount = 0;

const mockTargets = ["TechCrunch/startups", "Forbes/brands", "Wikipedia/List_of_companies", "BrandDirectory/all", "SuperBrands/latest"];

// --- Authentication ---
onAuthStateChanged(auth, user => {
    if (user) {
        userId = user.uid;
        log("User authenticated anonymously: " + userId);
        loadInitialData();
        setupSnapshots();
    } else {
        signInAnonymously(auth).catch(error => {
            log("Anonymous sign-in failed: " + error.message, 'error');
        });
    }
});

// --- Firestore ---
function setupSnapshots() {
    if (!userId) return;
    
    // Listen for new brands
    const brandsCollection = collection(db, `scrapers/${userId}/brands`);
    onSnapshot(brandsCollection, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const brand = change.doc.data();
                addBrandToTable(brand);
                brandsCount++;
                brandsCountEl.textContent = brandsCount;
            }
        });
    });
    
    // Listen for stats changes
    const statsDoc = doc(db, `scrapers/${userId}/stats/execution`);
    onSnapshot(statsDoc, (doc) => {
        if(doc.exists()){
            const stats = doc.data();
            totalRunsEl.textContent = stats.totalRuns || 0;
            successfulRunsEl.textContent = stats.successfulRuns || 0;
            failedRunsEl.textContent = stats.failedRuns || 0;
            avgBrandsEl.textContent = (stats.totalBrands && stats.totalRuns) ? Math.round(stats.totalBrands / stats.totalRuns) : 0;
        }
    });

    // Listen for alerts
    const alertsCollection = collection(db, `scrapers/${userId}/alerts`);
    onSnapshot(alertsCollection, (snapshot) => {
        alertsContainer.innerHTML = ''; // Clear previous alerts
        if(snapshot.empty){
             alertsContainer.innerHTML = `<p class="text-gray-500">No alerts yet.</p>`;
        }
        snapshot.forEach((doc) => {
            const alert = doc.data();
            addAlert(alert.message, alert.type);
        });
    });
}

async function loadInitialData() {
    if (!userId) return;
    
    // Load existing brands
    brandsTableBody.innerHTML = '';
    brandsCount = 0;
    const brandsCollection = collection(db, `scrapers/${userId}/brands`);
    const brandsSnapshot = await getDocs(brandsCollection);
    brandsSnapshot.forEach(doc => {
         const brand = doc.data();
         addBrandToTable(brand);
         brandsCount++;
         brandsCountEl.textContent = brandsCount;
    });
}

// --- Core Functions ---
function startScraping() {
    if (isScraping || !userId) return;
    isScraping = true;
    updateUI(true);
    log("Scraping process started.");
    
    // Increment total runs
    updateStats({ totalRuns: 'increment' });
    
    seconds = 0;
    startTimer();
    
    // Mock scraping process
    let targetIndex = 0;
    const scrapeInterval = setInterval(() => {
        if (!isScraping) {
            clearInterval(scrapeInterval);
            return;
        }
        
        if (targetIndex >= mockTargets.length) {
            stopScraping(true); // Success
            return;
        }

        const target = mockTargets[targetIndex];
        currentTargetEl.textContent = target;
        log(`Scraping target: ${target}`);

        // Simulate finding brands
        const newBrandsCount = Math.floor(Math.random() * 5) + 1;
        for (let i = 0; i < newBrandsCount; i++) {
            const newBrand = generateMockBrand();
            addDoc(collection(db, `scrapers/${userId}/brands`), newBrand);
        }
        
        // Simulate an error
        if (Math.random() < 0.1) {
            log(`Error scraping ${target}. Retrying...`, 'error');
            createAlert(`Failed to fetch from ${target}.`, 'error');
        }

        targetIndex++;

    }, 3000); // 3 seconds per target
}

function stopScraping(isSuccess = false) {
    if (!isScraping) return;
    isScraping = false;
    updateUI(false);
    stopTimer();
    currentTargetEl.textContent = 'N/A';
    if(isSuccess) {
         log("Scraping process completed successfully.");
         updateStats({ successfulRuns: 'increment' });
    } else {
         log("Scraping process stopped by user.", 'warning');
         updateStats({ failedRuns: 'increment' });
         createAlert('Task stopped manually by user.', 'warning');
    }
}

async function updateStats(updates) {
    if (!userId) return;
    const statsRef = doc(db, `scrapers/${userId}/stats/execution`);
    const docSnap = await getDoc(statsRef);
    let currentStats = docSnap.exists() ? docSnap.data() : { totalRuns: 0, successfulRuns: 0, failedRuns: 0, totalBrands: 0 };

    if(updates.totalRuns === 'increment') currentStats.totalRuns = (currentStats.totalRuns || 0) + 1;
    if(updates.successfulRuns === 'increment') currentStats.successfulRuns = (currentStats.successfulRuns || 0) + 1;
    if(updates.failedRuns === 'increment') currentStats.failedRuns = (currentStats.failedRuns || 0) + 1;
    
    // Note: This is a simplified way to track total brands for the average calculation.
    let currentBrandCount = 0;
    const brandsSnapshot = await getDocs(collection(db, `scrapers/${userId}/brands`));
    currentBrandCount = brandsSnapshot.size;
    currentStats.totalBrands = currentBrandCount;

    await setDoc(statsRef, currentStats, { merge: true });
}


// --- UI & Helpers ---
function updateUI(scraping) {
    isScraping = scraping;
    startButton.disabled = scraping;
    stopButton.disabled = !scraping;

    statusDot.className = 'status-dot ml-2 ' + (scraping ? 'status-running' : 'status-stopped');
    statusLabel.className = 'font-mono px-2 py-1 rounded-md ' + (scraping ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800');
    statusLabel.textContent = scraping ? 'Running' : 'Stopped';

    if (!scraping) {
         if (timerInterval) { // If a process was running and is now stopped
            statusDot.className = 'status-dot ml-2 status-stopped';
            statusLabel.textContent = 'Stopped';
            statusLabel.className = 'font-mono px-2 py-1 rounded-md bg-red-100 text-red-800';
         } else { // If idle from the start
            statusDot.className = 'status-dot ml-2 status-idle';
            statusLabel.textContent = 'Idle';
            statusLabel.className = 'font-mono px-2 py-1 rounded-md bg-yellow-100 text-yellow-800';
         }
    }
}

function addBrandToTable(brand) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td class="py-3 px-4 border-b border-gray-200"><img src="${brand.logo}" class="rounded-full h-10 w-10 object-cover" onerror="this.onerror=null;this.src='https://placehold.co/40x40/e2e8f0/e2e8f0?text=Logo';"></td>
        <td class="py-3 px-4 border-b border-gray-200 font-medium">${brand.name}</td>
        <td class="py-3 px-4 border-b border-gray-200">${brand.founder}</td>
        <td class="py-3 px-4 border-b border-gray-200">${brand.classification}</td>
    `;
    brandsTableBody.prepend(row);
}

function log(message, type = 'info') {
    const p = document.createElement('p');
    let typeClass = 'text-gray-400';
    if (type === 'error') typeClass = 'text-red-400';
    if (type === 'warning') typeClass = 'text-yellow-400';
    if (type === 'success') typeClass = 'text-green-400';
    p.className = typeClass;
    p.textContent = `> ${new Date().toLocaleTimeString()}: ${message}`;
    logsContainer.prepend(p);
}

function addAlert(message, type = 'error') {
    if(alertsContainer.querySelector('.text-gray-500')) alertsContainer.innerHTML = '';
    const alertDiv = document.createElement('div');
    let bgColor = 'bg-red-100';
    let textColor = 'text-red-800';
    if(type === 'warning') {
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
    }
    alertDiv.className = `p-3 rounded-lg ${bgColor} ${textColor}`;
    alertDiv.textContent = message;
    alertsContainer.prepend(alertDiv);
}

function createAlert(message, type){
     if(!userId) return;
     addDoc(collection(db, `scrapers/${userId}/alerts`), { message, type, timestamp: new Date() });
}

function startTimer() {
    timerInterval = setInterval(() => {
        seconds++;
        const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        elapsedTimeEl.textContent = `${h}:${m}:${s}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

// --- Mock Data Generator ---
function generateMockBrand() {
    const names = ["Apex", "Vortex", "Zenith", "Nova", "Pulse", "Fusion", "Equinox"];
    const domains = ["Industries", "Dynamics", "Solutions", "Global", "Enterprises"];
    const founders = ["Jane Doe", "John Smith", "Alex Ray", "Sam Wilson", "Chris Lee"];
    const classifications = ["Technology", "Finance", "Healthcare", "Retail", "Automotive"];
    
    const name = `${names[Math.floor(Math.random() * names.length)]} ${domains[Math.floor(Math.random() * domains.length)]}`;
    const logoText = name.split(" ").map(n => n[0]).join('');
    
    return {
        name: name,
        logo: `https://placehold.co/40x40/7c3aed/ffffff?text=${logoText}`,
        founder: founders[Math.floor(Math.random() * founders.length)],
        classification: classifications[Math.floor(Math.random() * classifications.length)],
        timestamp: new Date()
    };
}


// --- Event Listeners ---
startButton.addEventListener('click', startScraping);
stopButton.addEventListener('click', () => stopScraping(false));
scheduleButton.addEventListener('click', () => {
    log('Schedule feature is not yet implemented.', 'warning');
    createAlert('Schedule feature is a planned update.', 'warning');
});

// Initial UI state
updateUI(false);
