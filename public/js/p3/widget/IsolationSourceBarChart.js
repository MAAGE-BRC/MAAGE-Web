define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dojo/dom-construct',
  'dojo/dom-geometry',
  '../DataAPI'
], function (
  declare, lang,
  _WidgetBase, _TemplatedMixin,
  domConstruct, domGeometry,
  DataAPI
) {
  
  // ECharts is loaded globally
  var echarts = window.echarts;

  return declare([_WidgetBase, _TemplatedMixin], {
    templateString: '<div class="IsolationSourceBarChart" style="width: 100%; height: 500px;"></div>',
    
    chart: null,
    query: null,
    
    postCreate: function () {
      this.inherited(arguments);
      console.log('IsolationSourceBarChart postCreate');
    },
    
    startup: function () {
      if (this._started) { return; }
      this.inherited(arguments);
      
      console.log('IsolationSourceBarChart startup');
      // Don't initialize here - wait for explicit call
    },
    
    initChart: function() {
      console.log('IsolationSourceBarChart initChart');
      
      // Get actual dimensions
      var box = domGeometry.getContentBox(this.domNode);
      console.log('Chart container dimensions:', box.w, 'x', box.h);
      
      if (!this.chart && echarts && box.w > 0) {
        this.chart = echarts.init(this.domNode);
        console.log('Chart initialized');
        
        // Set initial empty option
        this.chart.setOption({
          title: {
            text: 'Isolation Source Distribution',
            left: 'center'
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'shadow'
            }
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: [],
            axisLabel: {
              interval: 0,
              rotate: 45
            }
          },
          yAxis: {
            type: 'value',
            name: 'Count'
          },
          series: [{
            type: 'bar',
            data: [],
            itemStyle: {
              color: '#3498DB'
            }
          }]
        });
      }
    },
    
    setQuery: function (query) {
      console.log('IsolationSourceBarChart setQuery:', query);
      this.query = query;
      
      // Initialize chart if not already done
      if (!this.chart) {
        this.initChart();
      }
      
      if (this._started && this.chart) {
        this.loadData();
      }
    },
    
    loadData: function () {
      if (!this.query || !this.chart) { 
        console.log('Cannot load data - query:', !!this.query, 'chart:', !!this.chart);
        return; 
      }
      
      console.log('IsolationSourceBarChart loading data');
      
      // Show loading
      this.chart.showLoading();
      
      // Build facet query for isolation_source
      var facetQuery = this.query + '&facet((field,isolation_source),(mincount,1),(sort,count),(limit,10))&limit(1)';
      
      console.log('Facet query:', facetQuery);
      
      DataAPI.query('genome', facetQuery, {
        accept: 'application/solr+json'
      }).then(
        lang.hitch(this, 'processData'),
        lang.hitch(this, 'handleError')
      );
    },
    
    processData: function (response) {
      console.log('IsolationSourceBarChart processData:', response);
      
      this.chart.hideLoading();
      
      if (!response || !response.facet_counts) {
        console.error('Invalid response format');
        return;
      }
      
      var facets = response.facet_counts.facet_fields.isolation_source || [];
      var data = [];
      var categories = [];
      
      // Process facet array (alternating name/count)
      for (var i = 0; i < facets.length; i += 2) {
        var source = facets[i];
        var count = facets[i + 1];
        
        // Skip 'other', 'misc', 'miscellaneous', etc.
        if (source && !source.match(/^(other|misc|miscellaneous|unknown|n\/a|na)$/i)) {
          categories.push(source);
          data.push(count);
        }
      }
      
      console.log('Chart data:', categories, data);
      
      // Update chart
      this.chart.setOption({
        xAxis: {
          data: categories
        },
        series: [{
          data: data
        }]
      });
    },
    
    handleError: function (error) {
      console.error('Error loading data:', error);
      this.chart.hideLoading();
      this.chart.setOption({
        title: {
          text: 'Error Loading Data',
          subtext: error.message || 'Unknown error occurred'
        }
      });
    },
    
    resize: function () {
      console.log('IsolationSourceBarChart resize called');
      
      // Try to initialize chart if not already done
      if (!this.chart) {
        this.initChart();
        // If we have a query, load data
        if (this.query && this.chart) {
          this.loadData();
        }
      }
      
      if (this.chart) {
        this.chart.resize();
      }
    }
  });
});