let allApplications = [];

// Load data when page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('db.json');
        const data = await response.json();
        allApplications = data.applications;
    } catch (error) {
        console.error('Error loading database:', error);
        alert('Error loading application database. Make sure db.json is in the same directory.');
    }

    // Allow Enter key to search
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
});

function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();

    if (!searchTerm) {
        document.getElementById('searchResults').innerHTML = '';
        document.getElementById('noResults').style.display = 'none';
        switchScreen('searchScreen', 'agentQueueScreen');
        return;
    }

    const results = allApplications.filter(app => {
        return (
            app.ApplicationID.toLowerCase().includes(searchTerm) ||
            app.FirstName.toLowerCase().includes(searchTerm) ||
            app.LastName.toLowerCase().includes(searchTerm) ||
            app.SSN.includes(searchTerm) ||
            app.Product.toLowerCase().includes(searchTerm) ||
            app.ProductType.toLowerCase().includes(searchTerm) ||
            app.AgentID.toLowerCase().includes(searchTerm) ||
            app.ApplicationStatus.toLowerCase().includes(searchTerm)
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
    resultsContainer.innerHTML = results.map(app => `
        <button class="result-line" onclick="openRecordWindow('${app.ApplicationID}')">
            ${escapeHtml(app.ApplicationID)} | ${escapeHtml(app.FirstName)} ${escapeHtml(app.LastName)} | ${escapeHtml(app.ApplicationStatus)}
        </button>
    `).join('');
}

function openRecordWindow(applicationId) {
    const record = allApplications.find(app => app.ApplicationID === applicationId);

    if (!record) {
        return;
    }

    const detailRows = Object.entries(record)
        .map(([key, value]) => `
            <tr>
                <td>${escapeHtml(key)}</td>
                <td>${escapeHtml(String(value ?? ''))}</td>
            </tr>
        `)
        .join('');

    const popup = window.open('', '_blank', 'width=700,height=600,resizable=yes,scrollbars=yes');
    if (!popup) {
        alert('Popup was blocked. Please allow popups and try again.');
        return;
    }

    popup.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Record Details</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 24px;
                    color: #222;
                }
                h2 {
                    margin: 0 0 16px;
                    color: #1f3a8a;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                td {
                    border: 1px solid #ddd;
                    padding: 10px;
                    vertical-align: top;
                }
                td:first-child {
                    width: 38%;
                    font-weight: 700;
                    background: #f8fafc;
                }
                .ok-btn {
                    background: #1f3a8a;
                    color: #fff;
                    border: none;
                    border-radius: 4px;
                    padding: 10px 18px;
                    font-size: 14px;
                    cursor: pointer;
                }
                .ok-btn:hover {
                    background: #172554;
                }
            </style>
        </head>
        <body>
            <h2>Application ${escapeHtml(record.ApplicationID)}</h2>
            <table>
                <tbody>
                    ${detailRows}
                </tbody>
            </table>
            <button class="ok-btn" onclick="if (window.opener) { window.opener.focus(); } window.close();">OK</button>
        </body>
        </html>
    `);
    popup.document.close();
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
