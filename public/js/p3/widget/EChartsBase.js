define([
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dojo/on',
  'dojo/dom-geometry',
  'dojo/dom-construct',
  'dojo/_base/lang',
  '../DataAPI'
], function (
  declare, _WidgetBase, _TemplatedMixin,
  on, domGeometry, domConstruct, lang,
  DataAPI
) {
  var echarts = window.echarts;
  
  if (!echarts) {
    console.error('ECharts library not found');
  }

  return declare([_WidgetBase, _TemplatedMixin], {
    templateString: '<div class="EChartsBase" data-dojo-attach-point="containerNode"></div>',
    
    chart: null,
    chartNode: null,
    query: null,
    dataType: 'genome',
    chartOptions: {},
    _initAttempts: 0,
    _maxInitAttempts: 10,
    
    // Default chart dimensions - can be overridden by subclasses
    chartHeight: '400px',
    minChartHeight: '400px',
    
    postCreate: function () {
      this.inherited(arguments);
      this.chartNode = domConstruct.create('div', {
        style: 'width: 100%; height: ' + this.chartHeight + '; min-height: ' + this.minChartHeight + ';'
      }, this.containerNode);
      
      // Initialize chart options if provided by subclass
      if (this.getChartOptions) {
        this.chartOptions = this.getChartOptions();
      }
    },
    
    startup: function () {
      if (this._started) { return; }
      this.inherited(arguments);
      this._attemptInitialization();
    },
    
    _attemptInitialization: function() {
      var box = domGeometry.getContentBox(this.chartNode);
      
      if (box.w > 0 && box.h > 0) {
        this._initializeChart();
      } else if (this._initAttempts < this._maxInitAttempts) {
        this._initAttempts++;
        setTimeout(lang.hitch(this, this._attemptInitialization), 500);
      } else {
        this._setupDeferredInitialization();
      }
    },
    
    _initializeChart: function() {
      if (!this.chart && echarts) {
        this.chart = echarts.init(this.chartNode, 'maage');
        this._setupResizeHandler();
        
        if (this.query) {
          this.loadData();
        }
      }
    },
    
    _setupResizeHandler: function() {
      this.own(
        on(window, 'resize', lang.hitch(this, function () {
          if (this.chart) {
            this.chart.resize();
          }
        }))
      );
    },
    
    _setupDeferredInitialization: function() {
      this.own(
        on(window, 'resize', lang.hitch(this, function () {
          if (!this.chart) {
            var box = domGeometry.getContentBox(this.chartNode);
            if (box.w > 0 && box.h > 0) {
              this._initializeChart();
            }
          } else {
            this.chart.resize();
          }
        }))
      );
    },
    
    resize: function () {
      this.inherited(arguments);
      if (this.chart) {
        this.chart.resize();
      } else {
        var box = domGeometry.getContentBox(this.chartNode);
        if (box.w > 0 && box.h > 0) {
          this._initializeChart();
        }
      }
    },
    
    setQuery: function (query) {
      this.query = query;
      if (this._started && this.chart) {
        this.loadData();
      }
    },
    
    loadData: function () {
      if (!this.query || !this.chart) { return; }
      
      this.chart.showLoading({
        text: 'Loading...',
        maskColor: 'rgba(255, 255, 255, 0.8)',
        textColor: '#333'
      });
      
      var facetQuery = this.buildFacetQuery();
      
      DataAPI.query(this.dataType, facetQuery, {
        accept: 'application/solr+json'
      }).then(
        lang.hitch(this, 'processData'),
        lang.hitch(this, 'handleError')
      );
    },
    
    buildFacetQuery: function () {
      // Abstract method - must be implemented by subclasses
      console.error('buildFacetQuery must be implemented by subclass');
      return this.query + '&limit(1)';
    },
    
    // Helper method for common facet query pattern
    buildSimpleFacetQuery: function(field, limit, sort) {
      var cleanQuery = this._cleanQuery(this.query);
      var sortParam = sort || 'count';
      var limitParam = limit || 10;
      return cleanQuery + '&facet((field,' + field + '),(mincount,1),(sort,' + sortParam + '),(limit,' + limitParam + '))&limit(1)';
    },
    
    _cleanQuery: function(query) {
      if (!query) return '';
      
      var cleaned = query;
      
      // Remove leading question mark
      if (cleaned.charAt(0) === '?') {
        cleaned = cleaned.substring(1);
      }
      
      // Fix malformed genome list queries
      var genomeMatch = cleaned.match(/^eq\(\*,\*\)&genome\((in\(genome_id,\([^)]+\)\))\)$/);
      if (genomeMatch) {
        cleaned = genomeMatch[1];
      }
      
      // Remove eq(*,*)& patterns
      cleaned = cleaned.replace(/^eq\(\*,\*\)&/, '');
      
      return cleaned;
    },
    
    processData: function (response) {
      // Abstract method - must be implemented by subclasses
      this.chart.hideLoading();
      console.error('processData must be implemented by subclass');
    },
    
    // Helper method to transform facet data into chart series
    transformFacetData: function(response, field, excludeTerms) {
      if (!response || !response.facet_counts || !response.facet_counts.facet_fields || !response.facet_counts.facet_fields[field]) {
        return { categories: [], values: [] };
      }
      
      var facetData = response.facet_counts.facet_fields[field];
      var categories = [];
      var values = [];
      var excludeSet = excludeTerms ? new Set(excludeTerms) : null;
      
      for (var i = 0; i < facetData.length; i += 2) {
        var label = facetData[i];
        var count = facetData[i + 1];
        
        if (!excludeSet || !excludeSet.has(label.toLowerCase())) {
          categories.push(label);
          values.push(count);
        }
      }
      
      return { categories: categories, values: values };
    },
    
    handleError: function (error) {
      if (this.chart) {
        this.chart.hideLoading();
        this.chart.setOption({
          title: {
            text: 'Error Loading Data',
            subtext: error.message || 'Unknown error',
            left: 'center',
            top: 'center'
          }
        });
      }
    },
    
    updateChart: function (data) {
      if (this.chart) {
        var options = lang.mixin({}, this.chartOptions, data);
        this.chart.setOption(options);
      }
    },
    
    destroy: function () {
      if (this.chart) {
        this.chart.dispose();
        this.chart = null;
      }
      this.inherited(arguments);
    }
  });
});