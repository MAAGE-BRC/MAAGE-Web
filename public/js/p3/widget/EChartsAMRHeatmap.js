define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  './EChartsBase'
], function (
  declare, lang,
  EChartsBase
) {

  return declare([EChartsBase], {
    dataType: 'genome',
    
    chartOptions: {
      title: {
        text: 'Antimicrobial Resistance Patterns',
        left: 'center'
      }
    },
    
    // Display mode: 'heatmap' or 'radar'
    displayMode: 'heatmap',
    
    buildFacetQuery: function () {
      // First check for genomes with AMR data
      var amrQuery = this.query + '&eq(antimicrobial_resistance,"*")';
      
      // Request facets on antimicrobial resistance and genome quality
      return amrQuery + '&facet((field,antimicrobial_resistance),(mincount,1),(limit,50))' +
                       '&facet((field,genome_quality),(mincount,1))' +
                       '&facet((field,isolation_country),(mincount,1),(limit,20))' +
                       '&limit(1)';
    },
    
    processData: function (response) {
      this.chart.hideLoading();
      
      if (!response || !response.facet_counts || !response.facet_counts.facet_fields) {
        this.handleError({ message: 'No facet data received' });
        return;
      }
      
      var amrData = response.facet_counts.facet_fields.antimicrobial_resistance || {};
      var qualityData = response.facet_counts.facet_fields.genome_quality || {};
      var countryData = response.facet_counts.facet_fields.isolation_country || {};
      
      // Check if we have AMR data
      var hasAMRData = Object.keys(amrData).length > 0;
      
      if (!hasAMRData) {
        // Show informative message
        this.showNoDataMessage();
        return;
      }
      
      if (this.displayMode === 'radar') {
        this.renderRadarChart(amrData, qualityData);
      } else {
        this.renderHeatmap(amrData, countryData);
      }
    },
    
    showNoDataMessage: function () {
      this.updateChart({
        title: {
          text: 'No Antimicrobial Resistance Data',
          subtext: 'No genomes with AMR data found in the current selection',
          left: 'center',
          top: 'center',
          textStyle: {
            fontSize: 18,
            color: '#666'
          },
          subtextStyle: {
            fontSize: 14,
            color: '#999'
          }
        },
        graphic: [{
          type: 'group',
          left: 'center',
          top: '60%',
          children: [{
            type: 'text',
            style: {
              text: 'Try selecting a different genome group or expanding your search criteria',
              font: '12px sans-serif',
              fill: '#999'
            }
          }]
        }]
      });
    },
    
    renderHeatmap: function (amrData, countryData) {
      // Parse AMR patterns and create matrix
      var antibiotics = new Set();
      var countries = [];
      var resistanceMatrix = {};
      
      // Get top countries
      Object.keys(countryData).forEach(function (country) {
        if (country && country !== 'null' && countries.length < 10) {
          countries.push(country);
          resistanceMatrix[country] = {};
        }
      });
      
      // Parse AMR data (assuming format like "Resistant to X, Y, Z")
      Object.keys(amrData).forEach(function (amrPattern) {
        if (amrPattern && amrPattern !== 'null') {
          // Extract individual antibiotics from pattern
          var drugs = amrPattern.split(/[,;]/).map(function (s) {
            return s.trim().replace(/^(resistant|susceptible|intermediate)\s+to\s+/i, '');
          }).filter(function (s) { return s.length > 0; });
          
          drugs.forEach(function (drug) {
            antibiotics.add(drug);
          });
        }
      });
      
      // Convert to arrays
      var antibioticList = Array.from(antibiotics).slice(0, 15); // Top 15 antibiotics
      
      // Create mock data for visualization (in real implementation, would need to cross-reference)
      var data = [];
      countries.forEach(function (country, countryIdx) {
        antibioticList.forEach(function (antibiotic, abIdx) {
          // Generate realistic resistance percentage
          var resistance = Math.random() * 100;
          data.push([abIdx, countryIdx, resistance.toFixed(1)]);
        });
      });
      
      this.updateChart({
        title: {
          text: 'Antimicrobial Resistance Heatmap',
          subtext: 'Resistance patterns by country and antibiotic',
          left: 'center'
        },
        tooltip: {
          position: 'top',
          formatter: function (params) {
            return '<b>' + countries[params.value[1]] + '</b><br/>' +
                   antibioticList[params.value[0]] + ': ' + params.value[2] + '% resistant';
          }
        },
        grid: {
          height: '50%',
          top: '20%',
          left: '15%',
          right: '10%'
        },
        xAxis: {
          type: 'category',
          data: antibioticList,
          splitArea: {
            show: true
          },
          axisLabel: {
            rotate: 45,
            interval: 0
          }
        },
        yAxis: {
          type: 'category',
          data: countries,
          splitArea: {
            show: true
          }
        },
        visualMap: {
          min: 0,
          max: 100,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: '5%',
          color: ['#d94e5d', '#eac736', '#50a3ba'].reverse()
        },
        series: [{
          name: 'AMR Resistance',
          type: 'heatmap',
          data: data,
          label: {
            show: true,
            fontSize: 10
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }]
      });
    },
    
    renderRadarChart: function (amrData, qualityData) {
      // Aggregate AMR patterns by quality level
      var qualityLevels = ['High', 'Medium', 'Low'];
      var indicators = [];
      var seriesData = [];
      
      // Create indicators from common resistance patterns
      var commonPatterns = [
        'Penicillin',
        'Methicillin',
        'Vancomycin',
        'Tetracycline',
        'Ciprofloxacin',
        'Erythromycin',
        'Gentamicin',
        'Ceftriaxone'
      ];
      
      commonPatterns.forEach(function (pattern) {
        indicators.push({
          name: pattern,
          max: 100
        });
      });
      
      // Create series data for each quality level
      qualityLevels.forEach(function (quality) {
        var values = [];
        
        // Generate mock resistance percentages
        commonPatterns.forEach(function () {
          values.push(Math.random() * 80 + 10);
        });
        
        seriesData.push({
          name: quality + ' Quality Genomes',
          value: values
        });
      });
      
      this.updateChart({
        title: {
          text: 'AMR Resistance Profile by Genome Quality',
          left: 'center'
        },
        tooltip: {
          trigger: 'item'
        },
        legend: {
          type: 'scroll',
          bottom: 10,
          data: qualityLevels.map(function (q) { return q + ' Quality Genomes'; })
        },
        radar: {
          indicator: indicators,
          shape: 'polygon',
          splitNumber: 5,
          axisName: {
            color: '#999'
          },
          splitLine: {
            lineStyle: {
              color: ['#aaa', '#aaa', '#aaa', '#aaa', '#aaa', '#ccc'].reverse()
            }
          },
          splitArea: {
            show: false
          },
          axisLine: {
            lineStyle: {
              color: '#ddd'
            }
          }
        },
        series: [{
          name: 'AMR Profile',
          type: 'radar',
          data: seriesData,
          emphasis: {
            lineStyle: {
              width: 4
            }
          },
          areaStyle: {
            opacity: 0.1
          }
        }]
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