// UI rendering and interaction logic

let runStatusChart = null;
let brandsBySourceChart = null;

export function updateUI(state) {
    // --- STATUS INDICATOR ---
    const statusDot = document.getElementById('statusIndicatorDot');
    const statusText = document.getElementById('statusIndicatorText');
    if (statusDot && statusText) {
        if (state.isScraping) {
            statusDot.className = 'w-3 h-3 rounded-full bg-green-500 mr-3';
            statusText.textContent = 'Scraping...';
        } else if (!state.dbInitialized) {
            statusDot.className = 'w-3 h-3 rounded-full bg-gray-400 mr-3';
            statusText.textContent = 'Initializing';
        } else {
            statusDot.className = 'w-3 h-3 rounded-full bg-blue-400 mr-3';
            statusText.textContent = 'Idle';
        }
    }

    // --- STORAGE STATUS ---
    const storageStatus = document.getElementById('storageStatusText');
    if (storageStatus) {
        if (!itialized) {
            storageStatus.textContent = 'Storage: Initializing...';
        } else {
            storageStatus.textContent = 'Storage: Ready';
        }
    }

    // Update KPIs
    document.getElementById('kpiTotalBrands').textContent = state.allBrands.length;
    document.getElementById('kpiTotalRuns').textContent = state.stats.totalRuns;
    // Calculate success rate
    const total = state.stats.successfulRuns + state.stats.failedRuns;
    const rate = total > 0 ? ((state.stats.successfulRuns / total) * 100).toFixed(0) : 0;
    document.getElementById('kpiSuccessRate').textContent = rate + '%';

    // Render brands table with current filter
    renderTable(state.allBrands, document.getElementById('searchInput') ? document.getElementById('searchInput').value : "");

    updateCharts(state);
}

// --- LOGS AND ALERTS (unchanged) ---
export function log(message, type = 'info') {
    const logsContainer = document.getElementById('logsContainer');
    if (!logsContainer) return;
    const time = new Date().toLocaleTimeString();
    const color = type === 'error' ? 'text-red-400' :
                  type === 'success' ? 'text-green-400' :
                  type === 'warning' ? 'text-yellow-300' :
                  'text-gray-200';
    logsContainer.innerHTML += `<div class="${color}">[${time}] ${message}</div>`;
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

export function addAlert(message, type = 'warning') {
    const alertsContainer = document.getElementById('alertsContainer');
    if (!alertsContainer) return;
    const color = type === 'error' ? 'bg-red-100 text-red-700' :
                  type === 'success' ? 'bg-green-100 text-green-700' :
                  'bg-yellow-100 text-yellow-700';
    const alert = document.createElement('div');
    alert.className = `rounded px-3 py-2 ${color} border border-gray-200 shadow-sm`;
    alert.innerText = message;
    alertsContainer.appendChild(alert);
    setTimeout(() => {
        alert.remove();
        if (alertsContainer.children.length === 0) {
            alertsContainer.innerHTML = '<p class="text-gray-500">No alerts yet.</p>';
        }
    }, 8000);
}

// --- CHARTS ---
export function initCharts(state) {
    // Run Status Chart
    const ctxRun = document.getElementById('runStatusChart');
    if (ctxRun) {
        if (runStatusChart) runStatusChart.destroy();
        runStatusChart = new window.Chart(ctxRun, {
            type: 'doughnut',
            data: {
                labels: ['Success', 'Failed'],
                datasets: [{
                    data: [state.stats.successfulRuns, state.stats.failedRuns],
                    backgroundColor: ['#38B2AC', '#F56565'],
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true, position: 'bottom' }
                }
            }
        });
    }
    // Brands by Source Chart
    const ctxSource = document.getElementById('brandsBySourceChart');
    if (ctxSource) {
        if (brandsBySourceChart) brandsBySourceChart.destroy();
        const sources = Object.keys(state.stats.brandsBySource);
        const counts = sources.map(s => state.stats.brandsBySource[s]);
        brandsBySourceChart = new window.Chart(ctxSource, {
            type: 'bar',
            data: {
                labels: sources,
                datasets: [{
                    label: 'Brands',
                    data: counts,
                    backgroundColor: '#4299E1'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { beginAtZero: true },
                    y: { beginAtZero: true }
                }
            }
        });
    }
}

// Call this in updateUI to keep charts live
function updateCharts(state) {
    // Update Run Status
    if (runStatusChart) {
        runStatusChart.data.datasets[0].data = [state.stats.successfulRuns, state.stats.failedRuns];
        runStatusChart.update();
    }
    // Update Brands by Source
    if (brandsBySourceChart) {
        const sources = Object.keys(state.stats.brandsBySource);
        brandsBySourceChart.data.labels = sources;
        brandsBySourceChart.data.datasets[0].data = sources.map(s => state.stats.brandsBySource[s]);
        brandsBySourceChart.update();
    }
}

// --- SCHEDULE MODAL (unchanged stubs) ---
export function initScheduleModal(state) { 
            scheduleButton.addEventListener('click', () => scheduleModal.classList.remove('hidden'));
            closeScheduleModal.addEventListener('click', () => scheduleModal.classList.add('hidden'));
            scheduleOverlay.addEventListener('click', () => scheduleModal.classList.add('hidden'));
            saveScheduleBtn.addEventListener('click', saveSchedule);
}

export function updateScheduleStatus(state) { 
            if (!state.isScheduled || state.targetBrandCount <= 0) {
            scheduleStatus.innerHTML = '<span class="text-gray-500">No Schedule Set</span>';
            return;
            }
            
            const frequencyMap = { 'manual': 'Manual Start', 'daily': 'Daily', 'weekly': 'Weekly', 'monthly': 'Monthly' };
            const freqText = frequencyMap[state.scheduleFrequency];
            let statusText = `<span class="text-blue-600 font-semibold">Target:</span> ${state.targetBrandCount} Brands | <span class="font-semibold">Mode:</span> ${freqText}`;
            scheduleStatus.innerHTML = statusText;
}

// --- EXPORT/IMPORT ---
export function initExportModal(state) {
    // Open/close modal
    document.getElementById('exportDataButton')?.addEventListener('click', () => {
        document.getElementById('exportModal').classList.remove('hidden');
    });
    document.getElementById('closeExportModal')?.addEventListener('click', () => {
        document.getElementById('exportModal').classList.add('hidden');
    });

    // Export JSON
    document.getElementById('exportJsonButton')?.addEventListener('click', () => {
        const dataStr = JSON.stringify(window.appState.allBrands, null, 2);
        downloadFile('brands.json', dataStr, 'application/json');
    });

    // Export CSV
    document.getElementById('exportCsvButton')?.addEventListener('click', () => {
        const csv = toCSV(window.appState.allBrands);
        downloadFile('brands.csv', csv, 'text/csv');
    });

    // Import logic
    document.getElementById('importDataButton')?.addEventListener('click', () => {
        document.getElementById('importFileInput').click();
    });
    document.getElementById('importFileInput')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const ext = file.name.split('.').pop().toLowerCase();
        const text = await file.text();
        let imported = [];
        try {
            if (ext === 'json') {
                imported = JSON.parse(text);
            } else if (ext === 'csv') {
                imported = fromCSV(text);
            }
            if (Array.isArray(imported)) {
                // Merge and dedupe by name
                const merged = [...window.appState.allBrands];
                for (const b of imported) {
                    if (!merged.some(x => x.name === b.name)) merged.push(b);
                }
                window.appState.allBrands = merged;
                // Optionally update stats
                await window.saveBrands(window.appState.allBrands);
                updateUI(window.appState);
                log(`Imported ${imported.length} brands from file.`, 'success');
            } else {
                addAlert('Failed to parse imported data.', 'error');
            }
        } catch (e) {
            addAlert('Import error: ' + e, 'error');
        }
        e.target.value = ''; // reset input
    });
}

