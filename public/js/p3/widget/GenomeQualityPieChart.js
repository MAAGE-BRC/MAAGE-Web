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
    templateString: '<div class="GenomeQualityPieChart" style="width: 100%; height: 400px;"></div>',
    
    chart: null,
    query: null,
    
    postCreate: function () {
      this.inherited(arguments);
      console.log('GenomeQualityPieChart postCreate');
    },
    
    startup: function () {
      if (this._started) { return; }
      this.inherited(arguments);
      
      console.log('GenomeQualityPieChart startup');
      // Don't initialize here - wait for explicit call
    },
    
    initChart: function() {
      console.log('GenomeQualityPieChart initChart');
      
      // Get actual dimensions
      var box = domGeometry.getContentBox(this.domNode);
      console.log('Chart container dimensions:', box.w, 'x', box.h);
      
      if (!this.chart && echarts && box.w > 0) {
        this.chart = echarts.init(this.domNode);
        console.log('Chart initialized');
        
        // Set initial empty option
        this.chart.setOption({
          title: {
            text: 'Genome Quality Distribution',
            left: 'center'
          },
          tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
          },
          legend: {
            orient: 'vertical',
            right: 10,
            top: 'center',
            data: []
          },
          series: [{
            name: 'Genome Quality',
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 10,
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: false,
              position: 'center'
            },
            emphasis: {
              label: {
                show: true,
                fontSize: '20',
                fontWeight: 'bold'
              }
            },
            labelLine: {
              show: false
            },
            data: []
          }]
        });
      }
    },
    
    setQuery: function (query) {
      console.log('GenomeQualityPieChart setQuery:', query);
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
      
      console.log('GenomeQualityPieChart loading data');
      
      // Show loading
      this.chart.showLoading();
      
      // Build facet query for genome_quality
      var facetQuery = this.query + '&facet((field,genome_quality))&limit(1)';
      
      console.log('Facet query:', facetQuery);
      
      DataAPI.query('genome', facetQuery, {
        accept: 'application/solr+json'
      }).then(
        lang.hitch(this, 'processData'),
        lang.hitch(this, 'handleError')
      );
    },
    
    processData: function (response) {
      console.log('GenomeQualityPieChart processData:', response);
      
      this.chart.hideLoading();
      
      if (!response || !response.facet_counts) {
        console.error('Invalid response format');
        return;
      }
      
      var facets = response.facet_counts.facet_fields.genome_quality || [];
      var data = [];
      var legendData = [];
      
      // Define colors for quality levels
      var qualityColors = {
        'High': '#2ECC71',     // Green
        'Good': '#3498DB',     // Blue
        'Medium': '#F39C12',   // Orange
        'Low': '#E74C3C',      // Red
        'Poor': '#C0392B'      // Dark Red
      };
      
      // Process facet array (alternating name/count)
      for (var i = 0; i < facets.length; i += 2) {
        var quality = facets[i];
        var count = facets[i + 1];
        
        if (quality && count > 0) {
          legendData.push(quality);
          data.push({
            value: count,
            name: quality,
            itemStyle: {
              color: qualityColors[quality] || '#95A5A6'
            }
          });
        }
      }
      
      console.log('Chart data:', data);
      
      // Update chart
      this.chart.setOption({
        legend: {
          data: legendData
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
      console.log('GenomeQualityPieChart resize called');
      
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