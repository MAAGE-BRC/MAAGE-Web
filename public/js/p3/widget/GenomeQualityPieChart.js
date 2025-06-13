define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  './EChartsBase'
], function (
  declare, lang,
  EChartsBase
) {

  return declare([EChartsBase], {
    // Define chart options
    getChartOptions: function() {
      return {
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
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true
            }
          },
          labelLine: {
            show: false
          },
          data: []
        }]
      };
    },
    
    // Implement required method - build facet query
    buildFacetQuery: function () {
      // Simple facet query for genome_quality field
      var cleanQuery = this._cleanQuery(this.query);
      return cleanQuery + '&facet((field,genome_quality))&limit(1)';
    },
    
    // Implement required method - process data
    processData: function (response) {
      this.chart.hideLoading();
      
      // Use the base class helper method
      var result = this.transformFacetData(response, 'genome_quality');
      
      var data = [];
      var legendData = [];
      
      // Transform to pie chart format
      for (var i = 0; i < result.categories.length; i++) {
        var quality = result.categories[i];
        var count = result.values[i];
        
        if (quality && count > 0) {
          legendData.push(quality);
          data.push({
            value: count,
            name: quality
          });
        }
      }
      
      // Update chart
      this.updateChart({
        legend: {
          data: legendData
        },
        series: [{
          name: 'Genome Quality',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true
            }
          },
          labelLine: {
            show: false
          },
          data: data
        }]
      });
    }
  });
});