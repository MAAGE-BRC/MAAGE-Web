/**
 * Base Chart Widget - Shared functionality for MAAGE ECharts widgets
 * Provides common patterns for initialization, data loading, and chart rendering
 */

class MAAGEChartWidget {
  constructor(container, config = {}) {
    this.container = container;
    this.config = {
      // Basic configuration
      chartTitle: config.chartTitle || 'Chart',
      facetField: config.facetField || '',
      sampleData: config.sampleData || {},
      chartType: config.chartType || 'bar',
      
      // Color and theming options
      colors: config.colors || this._getDefaultColors(),
      colorScheme: config.colorScheme || 'maage', // 'maage', 'blue', 'green', 'red', 'purple'
      customTheme: config.customTheme || null, // Custom ECharts theme object
      
      // Data processing options
      sortBy: config.sortBy || 'value', // 'value', 'name', 'custom'
      sortOrder: config.sortOrder || 'desc', // 'asc', 'desc'
      limit: config.limit || null, // Max number of items to display
      minCount: config.minCount || 1, // Minimum count to include item
      filterEmpty: config.filterEmpty !== false, // Filter out empty/null values
      
      // Chart-specific options
      orientation: config.orientation || 'horizontal', // 'horizontal', 'vertical' (for bar charts)
      showLegend: config.showLegend !== false, // Show/hide legend
      showTooltip: config.showTooltip !== false, // Show/hide tooltips
      showLabels: config.showLabels !== false, // Show/hide data labels
      animationDuration: config.animationDuration || 750, // Chart animation duration
      
      // Query and API options
      query: config.query || '*:*', // Base Solr query
      queryFilters: config.queryFilters || [], // Additional filters
      queryParams: config.queryParams || {}, // Additional query parameters
      apiTimeout: config.apiTimeout || 10000, // API request timeout
      
      // Performance optimization configs
      enableLazyLoad: config.enableLazyLoad !== false, // Default true
      dataThrottle: config.dataThrottle || 300, // ms
      cacheResults: config.cacheResults !== false, // Default true
      maxDataPoints: config.maxDataPoints || 1000, // Prevent memory issues
      
      // UI behavior options
      enableChartTableToggle: config.enableChartTableToggle !== false,
      defaultView: config.defaultView || 'chart', // 'chart' or 'table'
      openInNewTab: config.openInNewTab !== false, // Navigation behavior
      enableClickNavigation: config.enableClickNavigation !== false,
      
      // Export options
      enableExport: config.enableExport || false,
      exportFormats: config.exportFormats || ['png', 'csv'], // Available formats
      
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
    
    // Performance optimization state
    this._dataCache = new Map();
    this._resizeObserver = null;
    this._intersectionObserver = null;
    this._throttledResize = this._throttle(this._handleResize.bind(this), 150);
    this._throttledDataLoad = this._throttle(this.loadAPIData.bind(this), this.config.dataThrottle);
    
    this.init();
  }
  
  // Color scheme methods
  _getDefaultColors() {
    const colorSchemes = {
      maage: [
        "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", 
        "#ef4444", "#06b6d4", "#8b5a3c", "#6366f1",
        "#ec4899", "#84cc16", "#f97316", "#6b7280"
      ],
      blue: [
        "#1e40af", "#3b82f6", "#60a5fa", "#93c5fd",
        "#bfdbfe", "#dbeafe", "#1e3a8a", "#1d4ed8"
      ],
      green: [
        "#166534", "#16a34a", "#22c55e", "#4ade80",
        "#86efac", "#bbf7d0", "#14532d", "#15803d"
      ],
      red: [
        "#991b1b", "#dc2626", "#ef4444", "#f87171",
        "#fca5a5", "#fecaca", "#7f1d1d", "#b91c1c"
      ],
      purple: [
        "#581c87", "#7c3aed", "#8b5cf6", "#a78bfa",
        "#c4b5fd", "#ddd6fe", "#4c1d95", "#6d28d9"
      ]
    };
    
    return colorSchemes[this.config.colorScheme] || colorSchemes.maage;
  }
  
  _getThemeColors() {
    if (this.config.colors && Array.isArray(this.config.colors)) {
      return this.config.colors;
    }
    return this._getDefaultColors();
  }
  
  init() {
    this.setupEventListeners();
    this.setupPerformanceObservers();
    
    if (this.config.enableLazyLoad) {
      this.setupIntersectionObserver();
    } else {
      this.waitForGridStackAndInit();
    }
  }
  
  // Performance optimization methods
  _throttle(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  _debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  setupPerformanceObservers() {
    // ResizeObserver for efficient resize handling
    if (window.ResizeObserver) {
      this._resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          if (entry.target === this.chartContainer && this.chart) {
            this._throttledResize();
          }
        }
      });
      
      if (this.chartContainer) {
        this._resizeObserver.observe(this.chartContainer);
      }
    }
  }
  
  setupIntersectionObserver() {
    // Lazy loading - only initialize chart when visible
    if (window.IntersectionObserver) {
      this._intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.chart) {
            this._intersectionObserver.unobserve(this.container);
            this.waitForGridStackAndInit();
          }
        });
      }, {
        rootMargin: '50px' // Start loading when 50px away from viewport
      });
      
      this._intersectionObserver.observe(this.container);
    } else {
      // Fallback for browsers without IntersectionObserver
      this.waitForGridStackAndInit();
    }
  }
  
  _handleResize() {
    if (this.chart) {
      this.chart.resize();
    }
  }
  
  setupEventListeners() {
    this.toggleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        btn.dataset.view === 'chart' ? this.showChart() : this.showTable();
      });
    });
    
    // Add export functionality if enabled
    if (this.config.enableExport) {
      this.setupExportControls();
    }
  }
  
  setupExportControls() {
    // Create export button container if it doesn't exist
    let exportContainer = this.container.querySelector('.export-controls');
    if (!exportContainer) {
      exportContainer = document.createElement('div');
      exportContainer.className = 'export-controls flex gap-1 ml-2';
      
      // Insert after chart toggle buttons
      const buttonContainer = this.container.querySelector('.flex.gap-2');
      if (buttonContainer) {
        buttonContainer.appendChild(exportContainer);
      }
    }
    
    // Create export buttons for each enabled format
    this.config.exportFormats.forEach(format => {
      if (!exportContainer.querySelector(`[data-export="${format}"]`)) {
        const exportBtn = document.createElement('button');
        exportBtn.className = 'px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs';
        exportBtn.dataset.export = format;
        exportBtn.title = `Export as ${format.toUpperCase()}`;
        
        // Format-specific icons and text
        const formatConfig = {
          png: { icon: '🖼️', text: 'PNG' },
          csv: { icon: '📊', text: 'CSV' },
          pdf: { icon: '📄', text: 'PDF' }
        };
        
        const config = formatConfig[format] || { icon: '📤', text: format.toUpperCase() };
        exportBtn.innerHTML = `${config.icon} ${config.text}`;
        
        exportBtn.addEventListener('click', () => this.exportData(format));
        exportContainer.appendChild(exportBtn);
      }
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
      // Use throttled loading for performance
      this._throttledDataLoad();
    } else {
      this.processData(this.config.sampleData);
    }
  }
  
  loadAPIData() {
    const cacheKey = `${this.config.facetField}_${this.config.query || '*:*'}`;
    
    // Check cache first
    if (this.config.cacheResults && this._dataCache.has(cacheKey)) {
      const cachedData = this._dataCache.get(cacheKey);
      console.log(`${this.config.chartTitle}: Using cached data`);
      this.processDataFromSolrFacets(cachedData);
      return;
    }
    
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
          
          const facetData = results.facet_counts.facet_fields[this.config.facetField];
          
          // Cache the results
          if (this.config.cacheResults) {
            this._dataCache.set(cacheKey, facetData);
            
            // Clear cache after 5 minutes to prevent stale data
            setTimeout(() => {
              this._dataCache.delete(cacheKey);
            }, 300000);
          }
          
          this.processDataFromSolrFacets(facetData);
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
    const maxItems = Math.min(facetArray.length / 2, this.config.maxDataPoints);
    
    for (let i = 0; i < facetArray.length && this.data.length < maxItems; i += 2) {
      const key = facetArray[i];
      const count = facetArray[i + 1];
      
      // Apply configurable filters
      const shouldInclude = this._shouldIncludeDataPoint(key, count);
      if (shouldInclude) {
        this.data.push({ name: String(key), value: count });
      }
    }
    this.postProcessData();
  }
  
  processData(facets) {
    const entries = Object.entries(facets)
      .filter(([key, count]) => this._shouldIncludeDataPoint(key, count))
      .slice(0, this.config.maxDataPoints); // Prevent memory issues
      
    this.data = entries.map(([key, count]) => ({ name: key, value: count }));
    this.postProcessData();
  }
  
  _shouldIncludeDataPoint(key, count) {
    // Apply configured filters
    if (this.config.filterEmpty && (!key || key === 'null' || key === '')) {
      return false;
    }
    
    if (count < this.config.minCount) {
      return false;
    }
    
    return true;
  }
  
  postProcessData() {
    if (this.data.length === 0) {
      this.showError('No data to display');
      return;
    }
    
    // Apply configurable sorting
    this._sortData();
    
    // Apply limit after sorting for consistent results
    if (this.config.limit && this.data.length > this.config.limit) {
      this.data = this.data.slice(0, this.config.limit);
    }
    
    // Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(() => {
      this.hideLoading();
      this.renderChart();
      this.renderTable();
      
      // Show default view
      if (this.config.defaultView === 'table') {
        this.showTable();
      } else {
        this.showChart();
      }
    });
  }
  
  _sortData() {
    if (this.config.sortBy === 'value') {
      if (this.config.sortOrder === 'asc') {
        this.data.sort((a, b) => a.value - b.value);
      } else {
        this.data.sort((a, b) => b.value - a.value);
      }
    } else if (this.config.sortBy === 'name') {
      if (this.config.sortOrder === 'asc') {
        this.data.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        this.data.sort((a, b) => b.name.localeCompare(a.name));
      }
    }
    // Custom sorting can be implemented by overriding this method
  }
  
  renderChart() {
    if (!this.chart || !this.data.length) return;
    
    const option = this.getChartOption();
    
    // Apply theme colors
    option.color = this._getThemeColors();
    
    // Apply animation settings
    if (option.series) {
      option.series.forEach(series => {
        if (this.config.animationDuration !== null) {
          series.animationDuration = this.config.animationDuration;
        }
      });
    }
    
    this.chart.setOption(option);
    
    // Add click navigation functionality if enabled
    this.chart.off('click'); // Remove previous listeners
    if (this.config.enableClickNavigation) {
      this.chart.on('click', (params) => {
        this.handleChartClick(params);
      });
    }
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
  
  // Export functionality
  exportData(format) {
    this.showLoading(`Exporting as ${format.toUpperCase()}...`);
    
    try {
      switch (format.toLowerCase()) {
        case 'png':
          this.exportAsImage('png');
          break;
        case 'jpg':
        case 'jpeg':
          this.exportAsImage('jpeg');
          break;
        case 'csv':
          this.exportAsCSV();
          break;
        case 'pdf':
          this.exportAsPDF();
          break;
        default:
          throw new Error(`Export format '${format}' not supported`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      this.showError(`Export failed: ${error.message}`);
      setTimeout(() => this.hideLoading(), 2000);
    }
  }
  
  exportAsImage(format = 'png') {
    if (!this.chart) {
      throw new Error('Chart not initialized');
    }
    
    try {
      const dataURL = this.chart.getDataURL({
        type: format,
        pixelRatio: 2, // Higher quality
        backgroundColor: '#fff'
      });
      
      // Create download link
      const link = document.createElement('a');
      link.download = `${this.config.chartTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_chart.${format}`;
      link.href = dataURL;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.hideLoading();
    } catch (error) {
      throw new Error(`Image export failed: ${error.message}`);
    }
  }
  
  exportAsCSV() {
    if (!this.data || this.data.length === 0) {
      throw new Error('No data available for export');
    }
    
    try {
      // Create CSV content
      const headers = ['Name', 'Value'];
      const csvContent = [
        headers.join(','),
        ...this.data.map(item => `"${item.name}",${item.value}`)
      ].join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${this.config.chartTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_data.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
      }
      
      this.hideLoading();
    } catch (error) {
      throw new Error(`CSV export failed: ${error.message}`);
    }
  }
  
  exportAsPDF() {
    // PDF export requires additional libraries (jsPDF)
    // For now, we'll export as image and convert to PDF if needed
    if (!window.jsPDF) {
      console.warn('PDF export requires jsPDF library. Falling back to PNG export.');
      this.exportAsImage('png');
      return;
    }
    
    try {
      if (!this.chart) {
        throw new Error('Chart not initialized');
      }
      
      const canvas = this.chart.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff'
      });
      
      const pdf = new window.jsPDF('landscape');
      const imgWidth = 280;
      const imgHeight = 150;
      
      pdf.addImage(canvas, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`${this.config.chartTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_chart.pdf`);
      
      this.hideLoading();
    } catch (error) {
      throw new Error(`PDF export failed: ${error.message}`);
    }
  }
  
  destroy() {
    // Clean up chart
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
    
    // Clean up observers for memory efficiency
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    
    if (this._intersectionObserver) {
      this._intersectionObserver.disconnect();
      this._intersectionObserver = null;
    }
    
    // Clear data cache
    if (this._dataCache) {
      this._dataCache.clear();
    }
    
    // Clean up throttled functions
    this._throttledResize = null;
    this._throttledDataLoad = null;
    
    // Clear data references
    this.data = null;
    this.container = null;
    this.chartContainer = null;
    this.tableContainer = null;
    this.loadingEl = null;
    this.tableData = null;
    this.toggleBtns = null;
  }
}

