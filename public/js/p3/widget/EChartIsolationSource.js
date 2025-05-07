define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/dom-class', 'dojo/dom-construct', 'dojo/dom-style', 'dojo/on', 'dojo/topic',
  'dijit/_WidgetBase', 'dijit/_TemplatedMixin',
  '../DataAPI',
  'dojo/text!./templates/EChartIsolationSource.html'
], function (
  declare, lang,
  domClass, domConstruct, domStyle, on, Topic,
  WidgetBase, TemplatedMixin,
  DataAPI,
  Template
) {
  return declare([WidgetBase, TemplatedMixin], {
    baseClass: 'EChartIsolationSource',
    templateString: Template,
    apiServiceUrl: window.App.dataAPI,
    query: '',
    data: null,
    maxBars: 10, 

    postCreate: function() {
      this.inherited(arguments);
    },

    startup: function () {
      console.log("EChartIsolationSource startup");
      if (this._started) { 
        console.log("Widget already started, exiting startup");
        return; 
      }

      this.inherited(arguments);
      console.log("After inherited startup");

      if (!this.chartNode) {
        console.error("Chart node not available at startup");
      } else {
        console.log("Chart node found at startup with dimensions:", 
                   this.chartNode.offsetWidth, 
                   this.chartNode.offsetHeight);
      }

      this.resizeHandler = on(window, 'resize', lang.hitch(this, function () {
        console.log("Window resize detected");
        if (this.chart) {
          console.log("Resizing chart");
          this.chart.resize();
        }
      }));

      console.log("Setting initial render timer");
      this.initialRenderTimer = setTimeout(lang.hitch(this, function() {
        console.log("Initial render timer fired after 500ms");
        if (this.chartNode && this.chartNode.offsetWidth > 0 && this.chartNode.offsetHeight > 0) {
          console.log("chartNode has dimensions, initializing chart");
          this.initializeChart();
        } else {
          console.log("chartNode still has no dimensions, setting retry timer");

          this.retryTimer = setTimeout(lang.hitch(this, function() {
            console.log("First retry timer fired after 1000ms");
            if (this.chartNode && this.chartNode.offsetWidth > 0 && this.chartNode.offsetHeight > 0) {
              this.initializeChart();
            } else {

              console.log("Still no dimensions, setting second retry timer");
              this.secondRetryTimer = setTimeout(lang.hitch(this, function() {
                console.log("Second retry timer fired after 2000ms");
                this.initializeChart();
              }), 2000);
            }
          }), 1000);
        }
      }), 500);
    },

    initializeChart: function () {
      console.log("Starting chart initialization");
      if (!this.chartNode) {
        console.error("Chart node not found");
        return;
      }

      console.log("Chart container dimensions:", 
                 this.chartNode.offsetWidth, 
                 this.chartNode.offsetHeight,
                 "style:", this.chartNode.style.width, 
                 this.chartNode.style.height);

      var parentNode = this.chartNode.parentNode;
      if (parentNode) {
        console.log("Parent node found, setting explicit dimensions");
        domStyle.set(parentNode, {
          width: "100%",
          height: "400px",
          minWidth: "300px",
          minHeight: "400px"
        });
      }

      domStyle.set(this.chartNode, {
        width: "100%",
        height: "400px",
        minWidth: "300px", 
        minHeight: "400px"
      });

      console.log("After forcing dimensions:", 
                 this.chartNode.offsetWidth, 
                 this.chartNode.offsetHeight,
                 "style:", this.chartNode.style.width, 
                 this.chartNode.style.height);

      if (this.chartNode.offsetWidth <= 0 || this.chartNode.offsetHeight <= 0) {
        console.warn("Chart container still has no dimensions after forcing, delaying initialization");
        this.retryTimer = setTimeout(lang.hitch(this, function() {
          this.initializeChart();
        }), 500);
        return;
      }

      try {
        var dimensions = {
          width: (this.chartNode.offsetWidth || 300) + "px",
          height: (this.chartNode.offsetHeight || 400) + "px"
        };
        console.log("Setting final explicit dimensions:", dimensions);
        domStyle.set(this.chartNode, dimensions);

        if (typeof echarts === 'undefined') {
          console.error("ECharts library is not loaded");
          return;
        }

        if (!this.chart) {
          this.chart = echarts.init(this.chartNode);
        }

        var chartOptions = {
          title: {
            text: 'Genomes by Isolation Source',
            left: 'center',
            textStyle: {
              color: '#424242',
              fontWeight: 'bold',
              fontFamily: 'Poppins, sans-serif',
              fontSize: 16
            }
          },
          tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)'
          },
          legend: {
            orient: 'horizontal',
            left: 'center',
            bottom: 10,
            textStyle: {
              fontFamily: 'Inter, sans-serif'
            }
          },
          series: [{
            name: 'Isolation Source',
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            label: {
              show: true,
              position: 'outside',
              formatter: '{b}: {c} ({d}%)',
              fontFamily: 'Inter, sans-serif'
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 18,
                fontWeight: 'bold'
              }
            },
            labelLine: {
              show: true
            },
            data: [{ value: 0, name: 'Loading...' }],
            itemStyle: {
              borderRadius: 6,
              borderColor: '#fff',
              borderWidth: 2
            }
          }]
        };

        this.chart.setOption(chartOptions);

        this.chart.on('click', lang.hitch(this, function (params) {
          console.log("Pie slice clicked:", params);
        }));
      } catch (e) {
        console.error("Error initializing chart:", e);
      }

      if (this._pendingQuery) {
        console.log("Chart initialized, executing pending query");
        this.executeQuery(this._pendingQuery);
        this._pendingQuery = null;
      }
    },

    setLoading: function (isLoading) {
      if (isLoading) {
        domClass.remove(this.loadingNode, 'hidden');
      } else {
        domClass.add(this.loadingNode, 'hidden');
      }
    },

    _setQueryAttr: function (query) {
      this._set('query', query);
      this.setLoading(true);

      if (!query) {
        this.setLoading(false);
        return;
      }

      this._pendingQuery = query;

      if (!this.chart) {
        console.log("Chart not initialized yet, storing query for later");
        return;
      }

      this.executeQuery(query);
    },

    executeQuery: function(query) {
      console.log("Executing isolation source query:", query);

      return DataAPI.query('genome', 
        `${query}&facet((field,isolation_source),(mincount,1),(limit,${this.maxBars + 1}))&limit(1)`,
        { accept: 'application/solr+json' }
      ).then(lang.hitch(this, function (res) {
        console.log("Received API response for isolation source query");

        if (!res) {
          console.warn("Empty API response");
          this.handleEmptyData();
          return;
        }

        if (!res.facet_counts) {
          console.warn("No facet_counts in API response");
          this.handleEmptyData();
          return;
        }

        if (!res.facet_counts.facet_fields) {
          console.warn("No facet_fields in API response");
          this.handleEmptyData();
          return;
        }

        if (!res.facet_counts.facet_fields.isolation_source) {
          console.warn("No isolation_source field in API response facets");
          this.handleEmptyData();
          return;
        }

        const isolationSourceData = res.facet_counts.facet_fields.isolation_source;
        const entryCount = Object.keys(isolationSourceData).length;

        if (entryCount === 0) {
          console.warn("Isolation source data is empty");
          this.handleEmptyData();
          return;
        }

        console.log(`Found ${entryCount} isolation source entries`);

        this.processData(isolationSourceData);
      }))
      .catch(lang.hitch(this, function (err) {
        console.error("Error fetching isolation source data:", err);
        this.handleEmptyData();
      }));
    },

    handleEmptyData: function() {
      this.setLoading(false);

      if (this.chart) {
        console.log("Updating chart with 'No data available' message");
        this.chart.setOption({
          series: [{
            data: [{ value: 0, name: 'No data available' }]
          }]
        });
      }
    },

    processData: function (isolationSourceData) {
      console.log("Processing isolation source data");

      if (!this.chart) {
        console.error("Chart is not initialized yet, cannot process data");
        this.setLoading(false);
        return;
      }

      try {
        var pieData = [];
        var othersCount = 0;
        var maxBars = this.maxBars;

        for (var i = 0; i < isolationSourceData.length; i += 2) {
          var name = isolationSourceData[i];
          var value = isolationSourceData[i + 1];
          if (name === null || name === undefined || name === "") name = "Unknown";
          pieData.push({ name: String(name), value: value });
        }

        pieData.sort(function(a, b) { return b.value - a.value; });

        var displayData = [];
        for (var j = 0; j < pieData.length; j++) {
          if (j < maxBars) {
            displayData.push(pieData[j]);
          } else {
            othersCount += pieData[j].value;
          }
        }
        if (othersCount > 0) {
          displayData.push({ name: 'Others', value: othersCount });
        }

        this.chart.setOption({
          series: [{
            data: displayData,
            label: {
              show: true,
              position: 'outside',
              formatter: function(params) {
                return params.name + ': ' + params.value + ' (' + params.percent.toFixed(2) + '%)';
              },
              fontFamily: 'Inter, sans-serif'
            }
          }],
          legend: {
            data: displayData.map(function(d) { return d.name; }),
            orient: 'horizontal',
            left: 'center',
            bottom: 10,
            formatter: function(name) {
              return name;
            }
          }
        });

        console.log("Chart updated with processed data");
      } catch (err) {
        console.error("Error processing data:", err);
        this.handleEmptyData();
      }

      this.setLoading(false);
    },

    destroy: function () {
      console.log("Destroying EChartIsolationSource widget");

      this._pendingQuery = null;

      if (this.initialRenderTimer) {
        console.log("Clearing initial render timer");
        clearTimeout(this.initialRenderTimer);
        this.initialRenderTimer = null;
      }

      if (this.retryTimer) {
        console.log("Clearing retry timer");
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }

      if (this.secondRetryTimer) {
        console.log("Clearing second retry timer");
        clearTimeout(this.secondRetryTimer);
        this.secondRetryTimer = null;
      }

      if (this.resizeHandler) {
        console.log("Removing resize handler");
        this.resizeHandler.remove();
        this.resizeHandler = null;
      }

      if (this.chart) {
        console.log("Disposing ECharts instance");
        try {
          this.chart.off('click');
          this.chart.dispose();
        } catch (e) {
          console.error("Error disposing chart:", e);
        }
        this.chart = null;
      }

      this.chartNode = null;
      this.loadingNode = null;

      this.inherited(arguments);
    }
  });
});