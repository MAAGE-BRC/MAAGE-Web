/**
 * Base Chart Widget - Shared functionality for MAAGE ECharts widgets
 * Provides common patterns for initialization, data loading, and chart rendering
 */

class MAAGEChartWidget {
  constructor(container, config = {}) {
    this.container = container;
    this.config = {
      chartTitle: config.chartTitle || 'Chart',
      facetField: config.facetField || '',
      sampleData: config.sampleData || {},
      chartType: config.chartType || 'bar',
      colors: config.colors || ['#0ea5e9'],
      ...config
    };
    
    // DOM elements
    this.chartContainer = container.querySelector('.chart-content');
    this.tableContainer = container.querySelector('.table-content');
    this.loadingEl = container.querySelector('.chart-loading');
    this.tableData = container.querySelector('.table-data');
    this.toggleBtns = container.querySelectorAll('.chart-toggle-btn');
    
    // Chart state
    this.chart = null;
    this.data = [];
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.waitForGridStackAndInit();
  }
  
  setupEventListeners() {
    this.toggleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        btn.dataset.view === 'chart' ? this.showChart() : this.showTable();
      });
    });
  }
  
  waitForGridStackAndInit() {
    if (this.container.closest('.grid-stack-item')?.offsetWidth > 0) {
      this.initChart();
    } else {
      setTimeout(() => this.waitForGridStackAndInit(), 100);
    }
  }
  
  initChart() {
    if (!window.echarts) {
      console.error('ECharts not available');
      return;
    }
    
    this.chartContainer.style.display = 'block';
    this.chartContainer.style.width = '100%';
    this.chartContainer.style.height = '280px';
    
    setTimeout(() => {
      if (this.chartContainer.clientWidth > 0 && this.chartContainer.clientHeight > 0) {
        this.chart = echarts.init(this.chartContainer, 'maage');
        this.loadData();
      } else {
        setTimeout(() => this.initChart(), 100);
      }
    }, 50);
  }
  
  loadData() {
    if (window.maageSVC && window.maageSVC.initialized && this.config.facetField) {
      this.loadAPIData();
    } else {
      this.processData(this.config.sampleData);
    }
  }
  
  loadAPIData() {
    this.showLoading('Loading live data...');
    
    const query = `*:*&facet=true&facet.field=${this.config.facetField}&facet.mincount=1&rows=0`;
    
    // Set timeout for API requests
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('API request timeout')), 10000)
    );
    
    const apiPromise = window.maageSVC.query('genome', query, {
      query_lang: 'solr',
      accept: 'application/solr+json'
    });
    
    Promise.race([apiPromise, timeoutPromise])
      .then(results => {
        if (results?.facet_counts?.facet_fields?.[this.config.facetField]) {
          this.showLoading('Processing data...');
          this.processDataFromSolrFacets(results.facet_counts.facet_fields[this.config.facetField]);
        } else {
          console.warn(`${this.config.chartTitle}: No facet data returned, using sample data`);
          this.showError('No data available, showing sample data');
          setTimeout(() => this.processData(this.config.sampleData), 1000);
        }
      })
      .catch(error => {
        const isTimeout = error.message === 'API request timeout';
        console.warn(`${this.config.chartTitle} API query ${isTimeout ? 'timed out' : 'failed'}, using sample data:`, error);
        this.showError(isTimeout ? 'Request timed out, showing sample data' : 'Connection failed, showing sample data');
        setTimeout(() => this.processData(this.config.sampleData), 1500);
      });
  }
  
  processDataFromSolrFacets(facetArray) {
    this.data = [];
    for (let i = 0; i < facetArray.length; i += 2) {
      const key = facetArray[i];
      const count = facetArray[i + 1];
      if (key && key !== 'null') {
        this.data.push({ name: String(key), value: count });
      }
    }
    this.postProcessData();
  }
  
  processData(facets) {
    this.data = Object.entries(facets)
      .filter(([key]) => key && key !== 'null')
      .map(([key, count]) => ({ name: key, value: count }));
    this.postProcessData();
  }
  
  postProcessData() {
    if (this.config.sortBy === 'value') {
      this.data.sort((a, b) => b.value - a.value);
    } else if (this.config.sortBy === 'name') {
      this.data.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    if (this.config.limit) {
      this.data = this.data.slice(0, this.config.limit);
    }
    
    if (this.data.length === 0) return;
    
    this.hideLoading();
    this.renderChart();
    this.renderTable();
    this.showChart();
  }
  
  renderChart() {
    if (!this.chart || !this.data.length) return;
    
    const option = this.getChartOption();
    this.chart.setOption(option);
    
    // Add click navigation functionality
    this.chart.off('click'); // Remove previous listeners
    this.chart.on('click', (params) => {
      this.handleChartClick(params);
    });
  }
  
  handleChartClick(params) {
    if (!params.data || !params.name) return;
    
    const clickData = {
      field: this.config.facetField,
      value: params.name,
      count: params.value || params.data.value || params.data,
      chartTitle: this.config.chartTitle
    };
    
    console.log('Chart clicked:', clickData);
    
    // Build navigation URL based on field type
    const navigationUrl = this.buildNavigationUrl(clickData);
    
    if (navigationUrl) {
      // Show loading state briefly before navigation
      this.showLoading(`Navigating to ${params.name} data...`);
      
      setTimeout(() => {
        if (this.config.openInNewTab !== false) {
          window.open(navigationUrl, '_blank');
        } else {
          window.location.href = navigationUrl;
        }
        this.hideLoading();
      }, 500);
    }
  }
  
  buildNavigationUrl(clickData) {
    const baseUrl = '/view/GenomeList';
    const field = clickData.field;
    const value = encodeURIComponent(clickData.value);
    
    // Different navigation patterns based on field type
    switch (field) {
      case 'isolation_source':
        return `${baseUrl}/?filter=eq(isolation_source,"${value}")#view_tab=genomes`;
      case 'geographic_group':
        return `${baseUrl}/?filter=eq(geographic_group,"${value}")#view_tab=genomes`;
      case 'species':
        return `${baseUrl}/?filter=eq(species,"${value}")#view_tab=genomes`;
      case 'collection_year':
        return `${baseUrl}/?filter=eq(collection_year,${clickData.value})#view_tab=genomes`;
      case 'genome_status':
        return `${baseUrl}/?filter=eq(genome_status,"${value}")#view_tab=genomes`;
      case 'host_group':
        return `${baseUrl}/?filter=eq(host_group,"${value}")#view_tab=genomes`;
      case 'genus':
        return `${baseUrl}/?filter=eq(genus,"${value}")#view_tab=genomes`;
      default:
        // Generic filter for any field
        return `${baseUrl}/?filter=eq(${field},"${value}")#view_tab=genomes`;
    }
  }
  
  getChartOption() {
    // Override in subclasses for specific chart types
    const names = this.data.map(item => item.name);
    const values = this.data.map(item => item.value);
    
    return {
      tooltip: { 
        trigger: 'axis', 
        axisPointer: { type: 'shadow' },
        formatter: '{b}: {c}<br/><i>Click to view genomes</i>'
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value' },
      yAxis: { 
        type: 'category', 
        data: names,
        axisLabel: {
          formatter: value => value.length > 15 ? value.substring(0, 12) + '...' : value
        }
      },
      series: [{
        name: 'Count',
        type: 'bar',
        data: values,
        itemStyle: { 
          color: this.config.colors[0],
          borderRadius: [0, 4, 4, 0]
        },
        emphasis: {
          itemStyle: {
            color: this.adjustColorBrightness(this.config.colors[0], 20),
            cursor: 'pointer'
          }
        }
      }]
    };
  }
  
  adjustColorBrightness(hex, percent) {
    // Helper function to brighten colors on hover
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }
  
  renderTable() {
    if (!this.data.length) return;
    this.tableData.innerHTML = this.data.map(item => 
      `<tr class="border-b"><td class="p-2">${item.name}</td><td class="p-2">${item.value}</td></tr>`
    ).join('');
  }
  
  showChart() {
    this.loadingEl.style.display = 'none';
    this.chartContainer.style.display = 'block';
    this.tableContainer.style.display = 'none';
    if (this.chart) setTimeout(() => this.chart.resize(), 100);
  }
  
  showTable() {
    this.chartContainer.style.display = 'none';
    this.tableContainer.style.display = 'block';
  }
  
  showLoading(message = 'Loading chart data...') {
    this.loadingEl.style.display = 'block';
    const messageEl = this.loadingEl.querySelector('span');
    if (messageEl) {
      messageEl.textContent = message;
    }
  }
  
  showError(message) {
    this.loadingEl.style.display = 'block';
    this.loadingEl.innerHTML = `
      <div class="text-center">
        <div class="text-red-500 mb-2">⚠️</div>
        <span class="text-red-600 text-sm">${message}</span>
      </div>
    `;
  }
  
  hideLoading() {
    this.loadingEl.style.display = 'none';
  }
  
  destroy() {
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
  }
}

// Specialized chart classes
class MAAGEBarChart extends MAAGEChartWidget {
  getChartOption() {
    const names = this.data.map(item => item.name);
    const values = this.data.map(item => item.value);
    
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value' },
      yAxis: { 
        type: 'category', 
        data: names,
        axisLabel: {
          formatter: value => value.length > 15 ? value.substring(0, 12) + '...' : value
        }
      },
      series: [{
        name: 'Count',
        type: 'bar',
        data: values,
        itemStyle: { color: this.config.colors[0] }
      }]
    };
  }
}

