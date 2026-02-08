// Global state
let currentViz = 'line';
let currentData = null;
let currentChart = null;
let currentStyle = 'minimal';
let customColors = ['#667eea', '#764ba2', '#10b981', '#f59e0b', '#9c27b0', '#00bcd4', '#795548', '#607d8b'];
let useGradient = false;
let chartTextColor = null; // null = auto (based on theme)
let sortState = {}; // Track sorting state for each column

// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

const currentTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', currentTheme);

themeToggle.addEventListener('click', () => {
    const theme = html.getAttribute('data-theme');
    const newTheme = theme === 'light' ? 'dark' : 'light';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Redraw chart with new theme colors
    if (currentChart) {
        renderVisualization();
    }
});

// Get theme-appropriate text color
function getTextColor() {
    if (chartTextColor !== null) {
        return chartTextColor;
    }
    const theme = html.getAttribute('data-theme');
    return theme === 'dark' ? '#f0f0f0' : '#1a1a1a';
}

// Get theme-appropriate grid color
function getGridColor() {
    const theme = html.getAttribute('data-theme');
    return theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
}

// Sample datasets
const sampleData = {
    line: `Epoch,Training Loss,Validation Loss
1,2.45,2.51
2,1.89,2.03
3,1.34,1.67
4,0.98,1.45
5,0.71,1.38
6,0.52,1.35`,
    
    bar: `Method,Accuracy,F1-Score
Baseline,0.72,0.68
Method A,0.81,0.78
Method B,0.85,0.82
Method C,0.88,0.85`,
    
    scatter: `Feature 1,Feature 2,Class
2.5,3.1,A
3.2,4.5,A
5.1,2.8,B
6.3,4.2,B
4.5,5.1,A
7.2,3.5,B`,
    
    table: `Model,Accuracy,Precision,Recall,F1-Score
ResNet-50,0.923,0.918,0.925,0.921
VGG-16,0.891,0.885,0.893,0.889
EfficientNet,0.945,0.942,0.947,0.944
MobileNet,0.878,0.872,0.881,0.876`,
    
    box: `{"Group A":[23,25,28,29,31,33,35,38,40,42],"Group B":[18,22,24,26,28,30,32,35,38,41],"Group C":[28,30,32,35,37,39,41,43,45,48]}`,
    
    roc: `FPR,TPR
0.0,0.0
0.05,0.45
0.1,0.68
0.15,0.79
0.2,0.86
0.3,0.92
0.5,0.97
1.0,1.0`,
    
    pr: `Recall,Precision
0.0,1.0
0.2,0.95
0.4,0.90
0.6,0.83
0.8,0.72
1.0,0.65`,
    
    ablation: `Component,Accuracy
Full Model,0.923
- Attention,0.891
- Residual,0.878
- BatchNorm,0.854
None,0.812`
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Visualization buttons
    document.querySelectorAll('.viz-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.viz-button').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentViz = e.currentTarget.dataset.viz;
            loadSampleData();
        });
    });
    
    // Gradient checkbox
    document.getElementById('use-gradient').addEventListener('change', (e) => {
        useGradient = e.target.checked;
        if (currentChart) renderVisualization();
    });
    
    // Live update listeners
    ['chart-title', 'x-label', 'y-label'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            if (currentChart) renderVisualization();
        });
    });
    
    ['show-grid', 'show-legend'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            if (currentChart) renderVisualization();
        });
    });
    
    // Text color picker
    const textColorPicker = document.getElementById('text-color-picker');
    if (textColorPicker) {
        textColorPicker.addEventListener('input', (e) => {
            chartTextColor = e.target.value;
            if (currentChart) renderVisualization();
        });
    }
    
    // Auto color toggle
    const autoColorToggle = document.getElementById('auto-text-color');
    if (autoColorToggle) {
        autoColorToggle.addEventListener('change', (e) => {
            chartTextColor = e.target.checked ? null : document.getElementById('text-color-picker').value;
            document.getElementById('text-color-picker').disabled = e.target.checked;
            if (currentChart) renderVisualization();
        });
    }
    
    // Load initial sample data
    loadSampleData();
});

// Load sample data
function loadSampleData() {
    document.getElementById('data-input').value = sampleData[currentViz] || '';
    document.getElementById('data-format').value = currentViz === 'box' ? 'json' : 'csv';
    loadData();
}

// Parse and load data
function loadData() {
    const input = document.getElementById('data-input').value.trim();
    const format = document.getElementById('data-format').value;
    const errorEl = document.getElementById('input-error');
    
    errorEl.textContent = '';
    
    try {
        if (format === 'csv') {
            currentData = parseCSV(input);
        } else {
            currentData = JSON.parse(input);
        }
        sortState = {}; // Reset sort state when loading new data
        renderVisualization();
    } catch (e) {
        errorEl.textContent = 'Error parsing data: ' + e.message;
    }
}

