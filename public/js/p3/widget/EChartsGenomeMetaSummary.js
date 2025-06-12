define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/dom-construct', 'dojo/dom-style', 'dojo/on', 'dojo/topic',
  '../DataAPI',
  './SummaryWidget',
  'echarts/echarts'
], function (
  declare, lang,
  domConstruct, domStyle, on, Topic,
  DataAPI,
  SummaryWidget,
  echarts
) {

  var categoryName = {
    host_group: 'Host',
    isolation_country: 'Isolation Country',
    collection_year: 'Collection Year'
  };

  return declare([SummaryWidget], {
    dataModel: 'genome',
    query: '',
    baseQuery: '&limit(1)',
    echartsInstance: null,
    
    columns: [{
      label: 'Metadata Category',
      field: 'category',
      renderCell: function (obj, val, node) {
        node.innerHTML = categoryName[val];
      }
    }, {
      label: '',
      field: 'value',
      renderCell: function (obj, val, node) {
        node.innerHTML = val.map(function (d) {
          return '<a href="' + d.link + '">' + d.label + ' (' + d.count + ')</a>';
        }).join('<br/>');
      }
    }],
    
    onSetQuery: function (attr, oldVal, query) {
      return DataAPI.query('genome',
        `${this.query}&facet((field,host_group),(field,isolation_country),(field,collection_year),(mincount,1))${this.baseQuery}`,
        {
          accept: 'application/solr+json'
        })
        .then((res) => {
          const facets = res.facet_counts.facet_fields;
          return this.processData(facets)
        })
    },
    
    processData: function (results) {
      // Process data for table view
      this._tableData = Object.keys(results).map(function (cat) {
        var categories = [];
        var others = { count: 0 };
        var sorted = Object.entries(results[cat]).sort(([, a], [, b]) => b - a)
        sorted.forEach(function ([label, val]) {
          if (label) {
            if (categories.length < 4) {
              categories.push({
                label: label,
                count: val,
                link: `#view_tab=genomes&filter=eq(${cat},${encodeURIComponent(label)})`
              });
            }
            others.count += val;
          }
        });
        if (others.count > 0) {
          others.label = 'See all genomes with ' + categoryName[cat];
          others.link = '#view_tab=genomes&filter=eq(' + cat + ',*)';
          categories.push(others);
        }
        return { category: cat, value: categories };
      });

      // Process data for charts
      var chartData = {};
      Object.keys(results).forEach(function (cat) {
        var categories = [];
        var othersCount = 0;
        var sorted = Object.entries(results[cat]).sort(([, a], [, b]) => b - a)
        sorted.forEach(function ([label, val]) {
          if (label) {
            if (categories.length < 4) {
              categories.push({
                name: label,
                value: val,
                link: `#view_tab=genomes&filter=eq(${cat},${encodeURIComponent(label)})`
              });
            } else {
              othersCount += val;
            }
          }
        });
        if (othersCount > 0) {
          categories.push({
            name: 'Others',
            value: othersCount,
            link: '#view_tab=genomes&filter=eq(' + cat + ',*)'
          });
        }
        chartData[cat] = categories;
      });

      this.set('data', chartData);
    },

    render_chart: function () {
      var self = this;
      
      // Clear existing content
      domConstruct.empty(this.chartNode);
      
      // Create container divs for each chart
      var chartConfigs = [
        { id: 'host_chart', title: 'Host', field: 'host_group' },
        { id: 'isolation_country_chart', title: 'Isolation Country', field: 'isolation_country' },
        { id: 'collection_year_chart', title: 'Collection Year', field: 'collection_year' }
      ];
      
      // Check if echarts is available
      if (!echarts || typeof echarts.init !== 'function') {
        // If ECharts is not loaded, create a placeholder
        domConstruct.create('div', {
          innerHTML: 'ECharts library not loaded. Please include echarts in your page.',
          style: 'padding: 20px; color: #666;'
        }, this.chartNode);
        return;
      }
      
      chartConfigs.forEach(lang.hitch(this, function (config) {
        var chartContainer = domConstruct.create('div', {
          style: 'width: 300px; height: 300px; display: inline-block; margin: 10px;'
        }, this.chartNode);
        
        var chart = echarts.init(chartContainer, 'maage');
        
        var data = this.data[config.field] || [];
        
        if (data.length === 0) {
          domStyle.set(chartContainer, 'display', 'none');
          return;
        }
        
        var option = {
          title: {
            text: config.title,
            left: 'center',
            textStyle: {
              fontSize: 14,
              fontWeight: 'bold'
            }
          },
          tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)'
          },
          series: [{
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
                fontSize: '16',
                fontWeight: 'bold'
              }
            },
            labelLine: {
              show: false
            },
            data: data
          }]
        };
        
        chart.setOption(option);
        
        // Handle click events
        chart.on('click', function (params) {
          var item = params.data;
          if (item.link) {
            var baseUrl = location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '');
            var url = (window.location.href).split(baseUrl)[1].replace(window.location.hash, item.link);
            Topic.publish('/navigate', { href: url });
          }
        });
        
        // Make chart responsive
        on(window, 'resize', function () {
          chart.resize();
        });
      }));
    },

    render_table: function () {
      this.inherited(arguments);
      this.grid.refresh();
      this.grid.renderArray(this._tableData);
    }
  });
});