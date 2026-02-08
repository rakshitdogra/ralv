// PolyViz - Research Data Visualization Tool
// Global state
let currentChart = null;
let currentData = null;
let currentVizType = 'line';
let currentStyle = 'minimal';
let chartColors = ['#667eea', '#764ba2', '#10b981', '#f59e0b'];
let textColor = '#000000'; // Default text color

// Theme management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateTextColorForTheme(savedTheme);
}

function updateTextColorForTheme(theme) {
    // Set default text color based on theme
    if (theme === 'dark') {
        textColor = '#ffffff';
    } else {
        textColor = '#000000';
    }
    // Update text color input if it exists
    const textColorInput = document.getElementById('text-color');
    if (textColorInput) {
        textColorInput.value = textColor;
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateTextColorForTheme(next);
    
    // Redraw chart with new theme colors
    if (currentChart || document.getElementById('svg-container').innerHTML || document.getElementById('table-container').innerHTML) {
        renderVisualization();
    }
}

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    
    // Theme toggle button
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Visualization type buttons
    document.querySelectorAll('.viz-button').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.viz-button').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            currentVizType = button.dataset.viz;
            if (currentData) {
                renderVisualization();
            }
        });
    });
    
    // Color inputs
    document.querySelectorAll('.color-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            chartColors[index] = e.target.value;
        });
    });
    
    // Text color input
    const textColorInput = document.getElementById('text-color');
    if (textColorInput) {
        textColorInput.addEventListener('change', (e) => {
            textColor = e.target.value;
            if (currentChart || document.getElementById('svg-container').innerHTML || document.getElementById('table-container').innerHTML) {
                renderVisualization();
            }
        });
    }
    
    // Chart settings change listeners
    ['chart-title', 'x-label', 'y-label', 'show-grid', 'show-legend', 'use-gradient'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', () => {
                if (currentData) renderVisualization();
            });
        }
    });
});

// Data loading functions
function loadData() {
    const format = document.getElementById('data-format').value;
    const input = document.getElementById('data-input').value.trim();
    const errorDiv = document.getElementById('input-error');
    
    errorDiv.textContent = '';
    
    if (!input) {
        errorDiv.textContent = 'Please enter data';
        return;
    }
    
    try {
        if (format === 'csv') {
            currentData = parseCSV(input);
        } else {
            currentData = JSON.parse(input);
        }
        
        renderVisualization();
    } catch (error) {
        errorDiv.textContent = `Error: ${error.message}`;
    }
}

function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((header, index) => {
            const value = values[index];
            row[header] = isNaN(value) ? value : parseFloat(value);
        });
        data.push(row);
    }
    
    return data;
}

function loadSampleData() {
    const sampleData = {
        line: `x,y1,y2,y3
1,10,15,8
2,15,12,10
3,13,18,12
4,18,14,15
5,20,22,18
6,25,20,22`,
        bar: `category,value1,value2,value3
A,45,30,25
B,55,40,35
C,40,50,30
D,60,45,40
E,50,35,45`,
        scatter: `x,y,size
10,20,5
15,25,8
20,15,6
25,30,10
30,18,7
35,28,9
40,22,8
45,35,12`,
        table: `Name,Age,Score,Grade
Alice,25,95,A
Bob,30,87,B
Charlie,22,92,A
Diana,28,78,C
Eve,26,88,B`,
        box: `group,value
A,23
A,25
A,28
A,30
A,32
A,35
A,38
B,18
B,22
B,25
B,28
B,30
B,35
B,40
C,20
C,24
C,26
C,29
C,31
C,33
C,36`,
        roc: `fpr,tpr,model
0,0,Model A
0.1,0.6,Model A
0.2,0.75,Model A
0.3,0.85,Model A
0.5,0.92,Model A
0.8,0.97,Model A
1,1,Model A
0,0,Model B
0.1,0.5,Model B
0.2,0.68,Model B
0.3,0.78,Model B
0.5,0.88,Model B
0.8,0.95,Model B
1,1,Model B`,
        pr: `recall,precision,model
0,1,Model A
0.2,0.95,Model A
0.4,0.9,Model A
0.6,0.85,Model A
0.8,0.75,Model A
1,0.6,Model A
0,1,Model B
0.2,0.9,Model B
0.4,0.85,Model B
0.6,0.78,Model B
0.8,0.68,Model B
1,0.5,Model B`,
        ablation: `component,accuracy,f1_score
Baseline,0.75,0.72
+Feature A,0.82,0.80
+Feature B,0.85,0.83
+Feature C,0.88,0.86
Full Model,0.91,0.89`
    };
    
    const sample = sampleData[currentVizType] || sampleData.line;
    document.getElementById('data-input').value = sample;
    document.getElementById('data-format').value = 'csv';
    loadData();
}

