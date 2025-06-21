// UI rendering and interaction logic

export function updateUI(state) {
    // Update KPIs
    document.getElementById('kpiTotalBrands').textContent = state.allBrands.length;
    document.getElementById('kpiTotalRuns').textContent = state.stats.totalRuns;
    // Calculate success rate
    const total = state.stats.successfulRuns + state.stats.failedRuns;
    const rate = total > 0 ? ((state.stats.successfulRuns / total) * 100).toFixed(0) : 0;
    document.getElementById('kpiSuccessRate').textContent = rate + '%';

    // Render brands table with current filter
    renderTable(state.allBrands, document.getElementById('searchInput') ? document.getElementById('searchInput').value : "");

    // Optionally update charts, schedule status, etc.
}

export function log(message, type = 'info') {
    const logsContainer = document.getElementById('logsContainer');
    if (!logsContainer) return;
    const p = document.createElement('p');
    const typeClasses = { error: 'text-red-400', warning: 'text-yellow-400', success: 'text-green-400', info: 'text-gray-400' };
    p.className = typeClasses[type] || 'text-gray-400';
    p.innerHTML = `<span class="text-gray-500 mr-2">${new Date().toLocaleTimeString()} &gt;</span> ${message}`;
    logsContainer.prepend(p);
}

export function addAlert(message, type = 'warning') {
    const alertsContainer = document.getElementById('alertsContainer');
    if (!alertsContainer) return;
    if (alertsContainer.querySelector('.text-gray-500')) alertsContainer.innerHTML = '';
    const alertDiv = document.createElement('div');
    const C = {
        error: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
        warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
        success: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300'}
    }[type] || { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' };
    alertDiv.className = `p-3 rounded-lg border ${C.bg} ${C.text} ${C.border}`;
    alertDiv.textContent = message;
    alertsContainer.prepend(alertDiv);
}

export function initCharts(state) {
    // (Initialize and update Chart.js charts using the state)
    // For brevity, not implemented here
}

export function initScheduleModal(state) {
    // (Bind schedule modal open/close/save logic)
    // For brevity, not implemented here
}

export function initExportModal(state) {
    // (Bind export modal open/close/export logic)
    // For brevity, not implemented here
}

export function updateScheduleStatus(state) {
    // (Update the schedule status UI)
    // For brevity, not implemented here
}

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
            // You may want to expose the app state globally or manage with events
            if (window.appState) {
                renderTable(window.appState.allBrands, search.value);
            }
        });
    }
});