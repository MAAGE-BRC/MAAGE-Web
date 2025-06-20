define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dijit/_WidgetBase",
	"dijit/_WidgetsInTemplateMixin",
	"dijit/_TemplatedMixin",
	"dojo/text!./templates/GenomeListOverview.html",
	"p3/store/GenomeJsonRest",
	"./EChartVerticalBar",
	"./EChartDoughnut",
	"./EChartStackedBar",
	"./EChartMap",
	"./EChartTimeline",
	"./EChartScatter",
	"./EChartBoxPlot",
	"./EChartTreemap"
], function (
	declare,
	lang,
	WidgetBase,
	_WidgetsInTemplateMixin,
	Templated,
	Template,
	GenomeStore,
	VerticalBar,
	Doughnut,
	StackedBar,
	EChartMap,
	EChartTimeline,
	EChartScatter,
	EChartBoxPlot,
	EChartTreemap
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

		startup: function () {
			this.inherited(arguments);
			
			if (this.state && this.state.search) {
				setTimeout(lang.hitch(this, function () {
					this.createCharts();
				}), 100);
			}
		},

		_setStateAttr: function (state) {
			this._set("state", state);
			if (this._started && this.state && this.state.search) {
				
				setTimeout(lang.hitch(this, function () {
					this.createCharts();
				}), 100);
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
			
			
			if (this.mapLegendNode) {
				this.mapLegendNode.innerHTML = '<div style="text-align: center; color: #6c757d;">Map Legend Placeholder</div>';
			}
			if (this.mapStatsNode) {
				this.mapStatsNode.innerHTML = '<div style="text-align: center; color: #6c757d;">Map Statistics Placeholder</div>';
			}

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
					lang.hitch(this, () => {
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
					lang.hitch(this, () => {
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
			
			
			this.createMapChart();
			
			
			this.createQualityScatterChart();
			this.createTimelineChart();
			this.createSizeBoxPlotChart();
			this.createCategoryTreemapChart();
			
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
			
			
			const query = `${this.state.search}&facet((field,county),(mincount,1))&limit(0)`;
			const queryOptions = { headers: { Accept: "application/solr+json" } };
			
			this.genomeStore.query(query, queryOptions).then(
				lang.hitch(this, function (res) {
					if (res && res.facet_counts && res.facet_counts.facet_fields.county) {
						const countyFacets = res.facet_counts.facet_fields.county;
						const countyData = {};
						
						
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
				lang.hitch(this, function () {
					console.error("Failed to load county data:", err);
					mapChart.hideLoading();
				})
			);
			
			this.charts.push(mapChart);
		},
		
		updateMetrics: function () {
			const baseQuery = this.state.search;
			const queryOptions = { headers: { Accept: "application/solr+json" } };
			
			
			this.genomeStore.query(`${baseQuery}&limit(0)`, queryOptions).then(
				lang.hitch(this, function (res) {
					if (res && res.response) {
						const total = res.response.numFound || 0;
						
						const totalNode = this.domNode.querySelector(".metric-card:nth-child(1) .metric-value");
						if (totalNode) totalNode.textContent = total.toLocaleString();
					}
				})
			);
			
			
			this.genomeStore.query(`${baseQuery}&eq(genome_status,Complete)&limit(0)`, queryOptions).then(
				lang.hitch(this, function (res) {
					if (res && res.response) {
						const complete = res.response.numFound || 0;
						const completeNode = this.domNode.querySelector(".metric-card:nth-child(2) .metric-value");
						if (completeNode) completeNode.textContent = complete.toLocaleString();
					}
				})
			);
			
			
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
							const uniqueCount = facets.length / 2; 
							const node = this.domNode.querySelector(`.metric-card:nth-child(${facetInfo.nodeIndex}) .metric-value`);
							if (node) node.textContent = Math.floor(uniqueCount).toLocaleString();
						}
					})
				);
			}, this);
		},

		createQualityScatterChart: function () {
			if (!this.qualityScatterNode) return;
			
			const scatterChart = new EChartScatter({
				title: "Genome Size vs GC Content",
				theme: "maage-echarts-theme"
			});
			scatterChart.placeAt(this.qualityScatterNode);
			scatterChart.startup();
			scatterChart.showLoading();
			
			
			const query = `${this.state.search}&select(genome_id,genome_name,genome_length,gc_content,contigs,genome_status)&limit(1000)`;
			const queryOptions = { headers: { Accept: "application/json" } };
			
			this.genomeStore.query(query, queryOptions).then(
				lang.hitch(this, function (genomes) {
					if (genomes && genomes.length > 0) {
						
						const data = genomes.map(function (g) {
							return [
								g.genome_length || 0,  
								g.gc_content || 0,     
								g.contigs || 1,        
								g.genome_name || "Unknown" 
							];
						});
						
						scatterChart.updateChart({
							data: data,
							xAxisName: "Genome Length (bp)",
							yAxisName: "GC Content (%)",
							sizeMetricName: "Contigs",
							symbolSize: function (val) {
								
								return Math.min(Math.sqrt(val[2]) * 3, 30);
							}
						});
					}
					scatterChart.hideLoading();
				}),
				lang.hitch(this, function () {
					console.error("Failed to load genome quality data:", err);
					scatterChart.hideLoading();
				})
			);
			
			this.charts.push(scatterChart);
		},
		
		createTimelineChart: function () {
			if (!this.timelineChartNode) return;
			
			const timelineChart = new EChartTimeline({
				title: "Genomes Collected Over Time",
				theme: "maage-echarts-theme"
			});
			timelineChart.placeAt(this.timelineChartNode);
			timelineChart.startup();
			timelineChart.showLoading();
			
			
			const query = `${this.state.search}&facet((field,collection_date),(mincount,1))&limit(0)`;
			const queryOptions = { headers: { Accept: "application/solr+json" } };
			
			this.genomeStore.query(query, queryOptions).then(
				lang.hitch(this, function (res) {
					if (res && res.facet_counts && res.facet_counts.facet_fields.collection_date) {
						const dateFacets = res.facet_counts.facet_fields.collection_date;
						const timeData = [];
						
						
						for (let i = 0; i < dateFacets.length; i += 2) {
							const date = dateFacets[i];
							const count = dateFacets[i + 1];
							if (date && count > 0) {
								timeData.push([date, count]);
							}
						}
						
						
						timeData.sort(function (a, b) {
							return new Date(a[0]) - new Date(b[0]);
						});
						
						timelineChart.updateChart({
							data: timeData,
							yAxisName: "Number of Genomes",
							showArea: true,
							enableZoom: true
						});
					}
					timelineChart.hideLoading();
				}),
				lang.hitch(this, function () {
					console.error("Failed to load timeline data:", err);
					timelineChart.hideLoading();
				})
			);
			
			this.charts.push(timelineChart);
		},
		
		createSizeBoxPlotChart: function () {
			if (!this.sizeBoxPlotNode) return;
			
			const boxPlotChart = new EChartBoxPlot({
				title: "Genome Size by Host",
				theme: "maage-echarts-theme"
			});
			boxPlotChart.placeAt(this.sizeBoxPlotNode);
			boxPlotChart.startup();
			boxPlotChart.showLoading();
			
			
			const query = `${this.state.search}&select(genome_length,host_common_name)&limit(5000)`;
			const queryOptions = { headers: { Accept: "application/json" } };
			
			this.genomeStore.query(query, queryOptions).then(
				lang.hitch(this, function (genomes) {
					if (genomes && genomes.length > 0) {
						
						const hostData = {};
						genomes.forEach(function (g) {
							const host = g.host_common_name || "Unknown";
							if (!hostData[host]) {
								hostData[host] = [];
							}
							if (g.genome_length) {
								hostData[host].push(g.genome_length);
							}
						});
						
						
						const topHosts = Object.keys(hostData)
							.sort(function (a, b) {
								return hostData[b].length - hostData[a].length;
							})
							.slice(0, 10);
						
						boxPlotChart.updateChart({
							source: topHosts.reduce(function (acc, host) {
								acc[host] = hostData[host];
								return acc;
							}, {}),
							categories: topHosts,
							yAxisName: "Genome Length (bp)",
							rotateLabels: 45
						});
					}
					boxPlotChart.hideLoading();
				}),
				lang.hitch(this, function () {
					console.error("Failed to load size distribution data:", err);
					boxPlotChart.hideLoading();
				})
			);
			
			this.charts.push(boxPlotChart);
		},
		
		createCategoryTreemapChart: function () {
			if (!this.categoryTreemapNode) return;
			
			const treemapChart = new EChartTreemap({
				title: "Genome Categories",
				theme: "maage-echarts-theme"
			});
			treemapChart.placeAt(this.categoryTreemapNode);
			treemapChart.startup();
			treemapChart.showLoading();
			
			
			const query = `${this.state.search}&facet((pivot,(host_common_name,isolation_source,serovar)),(mincount,1))&limit(0)`;
			const queryOptions = { headers: { Accept: "application/solr+json" } };
			
			this.genomeStore.query(query, queryOptions).then(
				lang.hitch(this, function (res) {
					if (res && res.facet_counts && res.facet_counts.facet_pivot) {
						const pivotData = res.facet_counts.facet_pivot["host_common_name,isolation_source,serovar"];
						
						
						const treeData = pivotData.slice(0, 10).map(function (hostData) {
							return {
								name: hostData.value || "Unknown Host",
								value: hostData.count,
								children: (hostData.pivot || []).slice(0, 5).map(function (sourceData) {
									return {
										name: sourceData.value || "Unknown Source",
										value: sourceData.count,
										children: (sourceData.pivot || []).slice(0, 3).map(function (serovarData) {
											return {
												name: serovarData.value || "Unknown Serovar",
												value: serovarData.count
											};
										})
									};
								})
							};
						});
						
						treemapChart.updateChart({
							treeData: treeData,
							leafDepth: 2
						});
					}
					treemapChart.hideLoading();
				}),
				lang.hitch(this, function () {
					console.error("Failed to load category data:", err);
					treemapChart.hideLoading();
				})
			);
			
			this.charts.push(treemapChart);
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
