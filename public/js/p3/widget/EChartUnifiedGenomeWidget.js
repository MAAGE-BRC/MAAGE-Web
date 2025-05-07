define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dojo/topic',
  'dojo/when',
  'dojo/on',
  './EChartUnifiedGenomeDataService',
  'echarts',
  'dojo/text!./templates/EChartUnifiedGenomeWidget.html'
], function (declare, lang, domConstruct, domClass, topic, when, on, EChartUnifiedGenomeDataService, echarts, template) {

  let dataService = null;

  return declare(null, {
    baseClass: 'echartUnifiedGenomeWidget',
    genomeIds: null,
    chartType: 'bar',
    sourceField: 'collection_year',
    title: null,
    subtitle: null,
    showLabels: true,
    showLegend: true,
    xAxisLabel: null,
    yAxisLabel: null,
    seriesName: 'Genomes',
    chartOptions: {},
    templateString: template,

    constructor: function (params) {
      lang.mixin(this, params);

      if (!dataService) {
        dataService = new EChartUnifiedGenomeDataService();
      }

      this.uniqueId = this.id || `chart_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      if (!this.subtitle) {
        const sourceFieldMap = {
          'collection_year': 'Collection Year',
          'collection_month': 'Collection Month',
          'collection_date': 'Collection Date'
        };
        this.subtitle = sourceFieldMap[this.sourceField] || this.sourceField;
      }

      this.validChartTypes = ['bar', 'pie', 'line', 'scatter', 'radar', 'heatmap'];
      if (!this.validChartTypes.includes(this.chartType)) {
        console.warn(`Invalid chart type: ${this.chartType}. Defaulting to 'bar'`);
        this.chartType = 'bar';
      }
    },

    postCreate: function () {
      this.inherited(arguments);
      this._setupDom();
      this._setupControls();
      this._fetchDataAndRenderChart();
      this._bindResizeListener();
    },

    _setupDom: function () {

      if (!this.chartContainer) {
        this.chartContainer = domConstruct.create('div', {
          id: `${this.uniqueId}_container`,
          className: `${this.baseClass}-container`,
          style: 'width: 800px; height: 500px;'
        }, this.domNode);
      }

      if (!this.loadingNode) {
        this.loadingNode = domConstruct.create('div', {
          innerHTML: 'Loading data...',
          className: `${this.baseClass}-loading`,
          style: 'text-align: center; padding: 20px;'
        }, this.domNode);
      }

      if (!document.getElementById(`${this.baseClass}-styles`)) {
        domConstruct.create('style', {
          id: `${this.baseClass}-styles`,
          innerHTML: `
            .${this.baseClass}-container {
              min-height: 400px;
              margin: 0 auto;
            }
            .${this.baseClass}-loading {
              padding: 20px;
              text-align: center;
            }
            .${this.baseClass}-error {
              color: red;
              padding: 20px;
              text-align: center;
            }
            .${this.baseClass}-controls {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 10px;
            }
            .${this.baseClass}-button {
              margin-left: 5px;
              padding: 5px 10px;
              cursor: pointer;
              background: #f0f0f0;
              border: 1px solid #ddd;
              border-radius: 3px;
            }
            .${this.baseClass}-button:hover {
              background: #e0e0e0;
            }
            @media (max-width: 900px) {
              .${this.baseClass}-container {
                width: 100% !important;
                height: 400px !important;
              }
            }
          `
        }, document.head);
      }
    },

    _setupControls: function () {

      if (this.showChartControls) {
        this.controlsNode = domConstruct.create('div', {
          className: `${this.baseClass}-controls`
        }, this.domNode, 'first');

        const chartTypes = [{
          id: 'bar',
          label: 'Bar'
        }, {
          id: 'line',
          label: 'Line'
        }, {
          id: 'pie',
          label: 'Pie'
        }, {
          id: 'scatter',
          label: 'Scatter'
        }];

        chartTypes.forEach(type => {
          const button = domConstruct.create('div', {
            innerHTML: type.label,
            className: `${this.baseClass}-button`,
            'data-type': type.id
          }, this.controlsNode);

          on(button, 'click', lang.hitch(this, function () {
            this.chartType = type.id;
            this._renderChart();
          }));
        });
      }
    },

    _fetchDataAndRenderChart: function () {
      if (!this.genomeIds || !this.genomeIds.length) {
        console.error('No genome IDs provided');
        this._showError('No genome IDs provided');
        return;
      }

      const dataPromise = this.sourceField === 'collection_year' && !this.forceFull
        ? dataService.getFacetData(this.genomeIds, 'collection_year')
        : dataService.getGenomeCollectionData(this.genomeIds);

      when(dataPromise,
        lang.hitch(this, function (data) {
          if (this.loadingNode) {
            domConstruct.destroy(this.loadingNode);
            this.loadingNode = null;
          }
          this._processData(data);
          this._renderChart();
        }),
        lang.hitch(this, function (err) {
          console.error('Error fetching data:', err);
          this._showError('Error fetching data');
        })
      );
    },

    _processData: function (data) {

      if (typeof data === 'object' && !Array.isArray(data) && !data.yearData) {
        if (this.sourceField === 'collection_year') {
          this.chartData = Object.entries(data)
            .map(([year, count]) => ({
              name: year || 'Unknown',
              value: count
            }))
            .filter(item => item.name !== 'Unknown')
            .sort((a, b) => a.name - b.name);
        }
        return;
      }

      if (this.sourceField === 'collection_year' && data.yearData) {
        this.chartData = data.yearData;
      } else if (this.sourceField === 'collection_month' && data.monthData) {
        this.chartData = data.monthData;
      } else if (this.sourceField === 'collection_date' && data.dateData) {
        this.chartData = data.dateData;
      } else {

        this.chartData = data.yearData || [];
      }
    },

    _renderChart: function () {
      if (!this.chart) {
        this.chart = echarts.init(this.chartContainer);
      }

      const options = {
        title: {
          text: this.title || `Genome ${this.subtitle}`,
          left: 'center',
          subtextStyle: {
            color: '#999',
            fontSize: 14
          }
        },
        tooltip: {
          trigger: 'item'
        },
        color: this.colors || null
      };

      if (this.chartType === 'bar') {
        this._renderBarChart(options);
      } else if (this.chartType === 'pie') {
        this._renderPieChart(options);
      } else if (this.chartType === 'line') {
        this._renderLineChart(options);
      } else if (this.chartType === 'scatter') {
        this._renderScatterChart(options);
      } else if (this.chartType === 'radar') {
        this._renderRadarChart(options);
      } else if (this.chartType === 'heatmap') {
        this._renderHeatmapChart(options);
      }

      this.chart.setOption(lang.mixin(options, this.chartOptions));

      topic.publish(`/chart/${this.uniqueId}/ready`, this);
    },

    _renderBarChart: function (options) {
      lang.mixin(options, {
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: this.chartData.map(item => item.name),
          name: this.xAxisLabel || this.subtitle,
          nameLocation: 'middle',
          nameGap: 30
        },
        yAxis: {
          type: 'value',
          name: this.yAxisLabel || 'Count',
          nameLocation: 'middle',
          nameGap: 40
        },
        series: [{
          name: this.seriesName,
          type: 'bar',
          data: this.chartData.map(item => item.value),
          label: {
            show: this.showLabels,
            position: 'top'
          }
        }]
      });
    },

    _renderPieChart: function (options) {
      lang.mixin(options, {
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 10,
          show: this.showLegend,
          data: this.chartData.map(item => item.name)
        },
        series: [{
          name: this.seriesName,
          type: 'pie',
          radius: this.radius || '65%',
          center: ['50%', '50%'],
          data: this.chartData.map(item => ({
            name: item.name,
            value: item.value
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          label: {
            show: this.showLabels
          }
        }]
      });
    },

    _renderLineChart: function (options) {
      lang.mixin(options, {
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: this.chartData.map(item => item.name),
          name: this.xAxisLabel || this.subtitle,
          nameLocation: 'middle',
          nameGap: 30
        },
        yAxis: {
          type: 'value',
          name: this.yAxisLabel || 'Count',
          nameLocation: 'middle',
          nameGap: 40
        },
        series: [{
          name: this.seriesName,
          type: 'line',
          data: this.chartData.map(item => item.value),
          label: {
            show: this.showLabels
          },
          lineStyle: {
            width: 3
          },
          symbol: 'circle',
          symbolSize: 8
        }]
      });
    },

    _renderScatterChart: function (options) {
      lang.mixin(options, {
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: this.sourceField === 'collection_date' ? 'time' : 'category',
          data: this.chartData.map(item => item.name),
          name: this.xAxisLabel || this.subtitle,
          nameLocation: 'middle',
          nameGap: 30
        },
        yAxis: {
          type: 'value',
          name: this.yAxisLabel || 'Count',
          nameLocation: 'middle',
          nameGap: 40
        },
        series: [{
          name: this.seriesName,
          type: 'scatter',
          data: this.sourceField === 'collection_date'
            ? this.chartData.map(item => [item.date, item.value])
            : this.chartData.map(item => item.value),
          symbolSize: function (val) {
            return Math.max(Array.isArray(val) ? val[1] * 3 : val * 3, 8);
          }
        }]
      });
    },

    _renderRadarChart: function (options) {
      lang.mixin(options, {
        radar: {
          indicator: this.chartData.map(item => ({
            name: item.name,
            max: Math.max(...this.chartData.map(d => d.value)) * 1.2
          }))
        },
        series: [{
          name: this.seriesName,
          type: 'radar',
          data: [{
            value: this.chartData.map(item => item.value),
            name: this.seriesName
          }]
        }]
      });
    },

    _renderHeatmapChart: function (options) {

      const values = this.chartData.map(item => item.value);
      const min = Math.min(...values);
      const max = Math.max(...values);

      lang.mixin(options, {
        visualMap: {
          min: min,
          max: max,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: '15%'
        },
        grid: {
          height: '50%',
          top: '10%'
        },
        xAxis: {
          type: 'category',
          data: this.chartData.map(item => item.name),
          splitArea: {
            show: true
          }
        },
        yAxis: {
          type: 'category',
          data: [this.seriesName],
          splitArea: {
            show: true
          }
        },
        series: [{
          name: this.seriesName,
          type: 'heatmap',
          data: this.chartData.map((item, index) => [index, 0, item.value]),
          label: {
            show: this.showLabels
          }
        }]
      });
    },

    _bindResizeListener: function () {

      if (!window._chartResizeHandler) {
        window._chartResizeHandler = true;
        window.addEventListener('resize', function () {
          topic.publish('/chart/resize');
        });
      }

      this.own(topic.subscribe('/chart/resize', lang.hitch(this, function () {
        if (this.chart) this.chart.resize();
      })));
    },

    _showError: function (message) {
      if (this.loadingNode) {
        this.loadingNode.innerHTML = `Error: ${message}`;
        domClass.add(this.loadingNode, `${this.baseClass}-error`);
      } else {
        this.errorNode = domConstruct.create('div', {
          innerHTML: `Error: ${message}`,
          className: `${this.baseClass}-error`
        }, this.domNode);
      }
    },

    updateChartType: function (type) {
      if (this.validChartTypes.includes(type)) {
        this.chartType = type;
        this._renderChart();
        return true;
      }
      return false;
    },

    updateData: function (genomeIds) {
      this.genomeIds = genomeIds;

      if (this.errorNode) {
        domConstruct.destroy(this.errorNode);
        this.errorNode = null;
      }

      if (!this.loadingNode) {
        this.loadingNode = domConstruct.create('div', {
          innerHTML: 'Loading data...',
          className: `${this.baseClass}-loading`
        }, this.domNode);
      }

      this._fetchDataAndRenderChart();
    },

    exportChart: function (type, name) {
      if (!this.chart) return null;

      type = type || 'png';
      name = name || `genome-chart-${this.sourceField}`;

      const url = this.chart.getDataURL({
        type: type,
        pixelRatio: 2,
        backgroundColor: '#fff'
      });

      const link = document.createElement('a');
      link.download = `${name}.${type}`;
      link.href = url;
      link.click();

      return url;
    },

    resize: function (dim) {
      if (dim && dim.w && dim.h && this.chartContainer) {
        this.chartContainer.style.width = `${dim.w}px`;
        this.chartContainer.style.height = `${dim.h}px`;
      }

      if (this.chart) {
        this.chart.resize();
      }
    },

    destroy: function () {

      if (this.chart) {
        this.chart.dispose();
        this.chart = null;
      }

      this.inherited(arguments);
    }
  });
});