// Visualization rendering
function renderVisualization() {
    if (!currentData) return;
    
    // Clear previous visualizations
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }
    document.getElementById('svg-container').innerHTML = '';
    document.getElementById('table-container').innerHTML = '';
    
    const canvas = document.getElementById('chart-canvas');
    canvas.style.display = 'none';
    
    switch (currentVizType) {
        case 'line':
            renderLineChart();
            break;
        case 'bar':
            renderBarChart();
            break;
        case 'scatter':
            renderScatterChart();
            break;
        case 'table':
            renderTable();
            break;
        case 'box':
            renderBoxPlot();
            break;
        case 'roc':
            renderROCCurve();
            break;
        case 'pr':
            renderPRCurve();
            break;
        case 'ablation':
            renderAblationStudy();
            break;
    }
}

function getChartConfig() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const currentTextColor = textColor;
    
    return {
        title: document.getElementById('chart-title').value,
        xLabel: document.getElementById('x-label').value,
        yLabel: document.getElementById('y-label').value,
        showGrid: document.getElementById('show-grid').checked,
        showLegend: document.getElementById('show-legend').checked,
        useGradient: document.getElementById('use-gradient').checked,
        textColor: currentTextColor,
        gridColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
    };
}

function renderLineChart() {
    const canvas = document.getElementById('chart-canvas');
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    const config = getChartConfig();
    
    const labels = currentData.map(d => d.x || d[Object.keys(d)[0]]);
    const datasets = [];
    
    const keys = Object.keys(currentData[0]).filter(k => k !== 'x' && k !== Object.keys(currentData[0])[0]);
    
    keys.forEach((key, index) => {
        datasets.push({
            label: key,
            data: currentData.map(d => d[key]),
            borderColor: chartColors[index % chartColors.length],
            backgroundColor: config.useGradient 
                ? createGradient(ctx, chartColors[index % chartColors.length])
                : chartColors[index % chartColors.length] + '20',
            tension: 0.4,
            fill: config.useGradient,
            borderWidth: 2
        });
    });
    
    currentChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: !!config.title,
                    text: config.title,
                    color: config.textColor,
                    font: { size: 18, weight: 'bold' }
                },
                legend: {
                    display: config.showLegend,
                    labels: { color: config.textColor }
                }
            },
            scales: {
                x: {
                    title: {
                        display: !!config.xLabel,
                        text: config.xLabel,
                        color: config.textColor
                    },
                    ticks: { color: config.textColor },
                    grid: {
                        display: config.showGrid,
                        color: config.gridColor
                    }
                },
                y: {
                    title: {
                        display: !!config.yLabel,
                        text: config.yLabel,
                        color: config.textColor
                    },
                    ticks: { color: config.textColor },
                    grid: {
                        display: config.showGrid,
                        color: config.gridColor
                    }
                }
            }
        }
    });
}

function renderBarChart() {
    const canvas = document.getElementById('chart-canvas');
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    const config = getChartConfig();
    
    const labels = currentData.map(d => d.category || d[Object.keys(d)[0]]);
    const datasets = [];
    
    const keys = Object.keys(currentData[0]).filter(k => k !== 'category' && k !== Object.keys(currentData[0])[0]);
    
    keys.forEach((key, index) => {
        datasets.push({
            label: key,
            data: currentData.map(d => d[key]),
            backgroundColor: chartColors[index % chartColors.length],
            borderColor: chartColors[index % chartColors.length],
            borderWidth: 1
        });
    });
    
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: !!config.title,
                    text: config.title,
                    color: config.textColor,
                    font: { size: 18, weight: 'bold' }
                },
                legend: {
                    display: config.showLegend,
                    labels: { color: config.textColor }
                }
            },
            scales: {
                x: {
                    title: {
                        display: !!config.xLabel,
                        text: config.xLabel,
                        color: config.textColor
                    },
                    ticks: { color: config.textColor },
                    grid: {
                        display: config.showGrid,
                        color: config.gridColor
                    }
                },
                y: {
                    title: {
                        display: !!config.yLabel,
                        text: config.yLabel,
                        color: config.textColor
                    },
                    ticks: { color: config.textColor },
                    grid: {
                        display: config.showGrid,
                        color: config.gridColor
                    }
                }
            }
        }
    });
}

