define([
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dojo/on',
  'dojo/dom-class',
  'dojo/dom-style',
  'dojo/dom-geometry',
  'dojo/dom-construct',
  'dojo/_base/lang',
  'dojo/topic',
  '../DataAPI'
], function (
  declare, _WidgetBase, _TemplatedMixin,
  on, domClass, domStyle, domGeometry, domConstruct, lang, Topic,
  DataAPI
) {
  // ECharts is loaded globally
  var echarts = window.echarts;
  
  if (!echarts) {
    console.error('ECharts library not found. Make sure echarts.js is loaded before this widget.');
  }

  return declare([_WidgetBase, _TemplatedMixin], {
    templateString: '<div class="EChartsBase" data-dojo-attach-point="containerNode"></div>',
    
    chart: null,
    chartNode: null,
    query: null,
    dataType: 'genome',
    
    // Chart configuration to be overridden by subclasses
    chartOptions: {},
    
    // Default MAAGE theme colors
    themeColors: [
      '#E74C3C', // Red
      '#3498DB', // Blue
      '#2ECC71', // Green
      '#F39C12', // Orange
      '#9B59B6', // Purple
      '#1ABC9C', // Turquoise
      '#34495E', // Dark Gray
      '#E67E22', // Carrot
      '#95A5A6', // Gray
      '#16A085'  // Green Sea
    ],
    
    postCreate: function () {
      this.inherited(arguments);
      this.chartNode = domConstruct.create('div', {
        style: 'width: 100%; height: 400px; min-height: 400px;'
      }, this.containerNode);
    },
    
    startup: function () {
      if (this._started) { return; }
      this.inherited(arguments);
      
      console.log('EChartsBase startup - widget type:', this.declaredClass);
      
      // Ensure the chart node has dimensions before initializing
      this._initRetries = this._initRetries || 0;
      
      setTimeout(lang.hitch(this, function() {
        // Check if the container has dimensions
        var box = domGeometry.getContentBox(this.chartNode);
        console.log('EChartsBase dimensions check:', this.declaredClass, 'width:', box.w, 'height:', box.h);
        
        if (box.w > 0 && box.h > 0) {
          // Initialize ECharts instance
          this.chart = echarts.init(this.chartNode);
          console.log('EChartsBase chart initialized:', this.declaredClass);
          
          // Set up resize handler
          this.own(
            on(window, 'resize', lang.hitch(this, function () {
              if (this.chart) {
                this.chart.resize();
              }
            }))
          );
          
          // Load data if query is set
          if (this.query) {
            console.log('EChartsBase loading data on startup:', this.declaredClass);
            this.loadData();
          }
        } else if (this._initRetries < 10) {
          // Try again if container still has no dimensions, but limit retries
          this._initRetries++;
          console.log('EChartsBase no dimensions yet, retry', this._initRetries, 'of 10:', this.declaredClass);
          setTimeout(lang.hitch(this, this.startup), 500);
          this._started = false;
        } else {
          console.log('EChartsBase giving up after 10 retries, will init on resize:', this.declaredClass);
          // Set up resize handler to try initializing when container gets dimensions
          this.own(
            on(window, 'resize', lang.hitch(this, function () {
              if (!this.chart) {
                var box = domGeometry.getContentBox(this.chartNode);
                if (box.w > 0 && box.h > 0) {
                  this.chart = echarts.init(this.chartNode);
                  if (this.query) {
                    this.loadData();
                  }
                }
              } else {
                this.chart.resize();
              }
            }))
          );
        }
      }), 100);
    },
    
    resize: function () {
      this.inherited(arguments);
      if (this.chart) {
        this.chart.resize();
      } else {
        // Try to initialize if not already done
        var box = domGeometry.getContentBox(this.chartNode);
        if (box.w > 0 && box.h > 0) {
          this.chart = echarts.init(this.chartNode);
          console.log('EChartsBase chart initialized on resize:', this.declaredClass);
          if (this.query) {
            this.loadData();
          }
        }
      }
    },
    
    setQuery: function (query) {
      this.query = query;
      if (this._started && this.chart) {
        this.loadData();
      }
    },
    
    forceInitialize: function() {
      if (!this.chart) {
        var box = domGeometry.getContentBox(this.chartNode);
        console.log('EChartsBase forceInitialize:', this.declaredClass, 'width:', box.w, 'height:', box.h);
        if (box.w > 0 && box.h > 0) {
          this.chart = echarts.init(this.chartNode);
          console.log('EChartsBase chart initialized via forceInitialize:', this.declaredClass);
          if (this.query) {
            this.loadData();
          }
          return true;
        }
      }
      return false;
    },
    
    loadData: function () {
      if (!this.query || !this.chart) { return; }
      
      this.chart.showLoading({
        text: 'Loading data...',
        maskColor: 'rgba(255, 255, 255, 0.8)',
        textColor: '#333'
      });
      
      // Build query with facets
      var facetQuery = this.buildFacetQuery();
      
      // Debug logging
      console.log('EChartsBase loadData - original query:', this.query);
      console.log('EChartsBase loadData - facet query:', facetQuery);
      
      DataAPI.query(this.dataType, facetQuery, {
        accept: 'application/solr+json'
      }).then(
        lang.hitch(this, 'processData'),
        lang.hitch(this, 'handleError')
      );
    },
    
    // To be overridden by subclasses
    buildFacetQuery: function () {
      // Clean up the query to ensure proper format
      var cleanQuery = this.query;
      
      // Remove leading question marks if present
      if (cleanQuery && cleanQuery.charAt(0) === '?') {
        cleanQuery = cleanQuery.substring(1);
      }
      
      // Fix malformed genome list queries
      // Convert "eq(*,*)&genome(in(genome_id,(...)))" to "in(genome_id,(...))"
      var genomeMatch = cleanQuery.match(/^eq\(\*,\*\)&genome\((in\(genome_id,\([^)]+\)\))\)$/);
      if (genomeMatch) {
        cleanQuery = genomeMatch[1];
      }
      
      // Remove any remaining "eq(*,*)&" patterns
      cleanQuery = cleanQuery.replace(/^eq\(\*,\*\)&/, '');
      
      return cleanQuery + '&limit(1)';
    },
    
    // To be overridden by subclasses
    processData: function (response) {
      this.chart.hideLoading();
      // Process data and update chart
      this.updateChart({});
    },
    
    handleError: function (error) {
      this.chart.hideLoading();
      console.error('Error loading data:', error);
      this.chart.setOption({
        title: {
          text: 'Error Loading Data',
          subtext: error.message || 'Unknown error occurred',
          left: 'center',
          top: 'center'
        }
      });
    },
    
    updateChart: function (data) {
      var options = lang.mixin({
        color: this.themeColors,
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#ccc',
          borderWidth: 1,
          textStyle: {
            color: '#333'
          }
        }
      }, this.chartOptions, data);
      
      this.chart.setOption(options);
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