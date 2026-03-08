let allApplications = [];
let currentWorkItemId = null;

// Load data when page loads
document.addEventListener('DOMContentLoaded', async () => {
    await loadApplications();

    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
});

async function loadApplications() {
    try {
        // Prefer API when running with local server; fallback to direct json for static mode.
        const response = await fetch('/api/applications');
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

function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();

    if (!searchTerm) {
        document.getElementById('searchResults').innerHTML = '';
        document.getElementById('noResults').style.display = 'none';
        switchScreen('searchScreen', 'agentQueueScreen');
        return;
    }

    const results = allApplications.filter((app) => {
        return (
            app.ApplicationID.toLowerCase().includes(searchTerm) ||
            app.FirstName.toLowerCase().includes(searchTerm) ||
            app.LastName.toLowerCase().includes(searchTerm) ||
            app.SSN.includes(searchTerm) ||
            app.Product.toLowerCase().includes(searchTerm) ||
            app.ProductType.toLowerCase().includes(searchTerm) ||
            app.AgentID.toLowerCase().includes(searchTerm) ||
            app.ApplicationStatus.toLowerCase().includes(searchTerm) ||
            String(app['Case Notes'] || '').toLowerCase().includes(searchTerm)
        );
    });

    displayResults(results);
    switchScreen('searchScreen', 'agentQueueScreen');
}

function displayResults(results) {
    const resultsContainer = document.getElementById('searchResults');
    const noResults = document.getElementById('noResults');

    if (results.length === 0) {
        resultsContainer.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';
    resultsContainer.innerHTML = results.map((app) => `
        <button class="result-line" onclick="openWorkItem('${app.ApplicationID}')">
            ${escapeHtml(app.ApplicationID)} | ${escapeHtml(app.FirstName)} ${escapeHtml(app.LastName)} | ${escapeHtml(app.ApplicationStatus)}
        </button>
    `).join('');
}

function openWorkItem(applicationId) {
    const record = allApplications.find((app) => app.ApplicationID === applicationId);
    if (!record) {
        return;
    }

    currentWorkItemId = applicationId;

    const detailRows = Object.entries(record)
        .filter(([key]) => key !== 'Case Notes')
        .map(([key, value]) => `
            <div class="detail-row">
                <div class="detail-key">${escapeHtml(key)}</div>
                <div class="detail-value">${escapeHtml(String(value ?? ''))}</div>
            </div>
        `)
        .join('');

    document.getElementById('workItemContent').innerHTML = detailRows;
    document.getElementById('caseNotesInput').value = record['Case Notes'] || '';

    switchScreen('agentQueueScreen', 'workItemScreen');
}

async function saveWorkItemNotes(showSuccessMessage = true) {
    if (!currentWorkItemId) {
        return false;
    }

    const notesValue = document.getElementById('caseNotesInput').value;
    const record = allApplications.find((app) => app.ApplicationID === currentWorkItemId);
    if (!record) {
        return false;
    }

    record['Case Notes'] = notesValue;

    try {
        const response = await fetch(`/api/applications/${encodeURIComponent(currentWorkItemId)}/notes`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ caseNotes: notesValue })
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || 'Failed to save notes.');
        }

        if (showSuccessMessage) {
            alert('Notes saved successfully.');
        }
        return true;
    } catch (error) {
        console.error('Error saving notes:', error);
        alert('Unable to save to db.json. Start the app with: node server.js');
        return false;
    }
}

async function okAndReturn() {
    const saved = await saveWorkItemNotes(false);
    if (saved) {
        goBackToQueue();
    }
}

function goBackToQueue() {
    switchScreen('workItemScreen', 'agentQueueScreen');
}

function goBackToSearch() {
    switchScreen('agentQueueScreen', 'searchScreen');
}

function switchScreen(hideId, showId) {
    document.getElementById(hideId).classList.remove('active');
    document.getElementById(showId).classList.add('active');
}

function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
