define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/dom-construct',
    'dojo/topic',
    'dojo/when',
    './EChartGenomeDataService',
    'echarts'
], function (declare, lang, domConstruct, topic, when, EChartGenomeDataService, echarts) {

    let dataService = null;

    return declare(null, {
        baseClass: 'echartCollectionDate',
        genomeIds: null,
        chartOptions: {},

        constructor: function (params) {
            lang.mixin(this, params);

            if (!dataService) {
                dataService = new EChartGenomeDataService();
            }

            this.uniqueId = this.id || `chart_date_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        },

        postCreate: function () {
            this.inherited(arguments);
            this._setupDom();
            this._fetchDataAndRenderChart();
            this._bindResizeListener();
        },

        _setupDom: function () {
            this.chartContainer = domConstruct.create('div', {
                id: `${this.uniqueId}_container`,
                style: 'width: 800px; height: 500px;'
            }, this.domNode);

            this.loadingNode = domConstruct.create('div', {
                innerHTML: 'Loading data...',
                style: 'text-align: center; padding: 20px;'
            }, this.domNode);
        },

        _fetchDataAndRenderChart: function () {
            if (!this.genomeIds || !this.genomeIds.length) {
                console.error('No genome IDs provided');
                this._showError('No genome IDs provided');
                return;
            }

            when(dataService.getGenomeCollectionData(this.genomeIds),
                lang.hitch(this, function (data) {
                    domConstruct.destroy(this.loadingNode);
                    this.dateData = data.dateData;
                    this._renderDateChart();
                }),
                lang.hitch(this, function (err) {
                    console.error('Error fetching date data:', err);
                    this._showError('Error fetching data');
                })
            );
        },

        _renderDateChart: function () {
            this.chart = echarts.init(this.chartContainer);

            const options = lang.mixin({
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
                    type: 'scatter',
                    symbolSize: function (val) {
                        return Math.max(val[1] * 3, 8);
                    },
                    data: this.dateData.map(item => [item.date, item.count])
                }]
            }, this.chartOptions);

            this.chart.setOption(options);

            topic.publish(`/chart/${this.uniqueId}/ready`, this);
        },

        _bindResizeListener: function () {

            this.own(topic.subscribe('/chart/resize', lang.hitch(this, function () {
                if (this.chart) this.chart.resize();
            })));
        },

        _showError: function (message) {
            if (this.loadingNode) {
                this.loadingNode.innerHTML = `Error: ${message}`;
                this.loadingNode.style.color = 'red';
            }
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