define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  './EChartsBase'
], function (
  declare, lang,
  EChartsBase
) {

  return declare([EChartsBase], {
    chartOptions: {
      title: {
        text: 'Genome Collection Timeline',
        left: 'center'
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        name: 'Year'
      },
      yAxis: {
        type: 'value',
        name: 'Number of Genomes'
      },
      series: [{
        type: 'line',
        smooth: true,
        areaStyle: {
          opacity: 0.3
        },
        emphasis: {
          focus: 'series'
        }
      }]
    },
    
    // Optional: filter by year range
    startYear: null,
    endYear: null,
    
    buildFacetQuery: function () {
      var query = this.query;
      
      // Add year range filter if specified
      if (this.startYear && this.endYear) {
        query += '&and(ge(collection_year,' + this.startYear + '),le(collection_year,' + this.endYear + '))';
      }
      
      // Request facet on collection_year
      return query + '&facet((field,collection_year),(mincount,1),(sort,index))&limit(1)';
    },
    
    processData: function (response) {
      this.chart.hideLoading();
      
      if (!response || !response.facet_counts || !response.facet_counts.facet_fields) {
        this.handleError({ message: 'No facet data received' });
        return;
      }
      
      var yearData = response.facet_counts.facet_fields.collection_year || {};
      var years = [];
      var counts = [];
      
      // Convert object to arrays and sort by year
      Object.keys(yearData).forEach(function (year) {
        if (year && year !== 'null' && year !== '') {
          years.push(year);
          counts.push(yearData[year]);
        }
      });
      
      // Sort by year
      var sortedData = years.map(function (year, i) {
        return { year: parseInt(year), count: counts[i] };
      }).sort(function (a, b) {
        return a.year - b.year;
      });
      
      years = sortedData.map(function (d) { return d.year.toString(); });
      counts = sortedData.map(function (d) { return d.count; });
      
      // Calculate statistics
      var total = counts.reduce(function (sum, count) { return sum + count; }, 0);
      var average = total / counts.length;
      
      this.updateChart({
        title: {
          text: 'Genome Collection Timeline',
          subtext: 'Total: ' + total.toLocaleString() + ' genomes',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          formatter: function (params) {
            var param = params[0];
            return '<b>' + param.name + '</b><br/>' +
                   'Genomes: ' + param.value.toLocaleString();
          }
        },
        xAxis: {
          data: years
        },
        series: [{
          name: 'Genomes',
          data: counts,
          markLine: {
            silent: true,
            data: [{
              type: 'average',
              name: 'Average',
              label: {
                formatter: 'Avg: {c}'
              }
            }]
          },
          markPoint: {
            data: [
              { type: 'max', name: 'Peak Year' },
              { type: 'min', name: 'Min Year' }
            ]
          }
        }]
      });
      
      // Set up click handler for drilling down
      this.chart.on('click', lang.hitch(this, function (params) {
        if (params.componentType === 'series') {
          var year = years[params.dataIndex];
          this.onYearClick(year);
        }
      }));
    },
    
    onYearClick: function (year) {
      // Emit event for year selection
      this.emit('year-selected', {
        year: year,
        query: this.query + '&eq(collection_year,' + year + ')'
      });
    }
  });
});