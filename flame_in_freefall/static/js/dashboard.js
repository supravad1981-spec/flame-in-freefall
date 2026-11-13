const chartElement = document.getElementById('chart-data');

function getThemeLayout(title) {
  return {
    title,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#f4f8ff' },
    margin: { t: 40, r: 20, b: 40, l: 45 },
  };
}

function drawCharts(chartData) {
  if (!window.Plotly || !chartData.line || !chartData.bar || !chartData.comparison) {
    return;
  }

  Plotly.newPlot(
    'line-chart',
    [
      {
        x: chartData.line.x,
        y: chartData.line.y,
        mode: 'lines+markers',
        line: { color: '#4da3ff', width: 3 },
        marker: { color: '#9ed0ff', size: 6 },
        name: chartData.line.name,
      },
    ],
    getThemeLayout('Flame Temperature Over Time'),
    { responsive: true },
  );

  Plotly.newPlot(
    'bar-chart',
    [
      {
        x: chartData.bar.x,
        y: chartData.bar.y,
        type: 'bar',
        marker: { color: '#4da3ff' },
        name: chartData.bar.name,
      },
    ],
    getThemeLayout('Average Temperature by Group'),
    { responsive: true },
  );

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
      },
    ],
    {
      ...getThemeLayout('Flame Height vs Stability Index'),
      xaxis: { title: 'Flame height (mm)' },
      yaxis: { title: 'Stability index (derived)' },
    },
    { responsive: true },
  );
}

if (chartElement) {
  const chartData = JSON.parse(chartElement.textContent || '{}');
  drawCharts(chartData);
}
