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
        text: 'Phylogenetic Distribution',
        left: 'center'
      }
    },
    
    buildFacetQuery: function () {
      // Request facets on lineage and clade fields
      return this.query + '&facet((field,lineage),(mincount,1),(limit,100))' +
                         '&facet((field,clade),(mincount,1),(limit,100))' +
                         '&facet((field,strain),(mincount,1),(limit,200))' +
                         '&limit(1)';
    },
    
    processData: function (response) {
      this.chart.hideLoading();
      
      if (!response || !response.facet_counts || !response.facet_counts.facet_fields) {
        this.handleError({ message: 'No facet data received' });
        return;
      }
      
      var lineageData = response.facet_counts.facet_fields.lineage || {};
      var cladeData = response.facet_counts.facet_fields.clade || {};
      var strainData = response.facet_counts.facet_fields.strain || {};
      
      // Build hierarchical structure for treemap
      var treemapData = this.buildTreemapData(lineageData, cladeData, strainData);
      
      this.renderTreemap(treemapData);
    },
    
    buildTreemapData: function (lineageData, cladeData, strainData) {
      var root = {
        name: 'All Lineages',
        children: []
      };
      
      var totalCount = 0;
      
      // Process lineage data as top level
      Object.keys(lineageData).forEach(function (lineage) {
        if (lineage && lineage !== 'null' && lineage !== '') {
          var lineageNode = {
            name: lineage,
            value: lineageData[lineage],
            children: []
          };
          
          totalCount += lineageData[lineage];
          
          // Add clades as children of lineages
          Object.keys(cladeData).forEach(function (clade) {
            if (clade && clade !== 'null' && clade !== '') {
              // Simple heuristic: if clade name contains part of lineage name
              if (clade.toLowerCase().indexOf(lineage.toLowerCase()) !== -1 ||
                  lineage.toLowerCase().indexOf(clade.toLowerCase()) !== -1) {
                lineageNode.children.push({
                  name: clade,
                  value: cladeData[clade]
                });
              }
            }
          });
          
          // If no clades found, look for strains
          if (lineageNode.children.length === 0) {
            var strainChildren = [];
            Object.keys(strainData).forEach(function (strain) {
              if (strain && strain !== 'null' && strain !== '') {
                // Check if strain belongs to this lineage
                if (strain.toLowerCase().indexOf(lineage.toLowerCase()) !== -1) {
                  strainChildren.push({
                    name: strain,
                    value: strainData[strain]
                  });
                }
              }
            });
            
            // Add top 10 strains
            strainChildren.sort(function (a, b) { return b.value - a.value; });
            lineageNode.children = strainChildren.slice(0, 10);
          }
          
          // Only add lineages with significant counts
          if (lineageData[lineage] > 10) {
            root.children.push(lineageNode);
          }
        }
      });
      
      // Sort by value
      root.children.sort(function (a, b) {
        return b.value - a.value;
      });
      
      // Keep top lineages
      root.children = root.children.slice(0, 20);
      root.value = totalCount;
      
      return root;
    },
    
    renderTreemap: function (data) {
      var total = data.value || 0;
      
      this.updateChart({
        title: {
          text: 'Phylogenetic Distribution',
          subtext: 'Total: ' + total.toLocaleString() + ' genomes',
          left: 'center'
        },
        tooltip: {
          trigger: 'item',
          formatter: function (params) {
            var percentage = total > 0 ? ((params.value / total) * 100).toFixed(1) : 0;
            var path = params.treePathInfo.map(function (node) {
              return node.name;
            }).join(' → ');
            
            return '<b>' + path + '</b><br/>' +
                   'Genomes: ' + params.value.toLocaleString() + '<br/>' +
                   'Percentage: ' + percentage + '%';
          }
        },
        series: [{
          type: 'treemap',
          data: data.children,
          leafDepth: 2,
          roam: 'move',
          breadcrumb: {
            show: true,
            itemStyle: {
              textStyle: {
                fontSize: 12
              }
            }
          },
          levels: [
            {
              itemStyle: {
                borderColor: '#777',
                borderWidth: 4,
                gapWidth: 4
              },
              upperLabel: {
                show: true,
                height: 30,
                textStyle: {
                  fontSize: 14,
                  fontWeight: 'bold'
                }
              }
            },
            {
              itemStyle: {
                borderColor: '#555',
                borderWidth: 2,
                gapWidth: 2
              },
              upperLabel: {
                show: true,
                height: 20,
                textStyle: {
                  fontSize: 12
                }
              }
            },
            {
              itemStyle: {
                borderColor: '#333',
                borderWidth: 1,
                gapWidth: 1
              },
              label: {
                fontSize: 10
              }
            }
          ],
          label: {
            show: true,
            formatter: function (params) {
              return params.name + '\n' + params.value.toLocaleString();
            }
          },
          itemStyle: {
            borderRadius: 4
          },
          visibleMin: 100,
          childrenVisibleMin: 10
        }]
      });
      
      // Set up click handler
      this.chart.on('click', lang.hitch(this, function (params) {
        this.onLineageClick(params);
      }));
    },
    
    onLineageClick: function (params) {
      var field = 'lineage';
      var value = params.name;
      
      // Determine which field to use based on tree depth
      if (params.treePathInfo && params.treePathInfo.length > 2) {
        // Clicked on a clade or strain
        if (params.data.children && params.data.children.length > 0) {
          field = 'clade';
        } else {
          field = 'strain';
        }
      }
      
      // Emit event for lineage selection
      this.emit('lineage-selected', {
        lineage: value,
        field: field,
        path: params.treePathInfo,
        query: this.query + '&eq(' + field + ',"' + encodeURIComponent(value) + '")'
      });
    }
  });
});