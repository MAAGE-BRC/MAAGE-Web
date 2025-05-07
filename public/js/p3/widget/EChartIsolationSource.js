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
          console.log("Retrying chart initialization");
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
          console.error("ECharts library is not available");
          return;
        }

        if (!this.chart) {
          console.log("Initializing chart with dimensions:", this.chartNode.offsetWidth, this.chartNode.offsetHeight);
          this.chart = echarts.init(this.chartNode);
          console.log("Chart initialized successfully");

          if (this._pendingQuery) {
            console.log("Found pending query, executing it now");
            setTimeout(lang.hitch(this, function() {
              this.executeQuery(this._pendingQuery);
              this._pendingQuery = null;
            }), 100); 
          }
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
            trigger: 'axis',
            axisPointer: {
              type: 'shadow'
            }
          },
          grid: {
            left: '15%',
            right: '4%',
            bottom: '10%',
            top: '60',
            containLabel: true
          },
          xAxis: {
            type: 'value',
            name: 'Count',
            nameLocation: 'middle',
            nameGap: 30,
            nameTextStyle: {
              fontFamily: 'Inter, sans-serif'
            }
          },
          yAxis: {
            type: 'category',
            data: ['Loading...'],
            axisLabel: {
              fontFamily: 'Inter, sans-serif',
              width: 120,
              overflow: 'truncate',
              interval: 0
            }
          },
          series: [{
            name: 'Count',
            type: 'bar',
            data: [0],
            itemStyle: {
              color: '#5f94ab'
            }
          }]
        };

        this.chart.setOption(chartOptions);

        this.chart.on('click', lang.hitch(this, function (params) {
          if (params.data && params.data.link) {
            var baseUrl = location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '');
            var url = (window.location.href).split(baseUrl)[1].replace(window.location.hash, params.data.link);
            Topic.publish('/navigate', { href: url });
          }
        }));
      } catch (e) {
        console.error("Error initializing chart:", e);
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
          yAxis: {
            data: ['No data available']
          },
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

        var chartData = [];
        var categories = [];
        var others = { value: 0, name: 'Others', itemStyle: { color: '#e7c788' } }; 

        var sorted = Object.entries(isolationSourceData).sort(([, a], [, b]) => b - a);
        var totalCount = 0;

        console.log("Processing sorted data with entries:", sorted.length);

        sorted.forEach(function ([source, count], index) {
          if (source) {
            totalCount += count;
            if (index < this.maxBars) {

              chartData.push({
                value: count,
                name: source,
                link: `#view_tab=genomes&filter=eq(isolation_source,${encodeURIComponent(source)})`,
                cursor: 'pointer'
              });
              categories.push(source);
            } else {
              others.value += count;
            }
          }
        }, this);

        if (others.value > 0) {
          chartData.push({
            ...others,
            link: '#view_tab=genomes&filter=eq(isolation_source,*)',
            cursor: 'pointer'
          });
          categories.push('Others');
        }

        if (chartData.length === 0) {
          console.log("No isolation source data found");
          categories = ['No data available'];
          chartData = [{ value: 0, name: 'No data available' }];
        } else {
          console.log("Found isolation source data:", chartData.length, "entries");
        }

        console.log("Updating chart with categories:", categories);

        this.chart.setOption({
          yAxis: {
            data: categories
          },
          series: [{
            data: chartData
          }]
        });

        console.log("Chart updated successfully");
      } catch (err) {
        console.error("Error processing isolation source data:", err);
      }

      setTimeout(lang.hitch(this, function() {
        if (this.chart) {
          this.chart.resize();
        }
      }), 100);

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