// --- CSV UTILS ---
function toCSV(arr) {
    if (!arr.length) return '';
    const keys = Object.keys(arr[0]);
    const rows = arr.map(obj => keys.map(k => `"${(obj[k]||'').toString().replace(/"/g, '""')}"`).join(','));
    return keys.join(',') + '\n' + rows.join('\n');
}
function fromCSV(str) {
    const [header, ...lines] = str.trim().split('\n');
    const keys = header.split(',');
    return lines.map(line => {
        const vals = line.match(/("([^"]|"")*"|[^,]*)/g).map(s => s.replace(/^"|"$/g, '').replace(/""/g, '"'));
        const obj = {};
        keys.forEach((k, i) => obj[k] = vals[i]);
        return obj;
    });
}
function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 50);
}

// --- TABLE ---
export function renderTable(brands, filter) {
    const tbody = document.getElementById('brandsTableBody');
    if (!tbody) return;
    let filtered = brands;
    if (filter && filter.trim()) {
        const f = filter.trim().toLowerCase();
        filtered = brands.filter(b =>
            (b.name && b.name.toLowerCase().includes(f)) ||
            (b.founder && b.founder.toLowerCase().includes(f)) ||
            (b.classification && b.classification.toLowerCase().includes(f))
        );
    }
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-gray-500">No matching brands found.</td></tr>`;
        return;
    }
    tbody.innerHTML = filtered.map(b => `
        <tr>
            <td class="py-2 px-4">
                ${b.logo ? `<img src="${b.logo}" alt="${b.name}" class="w-8 h-8 rounded-full object-contain">` : `<span class="inline-block w-8 h-8 bg-gray-200 rounded-full"></span>`}
            </td>
            <td class="py-2 px-4 font-semibold">${b.name || ''}</td>
            <td class="py-2 px-4">${b.founder || ''}</td>
            <td class="py-2 px-4">${b.classification || ''}</td>
            <td class="py-2 px-4">${b.source || ''}</td>
        </tr>
    `).join('');
}

// Bind search input (live filtering in Data Explorer)
document.addEventListener('DOMContentLoaded', () => {
    const search = document.getElementById('searchInput');
    if (search) {
        search.addEventListener('input', () => {
            if (window.appState) {
                renderTable(window.appState.allBrands, search.value);
            }
        });
    }
});