// CSV parser
function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((h, idx) => {
            const val = values[idx];
            row[h] = isNaN(val) ? val : parseFloat(val);
        });
        data.push(row);
    }
    
    return { headers, data };
}

// Chart style management
function setChartStyle(style) {
    currentStyle = style;
    document.querySelectorAll('.style-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.style === style);
    });
    if (currentChart) renderVisualization();
}

// Color management
function applyColors() {
    document.querySelectorAll('.color-input').forEach((input, idx) => {
        customColors[idx] = input.value;
    });
    if (currentChart) renderVisualization();
}

function resetColors() {
    const defaults = ['#667eea', '#764ba2', '#10b981', '#f59e0b', '#9c27b0', '#00bcd4', '#795548', '#607d8b'];
    customColors = [...defaults];
    document.querySelectorAll('.color-input').forEach((input, idx) => {
        input.value = defaults[idx];
    });
    if (currentChart) renderVisualization();
}

function getColor(index) {
    return customColors[index % customColors.length];
}

// Main rendering dispatcher
function renderVisualization() {
    document.getElementById('chart-canvas').style.display = 'none';
    document.getElementById('svg-container').innerHTML = '';
    document.getElementById('table-container').innerHTML = '';
    
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }
    
    switch (currentViz) {
        case 'line': renderLineChart(); break;
        case 'bar': renderBarChart(); break;
        case 'scatter': renderScatterPlot(); break;
        case 'table': renderTable(); break;
        case 'box': renderBoxPlot(); break;
        case 'roc': renderROC(); break;
        case 'pr': renderPR(); break;
        case 'ablation': renderAblation(); break;
    }
}

// Style configurations
function getStyleConfig() {
    const styles = {
        minimal: {
            lineWidth: 2,
            pointRadius: 3,
            tension: 0.1,
            barBorderWidth: 1,
            scatterBorderWidth: 1,
            scatterRadius: 6
        },
        classic: {
            lineWidth: 3,
            pointRadius: 5,
            tension: 0.3,
            barBorderWidth: 2,
            scatterBorderWidth: 2,
            scatterRadius: 8
        },
        modern: {
            lineWidth: 3,
            pointRadius: 0,
            tension: 0.4,
            barBorderWidth: 0,
            scatterBorderWidth: 2,
            scatterRadius: 10
        },
        bold: {
            lineWidth: 4,
            pointRadius: 6,
            tension: 0,
            barBorderWidth: 3,
            scatterBorderWidth: 3,
            scatterRadius: 10
        }
    };
    return styles[currentStyle];
}

// Get chart options with theme-aware colors
function getChartOptions() {
    const textColor = getTextColor();
    const gridColor = getGridColor();
    
    return {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            title: {
                display: true,
                text: document.getElementById('chart-title').value,
                font: { 
                    size: currentStyle === 'bold' ? 18 : 16,
                    family: 'Inter, sans-serif',
                    weight: currentStyle === 'bold' ? 'bold' : '600' 
                },
                color: textColor,
                padding: 20
            },
            legend: {
                display: document.getElementById('show-legend').checked,
                position: 'top',
                labels: {
                    font: { size: 12, family: 'Inter, sans-serif' },
                    color: textColor,
                    boxWidth: 12,
                    padding: 15
                }
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: document.getElementById('x-label').value,
                    font: { size: 13, family: 'Inter, sans-serif', weight: '500' },
                    color: textColor
                },
                grid: {
                    display: document.getElementById('show-grid').checked,
                    color: gridColor
                },
                ticks: {
                    font: { size: 11, family: 'Inter, sans-serif' },
                    color: textColor
                }
            },
            y: {
                title: {
                    display: true,
                    text: document.getElementById('y-label').value,
                    font: { size: 13, family: 'Inter, sans-serif', weight: '500' },
                    color: textColor
                },
                grid: {
                    display: document.getElementById('show-grid').checked,
                    color: gridColor
                },
                ticks: {
                    font: { size: 11, family: 'Inter, sans-serif' },
                    color: textColor
                }
            }
        }
    };
}

// Line Chart
function renderLineChart() {
    const canvas = document.getElementById('chart-canvas');
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    
    const labels = currentData.data.map(d => d[currentData.headers[0]]);
    const datasets = currentData.headers.slice(1).map((header, idx) => {
        const baseColor = getColor(idx);
        return {
            label: header,
            data: currentData.data.map(d => d[header]),
            borderColor: baseColor,
            backgroundColor: useGradient ? function(context) {
                const chart = context.chart;
                const {ctx, chartArea} = chart;
                if (!chartArea) return baseColor + '40';
                const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                gradient.addColorStop(0, baseColor + '10');
                gradient.addColorStop(1, baseColor + '80');
                return gradient;
            } : 'transparent',
            fill: useGradient,
            borderWidth: getStyleConfig().lineWidth,
            pointRadius: getStyleConfig().pointRadius,
            pointBackgroundColor: baseColor,
            tension: getStyleConfig().tension
        };
    });
    
    currentChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: getChartOptions()
    });
}

