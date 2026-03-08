let allApplications = [];
let currentRecord = null;

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
        <div class="result-card" onclick="viewDetails('${app.ApplicationID}')">
            <h3>${app.FirstName} ${app.LastName}</h3>
            <p><strong>App ID:</strong> ${app.ApplicationID}</p>
            <p><strong>Status:</strong> ${app.ApplicationStatus}</p>
            <p><strong>Product:</strong> ${app.Product}</p>
            <p><strong>Agent:</strong> ${app.AgentID}</p>
        </div>
    `).join('');
}

function viewDetails(applicationId) {
    currentRecord = allApplications.find(app => app.ApplicationID === applicationId);
    
    if (!currentRecord) return;

    const detailsContent = document.getElementById('detailsContent');
    detailsContent.innerHTML = `
        <div class="detail-title">${currentRecord.FirstName} ${currentRecord.LastName} - Application Details</div>
        <div class="detail-row">
            <span class="detail-label">Application ID:</span>
            <span class="detail-value">${currentRecord.ApplicationID}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">First Name:</span>
            <span class="detail-value">${currentRecord.FirstName}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Last Name:</span>
            <span class="detail-value">${currentRecord.LastName}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">SSN:</span>
            <span class="detail-value">${currentRecord.SSN}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Application Status:</span>
            <span class="detail-value">${currentRecord.ApplicationStatus}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Date of Application Submitted:</span>
            <span class="detail-value">${currentRecord.DateOfApplicationSubmitted}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Product:</span>
            <span class="detail-value">${currentRecord.Product}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Product Type:</span>
            <span class="detail-value">${currentRecord.ProductType}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Agent ID:</span>
            <span class="detail-value">${currentRecord.AgentID}</span>
        </div>
    `;

    // Switch to details screen
    document.getElementById('searchScreen').classList.remove('active');
    document.getElementById('detailsScreen').classList.add('active');
}

function goBack() {
    document.getElementById('detailsScreen').classList.remove('active');
    document.getElementById('searchScreen').classList.add('active');
}