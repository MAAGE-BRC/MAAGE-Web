define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/on",
	"dijit/_WidgetBase",
	"dijit/_WidgetsInTemplateMixin",
	"dijit/_TemplatedMixin",
	"dojo/text!./templates/GenomeListOverview.html",
	"p3/store/GenomeJsonRest",
	"./EChartVerticalBar",
	"./EChartDoughnut",
	"./EChartStackedBar",
	"./EChartMap",
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
	StackedBar,
	EChartMap
) {
	return declare([WidgetBase, Templated, _WidgetsInTemplateMixin], {
		baseClass: "GenomeListOverview",
		templateString: Template,
		state: null,
		charts: [],

		postCreate: function () {
			this.inherited(arguments);
			this.genomeStore = new GenomeStore({});
		},

		_setStateAttr: function (state) {
			this._set("state", state);
			if (this.state && this.state.search) {
				this.createCharts();
			}
		},

		_processFacets: function (facets) {
			if (!facets || facets.length === 0) return [];
			const normMap = {
				stool: "Stool",
				"whole blood": "Blood",
				blood: "Blood",
				urine: "Urine",
				wound: "Wound",
				unknown: "Unknown",
				na: "N/A",
				"n/a": "N/A",
			};
			const agg = {};
			for (let i = 0; i < facets.length; i += 2) {
				const name = facets[i] || "N/A",
					count = facets[i + 1] || 0;
				if (count > 0) {
					const finalName = normMap[name.toLowerCase()] || name.charAt(0).toUpperCase() + name.slice(1);
					agg[finalName] = (agg[finalName] || 0) + count;
				}
			}
			return Object.keys(agg)
				.map((k) => ({ name: k, value: agg[k] }))
				.sort((a, b) => b.value - a.value);
		},

		_processPivotFacets: function (pivotData) {
			if (!pivotData || pivotData.length === 0) return { categories: [], series: [] };
			const allYears = [...new Set(pivotData.map((p) => parseInt(p.value, 10)))].filter((y) => !isNaN(y)).sort();
			if (allYears.length === 0) return { categories: [], series: [] };
			const maxYearInCategories = allYears[allYears.length - 1];
			const startYear = maxYearInCategories - 9;
			const recentPivotData = pivotData.filter((p) => parseInt(p.value, 10) >= startYear);
			const categories = [...new Set(recentPivotData.map((p) => p.value))].sort();
			const seriesCounts = {};
			recentPivotData.forEach((yearData) => {
				if (yearData.pivot) {
					yearData.pivot.forEach((seriesData) => {
						seriesCounts[seriesData.value] = (seriesCounts[seriesData.value] || 0) + seriesData.count;
					});
				}
			});
			const topSeriesNames = Object.keys(seriesCounts)
				.sort((a, b) => seriesCounts[b] - seriesCounts[a])
				.slice(0, 10);
			const series = topSeriesNames.map((seriesName) => ({
				name: seriesName || "N/A",
				data: categories.map((category) => {
					const categoryData = recentPivotData.find((p) => p.value === category);
					const seriesPoint =
						categoryData && categoryData.pivot
							? categoryData.pivot.find((p) => p.value === seriesName)
							: null;
					return seriesPoint ? seriesPoint.count : 0;
				}),
			}));
			return { categories: categories, series: series };
		},

		createCharts: function () {
			this.charts.forEach((chart) => chart.destroy());
			this.charts = [];

			const baseQuery = this.state.search;
			const queryOptions = { headers: { Accept: "application/solr+json" } };

			const createChart = (widgetClass, node, query, theme) => {
				if (!node) return;
				const chart = new widgetClass({
					title: "",
					theme: theme || "maage-echarts-theme",
				});
				chart.placeAt(node);
				chart.startup();
				chart.showLoading();
				this.genomeStore.query(query, queryOptions).then(
					lang.hitch(this, (res) => {
						const field = query.match(/facet\(\(field,(\w+)\)/)[1];
						if (res && res.facet_counts && res.facet_counts.facet_fields[field]) {
							const data = this._processFacets(res.facet_counts.facet_fields[field]);
							chart.updateChart(data);
						}
						chart.hideLoading();
					}),
					lang.hitch(this, (err) => {
						chart.hideLoading();
					})
				);
				this.charts.push(chart);
			};

			const createPivotChart = (widgetClass, node, query, theme) => {
				if (!node) return;
				const chart = new widgetClass({
					title: "",
					theme: theme || "maage-echarts-theme",
				});
				chart.placeAt(node);
				chart.startup();
				chart.showLoading();
				this.genomeStore.query(query, queryOptions).then(
					lang.hitch(this, (res) => {
						const pivotField = query.match(/facet\(\(pivot,\(([^,]+),([^)]+)\)\)/);
						const pivotKey = `${pivotField[1]},${pivotField[2]}`;
						const pivotData = res.facet_counts.facet_pivot[pivotKey];
						if (pivotData) {
							const data = this._processPivotFacets(pivotData);
							chart.updateChart(data);
						}
						chart.hideLoading();
					}),
					lang.hitch(this, (err) => {
						chart.hideLoading();
					})
				);
				this.charts.push(chart);
			};

			createChart(
				Doughnut,
				this.statusChartNode,
				`${baseQuery}&facet((field,genome_status),(mincount,1))&limit(0)`,
				"maage-muted"
			);
			createChart(
				Doughnut,
				this.countryChartNode,
				`${baseQuery}&facet((field,isolation_country),(mincount,1),(limit,10))&limit(0)`,
				"maage-muted"
			);
			createChart(
				VerticalBar,
				this.hostChartNode,
				`${baseQuery}&facet((field,host_common_name),(mincount,1),(limit,10))&limit(0)`,
				"maage-muted"
			);
			createChart(
				Doughnut,
				this.sourceChartNode,
				`${baseQuery}&facet((field,isolation_source),(mincount,1),(limit,10))&limit(0)`,
				"maage-muted"
			);
			createChart(
				Doughnut,
				this.serotypeChartNode,
				`${baseQuery}&facet((field,serovar),(mincount,1),(limit,10))&limit(0)`,
				"maage-muted"
			);
			createPivotChart(
				StackedBar,
				this.serotypeOverTimeChartNode,
				`${baseQuery}&facet((pivot,(collection_year,serovar)),(mincount,1))&limit(0)`,
				"maage-muted"
			);
			
			// Create the map chart for county data
			this.createMapChart();
			
			// Update the metrics
			this.updateMetrics();
		},
		
		createMapChart: function () {
			if (!this.mapChartNode) return;
			
			const mapChart = new EChartMap({
				title: "Genome Distribution by County",
				theme: "maage-echarts-theme"
			});
			mapChart.placeAt(this.mapChartNode);
			mapChart.startup();
			mapChart.showLoading();
			
			// Query for county data with faceting
			const query = `${this.state.search}&facet((field,county),(mincount,1))&limit(0)`;
			const queryOptions = { headers: { Accept: "application/solr+json" } };
			
			this.genomeStore.query(query, queryOptions).then(
				lang.hitch(this, function (res) {
					if (res && res.facet_counts && res.facet_counts.facet_fields.county) {
						const countyFacets = res.facet_counts.facet_fields.county;
						const countyData = {};
						
						// Process facets into county data object
						for (let i = 0; i < countyFacets.length; i += 2) {
							const county = countyFacets[i];
							const count = countyFacets[i + 1];
							if (county && count > 0) {
								countyData[county] = count;
							}
						}
						
						mapChart.updateChart({ countyData: countyData });
					}
					mapChart.hideLoading();
				}),
				lang.hitch(this, function (err) {
					console.error("Failed to load county data:", err);
					mapChart.hideLoading();
				})
			);
			
			this.charts.push(mapChart);
		},
		
		updateMetrics: function () {
			const baseQuery = this.state.search;
			const queryOptions = { headers: { Accept: "application/solr+json" } };
			
			// Query for basic stats
			this.genomeStore.query(`${baseQuery}&limit(0)`, queryOptions).then(
				lang.hitch(this, function (res) {
					if (res && res.response) {
						const total = res.response.numFound || 0;
						// Update total genomes metric
						const totalNode = this.domNode.querySelector(".metric-card:nth-child(1) .metric-value");
						if (totalNode) totalNode.textContent = total.toLocaleString();
					}
				})
			);
			
			// Query for complete genomes
			this.genomeStore.query(`${baseQuery}&eq(genome_status,Complete)&limit(0)`, queryOptions).then(
				lang.hitch(this, function (res) {
					if (res && res.response) {
						const complete = res.response.numFound || 0;
						const completeNode = this.domNode.querySelector(".metric-card:nth-child(2) .metric-value");
						if (completeNode) completeNode.textContent = complete.toLocaleString();
					}
				})
			);
			
			// Query for unique hosts, countries, and isolates
			const facetQueries = [
				{ field: "host_common_name", nodeIndex: 3 },
				{ field: "isolation_country", nodeIndex: 4 },
				{ field: "serovar", nodeIndex: 5 }
			];
			
			facetQueries.forEach(function (facetInfo) {
				this.genomeStore.query(`${baseQuery}&facet((field,${facetInfo.field}))&limit(0)`, queryOptions).then(
					lang.hitch(this, function (res) {
						if (res && res.facet_counts && res.facet_counts.facet_fields[facetInfo.field]) {
							const facets = res.facet_counts.facet_fields[facetInfo.field];
							const uniqueCount = facets.length / 2; // Facets come in pairs
							const node = this.domNode.querySelector(`.metric-card:nth-child(${facetInfo.nodeIndex}) .metric-value`);
							if (node) node.textContent = Math.floor(uniqueCount).toLocaleString();
						}
					})
				);
			}, this);
		},

		resize: function () {
			this.inherited(arguments);
			if (this.charts) this.charts.forEach((c) => c.resize());
		},

		destroy: function () {
			this.inherited(arguments);
			if (this.charts) this.charts.forEach((c) => c.destroy());
		},
	});
});
