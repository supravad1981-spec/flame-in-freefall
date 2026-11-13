const chartElement = document.getElementById('chart-data');
const chartContainerIds = ['line-chart', 'bar-chart', 'comparison-chart'];

function getThemeLayout(title) {
  return {
    title,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#f4f8ff' },
    margin: { t: 40, r: 20, b: 55, l: 62 },
  };
}

function setChartMessage(containerId, message) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  container.innerHTML = '';
  const messageNode = document.createElement('div');
  messageNode.textContent = message;
  messageNode.style.height = '100%';
  messageNode.style.display = 'flex';
  messageNode.style.alignItems = 'center';
  messageNode.style.justifyContent = 'center';
  messageNode.style.textAlign = 'center';
  messageNode.style.padding = '0.75rem';
  messageNode.style.color = '#9ab3d1';
  messageNode.style.fontSize = '0.95rem';
  container.appendChild(messageNode);
}

function setMessageOnAllCharts(message) {
  chartContainerIds.forEach((id) => setChartMessage(id, message));
}

function parseChartData(rawJson) {
  try {
    const parsed = JSON.parse(rawJson || '{}');
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Parsed chart data is not an object.');
    }
    return parsed;
  } catch (error) {
    setMessageOnAllCharts('Chart data could not be loaded. Please verify the dataset format and try again.');
    return null;
  }
}

function hasExperimentData(chartData) {
  const lineTraces = chartData?.line?.traces || [];
  const barY = chartData?.bar?.y || [];
  const comparisonY = chartData?.comparison?.y || [];

  return lineTraces.length > 0 || barY.length > 0 || comparisonY.length > 0;
}

function drawCharts(chartData) {
  if (!window.Plotly) {
    setMessageOnAllCharts('Chart library is unavailable. Please refresh and try again.');
    return;
  }

  if (!chartData?.line || !chartData?.bar || !chartData?.comparison) {
    setMessageOnAllCharts('Chart data is incomplete. Please check the loaded dataset.');
    return;
  }

  if (!hasExperimentData(chartData)) {
    setMessageOnAllCharts('No experiment data is available to visualize.');
    return;
  }

  const lineContainer = document.getElementById('line-chart');
  const barContainer = document.getElementById('bar-chart');
  const comparisonContainer = document.getElementById('comparison-chart');

  const lineTraces = (chartData.line.traces || []).map((trace) => ({
    x: trace.x,
    y: trace.y,
    mode: 'lines+markers',
    line: { width: 2.5 },
    marker: { size: 6 },
    name: trace.name,
    hovertemplate:
      'Experiment: %{fullData.name}<br>Time: %{x:.2f} s<br>Flame temperature: %{y:.2f} K<extra></extra>',
  }));

  if (lineContainer) {
    if (lineTraces.length === 0) {
      setChartMessage('line-chart', 'No temperature traces are available for the selected dataset.');
    } else {
      Plotly.newPlot(
        'line-chart',
        lineTraces,
        {
          ...getThemeLayout('Flame Temperature by Experiment'),
          xaxis: { title: 'Time (s)' },
          yaxis: { title: 'Flame temperature (K)' },
        },
        { responsive: true },
      );
    }
  }

  if (barContainer) {
    if (!Array.isArray(chartData.bar.y) || chartData.bar.y.length === 0) {
      setChartMessage('bar-chart', 'No experiment-group averages are available for this dataset.');
    } else {
      Plotly.newPlot(
        'bar-chart',
        [
          {
            x: chartData.bar.x,
            y: chartData.bar.y,
            type: 'bar',
            marker: { color: '#4da3ff' },
            name: chartData.bar.name,
            hovertemplate: 'Group: %{x}<br>Average temperature: %{y:.2f} K<extra></extra>',
          },
        ],
        {
          ...getThemeLayout('Average Temperature by Group'),
          xaxis: { title: 'Experiment group' },
          yaxis: { title: 'Average flame temperature (K)' },
        },
        { responsive: true },
      );
    }
  }

  if (comparisonContainer) {
    if (!Array.isArray(chartData.comparison.y) || chartData.comparison.y.length === 0) {
      setChartMessage('comparison-chart', 'No flame height and oxygen data points are available.');
    } else {
      Plotly.newPlot(
        'comparison-chart',
        [
          {
            x: chartData.comparison.x,
            y: chartData.comparison.y,
            text: chartData.comparison.text,
            mode: 'markers',
            marker: { color: '#61d6ff', size: 11, opacity: 0.85 },
            name: chartData.comparison.name,
            hovertemplate:
              'Experiment: %{text}<br>Flame height: %{x:.2f} mm<br>Oxygen concentration: %{y:.2f}%<extra></extra>',
          },
        ],
        {
          ...getThemeLayout('Flame Height vs Oxygen Concentration'),
          xaxis: { title: 'Flame height (mm)' },
          yaxis: { title: 'Oxygen concentration (%)' },
        },
        { responsive: true },
      );
    }
  }
}

function resizeCharts() {
  if (!window.Plotly) {
    return;
  }

  chartContainerIds.forEach((id) => {
    const container = document.getElementById(id);
    if (container && container.data) {
      Plotly.Plots.resize(container);
    }
  });
}

if (chartElement) {
  const chartData = parseChartData(chartElement.textContent);
  if (chartData) {
    drawCharts(chartData);
    window.addEventListener('resize', resizeCharts);
  }
}
