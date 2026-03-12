let allApplications = [];
let currentApplicationId = null;
const API_ORIGIN = resolveApiOrigin();
const QUEUE_COLUMNS = ['ApplicationID', 'LastName', 'FirstName', 'ApplicationStatus', 'ProductType', 'AgentID'];
const HIDDEN_DETAIL_FIELDS = new Set(['Credit Notes', 'Underwriter Notes', 'Process Notes']);

function resolveApiOrigin() {
    const isFileProtocol = window.location.protocol === 'file:';
    const isNodeServerOrigin = ['localhost', '127.0.0.1'].includes(window.location.hostname) && window.location.port === '8080';

    if (isFileProtocol || !isNodeServerOrigin) {
        return 'http://localhost:8080';
    }

    return window.location.origin;
}

function apiUrl(path) {
    return `${API_ORIGIN}${path}`;
}

document.addEventListener('DOMContentLoaded', async () => {
    wireUiEvents();
    await loadApplications();
    renderQueue();
});

function wireUiEvents() {
    document.getElementById('queueList').addEventListener('click', (event) => {
        const row = event.target.closest('.queue-row');
        if (!row) {
            return;
        }

        openRecord(row.dataset.applicationId || '');
    });

    document.getElementById('backToQueueBtn').addEventListener('click', () => {
        goBackToQueue();
    });

    document.querySelector('.tabs').addEventListener('click', (event) => {
        const button = event.target.closest('.tab-btn');
        if (!button) {
            return;
        }

        selectTab(button.dataset.tab || 'details');
    });
}

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
        <button class="queue-row" type="button" data-application-id="${escapeHtml(String(application.ApplicationID ?? ''))}">
            ${QUEUE_COLUMNS.map((column) => `
                <span class="queue-cell" data-label="${escapeHtml(formatLabel(column))}">
                    ${escapeHtml(String(application[column] ?? ''))}
                </span>
            `).join('')}
        </button>
    `).join('');
}

function openRecord(applicationId) {
    const application = findApplicationById(applicationId);
    if (!application) {
        return;
    }

    currentApplicationId = String(application.ApplicationID ?? '');
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

    loadLoanDecision(currentApplicationId);
    selectTab('details');
    switchScreen('queueScreen', 'recordScreen');
}

async function loadLoanDecision(applicationId) {
    const requestedApplicationId = String(applicationId ?? '');
    const alertBox = document.getElementById('loanDecisionAlert');
    alertBox.hidden = false;
    alertBox.className = 'loan-alert';
    alertBox.textContent = 'Loan Decision: Loading...';

    try {
        const response = await fetch(apiUrl(`/api/applications/${encodeURIComponent(requestedApplicationId)}/loan-decision`));
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(payload.error || 'Failed to load loan decision.');
        }

        if (currentApplicationId !== requestedApplicationId) {
            return;
        }

        const decisionClass = formatDecisionClass(payload.loanDecision);
        alertBox.className = `loan-alert ${decisionClass}`;
        alertBox.textContent = `Loan Decision: ${payload.loanDecision} (Credit Score: ${payload.creditScore})`;
    } catch (error) {
        const fallbackApplication = findApplicationById(requestedApplicationId);
        const fallbackDecision = getLocalLoanDecision(fallbackApplication);

        if (currentApplicationId !== requestedApplicationId) {
            return;
        }

        if (fallbackDecision) {
            alertBox.className = `loan-alert ${formatDecisionClass(fallbackDecision.loanDecision)}`;
            alertBox.textContent = `Loan Decision: ${fallbackDecision.loanDecision} (Credit Score: ${fallbackDecision.creditScore})`;
            return;
        }

        console.error('Error loading loan decision:', error);
        alertBox.className = 'loan-alert needs-review';
        alertBox.textContent = 'Loan Decision: unavailable';
    }
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
    document.getElementById('loanDecisionAlert').hidden = true;
    switchScreen('recordScreen', 'queueScreen');
}

function switchScreen(hideId, showId) {
    document.getElementById(hideId).classList.remove('active');
    document.getElementById(showId).classList.add('active');
}

function formatLabel(value) {
    return value.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function formatDecisionClass(value) {
    if (value === 'Approved') {
        return 'approved';
    }

    if (value === 'Declined') {
        return 'declined';
    }

    return 'needs-review';
}

function findApplicationById(applicationId) {
    const normalizedId = String(applicationId ?? '');
    return allApplications.find((item) => String(item.ApplicationID ?? '') === normalizedId);
}

function getLocalLoanDecision(application) {
    if (!application) {
        return null;
    }

    const creditScore = Number(application['Credit Score']);
    if (!Number.isFinite(creditScore)) {
        return null;
    }

    return {
        creditScore,
        loanDecision: deriveLoanDecision(creditScore)
    };
}

function deriveLoanDecision(creditScore) {
    if (creditScore < 600) {
        return 'Declined';
    }

    if (creditScore < 650) {
        return 'Needs Review';
    }

    if (creditScore > 700) {
        return 'Approved';
    }

    return 'Needs Review';
}

function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