// Bar Chart
function renderBarChart() {
    const canvas = document.getElementById('chart-canvas');
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    
    const labels = currentData.data.map(d => d[currentData.headers[0]]);
    const datasets = currentData.headers.slice(1).map((header, idx) => {
        const baseColor = getColor(idx);
        return {
            label: header,
            data: currentData.data.map(d => d[header]),
            backgroundColor: useGradient ? function(context) {
                const chart = context.chart;
                const {ctx, chartArea} = chart;
                if (!chartArea) return baseColor;
                const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                gradient.addColorStop(0, baseColor + '80');
                gradient.addColorStop(1, baseColor);
                return gradient;
            } : baseColor,
            borderWidth: getStyleConfig().barBorderWidth
        };
    });
    
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: getChartOptions()
    });
}

// Scatter Plot
function renderScatterPlot() {
    const canvas = document.getElementById('chart-canvas');
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    
    const classes = [...new Set(currentData.data.map(d => d[currentData.headers[2]]))];
    const datasets = classes.map((cls, idx) => ({
        label: cls,
        data: currentData.data
            .filter(d => d[currentData.headers[2]] === cls)
            .map(d => ({ x: d[currentData.headers[0]], y: d[currentData.headers[1]] })),
        backgroundColor: getColor(idx),
        borderWidth: getStyleConfig().scatterBorderWidth,
        pointRadius: getStyleConfig().scatterRadius
    }));
    
    currentChart = new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        options: getChartOptions()
    });
}