// Specialized chart classes
class MAAGEBarChart extends MAAGEChartWidget {
  getChartOption() {
    const names = this.data.map(item => item.name);
    const values = this.data.map(item => item.value);
    const isHorizontal = this.config.orientation === 'horizontal';
    
    const option = {
      tooltip: this.config.showTooltip ? { 
        trigger: 'axis', 
        axisPointer: { type: 'shadow' },
        formatter: function(params) {
          if (params && params.length > 0) {
            return `${params[0].name}<br/>${params[0].seriesName}: ${params[0].value}<br/><i>Click to view genomes</i>`;
          }
          return '';
        }
      } : { show: false },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: isHorizontal ? { 
        type: 'value',
        name: 'Count',
        nameLocation: 'middle',
        nameGap: 30
      } : { 
        type: 'category', 
        data: names,
        axisLabel: {
          rotate: 45,
          formatter: value => value.length > 15 ? value.substring(0, 12) + '...' : value
        }
      },
      yAxis: isHorizontal ? { 
        type: 'category', 
        data: names,
        axisLabel: {
          formatter: value => value.length > 15 ? value.substring(0, 12) + '...' : value
        }
      } : {
        type: 'value',
        name: 'Count',
        nameLocation: 'middle',
        nameGap: 40
      },
      series: [{
        name: this.config.chartTitle,
        type: 'bar',
        data: values.map((value, idx) => ({
          value: value,
          itemStyle: {
            color: this._getThemeColors()[idx % this._getThemeColors().length]
          }
        })),
        label: this.config.showLabels ? {
          show: true,
          position: isHorizontal ? 'right' : 'top',
          formatter: '{c}'
        } : { show: false }
      }]
    };
    
    return option;
  }
}

class MAAGEDoughnutChart extends MAAGEChartWidget {
  getChartOption() {
    return {
      tooltip: this.config.showTooltip ? {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)<br/><i>Click to view genomes</i>'
      } : { show: false },
      legend: this.config.showLegend ? {
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
      } : { show: false },
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