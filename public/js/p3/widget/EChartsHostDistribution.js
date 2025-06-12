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
        text: 'Host Distribution',
        left: 'center'
      }
    },
    
    // Chart display mode: 'sunburst', 'treemap', or 'bar'
    displayMode: 'sunburst',
    
    buildFacetQuery: function () {
      // Request facets on both host_group and host_name for hierarchical view
      return this.query + '&facet((field,host_group),(mincount,1),(limit,50))' +
                         '&facet((field,host_name),(mincount,1),(limit,200))' +
                         '&limit(1)';
    },
    
    processData: function (response) {
      this.chart.hideLoading();
      
      if (!response || !response.facet_counts || !response.facet_counts.facet_fields) {
        this.handleError({ message: 'No facet data received' });
        return;
      }
      
      var hostGroupData = response.facet_counts.facet_fields.host_group || {};
      var hostNameData = response.facet_counts.facet_fields.host_name || {};
      
      // Process data based on display mode
      if (this.displayMode === 'bar') {
        this.renderBarChart(hostGroupData);
      } else {
        this.renderHierarchicalChart(hostGroupData, hostNameData);
      }
    },
    
    renderBarChart: function (hostGroupData) {
      var hosts = [];
      
      // Convert to array and sort
      Object.keys(hostGroupData).forEach(function (host) {
        if (host && host !== 'null' && host !== '') {
          hosts.push({
            name: host,
            value: hostGroupData[host]
          });
        }
      });
      
      // Sort by count
      hosts.sort(function (a, b) {
        return b.value - a.value;
      });
      
      var names = hosts.map(function (h) { return h.name; });
      var values = hosts.map(function (h) { return h.value; });
      var total = values.reduce(function (sum, val) { return sum + val; }, 0);
      
      this.updateChart({
        title: {
          text: 'Host Distribution',
          subtext: 'Total: ' + total.toLocaleString() + ' genomes from ' + hosts.length + ' host groups',
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
          }
        }],
        grid: {
          bottom: 100
        }
      });
    },
    
    renderHierarchicalChart: function (hostGroupData, hostNameData) {
      // Map host names to their groups (simplified mapping)
      var hostGroupMap = {
        'Human': ['Homo sapiens', 'Human'],
        'Environment': ['Environmental', 'Water', 'Soil', 'Air', 'Wastewater'],
        'Bacteria': ['Escherichia coli', 'Salmonella', 'Staphylococcus', 'Streptococcus'],
        'Plant': ['Arabidopsis', 'Oryza sativa', 'Zea mays', 'Triticum'],
        'Animal': ['Mus musculus', 'Rattus', 'Bos taurus', 'Sus scrofa', 'Gallus gallus']
      };
      
      // Build hierarchical data
      var rootChildren = [];
      var totalCount = 0;
      
      Object.keys(hostGroupData).forEach(function (group) {
        if (group && group !== 'null' && group !== '') {
          var groupCount = hostGroupData[group];
          totalCount += groupCount;
          
          var children = [];
          
          // Find specific hosts for this group
          Object.keys(hostNameData).forEach(function (hostName) {
            if (hostName && hostName !== 'null') {
              // Check if this host belongs to the current group
              var belongsToGroup = false;
              if (hostGroupMap[group]) {
                belongsToGroup = hostGroupMap[group].some(function (pattern) {
                  return hostName.toLowerCase().indexOf(pattern.toLowerCase()) !== -1;
                });
              } else {
                // Default mapping based on common patterns
                belongsToGroup = hostName.toLowerCase().indexOf(group.toLowerCase()) !== -1;
              }
              
              if (belongsToGroup) {
                children.push({
                  name: hostName,
                  value: hostNameData[hostName]
                });
              }
            }
          });
          
          // Sort children by value
          children.sort(function (a, b) {
            return b.value - a.value;
          });
          
          // Limit to top 10 per group
          children = children.slice(0, 10);
          
          rootChildren.push({
            name: group,
            value: groupCount,
            children: children.length > 0 ? children : undefined
          });
        }
      });
      
      // Sort groups by value
      rootChildren.sort(function (a, b) {
        return b.value - a.value;
      });
      
      var hierarchicalData = {
        name: 'All Hosts',
        value: totalCount,
        children: rootChildren
      };
      
      if (this.displayMode === 'sunburst') {
        this.renderSunburst(hierarchicalData, totalCount);
      } else {
        this.renderTreemap(hierarchicalData, totalCount);
      }
    },
    
    renderSunburst: function (data, total) {
      this.updateChart({
        title: {
          text: 'Host Distribution',
          subtext: 'Total: ' + total.toLocaleString() + ' genomes',
          left: 'center'
        },
        tooltip: {
          trigger: 'item',
          formatter: function (params) {
            var percentage = ((params.value / total) * 100).toFixed(1);
            return '<b>' + params.name + '</b><br/>' +
                   'Genomes: ' + params.value.toLocaleString() + '<br/>' +
                   'Percentage: ' + percentage + '%';
          }
        },
        series: [{
          type: 'sunburst',
          data: data.children,
          radius: [0, '90%'],
          label: {
            rotate: 'radial'
          },
          emphasis: {
            focus: 'ancestor'
          },
          levels: [{}, {
            r0: '15%',
            r: '35%',
            itemStyle: {
              borderWidth: 2
            },
            label: {
              rotate: 'tangential'
            }
          }, {
            r0: '35%',
            r: '70%',
            label: {
              align: 'right'
            }
          }]
        }]
      });
      
      // Set up click handler
      this.chart.on('click', lang.hitch(this, function (params) {
        this.onHostClick(params.name, params.treePathInfo);
      }));
    },
    
    renderTreemap: function (data, total) {
      this.updateChart({
        title: {
          text: 'Host Distribution',
          subtext: 'Total: ' + total.toLocaleString() + ' genomes',
          left: 'center'
        },
        tooltip: {
          trigger: 'item',
          formatter: function (params) {
            var percentage = ((params.value / total) * 100).toFixed(1);
            return '<b>' + params.name + '</b><br/>' +
                   'Genomes: ' + params.value.toLocaleString() + '<br/>' +
                   'Percentage: ' + percentage + '%';
          }
        },
        series: [{
          type: 'treemap',
          data: data.children,
          leafDepth: 2,
          roam: false,
          breadcrumb: {
            show: true
          },
          levels: [
            {
              itemStyle: {
                borderColor: '#777',
                borderWidth: 4,
                gapWidth: 2
              }
            },
            {
              itemStyle: {
                borderColor: '#555',
                borderWidth: 2,
                gapWidth: 1
              }
            }
          ]
        }]
      });
      
      // Set up click handler
      this.chart.on('click', lang.hitch(this, function (params) {
        this.onHostClick(params.name, params.treePathInfo);
      }));
    },
    
    onHostClick: function (hostName, treePathInfo) {
      // Determine query field based on hierarchy level
      var field = 'host_name';
      if (treePathInfo && treePathInfo.length === 2) {
        // Clicked on a host group
        field = 'host_group';
      }
      
      // Emit event for host selection
      this.emit('host-selected', {
        host: hostName,
        field: field,
        query: this.query + '&eq(' + field + ',"' + encodeURIComponent(hostName) + '")'
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