function renderScatterChart() {
    const canvas = document.getElementById('chart-canvas');
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    const config = getChartConfig();
    
    const datasets = [{
        label: 'Data Points',
        data: currentData.map(d => ({
            x: d.x || d[Object.keys(d)[0]],
            y: d.y || d[Object.keys(d)[1]]
        })),
        backgroundColor: chartColors[0],
        borderColor: chartColors[0],
        pointRadius: currentData.map(d => d.size || 5),
        pointHoverRadius: currentData.map(d => (d.size || 5) + 2)
    }];
    
    currentChart = new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: !!config.title,
                    text: config.title,
                    color: config.textColor,
                    font: { size: 18, weight: 'bold' }
                },
                legend: {
                    display: config.showLegend,
                    labels: { color: config.textColor }
                }
            },
            scales: {
                x: {
                    title: {
                        display: !!config.xLabel,
                        text: config.xLabel,
                        color: config.textColor
                    },
                    ticks: { color: config.textColor },
                    grid: {
                        display: config.showGrid,
                        color: config.gridColor
                    }
                },
                y: {
                    title: {
                        display: !!config.yLabel,
                        text: config.yLabel,
                        color: config.textColor
                    },
                    ticks: { color: config.textColor },
                    grid: {
                        display: config.showGrid,
                        color: config.gridColor
                    }
                }
            }
        }
    });
}

