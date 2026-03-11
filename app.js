let allApplications = [];
let currentApplicationId = null;
const API_ORIGIN = resolveApiOrigin();
const QUEUE_COLUMNS = ['ApplicationID', 'LastName', 'FirstName', 'ApplicationStatus', 'ProductType', 'AgentID'];
const HIDDEN_DETAIL_FIELDS = new Set(['Credit Notes', 'Underwriter Notes', 'Process Notes']);

function resolveApiOrigin() {
    const isFileProtocol = window.location.protocol === 'file:';
    const isNodeServerOrigin = window.location.hostname === 'localhost' && window.location.port === '8080';

    if (isFileProtocol || !isNodeServerOrigin) {
        return 'http://localhost:8080';
    }

    return window.location.origin;
}

function apiUrl(path) {
    return `${API_ORIGIN}${path}`;
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadApplications();
    renderQueue();
});

async function loadApplications() {
    try {
        const response = await fetch(apiUrl('/api/applications'));
        if (!response.ok) {
            throw new Error('API not available');
        }

        const data = await response.json();
        allApplications = data.applications || [];
    } catch {
        try {
            const response = await fetch('db.json');
            const data = await response.json();
            allApplications = data.applications || [];
        } catch (error) {
            console.error('Error loading database:', error);
            alert('Error loading application database.');
        }
    }
}

function renderQueue() {
    const queueList = document.getElementById('queueList');
    const noRecords = document.getElementById('noRecords');

    if (allApplications.length === 0) {
        queueList.innerHTML = '';
        noRecords.hidden = false;
        return;
    }

    noRecords.hidden = true;
    queueList.innerHTML = allApplications.map((application) => `
        <button class="queue-row" type="button" onclick="openRecord('${escapeForAttribute(application.ApplicationID)}')">
            ${QUEUE_COLUMNS.map((column) => `
                <span class="queue-cell" data-label="${escapeHtml(formatLabel(column))}">
                    ${escapeHtml(String(application[column] ?? ''))}
                </span>
            `).join('')}
        </button>
    `).join('');
}

function openRecord(applicationId) {
    const application = allApplications.find((item) => item.ApplicationID === applicationId);
    if (!application) {
        return;
    }

    currentApplicationId = applicationId;
    document.getElementById('recordTitle').textContent = `${application.ApplicationID} - ${application.FirstName} ${application.LastName}`;
    document.getElementById('recordMeta').innerHTML = `
        <span>${escapeHtml(application.ApplicationStatus || '')}</span>
        <span>${escapeHtml(application.ProductType || '')}</span>
        <span>${escapeHtml(application.AgentID || '')}</span>
    `;

    renderDetails(application);
    document.getElementById('processNotesContent').textContent = application['Process Notes'] || '';
    document.getElementById('creditNotesContent').textContent = application['Credit Notes'] || '';
    document.getElementById('underwriterNotesContent').textContent = application['Underwriter Notes'] || '';

    selectTab('details');
    switchScreen('queueScreen', 'recordScreen');
}

function renderDetails(application) {
    const detailsContent = document.getElementById('detailsContent');
    const detailRows = Object.entries(application)
        .filter(([key]) => !HIDDEN_DETAIL_FIELDS.has(key))
        .map(([key, value]) => `
            <div class="detail-row">
                <div class="detail-key">${escapeHtml(formatLabel(key))}</div>
                <div class="detail-value">${escapeHtml(String(value ?? ''))}</div>
            </div>
        `)
        .join('');

    detailsContent.innerHTML = detailRows;
}

function selectTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach((button) => {
        button.classList.toggle('active', button.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });
}

function goBackToQueue() {
    currentApplicationId = null;
    switchScreen('recordScreen', 'queueScreen');
}

function switchScreen(hideId, showId) {
    document.getElementById(hideId).classList.remove('active');
    document.getElementById(showId).classList.add('active');
}

function formatLabel(value) {
    return value.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function escapeForAttribute(value) {
    return String(value).replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}

function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
