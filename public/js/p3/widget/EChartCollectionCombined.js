define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/dom-construct',
    'dojo/dom-class',
    'dojo/on',
    'dojo/topic',
    'dojo/when',
    './EChartGenomeDataService',
    'echarts',
    'dojo/text!./templates/EChartCollectionCombined.html'
], function (declare, lang, domConstruct, domClass, on, topic, when, EChartGenomeDataService, echarts, template) {

    let dataService = null;

    return declare(null, {
        baseClass: 'echartCollectionCombined',
        genomeIds: null,
        chartOptions: {},
        templateString: template,

        constructor: function (params) {
            lang.mixin(this, params);

            if (!dataService) {
                dataService = new EChartGenomeDataService();
            }

            this.uniqueId = this.id || `chart_combined_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        },

        postCreate: function () {
            this.inherited(arguments);
            this._setupDom();
            this._setupStyles();
            this._fetchDataAndRenderCharts();
            this._bindResizeListener();
        },

        _setupDom: function () {
            this.controlsNode = domConstruct.create('div', {
                className: `${this.baseClass}-controls`
            }, this.domNode);

            const tabs = ['year', 'month', 'timeline'];
            const tabLabels = ['By Year', 'By Month', 'Timeline'];

            this.tabsNode = domConstruct.create('div', {
                className: `${this.baseClass}-tabs`
            }, this.controlsNode);

            this.tabs = {};
            tabs.forEach((tab, i) => {
                this.tabs[tab] = domConstruct.create('span', {
                    innerHTML: tabLabels[i],
                    className: `${this.baseClass}-tab` + (i === 0 ? ' active' : ''),
                    'data-tab': tab,
                    id: `${this.uniqueId}_tab_${tab}`
                }, this.tabsNode);

                on(this.tabs[tab], 'click', lang.hitch(this, function (evt) {
                    this._switchTab(evt.target.getAttribute('data-tab'));
                }));
            });

            this.chartNode = domConstruct.create('div', {
                className: `${this.baseClass}-container`
            }, this.domNode);

            this.chartContainers = {};
            tabs.forEach(tab => {
                this.chartContainers[tab] = domConstruct.create('div', {
                    className: `${this.baseClass}-view` + (tab === 'year' ? ' active' : ''),
                    id: `${this.uniqueId}_chart_${tab}`,
                    style: 'width: 850px; height: 550px; display: ' + (tab === 'year' ? 'block' : 'none')
                }, this.chartNode);
            });

            this.loadingNode = domConstruct.create('div', {
                innerHTML: 'Loading data...',
                className: `${this.baseClass}-loading`,
                style: 'text-align: center; padding: 20px;'
            }, this.domNode);
        },

        _setupStyles: function () {

            const styleId = `${this.baseClass}-styles`;
            if (!document.getElementById(styleId)) {
                const styleNode = domConstruct.create('style', {
                    id: styleId,
                    innerHTML: `
            .${this.baseClass}-tabs {
              display: flex;
              border-bottom: 1px solid #ddd;
              margin-bottom: 20px;
            }
            .${this.baseClass}-tab {
              padding: 10px 20px;
              cursor: pointer;
              border: 1px solid transparent;
            }
            .${this.baseClass}-tab.active {
              border: 1px solid #ddd;
              border-bottom-color: white;
              margin-bottom: -1px;
              font-weight: bold;
            }
            .${this.baseClass}-view:not(.active) {
              display: none;
            }

            @media (max-width: 900px) {
              .${this.baseClass}-container div {
                width: 100% !important;
                height: 400px !important;
              }
            }
          `
                }, document.head);
            }
        },

        _switchTab: function (tabId) {

            Object.keys(this.tabs).forEach(tab => {
                domClass.toggle(this.tabs[tab], 'active', tab === tabId);
                this.chartContainers[tab].style.display = tab === tabId ? 'block' : 'none';
            });

            if (this.charts && this.charts[tabId]) {
                this.charts[tabId].resize();
            }

            topic.publish(`/chart/${this.uniqueId}/tabChange`, tabId);
        },

        _fetchDataAndRenderCharts: function () {
            if (!this.genomeIds || !this.genomeIds.length) {
                console.error('No genome IDs provided');
                this._showError('No genome IDs provided');
                return;
            }

            when(dataService.getGenomeCollectionData(this.genomeIds),
                lang.hitch(this, function (data) {
                    domConstruct.destroy(this.loadingNode);
                    this.data = data;
                    this._renderCharts();
                }),
                lang.hitch(this, function (err) {
                    console.error('Error fetching data:', err);
                    this._showError('Error fetching data');
                })
            );
        },

        _renderCharts: function () {
            this.charts = {};

            this.charts.year = echarts.init(this.chartContainers.year);
            this.charts.year.setOption(lang.mixin({
                title: {
                    text: 'Genome Collection by Year',
                    left: 'center'
                },
                tooltip: {
                    trigger: 'axis',
                    formatter: '{b}: {c} genomes'
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: this.data.yearData.map(item => item.year),
                    name: 'Year',
                    nameLocation: 'middle',
                    nameGap: 30
                },
                yAxis: {
                    type: 'value',
                    name: 'Count',
                    nameLocation: 'middle',
                    nameGap: 40
                },
                series: [{
                    name: 'Genomes',
                    type: 'bar',
                    data: this.data.yearData.map(item => item.count),
                    label: {
                        show: true,
                        position: 'top'
                    }
                }]
            }, this.chartOptions?.year || {}));

            this.charts.month = echarts.init(this.chartContainers.month);
            this.charts.month.setOption(lang.mixin({
                title: {
                    text: 'Genome Collection by Month',
                    left: 'center'
                },
                tooltip: {
                    trigger: 'axis',
                    formatter: '{b}: {c} genomes'
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: this.data.monthData.map(item => item.month),
                    name: 'Month',
                    nameLocation: 'middle',
                    nameGap: 30
                },
                yAxis: {
                    type: 'value',
                    name: 'Count',
                    nameLocation: 'middle',
                    nameGap: 40
                },
                series: [{
                    name: 'Genomes',
                    type: 'bar',
                    data: this.data.monthData.map(item => item.count),
                    label: {
                        show: true,
                        position: 'top'
                    }
                }]
            }, this.chartOptions?.month || {}));

            this.charts.timeline = echarts.init(this.chartContainers.timeline);
            this.charts.timeline.setOption(lang.mixin({
                title: {
                    text: 'Genome Collection Date Timeline',
                    left: 'center'
                },
                tooltip: {
                    trigger: 'axis',
                    formatter: function (params) {
                        const data = params[0].data;
                        return `${data[0]}: ${data[1]} genomes`;
                    }
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '10%',
                    containLabel: true
                },
                dataZoom: [
                    {
                        type: 'slider',
                        show: true,
                        xAxisIndex: [0],
                        start: 0,
                        end: 100
                    }
                ],
                xAxis: {
                    type: 'time',
                    name: 'Collection Date',
                    nameLocation: 'middle',
                    nameGap: 40,
                    axisLabel: {
                        formatter: '{yyyy}-{MM}-{dd}'
                    }
                },
                yAxis: {
                    type: 'value',
                    name: 'Count',
                    nameLocation: 'middle',
                    nameGap: 40
                },
                series: [{
                    name: 'Genomes',
                    type: 'bar',
                    data: this.data.dateData.map(item => [item.date, item.count])
                }]
            }, this.chartOptions?.timeline || {}));

            topic.publish(`/chart/${this.uniqueId}/ready`, this);
        },

        _bindResizeListener: function () {

            this.own(topic.subscribe('/chart/resize', lang.hitch(this, function () {
                if (this.charts) {
                    Object.values(this.charts).forEach(chart => {
                        if (chart) chart.resize();
                    });
                }
            })));
        },

        _showError: function (message) {
            if (this.loadingNode) {
                this.loadingNode.innerHTML = `Error: ${message}`;
                this.loadingNode.style.color = 'red';
            }
        },

        resize: function (dim) {
            if (dim && dim.w && dim.h) {
                Object.values(this.chartContainers).forEach(container => {
                    container.style.width = `${dim.w}px`;
                    container.style.height = `${dim.h}px`;
                });
            }

            if (this.charts) {
                Object.values(this.charts).forEach(chart => {
                    if (chart) chart.resize();
                });
            }
        },

        destroy: function () {

            if (this.charts) {
                Object.values(this.charts).forEach(chart => {
                    if (chart) chart.dispose();
                });
                this.charts = null;
            }

            this.inherited(arguments);
        }
    });
});