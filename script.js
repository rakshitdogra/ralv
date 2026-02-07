// Constants
const CONTACT_EMAIL = 'rakshitdogra.work@gmail.com';
const CROSSREF_API_BASE = 'https://api.crossref.org/works';
const DATACITE_API_BASE = 'https://api.datacite.org/dois';

// Sample references for demo
const sampleReferences = [
    'Smith, J., Johnson, A. B., & Williams, C. (2020). The impact of climate change on biodiversity. Nature, 578(7794), 123-145. https://doi.org/10.1038/s41586-020-2180-5',
    '10.1126/science.abc5812',
    'Doe, J. (2019). Machine learning in healthcare: A review. Journal of Medical Research, 15(3), 234-256.',
    'Brown, M., & Davis, K. (2018). The future of renewable energy. Energy Policy, 112, 12-24. https://doi.org/10.1016/j.enpol.2017.10.012',
    'LeCun, Y., Bengio, Y., & Hinton, G. (2015). Deep learning. Nature, 521(7553), 436-444.',
    'This is an invalid reference that will show as not found'
];

// State
let results = [];
const apiCache = new Map();

// DOM Elements
const referencesTextarea = document.getElementById('references');
const fileUpload = document.getElementById('fileUpload');
const uploadArea = document.getElementById('uploadArea');
const checkBtn = document.getElementById('checkBtn');
const clearBtn = document.getElementById('clearBtn');
const sampleBtn = document.getElementById('sampleBtn');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const resultsSection = document.getElementById('resultsSection');
const resultsGrid = document.getElementById('resultsGrid');
const resultsCount = document.getElementById('resultsCount');
const filterSelect = document.getElementById('filterSelect');
const clearResultsBtn = document.getElementById('clearResultsBtn');
const exportTxtBtn = document.getElementById('exportTxtBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportBibBtn = document.getElementById('exportBibBtn');
const exportRisBtn = document.getElementById('exportRisBtn');
const exportXlsBtn = document.getElementById('exportXlsBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const themeToggle = document.getElementById('themeToggle');

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
}

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// Toast Notifications
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

document.getElementById('toastClose').addEventListener('click', () => {
    document.getElementById('toast').classList.remove('show');
});

// File Upload Handlers
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length) {
        handleFileUpload(files[0]);
    }
});

fileUpload.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFileUpload(e.target.files[0]);
    }
});

async function handleFileUpload(file) {
    if (!file.name.endsWith('.txt')) {
        showToast('Please upload a .txt file', 'error');
        return;
    }

    try {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        
        if (lines.length === 0) {
            showToast('The file is empty', 'warning');
            return;
        }

        referencesTextarea.value = lines.join('\n');
        showToast(`Loaded ${lines.length} references from file`, 'success');
    } catch (error) {
        console.error('Error reading file:', error);
        showToast('Error reading the file', 'error');
    }
}

// Button Handlers
clearBtn.addEventListener('click', () => {
    referencesTextarea.value = '';
    fileUpload.value = '';
});

sampleBtn.addEventListener('click', () => {
    referencesTextarea.value = sampleReferences.join('\n\n');
    showToast('Sample data loaded. Click "Check References" to validate!', 'info');
});

clearResultsBtn.addEventListener('click', () => {
    results = [];
    renderResults();
    resultsSection.style.display = 'none';
    updateExportButtons();
});

filterSelect.addEventListener('change', renderResults);

// API Functions
async function queryCrossRef(query, isDOI = false) {
    const cacheKey = `${isDOI ? 'doi' : 'search'}:${query}`;
    if (apiCache.has(cacheKey)) {
        return apiCache.get(cacheKey);
    }

    try {
        const params = new URLSearchParams();
        if (isDOI) {
            if (CONTACT_EMAIL) params.set('mailto', CONTACT_EMAIL);
        } else {
            params.set('query.bibliographic', query);
            params.set('rows', '1');
            if (CONTACT_EMAIL) params.set('mailto', CONTACT_EMAIL);
        }

        const queryString = params.toString();
        const url = isDOI 
            ? `${CROSSREF_API_BASE}/${encodeURIComponent(query)}${queryString ? `?${queryString}` : ''}`
            : `${CROSSREF_API_BASE}?${queryString}`;

        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        let message = null;

        if (isDOI) {
            message = data.message || null;
        } else if (data.message.items && data.message.items.length > 0) {
            message = data.message.items[0];
        }

        apiCache.set(cacheKey, message);
        return message;
    } catch (error) {
        console.error('Error querying CrossRef:', error);
        apiCache.set(cacheKey, null);
        return null;
    }
}

