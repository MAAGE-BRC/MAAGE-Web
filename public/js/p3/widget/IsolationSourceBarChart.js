define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  './EChartsBase',
  '../util/IsolationSourceNormalizer'
], function (
  declare, lang,
  EChartsBase,
  IsolationSourceNormalizer
) {

  return declare([EChartsBase], {
    // Override default height for bar chart
    chartHeight: '500px',
    minChartHeight: '500px',
    
    // Define chart options
    getChartOptions: function() {
      return {
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
          containLabel: true
        },
        xAxis: {
          type: 'value',
          name: 'Count'
        },
        yAxis: {
          type: 'category',
          data: []
        },
        series: [{
          type: 'bar',
          data: []
        }]
      };
    },
    
    // Implement required method - build facet query
    buildFacetQuery: function () {
      // Get more results initially, then normalize and filter to top 10
      return this.buildSimpleFacetQuery('isolation_source', 50);
    },
    
    // Implement required method - process data
    processData: function (response) {
      this.chart.hideLoading();
      
      if (!response || !response.facet_counts) {
        return;
      }
      
      var facets = response.facet_counts.facet_fields.isolation_source || [];
      var normalizedData = {};
      
      // Process facet array and group by normalized names
      for (var i = 0; i < facets.length; i += 2) {
        var source = facets[i];
        var count = facets[i + 1];
        
        // Skip generic terms
        if (source && !IsolationSourceNormalizer.isGenericTerm(source)) {
          var normalized = IsolationSourceNormalizer.normalize(source);
          
          if (!normalizedData[normalized]) {
            normalizedData[normalized] = 0;
          }
          normalizedData[normalized] += count;
        }
      }
      
      // Convert to arrays and sort
      var sortedData = Object.keys(normalizedData)
        .map(function(key) {
          return { source: key, count: normalizedData[key] };
        })
        .sort(function(a, b) { return b.count - a.count; })
        .slice(0, 10); // Top 10
      
      var categories = [];
      var data = [];
      sortedData.forEach(function(item) {
        categories.push(item.source);
        data.push(item.count);
      });
      
      // Update chart
      this.updateChart({
        yAxis: {
          data: categories
        },
        series: [{
          type: 'bar',
          data: data
        }]
      });
    }
  });
});