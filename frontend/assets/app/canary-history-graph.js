(function(window) {
  'use strict';

  async function renderCanaryHistoryGraph(canvasId, dataPathPrefix = '', options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error(`Canvas element with id "${canvasId}" not found.`);
      return;
    }

    if (typeof window.Chart === 'undefined') {
      console.error('Chart.js is not loaded. Please include it in your HTML.');
      return;
    }

    // Define color schemes based on page variant
    const colorSchemes = {
      default: {
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        pointBackgroundColor: 'rgb(75, 192, 192)',
        gridColor: 'rgba(0, 0, 0, 0.1)',
        textColor: '#666'
      },
      stable: {
        borderColor: 'rgb(0, 0, 0)',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        pointBackgroundColor: 'rgb(0, 0, 0)',
        gridColor: 'rgba(0, 0, 0, 0.1)',
        textColor: '#333'
      },
      canary: {
        borderColor: 'rgb(255, 85, 85)',
        backgroundColor: 'rgba(255, 85, 85, 0.1)',
        pointBackgroundColor: 'rgb(255, 85, 85)',
        gridColor: 'rgba(255, 85, 85, 0.2)',
        textColor: '#ff5555'
      }
    };

    // Determine which color scheme to use based on the canvas ID or options
    let colorScheme = colorSchemes.default;
    if (options.variant) {
      colorScheme = colorSchemes[options.variant] || colorSchemes.default;
    } else if (canvasId.toLowerCase().includes('stable')) {
      colorScheme = colorSchemes.stable;
    } else if (canvasId.toLowerCase().includes('canary')) {
      colorScheme = colorSchemes.canary;
    }

    try {
      const response = await fetch(`${dataPathPrefix}assets/data/canary-history.json?nocache=${new Date().getTime()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch canary history: ${response.statusText}`);
      }
      const historyData = await response.json();

      if (!Array.isArray(historyData) || historyData.length === 0) {
        console.log('No canary history data to display.');
        const ctx = canvas.getContext('2d');
        ctx.font = '14px Arial';
        ctx.fillStyle = colorScheme.textColor;
        ctx.fillText('No canary history data available.', 10, 50);
        return;
      }

      const labels = historyData.map(item => new Date(item.timestamp));
      const dataPoints = historyData.map(item => item.percentage);

      new window.Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Canary distribution % over time',
            data: dataPoints,
            borderColor: colorScheme.borderColor,
            backgroundColor: colorScheme.backgroundColor,
            pointBackgroundColor: colorScheme.pointBackgroundColor,
            tension: 0.1,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'time',
              time: {
                unit: 'day',
                tooltipFormat: 'MMM dd, yyyy HH:mm',
                displayFormats: {
                  millisecond: 'HH:mm:ss.SSS',
                  second: 'HH:mm:ss',
                  minute: 'HH:mm',
                  hour: 'HH:mm',
                  day: 'MMM dd',
                  week: 'MMM dd',
                  month: 'MMM yyyy',
                  quarter: 'MMM yyyy',
                  year: 'yyyy',
                }
              },
              title: {
                display: true,
                text: 'time',
                color: colorScheme.textColor
              },
              grid: {
                color: colorScheme.gridColor
              },
              ticks: {
                color: colorScheme.textColor
              }
            },
            y: {
              beginAtZero: true,
              max: 100,
              title: {
                display: true,
                text: 'canary percentage (%)',
                color: colorScheme.textColor
              },
              grid: {
                color: colorScheme.gridColor
              },
              ticks: {
                color: colorScheme.textColor
              }
            }
          },
          plugins: {
            legend: {
              labels: {
                color: colorScheme.textColor
              }
            },
            tooltip: {
              callbacks: {
                title: function(tooltipItems) {
                  // Display full timestamp in tooltip title
                  const date = new Date(tooltipItems[0].parsed.x);
                  return date.toLocaleString();
                },
                label: function(tooltipItem) {
                  let label = tooltipItem.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  label += `${tooltipItem.formattedValue}%`;
                  // Add commit hash and version to tooltip
                  const dataIndex = tooltipItem.dataIndex;
                  if (historyData[dataIndex]) {
                    if (historyData[dataIndex].commit) {
                       label += ` (commit: ${historyData[dataIndex].commit})`;
                    }
                    if (historyData[dataIndex].version) {
                       label += ` (version: ${historyData[dataIndex].version})`;
                    }
                  }
                  return label;
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error rendering canary history graph:', error);
      if (canvas.getContext('2d')) {
        const ctx = canvas.getContext('2d');
        ctx.font = '14px Arial';
        ctx.fillStyle = colorScheme.textColor;
        ctx.fillText('Error loading graph data.', 10, 50);
      }
    }
  }

  window.renderCanaryHistoryGraph = renderCanaryHistoryGraph;
})(window);
