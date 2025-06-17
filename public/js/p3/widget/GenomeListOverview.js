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
    './EChartDoughnut'
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
    Doughnut
) {
    return declare([WidgetBase, Templated, _WidgetsInTemplateMixin], {
        baseClass: 'GenomeListOverview',
        templateString: Template,
        state: null,
        charts: [], // To hold our chart widgets for easy cleanup

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
            if (!facets || facets.length === 0) {
                return [];
            }
            const normalizationMap = {
                'stool': 'Stool', 'whole blood': 'Blood', 'blood': 'Blood',
                'urine': 'Urine', 'wound': 'Wound', 'unknown': 'Unknown',
                'na': 'N/A', 'n/a': 'N/A'
            };
            const aggregated = {};
            for (let i = 0; i < facets.length; i += 2) {
                const rawName = (facets[i] || "N/A");
                const count = facets[i + 1] || 0;
                if (count > 0) {
                    const lowerCaseName = rawName.toLowerCase();
                    const finalName = normalizationMap[lowerCaseName] || (rawName.charAt(0).toUpperCase() + rawName.slice(1));
                    if (aggregated[finalName]) {
                        aggregated[finalName] += count;
                    } else {
                        aggregated[finalName] = count;
                    }
                }
            }
            const data = Object.keys(aggregated).map(key => ({
                name: key,
                value: aggregated[key]
            }));
            return data.sort((a, b) => b.value - a.value);
        },

        createCharts: function() {
            this.charts.forEach(chart => chart.destroy());
            this.charts = [];

            const baseQuery = this.state.search;
            const queryOptions = { headers: { 'Accept': 'application/solr+json' } };

            // The theme is now handled by the EChart base class automatically
            const statusChart = new Doughnut({ title: '' });
            statusChart.placeAt(this.statusChartNode);
            statusChart.startup();
            statusChart.showLoading();
            const statusQuery = `${baseQuery}&facet((field,genome_status),(mincount,1))&limit(0)`;
            this.genomeStore.query(statusQuery, queryOptions).then(lang.hitch(this, function (res) {
                if (res && res.facet_counts && res.facet_counts.facet_fields.genome_status) {
                    statusChart.updateChart(this._processFacets(res.facet_counts.facet_fields.genome_status));
                }
                statusChart.hideLoading();
            }), lang.hitch(this, (err) => { statusChart.hideLoading(); }));
            this.charts.push(statusChart);

            const countryChart = new Doughnut({ title: '' });
            countryChart.placeAt(this.countryChartNode);
            countryChart.startup();
            countryChart.showLoading();
            const countryQuery = `${baseQuery}&facet((field,isolation_country),(mincount,1),(limit,10))&limit(0)`;
            this.genomeStore.query(countryQuery, queryOptions).then(lang.hitch(this, function (res) {
                if (res && res.facet_counts && res.facet_counts.facet_fields.isolation_country) {
                    countryChart.updateChart(this._processFacets(res.facet_counts.facet_fields.isolation_country));
                }
                countryChart.hideLoading();
            }), lang.hitch(this, (err) => { countryChart.hideLoading(); }));
            this.charts.push(countryChart);

            const hostChart = new VerticalBar({ title: '' });
            hostChart.placeAt(this.hostChartNode);
            hostChart.startup();
            hostChart.showLoading();
            const hostQuery = `${baseQuery}&facet((field,host_common_name),(mincount,1),(limit,10))&limit(0)`;
            this.genomeStore.query(hostQuery, queryOptions).then(lang.hitch(this, function (res) {
                 if (res && res.facet_counts && res.facet_counts.facet_fields.host_common_name) {
                    hostChart.updateChart(this._processFacets(res.facet_counts.facet_fields.host_common_name));
                }
                hostChart.hideLoading();
            }), lang.hitch(this, (err) => { hostChart.hideLoading(); }));
            this.charts.push(hostChart);

            const sourceChart = new Doughnut({ title: '' });
            sourceChart.placeAt(this.sourceChartNode);
            sourceChart.startup();
            sourceChart.showLoading();
            const sourceQuery = `${baseQuery}&facet((field,isolation_source),(mincount,1),(limit,10))&limit(0)`;
            this.genomeStore.query(sourceQuery, queryOptions).then(lang.hitch(this, function (res) {
                if (res && res.facet_counts && res.facet_counts.facet_fields.isolation_source) {
                    sourceChart.updateChart(this._processFacets(res.facet_counts.facet_fields.isolation_source));
                }
                sourceChart.hideLoading();
            }), lang.hitch(this, (err) => { sourceChart.hideLoading(); }));
            this.charts.push(sourceChart);
        },

        resize: function() {
            this.inherited(arguments);
            if (this.charts && this.charts.length > 0) {
                this.charts.forEach(chart => {
                    chart.resize();
                });
            }
        },

        destroy: function() {
            if (this.charts && this.charts.length > 0) {
                this.charts.forEach(chart => chart.destroy());
            }
            this.inherited(arguments);
        }
    });
});
