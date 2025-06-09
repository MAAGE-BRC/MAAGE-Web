define([
    'dojo/_base/declare', 'dojo/_base/lang',
    'dojo/dom-class', 'dojo/dom-style', 'dojo/on', 'dojo/dom-geometry',
    'dojo/topic', 'dojo/request', 'dojo/aspect',
    '../../util/PathJoin', 'dgrid/Grid',
    '../SummaryWidget',
    'dojo/text!./MAAGELine.html'
], function(
    declare, lang,
    domClass, domStyle, on, domGeom,
    Topic, xhr, aspect,
    PathJoin, Grid,
    SummaryWidget,
    Template
) {
    return declare([SummaryWidget], {
        baseClass: 'MAAGELine',
        dataModel: 'genome',
        query: '',
        baseQuery: '&limit(1)&json(nl,map)',
        chartTitle: 'Genome Timeline',
        maxPoints: 20,
        facetField: 'completion_date',
        sortByDate: true,
        templateString: Template,
        _chartInitialized: false,
        
        // MAAGE API integration
        _useGlobalMAAGEClient: true,
        apiServiceUrl: 'https://www.maage-brc.org/api',

        postCreate: function() {
            this.inherited(arguments);
            if (this.chartTitle) {
                this.chartTitleNode.innerHTML = this.chartTitle;
            }

            // MAAGE theme colors for line chart
            this._themeColors = [
                "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", 
                "#ef4444", "#06b6d4", "#8b5a3c", "#6366f1"
            ];

            this._resizeHandler = lang.hitch(this, function() {
                if (this.chart) this.chart.resize();
            });

            aspect.after(this, "resize", this._resizeHandler);
        },

        startup: function() {
            this.inherited(arguments);

            setTimeout(lang.hitch(this, function() {
                if (this.data && !this._chartInitialized) {
                    this._initChart();
                }
            }), 500);
        },

        onSetQuery: function(attr, oldVal, query) {
            if (!query) return;

            // Use global MAAGE client if available, otherwise fallback to xhr
            if (this._useGlobalMAAGEClient && window.maageSVC && window.maageSVC.initialized) {
                return this._queryWithMAAGEClient(query);
            } else {
                return this._queryWithXHR(query);
            }
        },

        _queryWithMAAGEClient: function(query) {
            // Build facet query using MAAGE client
            const facetQuery = `${this.query}&facet((field,${this.facetField}),(mincount,1))`;
            
            try {
                return window.maageSVC.query(this.dataModel, facetQuery, {
                    query_lang: 'solr',
                    accept: 'application/solr+json'
                }).then(lang.hitch(this, 'processData'));
            } catch (e) {
                console.warn('MAAGE client query failed, falling back to XHR:', e);
                return this._queryWithXHR(query);
            }
        },

        _queryWithXHR: function(query) {
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
                .filter(([key]) => key && key !== 'null')
                .map(([key, count]) => ({
                    name: key,
                    date: this._parseDate(key),
                    value: count,
                    link: `#view_tab=genomes&filter=eq(${this.facetField},${encodeURIComponent(key)})`
                }))
                .filter(item => item.date); // Filter out invalid dates

            if (this.sortByDate) {
                data.sort((a, b) => a.date - b.date);
            }

            // Limit data points and aggregate if necessary
            let chartData = data;
            if (data.length > this.maxPoints) {
                chartData = this._aggregateTimeData(data, this.maxPoints);
            }

            this._tableData = data;
            this._chartData = chartData;

            domClass.add(this.loadingNode, 'hidden');
            this.set('data', chartData);
        },

        _parseDate: function(dateStr) {
            // Try to parse various date formats
            let date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                // Try parsing year only
                const yearMatch = dateStr.match(/(\d{4})/);
                if (yearMatch) {
                    date = new Date(parseInt(yearMatch[1]), 0, 1);
                }
            }
            return isNaN(date.getTime()) ? null : date;
        },

        _aggregateTimeData: function(data, maxPoints) {
            if (data.length <= maxPoints) return data;

            // Group data into time periods
            const interval = Math.ceil(data.length / maxPoints);
            const aggregated = [];

            for (let i = 0; i < data.length; i += interval) {
                const group = data.slice(i, i + interval);
                const totalValue = group.reduce((sum, item) => sum + item.value, 0);
                const firstDate = group[0].date;
                const lastDate = group[group.length - 1].date;
                
                aggregated.push({
                    name: `${firstDate.getFullYear()}${group.length > 1 ? `-${lastDate.getFullYear()}` : ''}`,
                    date: firstDate,
                    value: totalValue,
                    link: `#view_tab=genomes&filter=range(${this.facetField},[${firstDate.toISOString().split('T')[0]},${lastDate.toISOString().split('T')[0]}])`
                });
            }

            return aggregated;
        },

        onSetData: function(attr, oldVal, data) {
            this.inherited(arguments);

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
                height: '350px'
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

                    if (window.addEventListener) {
                        window.addEventListener('resize', this._resizeHandler);
                    }

                    this.chart.on('click', 'series', lang.hitch(this, function(params) {
                        if (params.dataIndex >= 0 && this._chartData && this._chartData[params.dataIndex]) {
                            var item = this._chartData[params.dataIndex];
                            if (item && item.link) {
                                Topic.publish('/navigate', {
                                    href: item.link
                                });
                            }
                        }
                    }));
                } catch (e) {
                    console.error("Error initializing MAAGE line chart", e);
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
                const xAxisData = this._chartData.map(item => item.name);
                const seriesData = this._chartData.map((item, idx) => ({
                    value: item.value,
                    itemStyle: {
                        color: this._themeColors[0]
                    }
                }));

                this.chart.setOption({
                    color: this._themeColors,
                    tooltip: {
                        trigger: 'axis',
                        backgroundColor: '#fff',
                        borderColor: '#e5e7eb',
                        borderWidth: 1,
                        textStyle: {
                            color: '#374151'
                        },
                        formatter: function(params) {
                            if (params && params.length > 0) {
                                const data = params[0];
                                return `${data.name}<br/>${data.seriesName}: ${data.value}`;
                            }
                            return '';
                        }
                    },
                    grid: {
                        left: '3%',
                        right: '4%',
                        bottom: '3%',
                        top: '10%',
                        containLabel: true
                    },
                    xAxis: {
                        type: 'category',
                        data: xAxisData,
                        axisLine: {
                            lineStyle: {
                                color: '#e5e7eb'
                            }
                        },
                        axisLabel: {
                            color: '#6b7280',
                            rotate: 45,
                            formatter: function(value) {
                                if (value.length > 10) {
                                    return value.substring(0, 8) + '...';
                                }
                                return value;
                            }
                        }
                    },
                    yAxis: {
                        type: 'value',
                        name: 'Count',
                        nameLocation: 'middle',
                        nameGap: 50,
                        axisLine: {
                            lineStyle: {
                                color: '#e5e7eb'
                            }
                        },
                        axisLabel: {
                            color: '#6b7280'
                        },
                        splitLine: {
                            lineStyle: {
                                color: '#f3f4f6'
                            }
                        }
                    },
                    series: [{
                        name: this.chartTitle || "Count",
                        type: 'line',
                        data: seriesData,
                        smooth: true,
                        symbol: 'circle',
                        symbolSize: 6,
                        lineStyle: {
                            width: 3,
                            color: this._themeColors[0]
                        },
                        areaStyle: {
                            color: {
                                type: 'linear',
                                x: 0,
                                y: 0,
                                x2: 0,
                                y2: 1,
                                colorStops: [{
                                    offset: 0,
                                    color: this._themeColors[0] + '40'
                                }, {
                                    offset: 1,
                                    color: this._themeColors[0] + '10'
                                }]
                            }
                        },
                        emphasis: {
                            itemStyle: {
                                shadowBlur: 10,
                                shadowColor: 'rgba(0, 0, 0, 0.2)'
                            }
                        }
                    }]
                });

                this.chart.resize();
            } catch (e) {
                console.error("Error rendering MAAGE line chart", e);
            }
        },

        render_table: function() {
            if (!this.grid) {
                const opts = {
                    columns: [{
                            field: 'name',
                            label: this.facetField.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                        },
                        {
                            field: 'value',
                            label: 'Count'
                        }
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