// Table with proper sorting
function renderTable() {
    const container = document.getElementById('table-container');
    let html = '<table id="table-display"><thead><tr>';
    
    currentData.headers.forEach((h, idx) => {
        const sortClass = sortState[idx] === 'asc' ? 'sort-asc' : sortState[idx] === 'desc' ? 'sort-desc' : '';
        html += `<th class="${sortClass}" onclick="sortTable(${idx})">
            ${h}
            <span class="sort-indicator">
                <span class="sort-arrow up"></span>
                <span class="sort-arrow down"></span>
            </span>
        </th>`;
    });
    html += '</tr></thead><tbody>';
    
    currentData.data.forEach(row => {
        html += '<tr>';
        currentData.headers.forEach(h => {
            html += `<td>${row[h]}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function sortTable(columnIndex) {
    const column = currentData.headers[columnIndex];
    
    // Determine next sort direction
    if (!sortState[columnIndex] || sortState[columnIndex] === 'desc') {
        sortState[columnIndex] = 'asc';
    } else {
        sortState[columnIndex] = 'desc';
    }
    
    const direction = sortState[columnIndex];
    const isNumeric = typeof currentData.data[0][column] === 'number';
    
    // Sort data
    currentData.data.sort((a, b) => {
        const valA = a[column];
        const valB = b[column];
        
        let comparison = 0;
        if (isNumeric) {
            comparison = valA - valB;
        } else {
            comparison = String(valA).localeCompare(String(valB));
        }
        
        return direction === 'asc' ? comparison : -comparison;
    });
    
    renderTable();
}

// ROC Curve
function renderROC() {
    const canvas = document.getElementById('chart-canvas');
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    
    const fpr = currentData.data.map(d => d[currentData.headers[0]]);
    const tpr = currentData.data.map(d => d[currentData.headers[1]]);
    
    let auc = 0;
    for (let i = 1; i < fpr.length; i++) {
        auc += (fpr[i] - fpr[i-1]) * (tpr[i] + tpr[i-1]) / 2;
    }
    
    const textColor = getTextColor();
    const gridColor = getGridColor();
    
    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: fpr,
            datasets: [{
                label: `ROC Curve (AUC = ${auc.toFixed(3)})`,
                data: tpr,
                borderColor: getColor(0),
                backgroundColor: getColor(0) + '20',
                fill: true,
                borderWidth: getStyleConfig().lineWidth,
                pointRadius: getStyleConfig().pointRadius
            }, {
                label: 'Random Classifier',
                data: [0, 1],
                borderColor: textColor,
                borderDash: [5, 5],
                borderWidth: 1,
                pointRadius: 0
            }]
        },
        options: {
            ...getChartOptions(),
            scales: {
                x: {
                    title: { display: true, text: 'False Positive Rate', color: textColor },
                    min: 0,
                    max: 1,
                    grid: { display: document.getElementById('show-grid').checked, color: gridColor },
                    ticks: { color: textColor }
                },
                y: {
                    title: { display: true, text: 'True Positive Rate', color: textColor },
                    min: 0,
                    max: 1,
                    grid: { display: document.getElementById('show-grid').checked, color: gridColor },
                    ticks: { color: textColor }
                }
            }
        }
    });
}

// Precision-Recall Curve
function renderPR() {
    const canvas = document.getElementById('chart-canvas');
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    
    const recall = currentData.data.map(d => d[currentData.headers[0]]);
    const precision = currentData.data.map(d => d[currentData.headers[1]]);
    
    const textColor = getTextColor();
    const gridColor = getGridColor();
    
    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: recall,
            datasets: [{
                label: 'Precision-Recall Curve',
                data: precision,
                borderColor: getColor(2),
                backgroundColor: getColor(2) + '20',
                fill: true,
                borderWidth: getStyleConfig().lineWidth,
                pointRadius: getStyleConfig().pointRadius
            }]
        },
        options: {
            ...getChartOptions(),
            scales: {
                x: {
                    title: { display: true, text: 'Recall', color: textColor },
                    min: 0,
                    max: 1,
                    grid: { display: document.getElementById('show-grid').checked, color: gridColor },
                    ticks: { color: textColor }
                },
                y: {
                    title: { display: true, text: 'Precision', color: textColor },
                    min: 0,
                    max: 1,
                    grid: { display: document.getElementById('show-grid').checked, color: gridColor },
                    ticks: { color: textColor }
                }
            }
        }
    });
}

// Ablation Study
function renderAblation() {
    const canvas = document.getElementById('chart-canvas');
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    
    const labels = currentData.data.map(d => d[currentData.headers[0]]);
    const values = currentData.data.map(d => d[currentData.headers[1]]);
    const colors = values.map((v, i) => i === 0 ? getColor(2) : getColor(0));
    
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Performance',
                data: values,
                backgroundColor: colors,
                borderWidth: getStyleConfig().barBorderWidth
            }]
        },
        options: getChartOptions()
    });
}

// Export functions
function exportPNG() {
    const msgEl = document.getElementById('export-message');
    
    if (currentViz === 'table') {
        msgEl.textContent = 'PNG export not available for tables. Use CSV export.';
        msgEl.style.color = 'var(--error)';
        setTimeout(() => msgEl.textContent = '', 3000);
        return;
    }
    
    try {
        const canvas = document.getElementById('chart-canvas');
        canvas.toBlob((blob) => {
            if (!blob) {
                msgEl.textContent = 'Failed to generate PNG';
                msgEl.style.color = 'var(--error)';
                setTimeout(() => msgEl.textContent = '', 3000);
                return;
            }
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `${currentViz}_chart_${Date.now()}.png`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            msgEl.textContent = '✓ PNG downloaded successfully!';
            msgEl.style.color = 'var(--success)';
            setTimeout(() => msgEl.textContent = '', 3000);
        }, 'image/png');
    } catch (e) {
        msgEl.textContent = 'Error exporting PNG: ' + e.message;
        msgEl.style.color = 'var(--error)';
        setTimeout(() => msgEl.textContent = '', 3000);
    }
}

function exportSVG() {
    const msgEl = document.getElementById('export-message');
    msgEl.textContent = 'SVG export coming soon. Use PNG for now.';
    msgEl.style.color = 'var(--warning)';
    setTimeout(() => msgEl.textContent = '', 3000);
}

function exportCSV() {
    const msgEl = document.getElementById('export-message');
    
    if (!currentData) {
        msgEl.textContent = 'No data to export';
        msgEl.style.color = 'var(--error)';
        setTimeout(() => msgEl.textContent = '', 3000);
        return;
    }
    
    try {
        let csv = '';
        
        if (currentData.headers && currentData.data) {
            csv = currentData.headers.join(',') + '\n';
            currentData.data.forEach(row => {
                csv += currentData.headers.map(h => {
                    const val = row[h];
                    if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                        return '"' + val.replace(/"/g, '""') + '"';
                    }
                    return val;
                }).join(',') + '\n';
            });
        } else {
            csv = JSON.stringify(currentData, null, 2);
        }
        
        if (!csv) {
            msgEl.textContent = 'No data to export';
            msgEl.style.color = 'var(--error)';
            setTimeout(() => msgEl.textContent = '', 3000);
            return;
        }
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${currentViz}_data_${Date.now()}.csv`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        msgEl.textContent = '✓ CSV downloaded successfully!';
        msgEl.style.color = 'var(--success)';
        setTimeout(() => msgEl.textContent = '', 3000);
    } catch (e) {
        msgEl.textContent = 'Error exporting CSV: ' + e.message;
        msgEl.style.color = 'var(--error)';
        setTimeout(() => msgEl.textContent = '', 3000);
    }
}
