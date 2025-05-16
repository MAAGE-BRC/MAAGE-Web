define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/dom-class', 'dojo/dom-style', 'dojo/on', 'dojo/dom-geometry',
  'dojo/topic', 'dojo/aspect',
  '../util/PathJoin', 'dgrid/Grid',
  './SummaryWidget',
  'dojo/text!./templates/ECDoughnut.html',
  'bvbrc_js_client/dist/bvbrc_client' // Import BV-BRC JS client
], function (
  declare, lang,
  domClass, domStyle, on, domGeom,
  Topic, aspect,
  PathJoin, Grid,
  SummaryWidget,
  Template,
  BVBRCClient  // Now available as a module
) {
  return declare([SummaryWidget], {
    baseClass: 'ECDoughnut',
    dataModel: 'genome',
    query: '',
    baseQuery: '',
    chartTitle: 'Isolation Sources',
    maxSlices: 10,
    facetField: 'isolation_source',
    templateString: Template,
    _chartInitialized: false,
    
    // Client instance - can be shared across components
    _client: null,
    
    postCreate: function() {
      this.inherited(arguments);
      
      // Initialize the client - use the configured API URL
      this._client = new BVBRCClient();
      this._client.init(this.apiServiceUrl);
      
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
      
      // Create the faceted query
      const facetQuery = `${this.query}&facet((field,${this.facetField}),(mincount,1))${this.baseQuery}`;
      
      // Use the client to execute the query
      return this._client.query(this.dataModel, facetQuery, {
        accept: 'application/solr+json'  // Use Solr JSON format for facets
      }).then(lang.hitch(this, 'processData'));
    },
    
    processData: function(results) {
      // Check if we got facets in the results
      if (!results?.facet_counts?.facet_fields?.[this.facetField]) {
        domClass.remove(this.loadingNode, 'hidden');
        this.loadingNode.innerHTML = 'No data available';
        return;
      }
      
      const facets = results.facet_counts.facet_fields[this.facetField];
      
      // Convert flat SOLR facet format to array of objects
      let data = Object.entries(facets)
        .filter(([key]) => key)
        .map(([key, count]) => ({
          name: key || 'Unknown',
          value: count,
          link: `#view_tab=genomes&filter=eq(${this.facetField},${encodeURIComponent(key)})`
        }))
        .sort((a, b) => b.value - a.value);
      
      let chartData = data.slice(0, this.maxSlices);
      let othersCount = 0;
      
      // Group smaller slices as "Others"
      if (data.length > this.maxSlices) {
        othersCount = data.slice(this.maxSlices).reduce((sum, item) => sum + item.value, 0);
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
        this.chart.setOption({
          tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
          },
          legend: {
            type: 'scroll',
            orient: 'vertical',
            right: 10,
            top: 20,
            bottom: 20,
            itemWidth: 15,
            itemHeight: 10,
            textStyle: {
              width: 100,
              overflow: 'truncate',
              ellipsis: '...'
            },
            pageButtonPosition: 'end',
            pageButtonItemGap: 5,
            pageIconSize: 12,
            pageTextStyle: {
              fontSize: 12
            }
          },
          series: [{
            name: this.chartTitle || "",
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: true,
            itemStyle: {
              borderRadius: 4,
              borderColor: '#fff',
              borderWidth: 2
            },
            label: { show: false },
            emphasis: {
              label: {
                show: true,
                fontSize: '14',
                fontWeight: 'bold'
              }
            },
            data: this._chartData.map(item => ({
              value: item.value,
              name: item.name
            }))
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