function renderTable() {
    const container = document.getElementById('table-container');
    container.style.display = 'block';
    
    if (!currentData || currentData.length === 0) return;
    
    const headers = Object.keys(currentData[0]);
    
    let html = '<div style="display: flex; justify-content: center;"><table id="table-display" class="data-table">';
    html += '<thead><tr>';
    
    headers.forEach((header, index) => {
        html += `<th onclick="sortTable(${index})" style="cursor: pointer; position: relative; padding-right: 30px;">
            ${header}
            <span class="sort-arrow" data-column="${index}" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%);">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.3;">
                    <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
            </span>
        </th>`;
    });
    
    html += '</tr></thead><tbody>';
    
    currentData.forEach(row => {
        html += '<tr>';
        headers.forEach(header => {
            html += `<td>${row[header]}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// Table sorting function
let sortDirection = {};

function sortTable(columnIndex) {
    if (!currentData) return;
    
    const headers = Object.keys(currentData[0]);
    const header = headers[columnIndex];
    
    // Toggle sort direction
    sortDirection[columnIndex] = sortDirection[columnIndex] === 'asc' ? 'desc' : 'asc';
    const direction = sortDirection[columnIndex];
    
    // Sort data
    currentData.sort((a, b) => {
        let aVal = a[header];
        let bVal = b[header];
        
        // Handle numeric values
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        // Handle string values
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
        
        if (direction === 'asc') {
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
            return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
    });
    
    // Update arrow indicators
    document.querySelectorAll('.sort-arrow').forEach(arrow => {
        arrow.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.3;">
            <polyline points="18 15 12 9 6 15"></polyline>
        </svg>`;
    });
    
    const currentArrow = document.querySelector(`.sort-arrow[data-column="${columnIndex}"]`);
    if (direction === 'asc') {
        currentArrow.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 15 12 9 6 15"></polyline>
        </svg>`;
    } else {
        currentArrow.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
        </svg>`;
    }
    
    // Re-render table
    renderTable();
}

function renderBoxPlot() {
    const container = document.getElementById('svg-container');
    container.style.display = 'block';
    const config = getChartConfig();
    
    // Group data by category
    const groups = {};
    currentData.forEach(d => {
        const group = d.group || d[Object.keys(d)[0]];
        const value = d.value || d[Object.keys(d)[1]];
        if (!groups[group]) groups[group] = [];
        groups[group].push(value);
    });
    
    // Calculate box plot statistics for each group
    const boxData = Object.keys(groups).map(key => {
        const values = groups[key].sort((a, b) => a - b);
        const q1 = quantile(values, 0.25);
        const median = quantile(values, 0.5);
        const q3 = quantile(values, 0.75);
        const iqr = q3 - q1;
        const min = Math.max(Math.min(...values), q1 - 1.5 * iqr);
        const max = Math.min(Math.max(...values), q3 + 1.5 * iqr);
        const outliers = values.filter(v => v < min || v > max);
        
        return { key, min, q1, median, q3, max, outliers };
    });
    
    // SVG dimensions
    const width = 800;
    const height = 500;
    const margin = { top: 60, right: 40, bottom: 60, left: 60 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    
    // Scales
    const xScale = (index) => margin.left + (plotWidth / boxData.length) * (index + 0.5);
    const allValues = boxData.flatMap(d => [d.min, d.max, ...d.outliers]);
    const yMin = Math.min(...allValues);
    const yMax = Math.max(...allValues);
    const yScale = (value) => margin.top + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;
    
    // Create SVG
    let svg = `<svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width: 100%;">`;
    
    // Title
    if (config.title) {
        svg += `<text x="${width/2}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="${config.textColor}">${config.title}</text>`;
    }
    
    // Y-axis
    svg += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="${config.textColor}" stroke-width="2"/>`;
    
    // Y-axis label
    if (config.yLabel) {
        svg += `<text x="${margin.left - 40}" y="${height/2}" text-anchor="middle" font-size="14" fill="${config.textColor}" transform="rotate(-90, ${margin.left - 40}, ${height/2})">${config.yLabel}</text>`;
    }
    
    // Y-axis ticks and grid
    for (let i = 0; i <= 5; i++) {
        const value = yMin + (yMax - yMin) * (i / 5);
        const y = yScale(value);
        
        // Grid line
        if (config.showGrid) {
            svg += `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="${config.gridColor}" stroke-width="1"/>`;
        }
        
        // Tick
        svg += `<line x1="${margin.left - 5}" y1="${y}" x2="${margin.left}" y2="${y}" stroke="${config.textColor}" stroke-width="2"/>`;
        svg += `<text x="${margin.left - 10}" y="${y + 5}" text-anchor="end" font-size="12" fill="${config.textColor}">${value.toFixed(1)}</text>`;
    }
    
    // X-axis
    svg += `<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="${config.textColor}" stroke-width="2"/>`;
    
    // X-axis label
    if (config.xLabel) {
        svg += `<text x="${width/2}" y="${height - 10}" text-anchor="middle" font-size="14" fill="${config.textColor}">${config.xLabel}</text>`;
    }
    
    // Draw box plots
    const boxWidth = Math.min(60, plotWidth / boxData.length * 0.6);
    
    boxData.forEach((box, index) => {
        const x = xScale(index);
        const color = chartColors[index % chartColors.length];
        
        // Whiskers
        svg += `<line x1="${x}" y1="${yScale(box.min)}" x2="${x}" y2="${yScale(box.q1)}" stroke="${color}" stroke-width="2"/>`;
        svg += `<line x1="${x}" y1="${yScale(box.q3)}" x2="${x}" y2="${yScale(box.max)}" stroke="${color}" stroke-width="2"/>`;
        
        // Whisker caps
        svg += `<line x1="${x - 10}" y1="${yScale(box.min)}" x2="${x + 10}" y2="${yScale(box.min)}" stroke="${color}" stroke-width="2"/>`;
        svg += `<line x1="${x - 10}" y1="${yScale(box.max)}" x2="${x + 10}" y2="${yScale(box.max)}" stroke="${color}" stroke-width="2"/>`;
        
        // Box
        const boxHeight = yScale(box.q1) - yScale(box.q3);
        svg += `<rect x="${x - boxWidth/2}" y="${yScale(box.q3)}" width="${boxWidth}" height="${boxHeight}" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>`;
        
        // Median line
        svg += `<line x1="${x - boxWidth/2}" y1="${yScale(box.median)}" x2="${x + boxWidth/2}" y2="${yScale(box.median)}" stroke="${color}" stroke-width="3"/>`;
        
        // Outliers
        box.outliers.forEach(outlier => {
            svg += `<circle cx="${x}" cy="${yScale(outlier)}" r="3" fill="${color}"/>`;
        });
        
        // X-axis label
        svg += `<text x="${x}" y="${height - margin.bottom + 20}" text-anchor="middle" font-size="12" fill="${config.textColor}">${box.key}</text>`;
    });
    
    svg += '</svg>';
    container.innerHTML = svg;
}

// Helper function for quantile calculation
function quantile(arr, q) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
        return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
        return sorted[base];
    }
}

function renderROCCurve() {
    const canvas = document.getElementById('chart-canvas');
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    const config = getChartConfig();
    
    // Group data by model if exists
    const models = {};
    currentData.forEach(d => {
        const model = d.model || 'Model';
        if (!models[model]) models[model] = { fpr: [], tpr: [] };
        models[model].fpr.push(d.fpr || d[Object.keys(d)[0]]);
        models[model].tpr.push(d.tpr || d[Object.keys(d)[1]]);
    });
    
    const datasets = Object.keys(models).map((model, index) => ({
        label: model,
        data: models[model].fpr.map((fpr, i) => ({ x: fpr, y: models[model].tpr[i] })),
        borderColor: chartColors[index % chartColors.length],
        backgroundColor: chartColors[index % chartColors.length] + '20',
        borderWidth: 2,
        tension: 0.1,
        fill: false
    }));
    
    // Add diagonal reference line
    datasets.push({
        label: 'Random (AUC = 0.5)',
        data: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        borderColor: config.textColor,
        borderDash: [5, 5],
        borderWidth: 1,
        fill: false,
        pointRadius: 0
    });
    
    currentChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: !!config.title,
                    text: config.title || 'ROC Curve',
                    color: config.textColor,
                    font: { size: 18, weight: 'bold' }
                },
                legend: {
                    display: config.showLegend,
                    labels: { color: config.textColor }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: config.xLabel || 'False Positive Rate',
                        color: config.textColor
                    },
                    ticks: { color: config.textColor },
                    grid: {
                        display: config.showGrid,
                        color: config.gridColor
                    },
                    min: 0,
                    max: 1
                },
                y: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: config.yLabel || 'True Positive Rate',
                        color: config.textColor
                    },
                    ticks: { color: config.textColor },
                    grid: {
                        display: config.showGrid,
                        color: config.gridColor
                    },
                    min: 0,
                    max: 1
                }
            }
        }
    });
}

function renderPRCurve() {
    const canvas = document.getElementById('chart-canvas');
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    const config = getChartConfig();
    
    // Group data by model if exists
    const models = {};
    currentData.forEach(d => {
        const model = d.model || 'Model';
        if (!models[model]) models[model] = { recall: [], precision: [] };
        models[model].recall.push(d.recall || d[Object.keys(d)[0]]);
        models[model].precision.push(d.precision || d[Object.keys(d)[1]]);
    });
    
    const datasets = Object.keys(models).map((model, index) => ({
        label: model,
        data: models[model].recall.map((recall, i) => ({ x: recall, y: models[model].precision[i] })),
        borderColor: chartColors[index % chartColors.length],
        backgroundColor: chartColors[index % chartColors.length] + '20',
        borderWidth: 2,
        tension: 0.1,
        fill: false
    }));
    
    currentChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: !!config.title,
                    text: config.title || 'Precision-Recall Curve',
                    color: config.textColor,
                    font: { size: 18, weight: 'bold' }
                },
                legend: {
                    display: config.showLegend,
                    labels: { color: config.textColor }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: config.xLabel || 'Recall',
                        color: config.textColor
                    },
                    ticks: { color: config.textColor },
                    grid: {
                        display: config.showGrid,
                        color: config.gridColor
                    },
                    min: 0,
                    max: 1
                },
                y: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: config.yLabel || 'Precision',
                        color: config.textColor
                    },
                    ticks: { color: config.textColor },
                    grid: {
                        display: config.showGrid,
                        color: config.gridColor
                    },
                    min: 0,
                    max: 1
                }
            }
        }
    });
}

function renderAblationStudy() {
    const canvas = document.getElementById('chart-canvas');
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    const config = getChartConfig();
    
    const labels = currentData.map(d => d.component || d[Object.keys(d)[0]]);
    const datasets = [];
    
    const keys = Object.keys(currentData[0]).filter(k => k !== 'component' && k !== Object.keys(currentData[0])[0]);
    
    keys.forEach((key, index) => {
        datasets.push({
            label: key,
            data: currentData.map(d => d[key]),
            backgroundColor: chartColors[index % chartColors.length],
            borderColor: chartColors[index % chartColors.length],
            borderWidth: 2
        });
    });
    
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: !!config.title,
                    text: config.title || 'Ablation Study',
                    color: config.textColor,
                    font: { size: 18, weight: 'bold' }
                },
                legend: {
                    display: config.showLegend,
                    labels: { color: config.textColor }
                }
            },
            scales: {
                x: {
                    title: {
                        display: !!config.xLabel,
                        text: config.xLabel || 'Component',
                        color: config.textColor
                    },
                    ticks: { 
                        color: config.textColor,
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: config.showGrid,
                        color: config.gridColor
                    }
                },
                y: {
                    title: {
                        display: !!config.yLabel,
                        text: config.yLabel || 'Score',
                        color: config.textColor
                    },
                    ticks: { color: config.textColor },
                    grid: {
                        display: config.showGrid,
                        color: config.gridColor
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

function createGradient(ctx, color) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color + '00');
    return gradient;
}

// Chart style functions
function setChartStyle(style) {
    currentStyle = style;
    document.querySelectorAll('.style-option').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-style="${style}"]`).classList.add('active');
    
    if (currentData) renderVisualization();
}

// Color functions
function applyColors() {
    document.querySelectorAll('.color-input').forEach(input => {
        const index = parseInt(input.dataset.index);
        chartColors[index] = input.value;
    });
    
    if (currentData) renderVisualization();
}

function resetColors() {
    const defaultColors = ['#667eea', '#764ba2', '#10b981', '#f59e0b'];
    chartColors = [...defaultColors];
    
    document.querySelectorAll('.color-input').forEach((input, index) => {
        input.value = defaultColors[index];
    });
    
    if (currentData) renderVisualization();
}

// Export functions
function exportPNG() {
    const canvas = document.getElementById('chart-canvas');
    const svg = document.getElementById('svg-container');
    const messageDiv = document.getElementById('export-message');
    
    if (canvas.style.display !== 'none') {
        const link = document.createElement('a');
        link.download = 'chart.png';
        link.href = canvas.toDataURL();
        link.click();
        messageDiv.textContent = '✓ PNG exported successfully';
        messageDiv.style.color = 'var(--success)';
    } else if (svg.innerHTML) {
        // For SVG-based visualizations, convert to canvas first
        const svgElement = svg.querySelector('svg');
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        const img = new Image();
        img.onload = () => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = svgElement.viewBox.baseVal.width || 800;
            tempCanvas.height = svgElement.viewBox.baseVal.height || 500;
            const ctx = tempCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            const link = document.createElement('a');
            link.download = 'chart.png';
            link.href = tempCanvas.toDataURL();
            link.click();
            
            URL.revokeObjectURL(url);
            messageDiv.textContent = '✓ PNG exported successfully';
            messageDiv.style.color = 'var(--success)';
        };
        img.src = url;
    } else {
        messageDiv.textContent = '⚠ Table view cannot be exported as PNG';
        messageDiv.style.color = 'var(--error)';
    }
    
    setTimeout(() => { messageDiv.textContent = ''; }, 3000);
}

function exportSVG() {
    const svg = document.getElementById('svg-container');
    const messageDiv = document.getElementById('export-message');
    
    if (svg.innerHTML) {
        const svgElement = svg.querySelector('svg');
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const link = document.createElement('a');
        link.download = 'chart.svg';
        link.href = URL.createObjectURL(blob);
        link.click();
        messageDiv.textContent = '✓ SVG exported successfully';
        messageDiv.style.color = 'var(--success)';
    } else {
        messageDiv.textContent = '⚠ Current visualization does not support SVG export';
        messageDiv.style.color = 'var(--error)';
    }
    
    setTimeout(() => { messageDiv.textContent = ''; }, 3000);
}

function exportCSV() {
    const messageDiv = document.getElementById('export-message');
    
    if (!currentData) {
        messageDiv.textContent = '⚠ No data to export';
        messageDiv.style.color = 'var(--error)';
        setTimeout(() => { messageDiv.textContent = ''; }, 3000);
        return;
    }
    
    const headers = Object.keys(currentData[0]);
    let csv = headers.join(',') + '\n';
    
    currentData.forEach(row => {
        csv += headers.map(header => row[header]).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.download = 'data.csv';
    link.href = URL.createObjectURL(blob);
    link.click();
    
    messageDiv.textContent = '✓ CSV exported successfully';
    messageDiv.style.color = 'var(--success)';
    setTimeout(() => { messageDiv.textContent = ''; }, 3000);
}