async function queryDataCite(doi) {
    const cacheKey = `datacite:${doi}`;
    if (apiCache.has(cacheKey)) {
        return apiCache.get(cacheKey);
    }

    try {
        const response = await fetch(`${DATACITE_API_BASE}/${encodeURIComponent(doi)}`, {
            headers: { 'Accept': 'application/vnd.api+json' }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        if (data.data) {
            const attr = data.data.attributes;
            const normalized = {
                title: attr.titles?.[0]?.title || 'Untitled',
                authors: attr.creators?.map(c => c.name || `${(c.givenName || '').trim()} ${(c.familyName || '').trim()}`.trim()).filter(Boolean).join(', ') || 'Unknown',
                journal: attr.publisher || 'Unknown',
                year: attr.publicationYear || new Date().getFullYear(),
                doi: attr.doi,
                url: attr.url || `https://doi.org/${attr.doi}`,
                type: attr.types?.resourceTypeGeneral || 'Article'
            };
            apiCache.set(cacheKey, normalized);
            return normalized;
        }

        apiCache.set(cacheKey, null);
        return null;
    } catch (error) {
        console.error('Error querying DataCite:', error);
        apiCache.set(cacheKey, null);
        return null;
    }
}

function extractDOI(text) {
    const doiRegex = /\b(10\.\d{4,}(?:[.\/#;]\S+)?\/\S+)\b/i;
    const match = text.match(doiRegex);
    return match ? match[0].trim() : null;
}

function parseReference(text) {
    const doi = extractDOI(text);
    if (doi) {
        return { doi, raw: text };
    }

    const citationRegex = /^(?<authors>.+?)\s*\((?<year>\d{4})\)\s*[.:]\s*(?<title>[^\.]+)\.\s*(?<journal>[^,]+),\s*(?<volume>\d+)(?:\((?<issue>[^)]+)\))?\s*,\s*(?<pages>[\d-]+)\.?/i;
    const match = text.match(citationRegex);
    
    if (match && match.groups) {
        return {
            title: match.groups.title.trim(),
            year: match.groups.year,
            journal: match.groups.journal.trim(),
            volume: match.groups.volume,
            issue: match.groups.issue || null,
            pages: match.groups.pages,
            raw: text
        };
    }

    const titleMatch = text.match(/[\""]([^\"\"]+)[\"\"]]/) || 
                      text.match(/(?<=[.?!])\s*([^.!?]+?)(?=\.\s+[A-Z]|$)/) ||
                      text.match(/\.\s*([^,;]+?)(?=\s*(?:,|;|$))/i);
    
    const yearMatch = text.match(/\((\d{4})\)/) || 
                     text.match(/(?:19|20)\d{2}(?=[^0-9]|$)/);
    
    const journalMatch = text.match(/(?<=\.\s*)[A-Z][^.,;]+?(?=,\s*\d|$)/i);

    return {
        title: titleMatch ? titleMatch[1].trim() : null,
        year: yearMatch ? yearMatch[1] || yearMatch[0] : null,
        journal: journalMatch ? journalMatch[0].trim() : null,
        raw: text
    };
}

// Check References
checkBtn.addEventListener('click', checkReferences);

async function checkReferences() {
    const referencesText = referencesTextarea.value.trim();
    
    if (!referencesText) {
        showToast('Please enter some references to check', 'error');
        return;
    }

    const references = referencesText.split('\n').filter(ref => ref.trim() !== '');
    
    if (references.length === 0) {
        showToast('No valid references found', 'error');
        return;
    }

    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    results = [];
    renderResults();

    for (let i = 0; i < references.length; i++) {
        const ref = references[i].trim();
        if (!ref) continue;

        const progress = ((i + 1) / references.length) * 100;
        progressBar.style.width = `${progress}%`;

        try {
            const doi = extractDOI(ref);
            let result = null;

            if (doi) {
                result = await queryCrossRef(doi, true);
                if (!result) {
                    result = await queryDataCite(doi);
                }
            }

            if (!result) {
                const parsedRef = parseReference(ref);
                if (parsedRef.doi) {
                    result = await queryCrossRef(parsedRef.doi, true);
                    if (!result) {
                        result = await queryDataCite(parsedRef.doi);
                    }
                }

                if (!result && parsedRef.title) {
                    let searchQuery = parsedRef.title;
                    if (parsedRef.journal) searchQuery += ` ${parsedRef.journal}`;
                    if (parsedRef.year) searchQuery += ` ${parsedRef.year}`;
                    result = await queryCrossRef(searchQuery);
                }
            }

            if (result) {
                const formattedResult = {
                    id: Date.now() + i,
                    input: ref,
                    status: 'found',
                    title: result.title?.[0] || result.title || 'Untitled',
                    journal: result['container-title']?.[0] || result.journal || 'Unknown',
                    year: result.created?.['date-parts']?.[0]?.[0] || result.year || '—',
                    doi: result.DOI || result.doi || '',
                    url: result.URL || result.url || (result.DOI ? `https://doi.org/${result.DOI}` : ''),
                    authors: result.author?.map(a => a.given ? `${a.given} ${a.family}`.trim() : a.name).join(', ') || 'Unknown'
                };
                results.push(formattedResult);
            } else {
                const parsedRef = parseReference(ref);
                results.push({
                    id: Date.now() + i,
                    input: ref,
                    status: 'not-found',
                    title: parsedRef.title || ref.substring(0, 100) + (ref.length > 100 ? '...' : ''),
                    journal: parsedRef.journal || '—',
                    year: parsedRef.year || '—',
                    doi: '',
                    url: '',
                    authors: '—'
                });
            }

            renderResults();
        } catch (error) {
            console.error('Error checking reference:', error);
            results.push({
                id: Date.now() + i,
                input: ref,
                status: 'error',
                title: 'Error processing reference',
                journal: '',
                year: '',
                doi: '',
                url: '',
                authors: ''
            });
            renderResults();
        }

        await new Promise(resolve => setTimeout(resolve, 200));
    }

    progressBar.style.width = '100%';
    
    // Trigger confetti
    setTimeout(() => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }, 100);

    resultsSection.style.display = 'block';
    updateExportButtons();
    
    showToast(`Processed ${references.length} references (${results.filter(r => r.status === 'found').length} found)`, 'success');
    
    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }, 300);
}

// Render Results
function renderResults() {
    const filter = filterSelect.value;
    const filteredResults = filter === 'all' 
        ? results 
        : results.filter(r => r.status === filter);

    const foundCount = results.filter(r => r.status === 'found').length;
    const notFoundCount = results.filter(r => r.status === 'not-found').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    resultsCount.textContent = `${results.length} references: ${foundCount} found, ${notFoundCount} not found, ${errorCount} errors`;

    resultsGrid.innerHTML = filteredResults.map((result, index) => {
        const statusBadge = getStatusBadge(result.status);
        const titleDisplay = result.url 
            ? `<a href="${result.url}" target="_blank" rel="noopener noreferrer">${result.title || 'Untitled'}</a>`
            : (result.title || 'Untitled');

        return `
            <div class="result-card" data-status="${result.status}">
                <div class="result-header">
                    <span class="result-number">#${index + 1}</span>
                    ${statusBadge}
                </div>
                <h3 class="result-title">${titleDisplay}</h3>
                <div class="result-meta">
                    ${result.authors && result.authors !== '—' ? `
                        <div class="meta-row">
                            <span class="meta-label">Authors:</span>
                            <span class="meta-value">${result.authors}</span>
                        </div>
                    ` : ''}
                    ${result.journal && result.journal !== '—' ? `
                        <div class="meta-row">
                            <span class="meta-label">Journal:</span>
                            <span class="meta-value">${result.journal}</span>
                        </div>
                    ` : ''}
                    ${result.year && result.year !== '—' ? `
                        <div class="meta-row">
                            <span class="meta-label">Year:</span>
                            <span class="meta-value">${result.year}</span>
                        </div>
                    ` : ''}
                    ${result.doi ? `
                        <div class="meta-row">
                            <span class="meta-label">DOI:</span>
                            <span class="meta-value">
                                <a href="https://doi.org/${result.doi}" target="_blank" rel="noopener noreferrer">${result.doi}</a>
                            </span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    if (results.length > 0) {
        resultsSection.style.display = 'block';
    }
}

function getStatusBadge(status) {
    const badges = {
        'found': '<span class="status-badge status-found">✓ Found</span>',
        'not-found': '<span class="status-badge status-not-found">✗ Not Found</span>',
        'error': '<span class="status-badge status-error">⚠ Error</span>'
    };
    return badges[status] || '';
}

function updateExportButtons() {
    const hasResults = results.some(r => r.status === 'found');
    exportTxtBtn.disabled = !hasResults;
    exportCsvBtn.disabled = !hasResults;
    exportBibBtn.disabled = !hasResults;
    exportRisBtn.disabled = !hasResults;
    exportXlsBtn.disabled = !hasResults;
    exportPdfBtn.disabled = !hasResults;
}

// Export Functions
exportTxtBtn.addEventListener('click', exportToTxt);
exportCsvBtn.addEventListener('click', exportToCsv);
exportBibBtn.addEventListener('click', exportToBibtex);
exportRisBtn.addEventListener('click', exportToRis);
exportXlsBtn.addEventListener('click', exportToXls);
exportPdfBtn.addEventListener('click', exportToPdf);

function exportToTxt() {
    const foundResults = results.filter(r => r.status === 'found');
    let content = 'Reference Checker Report\n';
    content += `Generated on: ${new Date().toLocaleString()}\n\n`;
    content += '='.repeat(80) + '\n\n';

    foundResults.forEach((result, index) => {
        content += `[${index + 1}] ${result.title}\n`;
        if (result.authors) content += `Authors: ${result.authors}\n`;
        if (result.journal) content += `Journal: ${result.journal}\n`;
        if (result.year) content += `Year: ${result.year}\n`;
        if (result.doi) content += `DOI: ${result.doi}\n`;
        if (result.url) content += `URL: ${result.url}\n`;
        content += '\n' + '-'.repeat(80) + '\n\n';
    });

    downloadFile('references.txt', 'text/plain', content);
    showToast('Exported to TXT', 'success');
}

function exportToCsv() {
    const csvContent = [
        'ID,Status,Title,Authors,Journal,Year,DOI',
        ...results.filter(r => r.status === 'found').map((r, i) => 
            `${i + 1},"Found","${escapeCsv(r.title)}","${escapeCsv(r.authors)}","${escapeCsv(r.journal)}","${r.year}","${r.doi}"`
        )
    ].join('\n');

    downloadFile('references.csv', 'text/csv', csvContent);
    showToast('Exported to CSV', 'success');
}

function exportToBibtex() {
    const bibtexContent = results
        .filter(r => r.status === 'found' && r.doi)
        .map((r, i) => {
            const id = `ref${i + 1}`;
            return `@article{${id},
  title = {${r.title || 'Untitled'}},
  author = {${r.authors || 'Unknown'}},
  journal = {${r.journal || 'Unknown'}},
  year = {${r.year || '2023'}},
  doi = {${r.doi || ''}}
}`;
        }).join('\n\n');

    downloadFile('references.bib', 'application/x-bibtex', bibtexContent);
    showToast('Exported to BibTeX', 'success');
}

function exportToRis() {
    const risContent = results
        .filter(r => r.status === 'found')
        .map(r => {
            return `TY  - JOUR
TI  - ${r.title || 'Untitled'}
AU  - ${r.authors || 'Unknown'}
JO  - ${r.journal || 'Unknown'}
PY  - ${r.year || '2023'}
DO  - ${r.doi || ''}
ER  -`;
        }).join('\n\n');

    downloadFile('references.ris', 'application/x-research-info-systems', risContent);
    showToast('Exported to RIS', 'success');
}

function exportToXls() {
    try {
        const data = results.filter(r => r.status === 'found').map((result, index) => ({
            '#': index + 1,
            'Status': 'Found',
            'Title': result.title || '',
            'Authors': result.authors || '',
            'Journal': result.journal || '',
            'Year': result.year || '',
            'DOI': result.doi || '',
            'URL': result.url || ''
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'References');

        const timestamp = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `references-${timestamp}.xlsx`);

        showToast('Exported to Excel', 'success');
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showToast('Error exporting to Excel', 'error');
    }
}

function exportToPdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l');
    
    doc.setFont('helvetica');
    
    // Title
    doc.setFontSize(18);
    doc.text('Reference Checker Report', 20, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 20, 32);
    
    // Summary
    const foundCount = results.filter(r => r.status === 'found').length;
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.text(`Total References: ${results.length}`, 20, 45);
    doc.text(`Found: ${foundCount}`, 20, 52);
    
    // Table
    const headers = ['#', 'Title', 'Authors', 'Journal', 'Year', 'DOI'];
    const tableData = results
        .filter(r => r.status === 'found')
        .map((result, index) => [
            (index + 1).toString(),
            (result.title || '').substring(0, 50),
            (result.authors || '').substring(0, 40),
            (result.journal || '').substring(0, 30),
            result.year || '',
            result.doi || ''
        ]);

    doc.autoTable({
        head: [headers],
        body: tableData,
        startY: 65,
        styles: { fontSize: 9 }
    });

    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`refcheck-report-${timestamp}.pdf`);
    
    showToast('Exported to PDF', 'success');
}

// Helper Functions
function downloadFile(filename, type, content) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function escapeCsv(str) {
    if (!str) return '';
    return str.toString().replace(/"/g, '""');
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Initialize
initTheme();

// Welcome message
setTimeout(() => {
    showToast('Welcome to RefCheck! Try the sample data or paste your own references.', 'info');
}, 1000);
