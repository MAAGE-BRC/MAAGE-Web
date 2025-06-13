define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  './EChartsBase',
  '../DataAPI'
], function (
  declare, lang,
  EChartsBase,
  DataAPI
) {

  return declare([EChartsBase], {
    // Override default height for stacked chart
    chartHeight: '500px',
    minChartHeight: '500px',
    
    // Define chart options
    getChartOptions: function() {
      return {
        title: {
          text: 'Host Organism by Genome Quality',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          formatter: function(params) {
            var result = params[0].axisValueLabel + '<br/>';
            var total = 0;
            params.forEach(function(item) {
              total += item.value;
            });
            params.forEach(function(item) {
              var percentage = ((item.value / total) * 100).toFixed(1);
              result += item.marker + ' ' + item.seriesName + ': ' + item.value.toLocaleString() + ' (' + percentage + '%)<br/>';
            });
            result += 'Total: ' + total.toLocaleString();
            return result;
          }
        },
        legend: {
          top: 30,
          data: []
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          top: 80,
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: [],
          axisLabel: {
            rotate: 45,
            interval: 0
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
        series: []
      };
    },
    
    // Override buildFacetQuery to get both host and quality data
    buildFacetQuery: function () {
      // We need to make a more complex query to get host organisms faceted by quality
      var cleanQuery = this._cleanQuery(this.query);
      // Get top 10 host organisms first
      return cleanQuery + '&facet((field,host_common_name),(mincount,1),(sort,count),(limit,10))&limit(1)';
    },
    
    // Process data - this is more complex as we need to make multiple queries
    processData: function(response) {
      this.chart.hideLoading();
      
      if (!response || !response.facet_counts || !response.facet_counts.facet_fields) {
        return;
      }
      
      var hostFacets = response.facet_counts.facet_fields.host_common_name || [];
      var topHosts = [];
      
      // Get top hosts (excluding unknowns)
      for (var i = 0; i < hostFacets.length && topHosts.length < 8; i += 2) {
        var host = hostFacets[i];
        var count = hostFacets[i + 1];
        
        if (host && count > 0 && 
            host.toLowerCase() !== 'unknown' && 
            host.toLowerCase() !== 'not available' &&
            host.toLowerCase() !== 'missing') {
          topHosts.push(host);
        }
      }
      
      if (topHosts.length === 0) {
        this.updateChart({
          title: {
            text: 'No host organism data available',
            left: 'center',
            top: 'center'
          }
        });
        return;
      }
      
      // Now we need to get quality breakdown for each host
      this._loadQualityDataForHosts(topHosts);
    },
    
    _loadQualityDataForHosts: function(hosts) {
      var promises = [];
      var baseQuery = this._cleanQuery(this.query);
      
      // Create a query for each host to get quality breakdown
      hosts.forEach(function(host) {
        var hostQuery = baseQuery + '&eq(host_common_name,' + encodeURIComponent('"' + host + '"') + ')' +
                       '&facet((field,genome_quality))&limit(1)';
        
        promises.push(
          DataAPI.query('genome', hostQuery, {
            accept: 'application/solr+json'
          }).then(function(response) {
            return {
              host: host,
              qualityData: response.facet_counts ? response.facet_counts.facet_fields.genome_quality || [] : []
            };
          })
        );
      });
      
      // Wait for all queries to complete
      Promise.all(promises).then(
        lang.hitch(this, '_processStackedData'),
        lang.hitch(this, 'handleError')
      );
    },
    
    _processStackedData: function(results) {
      // Organize data for stacked bar chart
      var hosts = [];
      var qualityTypes = new Set();
      var dataByQuality = {};
      
      // First pass - collect all quality types and hosts
      results.forEach(function(result) {
        hosts.push(result.host);
        
        for (var i = 0; i < result.qualityData.length; i += 2) {
          var quality = result.qualityData[i];
          var count = result.qualityData[i + 1];
          if (quality && count > 0) {
            qualityTypes.add(quality);
          }
        }
      });
      
      // Sort quality types for consistent ordering
      var sortedQualities = Array.from(qualityTypes).sort(function(a, b) {
        // Order: High -> Medium -> Low -> others
        var order = {'High': 0, 'Medium': 1, 'Low': 2};
        return (order[a] !== undefined ? order[a] : 3) - (order[b] !== undefined ? order[b] : 3);
      });
      
      // Initialize data structure
      sortedQualities.forEach(function(quality) {
        dataByQuality[quality] = [];
      });
      
      // Second pass - populate data
      results.forEach(function(result) {
        var qualityMap = {};
        
        // Convert quality data to map
        for (var i = 0; i < result.qualityData.length; i += 2) {
          qualityMap[result.qualityData[i]] = result.qualityData[i + 1];
        }
        
        // Add data for each quality type
        sortedQualities.forEach(function(quality) {
          dataByQuality[quality].push(qualityMap[quality] || 0);
        });
      });
      
      // Create series for chart
      var series = [];
      var colors = {
        'High': '#10b981',     // emerald-500
        'Medium': '#f59e0b',   // amber-500
        'Low': '#ef4444',      // red-500
        'default': '#6b7280'   // gray-500
      };
      
      sortedQualities.forEach(function(quality) {
        series.push({
          name: quality,
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          itemStyle: {
            color: colors[quality] || colors.default
          },
          data: dataByQuality[quality]
        });
      });
      
      // Update chart
      this.updateChart({
        legend: {
          data: sortedQualities
        },
        xAxis: {
          data: hosts
        },
        series: series
      });
    }
  });
});