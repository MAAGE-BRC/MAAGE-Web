define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dijit/_WidgetBase',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/_TemplatedMixin',
    'dojo/text!./templates/GenomeListOverview.html',
    'p3/store/GenomeJsonRest',
    './EChartVerticalBar',
    './EChartDoughnut',
    './EChartStackedBar'
], function (
    declare,
    lang,
    on,
    WidgetBase,
    _WidgetsInTemplateMixin,
    Templated,
    Template,
    GenomeStore,
    VerticalBar,
    Doughnut,
    StackedBar
) {
    return declare([WidgetBase, Templated, _WidgetsInTemplateMixin], {
        baseClass: 'GenomeListOverview',
        templateString: Template,
        state: null,
        charts: [],

        postCreate: function () {
            this.inherited(arguments);
            this.genomeStore = new GenomeStore({});
        },

        _setStateAttr: function (state) {
            this._set('state', state);
            if (this.state && this.state.search) {
                this.createCharts();
            }
        },

        _processFacets: function(facets) {
            if (!facets || facets.length === 0) return [];
            const normMap = {'stool':'Stool','whole blood':'Blood','blood':'Blood','urine':'Urine','wound':'Wound','unknown':'Unknown','na':'N/A','n/a':'N/A'};
            const agg = {};
            for (let i = 0; i < facets.length; i += 2) {
                const name = (facets[i] || "N/A"), count = facets[i + 1] || 0;
                if (count > 0) {
                    const finalName = normMap[name.toLowerCase()] || (name.charAt(0).toUpperCase() + name.slice(1));
                    agg[finalName] = (agg[finalName] || 0) + count;
                }
            }
            return Object.keys(agg).map(k => ({ name: k, value: agg[k] })).sort((a, b) => b.value - a.value);
        },

        _processPivotFacets: function(pivotData) {
            if (!pivotData || pivotData.length === 0) return { categories: [], series: [] };
            const allYears = [...new Set(pivotData.map(p => parseInt(p.value, 10)))].filter(y => !isNaN(y)).sort();
            if (allYears.length === 0) return { categories: [], series: [] };
            const maxYearInCategories = allYears[allYears.length - 1];
            const startYear = maxYearInCategories - 9;
            const recentPivotData = pivotData.filter(p => parseInt(p.value, 10) >= startYear);
            const categories = [...new Set(recentPivotData.map(p => p.value))].sort();
            const seriesCounts = {};
            recentPivotData.forEach(yearData => {
                if(yearData.pivot){
                    yearData.pivot.forEach(seriesData => {
                        seriesCounts[seriesData.value] = (seriesCounts[seriesData.value] || 0) + seriesData.count;
                    });
                }
            });
            const topSeriesNames = Object.keys(seriesCounts).sort((a, b) => seriesCounts[b] - seriesCounts[a]).slice(0, 10);
            const series = topSeriesNames.map(seriesName => ({
                name: seriesName || "N/A",
                data: categories.map(category => {
                    const categoryData = recentPivotData.find(p => p.value === category);
                    const seriesPoint = categoryData && categoryData.pivot ? categoryData.pivot.find(p => p.value === seriesName) : null;
                    return seriesPoint ? seriesPoint.count : 0;
                })
            }));
            return { categories: categories, series: series };
        },

        createCharts: function() {
            this.charts.forEach(chart => chart.destroy());
            this.charts = [];

            const baseQuery = this.state.search;
            const queryOptions = { headers: { 'Accept': 'application/solr+json' } };

            const createChart = (widgetClass, node, query) => {
                if (!node) return;
                const chart = new widgetClass({ title: '' });
                chart.placeAt(node);
                chart.startup();
                chart.showLoading();
                this.genomeStore.query(query, queryOptions).then(lang.hitch(this, (res) => {
                    const field = query.match(/facet\(\(field,(\w+)\)/)[1];
                    if (res && res.facet_counts && res.facet_counts.facet_fields[field]) {
                        const data = this._processFacets(res.facet_counts.facet_fields[field]);
                        chart.updateChart(data);
                    }
                    chart.hideLoading();
                }), lang.hitch(this, (err) => { chart.hideLoading(); }));
                this.charts.push(chart);
            };

            const createPivotChart = (widgetClass, node, query) => {
                if (!node) return;
                const chart = new widgetClass({ title: '' });
                chart.placeAt(node);
                chart.startup();
                chart.showLoading();
                this.genomeStore.query(query, queryOptions).then(lang.hitch(this, (res) => {
                    const pivotField = query.match(/facet\(\(pivot,\(([^,]+),([^)]+)\)\)/);
                    const pivotKey = `${pivotField[1]},${pivotField[2]}`;
                    const pivotData = res.facet_counts.facet_pivot[pivotKey];
                    if (pivotData) {
                        const data = this._processPivotFacets(pivotData);
                        chart.updateChart(data);
                    }
                    chart.hideLoading();
                }), lang.hitch(this, (err) => { chart.hideLoading(); }));
                this.charts.push(chart);
            };

            createChart(Doughnut, this.statusChartNode, `${baseQuery}&facet((field,genome_status),(mincount,1))&limit(0)`);
            createChart(Doughnut, this.countryChartNode, `${baseQuery}&facet((field,isolation_country),(mincount,1),(limit,10))&limit(0)`);
            createChart(VerticalBar, this.hostChartNode, `${baseQuery}&facet((field,host_common_name),(mincount,1),(limit,10))&limit(0)`);
            createChart(Doughnut, this.sourceChartNode, `${baseQuery}&facet((field,isolation_source),(mincount,1),(limit,10))&limit(0)`);
            createChart(Doughnut, this.serotypeChartNode, `${baseQuery}&facet((field,serovar),(mincount,1),(limit,10))&limit(0)`);
            createPivotChart(StackedBar, this.serotypeOverTimeChartNode, `${baseQuery}&facet((pivot,(collection_year,serovar)),(mincount,1))&limit(0)`);
        },

        resize: function() {
            this.inherited(arguments);
            if (this.charts) this.charts.forEach(c => c.resize());
        },

        destroy: function() {
            this.inherited(arguments);
            if (this.charts) this.charts.forEach(c => c.destroy());
        }
    });
});
