define([
    'dojo/_base/declare', 'dojo/_base/lang',
    'dojo/dom-class', 'dojo/dom-style', 'dojo/on', 'dojo/dom-geometry',
    'dojo/topic', 'dojo/request', 'dojo/aspect',
    '../../util/PathJoin', 'dgrid/Grid',
    '../SummaryWidget',
    'dojo/text!./MAAGEDoughnut.html'
], function(
    declare, lang,
    domClass, domStyle, on, domGeom,
    Topic, xhr, aspect,
    PathJoin, Grid,
    SummaryWidget,
    Template
) {
    return declare([SummaryWidget], {
        baseClass: 'MAAGEDoughnut',
        dataModel: 'genome',
        query: '',
        baseQuery: '&limit(1)&json(nl,map)',
        chartTitle: 'Genome Classification',
        maxSlices: 10,
        facetField: 'isolation_source',
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

            // MAAGE theme colors - using distinctive palette for doughnut
            this._themeColors = [
                "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", 
                "#ef4444", "#06b6d4", "#8b5a3c", "#6366f1",
                "#ec4899", "#84cc16", "#f97316", "#6b7280"
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
                .filter(([key]) => key)
                .map(([key, count]) => ({
                    name: key || 'Unknown',
                    value: count,
                    link: `#view_tab=genomes&filter=eq(${this.facetField},${encodeURIComponent(key)})`
                }))
                .sort((a, b) => b.value - a.value);

            let chartData = data.slice(0, this.maxSlices);
            let othersCount = 0;

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
                    console.error("Error initializing MAAGE doughnut chart", e);
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
                    color: this._themeColors,
                    tooltip: {
                        trigger: 'item',
                        formatter: '{a} <br/>{b}: {c} ({d}%)',
                        backgroundColor: '#fff',
                        borderColor: '#e5e7eb',
                        borderWidth: 1,
                        textStyle: {
                            color: '#374151'
                        }
                    },
                    legend: {
                        type: 'scroll',
                        orient: 'vertical',
                        right: 10,
                        top: 20,
                        bottom: 20,
                        itemWidth: 16,
                        itemHeight: 12,
                        textStyle: {
                            color: '#6b7280',
                            fontSize: 12,
                            width: 120,
                            overflow: 'truncate',
                            ellipsis: '...'
                        },
                        pageButtonPosition: 'end',
                        pageButtonItemGap: 5,
                        pageIconSize: 12,
                        pageTextStyle: {
                            fontSize: 12,
                            color: '#6b7280'
                        }
                    },
                    series: [{
                        name: this.chartTitle || "",
                        type: 'pie',
                        radius: ['45%', '75%'],
                        center: ['40%', '50%'],
                        avoidLabelOverlap: true,
                        itemStyle: {
                            borderRadius: 6,
                            borderColor: '#fff',
                            borderWidth: 3
                        },
                        label: { 
                            show: false 
                        },
                        emphasis: {
                            label: {
                                show: true,
                                fontSize: '14',
                                fontWeight: 'bold',
                                color: '#374151'
                            },
                            itemStyle: {
                                shadowBlur: 10,
                                shadowOffsetX: 0,
                                shadowColor: 'rgba(0, 0, 0, 0.2)'
                            }
                        },
                        labelLine: {
                            show: false
                        },
                        data: this._chartData.map(item => ({
                            value: item.value,
                            name: item.name
                        }))
                    }]
                });

                this.chart.resize();
            } catch (e) {
                console.error("Error rendering MAAGE doughnut chart", e);
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