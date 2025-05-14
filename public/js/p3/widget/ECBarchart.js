define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/dom-class', 'dojo/dom-style', 'dojo/on', 'dojo/dom-geometry',
  'dojo/topic', 'dojo/request', 'dojo/aspect',
  '../util/PathJoin', 'dgrid/Grid',
  './SummaryWidget',
  'dojo/text!./templates/ECBarchart.html'
], function (
  declare, lang,
  domClass, domStyle, on, domGeom,
  Topic, xhr, aspect,
  PathJoin, Grid,
  SummaryWidget,
  Template
) {
  return declare([SummaryWidget], {
    baseClass: 'ECBarchart',
    dataModel: 'genome',
    query: '',
    baseQuery: '&limit(1)&json(nl,map)',
    chartTitle: 'Distribution',
    maxBars: 15,
    facetField: 'isolation_source',
    sortByCount: true, // Set to false to sort by name
    templateString: Template,
    _chartInitialized: false,
    
    postCreate: function() {
      this.inherited(arguments);
      if (this.chartTitle) {
        this.chartTitleNode.innerHTML = this.chartTitle;
      }
      
      // Safely handle resize
      this._resizeHandler = lang.hitch(this, function() {
        if (this.chart) this.chart.resize();
      });
      
      // Listen for container/widget resize
      aspect.after(this, "resize", this._resizeHandler);
    },

    startup: function() {
      this.inherited(arguments);
      
      // Add a short delay after startup to ensure container has dimensions
      setTimeout(lang.hitch(this, function() {
        if (this.data && !this._chartInitialized) {
          this._initChart();
        }
      }), 500);
    },

    onSetQuery: function(attr, oldVal, query) {
      if (!query) return;
      
      const facetQuery = `${this.query}&facet((field,${this.facetField}),(mincount,1))${this.baseQuery}`;
      
      return xhr.post(PathJoin(this.apiServiceUrl, this.dataModel) + '/', {
        handleAs: 'json',
        headers: this.headers,
        data: facetQuery
      }).then(lang.hitch(this, 'processData'));
    },
    
    processData: function(results) {
      if (!results?.facet_counts?.facet_fields?.[this.facetField]) {
        domClass.remove(this.loadingNode, 'hidden');
        this.loadingNode.innerHTML = 'No data available';
        return;
      }
      
      const facets = results.facet_counts.facet_fields[this.facetField];
      
      let data = Object.entries(facets)
        .filter(([key]) => key)
        .map(([key, count]) => ({
          name: key || 'Unknown',
          value: count,
          link: `#view_tab=genomes&filter=eq(${this.facetField},${encodeURIComponent(key)})`
        }));
        
      // Sort data
      if (this.sortByCount) {
        data.sort((a, b) => b.value - a.value);
      } else {
        data.sort((a, b) => a.name.localeCompare(b.name));
      }
      
      // Limit to max bars
      let chartData = data.slice(0, this.maxBars);
      let othersCount = 0;
      
      if (data.length > this.maxBars) {
        othersCount = data.slice(this.maxBars).reduce((sum, item) => sum + item.value, 0);
        if (othersCount > 0) {
          chartData.push({
            name: 'Others',
            value: othersCount,
            link: `#view_tab=genomes&filter=eq(${this.facetField},*)`
          });
        }
      }
      
      this._tableData = data;
      this._chartData = chartData;
      
      domClass.add(this.loadingNode, 'hidden');
      this.set('data', chartData);
    },
    
    onSetData: function(attr, oldVal, data) {
      this.inherited(arguments);
      
      // Initialize chart with delay to ensure container dimensions
      setTimeout(lang.hitch(this, function() {
        this._initChart();
      }), 100);
    },
    
    _initChart: function() {
      if (!window.echarts) {
        console.warn("ECharts is not available");
        return;
      }
      
      domStyle.set(this.chartNode, {
        display: 'block',
        height: '300px'
      });
      
      var box = domGeom.getContentBox(this.chartNode);
      if (box.w === 0 || box.h === 0) {
        console.warn("Chart container has no dimensions", box);
        return;
      }
      
      if (!this.chart) {
        try {
          this.chart = window.echarts.init(this.chartNode, 'maage');
          this._chartInitialized = true;
          
          // Add resize listener
          if (window.addEventListener) {
            window.addEventListener('resize', this._resizeHandler);
          }
          
          // Add click handler
          this.chart.on('click', 'series', lang.hitch(this, function(params) {
            if (params.dataIndex >= 0 && this._chartData && this._chartData[params.dataIndex]) {
              var item = this._chartData[params.dataIndex];
              if (item && item.link) {
                Topic.publish('/navigate', { href: item.link });
              }
            }
          }));
        } catch(e) {
          console.error("Error initializing chart", e);
          return;
        }
      }
      
      this.render_chart();
    },
    
    render_chart: function() {
      if (!this._chartData || this._chartData.length === 0) {
        this.chartNode.innerHTML = "No data available";
        return;
      }
      
      if (!this.chart) {
        this._initChart();
        return;
      }
      
      try {
        // Reverse data for better visual display in bars
        const names = this._chartData.map(item => item.name);
        const values = this._chartData.map(item => item.value);
        
        this.chart.setOption({
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'shadow'
            }
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
          },
          xAxis: {
            type: 'value',
            name: 'Count',
            nameLocation: 'middle',
            nameGap: 30
          },
          yAxis: {
            type: 'category',
            data: names,
            axisLabel: {
              interval: 0,
              rotate: 0,
              formatter: function (value) {
                // Truncate long names
                if (value.length > 20) {
                  return value.substring(0, 17) + '...';
                }
                return value;
              }
            }
          },
          series: [{
            name: "Count",
            type: 'bar',
            data: values,
            emphasis: {
              focus: 'series'
            },
            itemStyle: {
              borderRadius: [0, 4, 4, 0],
              borderWidth: 1,
              borderType: 'solid',
              borderColor: '#fff'
            },
            // Add label for each bar
            label: {
              show: true,
              position: 'right',
              formatter: '{c}'
            }
          }]
        });
        
        this.chart.resize();
      } catch(e) {
        console.error("Error rendering chart", e);
      }
    },
    
    render_table: function() {
      if (!this.grid) {
        const opts = {
          columns: [
            { field: 'name', label: this.facetField.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) },
            { field: 'value', label: 'Count' }
          ]
        };
        
        this.grid = new Grid(opts, this.tableNode);
        this.grid.startup();
      }
      
      this.grid.refresh();
      this.grid.renderArray(this._tableData);
    },
    
    resize: function(changeSize, resultSize) {
      this.inherited(arguments);
      
      setTimeout(lang.hitch(this, function() {
        if (this.chart) {
          this.chart.resize();
        }
      }), 50);
    },
    
    showChart: function() {
      domClass.add(this.tableNode, 'hidden');
      domClass.remove(this.chartNode, 'hidden');
      this.resize();
    },
    
    showTable: function() {
      domClass.remove(this.tableNode, 'hidden');
      domClass.add(this.chartNode, 'hidden');
      this.render_table();
    },
    
    destroy: function() {
      if (this._resizeHandler && window.removeEventListener) {
        window.removeEventListener('resize', this._resizeHandler);
        this._resizeHandler = null;
      }
      
      if (this.chart) {
        this.chart.dispose();
        this.chart = null;
      }
      
      this.inherited(arguments);
    }
  });
});