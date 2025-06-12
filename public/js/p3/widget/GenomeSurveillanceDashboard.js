define([
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/on',
  'dojo/dom-class',
  'dojo/dom-construct',
  'dojo/_base/lang',
  'dojo/text!./templates/GenomeSurveillanceDashboard.html',
  './EChartsTimeSeriesChart',
  './EChartsGeographicDistribution',
  './EChartsHostDistribution',
  './EChartsLineageTreemap',
  './EChartsAMRHeatmap',
  './EChartsGenomeStats',
  'dijit/layout/ContentPane',
  'dijit/layout/TabContainer'
], function (
  declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
  on, domClass, domConstruct, lang,
  Template,
  TimeSeriesChart, GeographicDistribution, HostDistribution,
  LineageTreemap, AMRHeatmap, GenomeStats,
  ContentPane, TabContainer
) {

  return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
    baseClass: 'GenomeSurveillanceDashboard',
    templateString: Template,
    
    query: null,
    state: null,
    
    // Widget references
    statsWidget: null,
    timeSeriesChart: null,
    geoDistChart: null,
    hostDistChart: null,
    lineageTreemap: null,
    amrHeatmap: null,
    
    postCreate: function () {
      this.inherited(arguments);
      console.log('GenomeSurveillanceDashboard postCreate called');
      
      // Add test content to verify rendering
      if (this.summaryNode) {
        this.summaryNode.innerHTML = '<div style="padding: 20px; background: #f5f5f5; border: 1px solid #ddd; margin-bottom: 20px;">' +
                                    '<h3 style="margin: 0 0 10px 0;">Genome Surveillance Dashboard</h3>' +
                                    '<p style="margin: 0;">Loading surveillance data...</p>' +
                                    '</div>';
      }
    },
    
    initializeCharts: function () {
      console.log('GenomeSurveillanceDashboard initializeCharts - starting');
      
      // Check if all containers are available
      console.log('Container availability check:');
      console.log('- summaryNode:', this.summaryNode ? 'available' : 'missing');
      console.log('- timeSeriesContainer:', this.timeSeriesContainer ? 'available' : 'missing');
      console.log('- geoDistContainer:', this.geoDistContainer ? 'available' : 'missing');
      console.log('- hostDistContainer:', this.hostDistContainer ? 'available' : 'missing');
      console.log('- lineageContainer:', this.lineageContainer ? 'available' : 'missing');
      console.log('- amrContainer:', this.amrContainer ? 'available' : 'missing');
      
      // Create stats widget
      this.statsWidget = new GenomeStats({});
      domConstruct.place(this.statsWidget.domNode, this.summaryNode, 'replace');
      console.log('Stats widget created');
      
      // Create chart containers with explicit dimensions
      var chartContainerStyle = 'width: 100%; height: 500px;';
      
      // Create time series chart container
      console.log('Creating time series chart, container:', this.timeSeriesContainer);
      var tsContainer = domConstruct.create('div', {
        style: chartContainerStyle
      }, this.timeSeriesContainer.containerNode);
      
      this.timeSeriesChart = new TimeSeriesChart({});
      domConstruct.place(this.timeSeriesChart.domNode, tsContainer);
      console.log('Time series chart created');
      
      // Create geographic distribution chart container
      console.log('Creating geographic chart, container:', this.geoDistContainer);
      var geoChartContainer = domConstruct.create('div', {
        style: chartContainerStyle
      }, this.geoDistContainer.containerNode);
      
      this.geoDistChart = new GeographicDistribution({
        displayMode: 'bar'
      });
      domConstruct.place(this.geoDistChart.domNode, geoChartContainer);
      console.log('Geographic chart created');
      
      // Create host distribution chart container
      var hostChartContainer = domConstruct.create('div', {
        style: chartContainerStyle
      }, this.hostDistContainer.containerNode);
      
      this.hostDistChart = new HostDistribution({
        displayMode: 'sunburst'
      });
      domConstruct.place(this.hostDistChart.domNode, hostChartContainer);
      
      // Create lineage treemap container
      var lineageContainer = domConstruct.create('div', {
        style: chartContainerStyle
      }, this.lineageContainer.containerNode);
      
      this.lineageTreemap = new LineageTreemap({});
      domConstruct.place(this.lineageTreemap.domNode, lineageContainer);
      
      // Create AMR heatmap container
      var amrChartContainer = domConstruct.create('div', {
        style: chartContainerStyle
      }, this.amrContainer.containerNode);
      
      this.amrHeatmap = new AMRHeatmap({
        displayMode: 'heatmap'
      });
      domConstruct.place(this.amrHeatmap.domNode, amrChartContainer);
      
      // Only startup the stats widget and first tab's chart initially
      this.statsWidget.startup();
      this.timeSeriesChart.startup();
      
      // Setup tab change handlers to startup charts when tabs become visible
      this.tabContainer.watch('selectedChildWidget', lang.hitch(this, function(name, oldVal, newVal) {
        console.log('Tab changed to:', newVal.title);
        
        // Delay to ensure tab is fully visible
        setTimeout(lang.hitch(this, function() {
          // Force initialize and resize the appropriate chart
          if (newVal === this.timeSeriesContainer) {
            if (this.timeSeriesChart.forceInitialize) {
              this.timeSeriesChart.forceInitialize();
            }
            if (this.timeSeriesChart.resize) {
              this.timeSeriesChart.resize();
            }
          } else if (newVal === this.geoDistContainer) {
            if (!this.geoDistChart._started) {
              this.geoDistChart.startup();
            }
            if (this.geoDistChart.forceInitialize) {
              this.geoDistChart.forceInitialize();
            }
            if (this.geoDistChart.resize) {
              this.geoDistChart.resize();
            }
          } else if (newVal === this.hostDistContainer) {
            if (!this.hostDistChart._started) {
              this.hostDistChart.startup();
            }
            if (this.hostDistChart.forceInitialize) {
              this.hostDistChart.forceInitialize();
            }
            if (this.hostDistChart.resize) {
              this.hostDistChart.resize();
            }
          } else if (newVal === this.lineageContainer) {
            if (!this.lineageTreemap._started) {
              this.lineageTreemap.startup();
            }
            if (this.lineageTreemap.forceInitialize) {
              this.lineageTreemap.forceInitialize();
            }
            if (this.lineageTreemap.resize) {
              this.lineageTreemap.resize();
            }
          } else if (newVal === this.amrContainer) {
            if (!this.amrHeatmap._started) {
              this.amrHeatmap.startup();
            }
            if (this.amrHeatmap.forceInitialize) {
              this.amrHeatmap.forceInitialize();
            }
            if (this.amrHeatmap.resize) {
              this.amrHeatmap.resize();
            }
          }
        }), 200);
      }));
    },
    
    setupEventHandlers: function () {
      // Time series chart events
      this.own(
        on(this.timeSeriesChart, 'year-selected', lang.hitch(this, function (evt) {
          this.onFilterApplied('year', evt.year, evt.query);
        }))
      );
      
      // Geographic distribution events
      this.own(
        on(this.geoDistChart, 'country-selected', lang.hitch(this, function (evt) {
          this.onFilterApplied('country', evt.country, evt.query);
        }))
      );
      
      // Host distribution events
      this.own(
        on(this.hostDistChart, 'host-selected', lang.hitch(this, function (evt) {
          this.onFilterApplied('host', evt.host, evt.query);
        }))
      );
      
      // Lineage treemap events
      this.own(
        on(this.lineageTreemap, 'lineage-selected', lang.hitch(this, function (evt) {
          this.onFilterApplied('lineage', evt.lineage, evt.query);
        }))
      );
      
      // Chart display mode toggles
      this.own(
        on(this.geoBarBtn, 'click', lang.hitch(this, function () {
          this.geoDistChart.setDisplayMode('bar');
          domClass.add(this.geoBarBtn, 'active');
          domClass.remove(this.geoPieBtn, 'active');
        })),
        
        on(this.geoPieBtn, 'click', lang.hitch(this, function () {
          this.geoDistChart.setDisplayMode('pie');
          domClass.add(this.geoPieBtn, 'active');
          domClass.remove(this.geoBarBtn, 'active');
        })),
        
        on(this.hostSunburstBtn, 'click', lang.hitch(this, function () {
          this.hostDistChart.setDisplayMode('sunburst');
          domClass.add(this.hostSunburstBtn, 'active');
          domClass.remove(this.hostTreemapBtn, 'active');
          domClass.remove(this.hostBarBtn, 'active');
        })),
        
        on(this.hostTreemapBtn, 'click', lang.hitch(this, function () {
          this.hostDistChart.setDisplayMode('treemap');
          domClass.add(this.hostTreemapBtn, 'active');
          domClass.remove(this.hostSunburstBtn, 'active');
          domClass.remove(this.hostBarBtn, 'active');
        })),
        
        on(this.hostBarBtn, 'click', lang.hitch(this, function () {
          this.hostDistChart.setDisplayMode('bar');
          domClass.add(this.hostBarBtn, 'active');
          domClass.remove(this.hostSunburstBtn, 'active');
          domClass.remove(this.hostTreemapBtn, 'active');
        })),
        
        on(this.amrHeatmapBtn, 'click', lang.hitch(this, function () {
          this.amrHeatmap.setDisplayMode('heatmap');
          domClass.add(this.amrHeatmapBtn, 'active');
          domClass.remove(this.amrRadarBtn, 'active');
        })),
        
        on(this.amrRadarBtn, 'click', lang.hitch(this, function () {
          this.amrHeatmap.setDisplayMode('radar');
          domClass.add(this.amrRadarBtn, 'active');
          domClass.remove(this.amrHeatmapBtn, 'active');
        }))
      );
    },
    
    startup: function () {
      if (this._started) { return; }
      this.inherited(arguments);
      
      console.log('GenomeSurveillanceDashboard startup called');
      
      // Initialize charts after DOM is ready and visible
      setTimeout(lang.hitch(this, function() {
        console.log('GenomeSurveillanceDashboard initializing charts');
        console.log('TabContainer node:', this.tabContainer);
        console.log('TabContainer domNode:', this.tabContainer ? this.tabContainer.domNode : 'not found');
        
        // Make sure tab container is started
        if (this.tabContainer && !this.tabContainer._started) {
          this.tabContainer.startup();
        }
        
        // Wait a bit more for the tab container to fully render
        setTimeout(lang.hitch(this, function() {
          this.initializeCharts();
          this.setupEventHandlers();
          
          // Force a resize on the tab container to ensure proper layout
          if (this.tabContainer && this.tabContainer.resize) {
            this.tabContainer.resize();
          }
          
          // Load data if query is available
          if (this.query) {
            console.log('GenomeSurveillanceDashboard loading data with query:', this.query);
            this.loadData();
          }
        }), 500);
      }), 100);
    },
    
    setQuery: function (query) {
      this.query = query;
      if (this._started) {
        this.loadData();
      }
    },
    
    _setQueryAttr: function (query) {
      this.setQuery(query);
    },
    
    _setStateAttr: function (state) {
      this._set('state', state);
      console.log('GenomeSurveillanceDashboard _setStateAttr called with state:', state);
      if (state && state.search) {
        this.setQuery(state.search);
      }
    },
    
    loadData: function () {
      if (!this.query) { 
        console.log('GenomeSurveillanceDashboard loadData - no query available');
        return; 
      }
      
      console.log('GenomeSurveillanceDashboard loadData - updating charts with query:', this.query);
      
      // Update all charts with the query
      if (this.statsWidget) { 
        console.log('Setting query on statsWidget');
        this.statsWidget.setQuery(this.query); 
      }
      if (this.timeSeriesChart) { 
        console.log('Setting query on timeSeriesChart');
        this.timeSeriesChart.setQuery(this.query); 
      }
      if (this.geoDistChart) { 
        console.log('Setting query on geoDistChart');
        this.geoDistChart.setQuery(this.query); 
      }
      if (this.hostDistChart) { 
        console.log('Setting query on hostDistChart');
        this.hostDistChart.setQuery(this.query); 
      }
      if (this.lineageTreemap) { 
        console.log('Setting query on lineageTreemap');
        this.lineageTreemap.setQuery(this.query); 
      }
      if (this.amrHeatmap) { 
        console.log('Setting query on amrHeatmap');
        this.amrHeatmap.setQuery(this.query); 
      }
    },
    
    
    onFilterApplied: function (filterType, filterValue, newQuery) {
      // Emit event for filter application
      this.emit('filter-applied', {
        type: filterType,
        value: filterValue,
        query: newQuery
      });
      
      // Optionally update the dashboard with the filtered query
      // this.setQuery(newQuery);
    },
    
    resize: function () {
      this.inherited(arguments);
      
      // Resize all charts
      if (this.statsWidget) { this.statsWidget.resize(); }
      if (this.timeSeriesChart) { this.timeSeriesChart.resize(); }
      if (this.geoDistChart) { this.geoDistChart.resize(); }
      if (this.hostDistChart) { this.hostDistChart.resize(); }
      if (this.lineageTreemap) { this.lineageTreemap.resize(); }
      if (this.amrHeatmap) { this.amrHeatmap.resize(); }
    }
  });
});