class MAAGEDoughnutChart extends MAAGEChartWidget {
  getChartOption() {
    return {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)<br/><i>Click to view genomes</i>'
      },
      legend: {
        type: 'scroll',
        orient: 'vertical',
        right: 10,
        top: 20,
        bottom: 20,
        itemWidth: 14,
        itemHeight: 10,
        textStyle: {
          fontSize: 11,
          width: 80,
          overflow: 'truncate'
        }
      },
      series: [{
        name: this.config.chartTitle,
        type: 'pie',
        radius: ['45%', '75%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 4,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            fontSize: '12',
            fontWeight: 'bold'
          },
          itemStyle: {
            cursor: 'pointer',
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        data: this.data.map(item => ({
          value: item.value,
          name: item.name
        }))
      }]
    };
  }
}

class MAAGELineChart extends MAAGEChartWidget {
  getChartOption() {
    const names = this.data.map(item => item.name);
    const values = this.data.map(item => item.value);
    
    return {
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          if (params && params.length > 0) {
            return `${params[0].name}<br/>${params[0].seriesName}: ${params[0].value}<br/><i>Click to view genomes</i>`;
          }
          return '';
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: names,
        axisLabel: {
          color: '#6b7280'
        }
      },
      yAxis: {
        type: 'value',
        name: 'Count',
        nameLocation: 'middle',
        nameGap: 40,
        axisLabel: {
          color: '#6b7280'
        },
        splitLine: {
          lineStyle: {
            color: '#f3f4f6'
          }
        }
      },
      series: [{
        name: this.config.chartTitle,
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: this.config.colors[0]
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{
              offset: 0, color: this.config.colors[0] + '40'
            }, {
              offset: 1, color: this.config.colors[0] + '10'
            }]
          }
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.2)',
            cursor: 'pointer',
            scale: 1.1
          }
        }
      }]
    };
  }
}

// Export for global use
window.MAAGEChartWidget = MAAGEChartWidget;
window.MAAGEBarChart = MAAGEBarChart;
window.MAAGEDoughnutChart = MAAGEDoughnutChart;
window.MAAGELineChart = MAAGELineChart;