// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

// Check for saved theme preference or default to light mode
const currentTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', currentTheme);

themeToggle.addEventListener('click', () => {
    const theme = html.getAttribute('data-theme');
    const newTheme = theme === 'light' ? 'dark' : 'light';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// VPN Modal
const vpnInfoBtn = document.getElementById('vpnInfoBtn');
const vpnModal = document.getElementById('vpnModal');
const closeVpnModal = document.getElementById('closeVpnModal');
const gotItBtn = document.getElementById('gotItBtn');

function showVpnModal() {
    vpnModal.style.display = 'flex';
    setTimeout(() => vpnModal.classList.add('show'), 10);
}

function hideVpnModal() {
    vpnModal.classList.remove('show');
    setTimeout(() => vpnModal.style.display = 'none', 300);
}

vpnInfoBtn.addEventListener('click', showVpnModal);
closeVpnModal.addEventListener('click', hideVpnModal);
gotItBtn.addEventListener('click', hideVpnModal);

vpnModal.addEventListener('click', (e) => {
    if (e.target === vpnModal) hideVpnModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && vpnModal.classList.contains('show')) {
        hideVpnModal();
    }
});

// Toast Notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = toast.querySelector('.toast-icon');
    
    // Remove previous type classes
    toast.classList.remove('success', 'error', 'warning');
    toast.classList.add(type);
    
    // Update icon based on type
    if (type === 'success') {
        toastIcon.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
    } else if (type === 'error') {
        toastIcon.innerHTML = '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>';
    } else if (type === 'warning') {
        toastIcon.innerHTML = '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>';
    }
    
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

document.getElementById('toastClose').addEventListener('click', () => {
    document.getElementById('toast').classList.remove('show');
});

// DOI Input Handlers
const doiInput = document.getElementById('doiInput');
const clearBtn = document.getElementById('clearBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const generateBtn = document.getElementById('generateBtn');

clearBtn.addEventListener('click', () => {
    doiInput.value = '';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('exportSection').style.display = 'none';
    showToast('Input cleared', 'success');
});

loadSampleBtn.addEventListener('click', () => {
    const sampleDOIs = `10.1038/s41586-020-2180-5
10.1016/j.enpol.2017.10.012`;
    doiInput.value = sampleDOIs;
    showToast('Sample DOIs loaded', 'success');
});

// CrossRef API Integration
const CROSSREF_API_BASE = 'https://api.crossref.org/works';
const apiCache = new Map();

async function fetchPaperTitle(doi) {
    const cleanDOI = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
    
    // Check cache first
    if (apiCache.has(cleanDOI)) {
        return apiCache.get(cleanDOI);
    }
    
    try {
        const url = `${CROSSREF_API_BASE}/${encodeURIComponent(cleanDOI)}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const title = data.message.title?.[0] || 'Title not found';
        
        // Cache the result
        apiCache.set(cleanDOI, title);
        return title;
    } catch (error) {
        console.error('Error fetching paper title:', error);
        const fallbackTitle = 'Unable to fetch title';
        apiCache.set(cleanDOI, fallbackTitle);
        return fallbackTitle;
    }
}

// Process DOIs and Generate Results
generateBtn.addEventListener('click', async () => {
    const doiText = doiInput.value.trim();
    
    if (!doiText) {
        showToast('Please enter at least one DOI', 'warning');
        return;
    }
    
    const doiLines = doiText.split('\n').filter(line => line.trim() !== '');
    
    if (doiLines.length === 0) {
        showToast('No valid DOIs found', 'error');
        return;
    }
    
    // Show loading state
    const originalBtnHTML = generateBtn.innerHTML;
    generateBtn.disabled = true;
    generateBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
        Processing...
    `;
    
    // Show results section
    const resultsSection = document.getElementById('resultsSection');
    const resultsGrid = document.getElementById('resultsGrid');
    const resultsCount = document.getElementById('resultsCount');
    const exportSection = document.getElementById('exportSection');
    
    resultsSection.style.display = 'block';
    exportSection.style.display = 'block';
    resultsGrid.innerHTML = '';
    
    const results = [];
    
    // Process each DOI
    for (let i = 0; i < doiLines.length; i++) {
        let doi = doiLines[i].trim();
        
        // Clean DOI
        if (doi.startsWith('https://doi.org/')) {
            doi = doi.replace('https://doi.org/', '');
        } else if (doi.toLowerCase().startsWith('doi:')) {
            doi = doi.substring(4).trim();
        } else if (doi.includes('doi.org/')) {
            doi = doi.split('doi.org/')[1];
        }
        
        doi = doi.split(/[?#]/)[0].trim();
        
        if (!doi) continue;
        
        const scihubUrl = `https://sci-hub.red/${doi}`;
        
        // Create result card
        const resultCard = document.createElement('div');
        resultCard.className = 'result-card';
        resultCard.innerHTML = `
            <div class="result-header">
                <span class="result-number">#${i + 1}</span>
                <span class="status-badge status-found">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Unlocked
                </span>
            </div>
            <h3 class="result-title">
                <a href="${scihubUrl}" target="_blank" rel="noopener noreferrer">
                    Fetching title...
                </a>
            </h3>
            <div class="result-meta">
                <div class="meta-row">
                    <span class="meta-label">DOI:</span>
                    <span class="meta-value">${doi}</span>
                </div>
                <div class="meta-row">
                    <span class="meta-label">Access:</span>
                    <span class="meta-value">
                        <a href="${scihubUrl}" target="_blank" rel="noopener noreferrer">
                            Open in Sci-Hub
                        </a>
                    </span>
                </div>
            </div>
        `;
        
        resultsGrid.appendChild(resultCard);
        
        // Fetch title asynchronously
        fetchPaperTitle(doi).then(title => {
            const titleLink = resultCard.querySelector('.result-title a');
            titleLink.textContent = title;
        });
        
        results.push({ doi, url: scihubUrl });
    }
    
    // Update count
    resultsCount.textContent = `${results.length} paper${results.length !== 1 ? 's' : ''} processed`;
    
    // Store results globally for export
    window.currentResults = results;
    
    // Reset button
    generateBtn.disabled = false;
    generateBtn.innerHTML = originalBtnHTML;
    
    showToast(`Successfully processed ${results.length} DOI${results.length !== 1 ? 's' : ''}`, 'success');
    
    // Smooth scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Export Functionality
document.getElementById('copyLinksBtn').addEventListener('click', () => {
    if (!window.currentResults || window.currentResults.length === 0) {
        showToast('No links to copy', 'warning');
        return;
    }
    
    const links = window.currentResults.map(r => r.url).join('\n');
    
    navigator.clipboard.writeText(links)
        .then(() => showToast('Links copied to clipboard', 'success'))
        .catch(() => showToast('Failed to copy links', 'error'));
});

document.getElementById('downloadTxtBtn').addEventListener('click', () => {
    if (!window.currentResults || window.currentResults.length === 0) {
        showToast('No data to download', 'warning');
        return;
    }
    
    const content = window.currentResults
        .map((r, i) => `${i + 1}. DOI: ${r.doi}\n   Link: ${r.url}`)
        .join('\n\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `refunlocker-results-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Download started', 'success');
});

// Filter Results
document.getElementById('filterSelect').addEventListener('change', (e) => {
    const filter = e.target.value;
    const cards = document.querySelectorAll('.result-card');
    
    cards.forEach(card => {
        const badge = card.querySelector('.status-badge');
        const isFound = badge.classList.contains('status-found');
        
        if (filter === 'all') {
            card.style.display = 'block';
        } else if (filter === 'found' && isFound) {
            card.style.display = 'block';
        } else if (filter === 'not-found' && !isFound) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
});

// Add spin animation to CSS via JavaScript
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .vpn-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        z-index: 1000;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .vpn-modal.show {
        opacity: 1;
    }
    
    .vpn-modal-content {
        background: var(--card);
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: var(--shadow-lg);
        transform: scale(0.95);
        transition: transform 0.3s ease;
    }
    
    .vpn-modal.show .vpn-modal-content {
        transform: scale(1);
    }
    
    .vpn-modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .vpn-modal-header h3 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0;
        font-size: 1.25rem;
    }
    
    .vpn-modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: var(--muted-foreground);
        padding: 0.25rem 0.5rem;
        line-height: 1;
        transition: color 0.2s ease;
    }
    
    .vpn-modal-close:hover {
        color: var(--foreground);
    }
    
    .vpn-modal-body {
        padding: 1.5rem;
    }
    
    .vpn-alert {
        display: flex;
        gap: 1rem;
        padding: 1rem;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.2);
        border-radius: 8px;
        margin-bottom: 1.5rem;
    }
    
    .vpn-alert svg {
        flex-shrink: 0;
        color: var(--error);
    }
    
    .vpn-alert p {
        margin: 0;
        line-height: 1.5;
    }
    
    .vpn-tips {
        margin-bottom: 1.5rem;
    }
    
    .vpn-tips h4 {
        font-size: 1rem;
        margin-bottom: 1rem;
    }
    
    .vpn-tips ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    
    .vpn-tips li {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 0;
    }
    
    .vpn-tips li svg {
        color: var(--success);
        flex-shrink: 0;
    }
    
    .vpn-note {
        display: flex;
        gap: 0.75rem;
        padding: 1rem;
        background: rgba(99, 102, 241, 0.1);
        border: 1px solid rgba(99, 102, 241, 0.2);
        border-radius: 8px;
    }
    
    .vpn-note svg {
        flex-shrink: 0;
        color: var(--gradient-1);
    }
    
    .vpn-note p {
        margin: 0;
        line-height: 1.5;
    }
    
    .vpn-modal-footer {
        padding: 1.5rem;
        border-top: 1px solid var(--border);
        display: flex;
        justify-content: flex-end;
    }
    
    .vpn-btn {
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
    }
    
    .vpn-btn-primary {
        background: var(--primary);
        color: var(--primary-foreground);
    }
    
    .vpn-btn-primary:hover {
        opacity: 0.9;
        transform: translateY(-1px);
    }
`;
document.head.appendChild(style);
