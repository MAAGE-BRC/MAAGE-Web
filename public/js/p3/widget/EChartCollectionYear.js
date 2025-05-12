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
        baseClass: 'echartCollectionYear',
        genomeIds: null,
        chartOptions: {},

        constructor: function (params) {
            lang.mixin(this, params);

            if (!dataService) {
                dataService = new EChartGenomeDataService();
            }

            this.uniqueId = this.id || `chart_year_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
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

            when(dataService.getFacetData(this.genomeIds, 'collection_year'),
                lang.hitch(this, function (facetData) {
                    domConstruct.destroy(this.loadingNode);

                    this.yearData = Object.entries(facetData)
                        .map(([year, count]) => ({
                            year: year || 'Unknown',
                            count: count
                        }))
                        .filter(item => item.year !== 'Unknown')
                        .sort((a, b) => a.year - b.year);

                    this._renderYearChart();
                }),
                lang.hitch(this, function (err) {
                    console.error('Error fetching year data:', err);
                    this._showError('Error fetching data');
                })
            );
        },

        _renderYearChart: function () {
            this.chart = echarts.init(this.chartContainer);

            const options = lang.mixin({
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
                    data: this.yearData.map(item => item.year),
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
                    data: this.yearData.map(item => item.count),
                    label: {
                        show: true,
                        position: 'top'
                    }
                }]
            }, this.chartOptions);

            this.chart.setOption(options);

            topic.publish(`/chart/${this.uniqueId}/ready`, this);
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