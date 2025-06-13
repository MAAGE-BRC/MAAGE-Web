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
          text: 'Genome Submissions by Year',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          formatter: function(params) {
            return params[0].name + ': ' + params[0].value.toLocaleString() + ' genomes';
          }
        },
        grid: {
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: [],
          axisLabel: {
            rotate: 45
          }
        },
        yAxis: {
          type: 'value',
          name: 'Number of Genomes',
          axisLabel: {
            formatter: function(value) {
              return value.toLocaleString();
            }
          }
        },
        series: [{
          type: 'bar',
          data: [],
          label: {
            show: true,
            position: 'top',
            formatter: function(params) {
              return params.value.toLocaleString();
            }
          }
        }]
      };
    },
    
    // Implement required method - build facet query
    buildFacetQuery: function () {
      // Get facet data for collection_year, sorted by index
      return this.buildSimpleFacetQuery('collection_year', 50, 'index');
    },
    
    // Implement required method - process data
    processData: function(response) {
      this.chart.hideLoading();
      
      if (!response || !response.facet_counts || !response.facet_counts.facet_fields) {
        return;
      }
      
      var facets = response.facet_counts.facet_fields.collection_year || [];
      var yearData = {};
      
      // Get current year
      var currentYear = new Date().getFullYear();
      var startYear = currentYear - 9;
      
      // Initialize all years in range with 0
      for (var year = startYear; year <= currentYear; year++) {
        yearData[year.toString()] = 0;
      }
      
      // Process facet data
      for (var i = 0; i < facets.length; i += 2) {
        var year = facets[i];
        var count = facets[i + 1];
        
        // Only include years in our range
        if (year && parseInt(year) >= startYear && parseInt(year) <= currentYear) {
          yearData[year] = count;
        }
      }
      
      // Convert to arrays for chart
      var years = [];
      var counts = [];
      
      // Sort years in ascending order (oldest first) for vertical bar chart
      Object.keys(yearData).sort(function(a, b) {
        return parseInt(a) - parseInt(b);
      }).forEach(function(year) {
        years.push(year);
        counts.push(yearData[year]);
      });
      
      // Update chart
      this.updateChart({
        xAxis: {
          data: years
        },
        series: [{
          type: 'bar',
          data: counts,
          label: {
            show: true,
            position: 'top',
            formatter: function(params) {
              return params.value.toLocaleString();
            }
          }
        }]
      });
    }
  });
});