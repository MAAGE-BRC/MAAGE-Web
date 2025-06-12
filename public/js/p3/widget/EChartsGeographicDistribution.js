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
        text: 'Geographic Distribution',
        left: 'center'
      }
    },
    
    // Chart display mode: 'bar', 'pie', or 'map'
    displayMode: 'bar',
    
    // Maximum number of countries to show (others grouped as "Others")
    maxCountries: 15,
    
    buildFacetQuery: function () {
      // Request facet on isolation_country
      return this.query + '&facet((field,isolation_country),(mincount,1),(limit,100))&limit(1)';
    },
    
    processData: function (response) {
      this.chart.hideLoading();
      
      if (!response || !response.facet_counts || !response.facet_counts.facet_fields) {
        this.handleError({ message: 'No facet data received' });
        return;
      }
      
      var countryData = response.facet_counts.facet_fields.isolation_country || {};
      var countries = [];
      var counts = [];
      
      // Convert to array and sort by count
      Object.keys(countryData).forEach(function (country) {
        if (country && country !== 'null' && country !== '') {
          countries.push({
            name: country,
            value: countryData[country]
          });
        }
      });
      
      // Sort by count (descending)
      countries.sort(function (a, b) {
        return b.value - a.value;
      });
      
      // Group small countries as "Others" if needed
      var topCountries = countries.slice(0, this.maxCountries);
      var othersCount = 0;
      
      if (countries.length > this.maxCountries) {
        for (var i = this.maxCountries; i < countries.length; i++) {
          othersCount += countries[i].value;
        }
        if (othersCount > 0) {
          topCountries.push({
            name: 'Others',
            value: othersCount
          });
        }
      }
      
      // Calculate total
      var total = topCountries.reduce(function (sum, country) {
        return sum + country.value;
      }, 0);
      
      if (this.displayMode === 'pie') {
        this.renderPieChart(topCountries, total);
      } else {
        this.renderBarChart(topCountries, total);
      }
    },
    
    renderBarChart: function (countries, total) {
      var names = countries.map(function (c) { return c.name; });
      var values = countries.map(function (c) { return c.value; });
      
      this.updateChart({
        title: {
          text: 'Geographic Distribution',
          subtext: 'Total: ' + total.toLocaleString() + ' genomes from ' + (countries.length - (countries[countries.length-1].name === 'Others' ? 1 : 0)) + ' countries',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          formatter: function (params) {
            var param = params[0];
            var percentage = ((param.value / total) * 100).toFixed(1);
            return '<b>' + param.name + '</b><br/>' +
                   'Genomes: ' + param.value.toLocaleString() + '<br/>' +
                   'Percentage: ' + percentage + '%';
          }
        },
        xAxis: {
          type: 'category',
          data: names,
          axisLabel: {
            rotate: 45,
            interval: 0
          }
        },
        yAxis: {
          type: 'value',
          name: 'Number of Genomes'
        },
        series: [{
          name: 'Genomes',
          type: 'bar',
          data: values,
          itemStyle: {
            borderRadius: [4, 4, 0, 0]
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }],
        grid: {
          bottom: 100
        }
      });
      
      // Set up click handler
      this.chart.on('click', lang.hitch(this, function (params) {
        if (params.componentType === 'series' && params.name !== 'Others') {
          this.onCountryClick(params.name);
        }
      }));
    },
    
    renderPieChart: function (countries, total) {
      this.updateChart({
        title: {
          text: 'Geographic Distribution',
          subtext: 'Total: ' + total.toLocaleString() + ' genomes',
          left: 'center'
        },
        tooltip: {
          trigger: 'item',
          formatter: function (params) {
            return '<b>' + params.name + '</b><br/>' +
                   'Genomes: ' + params.value.toLocaleString() + '<br/>' +
                   'Percentage: ' + params.percent + '%';
          }
        },
        legend: {
          type: 'scroll',
          orient: 'vertical',
          right: 10,
          top: 20,
          bottom: 20
        },
        series: [{
          name: 'Countries',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['40%', '50%'],
          data: countries,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          label: {
            show: false,
            position: 'center'
          },
          labelLine: {
            show: false
          }
        }]
      });
      
      // Set up click handler
      this.chart.on('click', lang.hitch(this, function (params) {
        if (params.name !== 'Others') {
          this.onCountryClick(params.name);
        }
      }));
    },
    
    onCountryClick: function (country) {
      // Emit event for country selection
      this.emit('country-selected', {
        country: country,
        query: this.query + '&eq(isolation_country,"' + encodeURIComponent(country) + '")'
      });
    },
    
    setDisplayMode: function (mode) {
      this.displayMode = mode;
      if (this._started) {
        this.loadData();
      }
    }
  });
});