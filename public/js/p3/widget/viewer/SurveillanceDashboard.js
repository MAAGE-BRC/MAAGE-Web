define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/on",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/topic",
	"dojo/number",
	"dijit/layout/ContentPane",
	"dijit/_WidgetsInTemplateMixin",
	"dijit/_TemplatedMixin",
	"dojo/text!../templates/SurveillanceDashboard.html",
	"p3/store/GenomeJsonRest",
	"p3/store/AMRJsonRest",
	"../EChartVerticalBar",
	"../EChartDoughnut",
	"../EChartStackedBar",
	"../EChartAMRStackedBar",
	"../D3Choropleth",
	"../GenomeListSummary"
], function (
	declare,
	lang,
	on,
	domClass,
	domConstruct,
	Topic,
	number,
	ContentPane,
	_WidgetsInTemplateMixin,
	Templated,
	Template,
	GenomeStore,
	AMRStore,
	VerticalBar,
	Doughnut,
	StackedBar,
	AMRStackedBar,
	Choropleth,
	GenomeListSummary
)
{
	return declare([ContentPane, Templated, _WidgetsInTemplateMixin], {
		baseClass: "SurveillanceDashboard",
		templateString: Template,
		charts: [],
		mapChart: null,
		amrChart: null,
		clusterChart: null,
		summaryWidget: null,
		currentClusterField: "cgmlst_hc5",

		// The fully composed query (preset + user filters) set by DashboardContainer
		query: "",

		// Display hints set by DashboardContainer based on the active preset
		timelineMode: "bar",       // "bar" or "stacked"
		pathogenField: "species",  // "species" or "serovar"

		postCreate: function ()
		{
			this.inherited(arguments);
			this.genomeStore = new GenomeStore({});
			this.amrStore = new AMRStore({});

			// Cluster HC buttons
			this.own(
				on(this.clusterHC5Btn, "click", lang.hitch(this, function ()
				{
					this.switchClusterView("cgmlst_hc5");
				})),
				on(this.clusterHC10Btn, "click", lang.hitch(this, function ()
				{
					this.switchClusterView("cgmlst_hc10");
				})),
				on(this.clusterHC20Btn, "click", lang.hitch(this, function ()
				{
					this.switchClusterView("cgmlst_hc20");
				})),
				on(this.clusterHC50Btn, "click", lang.hitch(this, function ()
				{
					this.switchClusterView("cgmlst_hc50");
				}))
			);

			// AMR view buttons
			this.own(
				on(this.amrCountBtn, "click", lang.hitch(this, function ()
				{
					this.switchAMRView("count");
				})),
				on(this.amrPercentBtn, "click", lang.hitch(this, function ()
				{
					this.switchAMRView("percent");
				}))
			);
		},

		startup: function ()
		{
			this.inherited(arguments);
			// Load if a query was set during construction
			if (this.query)
			{
				setTimeout(lang.hitch(this, function ()
				{
					this.loadDashboard();
				}), 100);
			}
		},

		// Called by DashboardContainer when the combined query changes
		_setQueryAttr: function (query)
		{
			var oldQuery = this.query;
			this._set("query", query || "");

			if (this._started && oldQuery !== this.query && this.query)
			{
				this.loadDashboard();
			}
		},

		// Display hint setters (no reload — query change triggers reload)
		_setTimelineModeAttr: function (mode)
		{
			this._set("timelineMode", mode || "bar");
		},

		_setPathogenFieldAttr: function (field)
		{
			this._set("pathogenField", field || "species");
		},

		switchClusterView: function (field)
		{
			if (this.currentClusterField === field) return;

			this.currentClusterField = field;
			domClass.toggle(this.clusterHC5Btn, "active", field === "cgmlst_hc5");
			domClass.toggle(this.clusterHC10Btn, "active", field === "cgmlst_hc10");
			domClass.toggle(this.clusterHC20Btn, "active", field === "cgmlst_hc20");
			domClass.toggle(this.clusterHC50Btn, "active", field === "cgmlst_hc50");

			this.createClusterChart();
		},

		switchAMRView: function (viewMode)
		{
			if (!this.amrChart) return;

			domClass.toggle(this.amrCountBtn, "active", viewMode === "count");
			domClass.toggle(this.amrPercentBtn, "active", viewMode === "percent");

			this.amrChart.setViewMode(viewMode);
		},

		loadDashboard: function ()
		{
			this.destroyCharts();

			this.createSummaryWidget();
			this.createMapChart();
			this.createTimelineChart();
			this.createPathogenChart();
			this.createClusterChart();
			this.createHostChart();
			this.createAMRChart();
			this.createRecentGenomesTable();
		},

		// ----- Shared helpers -----

		_processFacets: function (facets)
		{
			if (!facets || facets.length === 0) return [];
			var agg = {};
			for (var i = 0; i < facets.length; i += 2)
			{
				var name = facets[i] || "N/A";
				var count = facets[i + 1] || 0;
				if (count > 0)
				{
					var finalName = name.charAt(0).toUpperCase() + name.slice(1);
					agg[finalName] = (agg[finalName] || 0) + count;
				}
			}
			return Object.keys(agg)
				.map(function (k) { return { name: k, value: agg[k] }; })
				.sort(function (a, b) { return b.value - a.value; });
		},

		_processPivotFacets: function (pivotData)
		{
			if (!pivotData || pivotData.length === 0) return { categories: [], series: [] };
			var allYears = pivotData
				.map(function (p) { return parseInt(p.value, 10); })
				.filter(function (y) { return !isNaN(y); });
			allYears = allYears.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort();
			if (allYears.length === 0) return { categories: [], series: [] };

			var maxYear = allYears[allYears.length - 1];
			var startYear = maxYear - 9;
			var recentPivotData = pivotData.filter(function (p)
			{
				return parseInt(p.value, 10) >= startYear;
			});

			var categories = recentPivotData.map(function (p) { return p.value; });
			categories = categories.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort();

			var seriesCounts = {};
			recentPivotData.forEach(function (yearData)
			{
				if (yearData.pivot)
				{
					yearData.pivot.forEach(function (sd)
					{
						seriesCounts[sd.value] = (seriesCounts[sd.value] || 0) + sd.count;
					});
				}
			});

			var topSeriesNames = Object.keys(seriesCounts)
				.sort(function (a, b) { return seriesCounts[b] - seriesCounts[a]; })
				.slice(0, 10);

			var series = topSeriesNames.map(function (seriesName)
			{
				return {
					name: seriesName || "N/A",
					data: categories.map(function (cat)
					{
						var catData = recentPivotData.find(function (p) { return p.value === cat; });
						var sp = catData && catData.pivot
							? catData.pivot.find(function (p) { return p.value === seriesName; })
							: null;
						return sp ? sp.count : 0;
					})
				};
			});

			return { categories: categories, series: series };
		},

		_createChartWhenReady: function (node, widgetClass, options, dataLoader)
		{
			if (!node) return;

			var self = this;
			var checkAndCreate = function ()
			{
				var rect = node.getBoundingClientRect();
				if (rect.width > 0 && rect.height > 0)
				{
					var chart = new widgetClass(options);
					chart.placeAt(node);
					chart.startup();
					chart.showLoading();

					setTimeout(function ()
					{
						if (chart.resize) chart.resize();
					}, 100);

					dataLoader(chart);
					self.charts.push(chart);
				} else
				{
					setTimeout(checkAndCreate, 100);
				}
			};

			checkAndCreate();
		},

		// ----- Chart creation methods -----

		createSummaryWidget: function ()
		{
			if (!this.summaryNode) return;

			if (this.summaryWidget)
			{
				this.summaryWidget.destroy();
			}

			this.summaryWidget = new GenomeListSummary({
				state: { search: this.query }
			});
			this.summaryWidget.placeAt(this.summaryNode);
			this.summaryWidget.startup();
		},

		createMapChart: function ()
		{
			if (!this.mapChartNode) return;

			this._createChartWhenReady(
				this.mapChartNode,
				Choropleth,
				{
					title: "Genome Distribution",
					theme: "maage-echarts-theme",
					externalControlsContainer: this.mapControlsContainer
				},
				lang.hitch(this, function (chart)
				{
					var baseQuery = this.query;
					var queryOptions = { headers: { Accept: "application/solr+json" } };

					var countryQuery = baseQuery + "&facet((field,isolation_country),(mincount,1))&limit(0)";
					var countryPivotQuery = baseQuery + "&facet((pivot,(isolation_country,genus)),(mincount,1))&limit(0)";
					var countryHostQuery = baseQuery + "&facet((pivot,(isolation_country,host_common_name)),(mincount,1))&limit(0)";
					var stateQuery = baseQuery + "&facet((field,state_province),(mincount,1))&limit(0)";
					var statePivotQuery = baseQuery + "&facet((pivot,(state_province,genus)),(mincount,1))&limit(0)";
					var stateHostQuery = baseQuery + "&facet((pivot,(state_province,host_common_name)),(mincount,1))&limit(0)";
					var countyQuery = baseQuery + "&facet((field,county),(mincount,1),(limit,1000))&limit(0)";
					var countyPivotQuery = baseQuery + "&facet((pivot,(county,genus)),(mincount,1),(limit,1000))&limit(0)";

					Promise.all([
						this.genomeStore.query(countryQuery, queryOptions),
						this.genomeStore.query(countryPivotQuery, queryOptions),
						this.genomeStore.query(countryHostQuery, queryOptions),
						this.genomeStore.query(stateQuery, queryOptions),
						this.genomeStore.query(statePivotQuery, queryOptions),
						this.genomeStore.query(stateHostQuery, queryOptions),
						this.genomeStore.query(countyQuery, queryOptions),
						this.genomeStore.query(countyPivotQuery, queryOptions)
					]).then(
						lang.hitch(this, function (results)
						{
							var countryRes = results[0];
							var countryPivotRes = results[1];
							var countryHostRes = results[2];
							var stateRes = results[3];
							var statePivotRes = results[4];
							var stateHostRes = results[5];
							var countyRes = results[6];
							var countyPivotRes = results[7];

							var data = {
								countryData: {},
								countryMetadata: {},
								stateData: {},
								stateMetadata: {},
								countyData: {},
								countyMetadata: {}
							};

							var processPivotData = function (pivotRes)
							{
								var metadata = {};
								if (pivotRes && pivotRes.facet_counts && pivotRes.facet_counts.facet_pivot)
								{
									var pivotKey = Object.keys(pivotRes.facet_counts.facet_pivot)[0];
									var pivots = pivotRes.facet_counts.facet_pivot[pivotKey] || [];
									pivots.forEach(function (item)
									{
										metadata[item.value] = {
											total: item.count,
											breakdown: {}
										};
										if (item.pivot)
										{
											item.pivot.forEach(function (subItem)
											{
												metadata[item.value].breakdown[subItem.value] = subItem.count;
											});
										}
									});
								}
								return metadata;
							};

							// Country data
							if (countryRes && countryRes.facet_counts && countryRes.facet_counts.facet_fields.isolation_country)
							{
								var facets = countryRes.facet_counts.facet_fields.isolation_country;
								for (var i = 0; i < facets.length; i += 2)
								{
									if (facets[i] && facets[i + 1] > 0) data.countryData[facets[i]] = facets[i + 1];
								}
							}
							var countryGenusData = processPivotData(countryPivotRes);
							var countryHostData = processPivotData(countryHostRes);
							Object.keys(data.countryData).forEach(function (c)
							{
								data.countryMetadata[c] = {
									genera: (countryGenusData[c] && countryGenusData[c].breakdown) || {},
									hosts: (countryHostData[c] && countryHostData[c].breakdown) || {}
								};
							});

							// State data
							if (stateRes && stateRes.facet_counts && stateRes.facet_counts.facet_fields.state_province)
							{
								var facets = stateRes.facet_counts.facet_fields.state_province;
								for (var i = 0; i < facets.length; i += 2)
								{
									if (facets[i] && facets[i + 1] > 0) data.stateData[facets[i]] = facets[i + 1];
								}
							}
							var stateGenusData = processPivotData(statePivotRes);
							var stateHostData = processPivotData(stateHostRes);
							Object.keys(data.stateData).forEach(function (s)
							{
								data.stateMetadata[s] = {
									genera: (stateGenusData[s] && stateGenusData[s].breakdown) || {},
									hosts: (stateHostData[s] && stateHostData[s].breakdown) || {}
								};
							});

							// County data
							if (countyRes && countyRes.facet_counts && countyRes.facet_counts.facet_fields.county)
							{
								var facets = countyRes.facet_counts.facet_fields.county;
								for (var i = 0; i < facets.length; i += 2)
								{
									if (facets[i] && facets[i + 1] > 0) data.countyData[facets[i]] = facets[i + 1];
								}
							}
							var countyGenusData = processPivotData(countyPivotRes);
							Object.keys(data.countyData).forEach(function (c)
							{
								data.countyMetadata[c] = {
									genera: (countyGenusData[c] && countyGenusData[c].breakdown) || {}
								};
							});

							chart.updateChart(data);
							chart.hideLoading();

							setTimeout(function () { if (chart.resize) chart.resize(); }, 50);
						}),
						function (err)
						{
							console.error("Dashboard: Failed to load map data:", err);
							chart.hideLoading();
						}
					);

					this.mapChart = chart;
				})
			);
		},

		createTimelineChart: function ()
		{
			if (!this.timelineChartNode) return;

			var baseQuery = this.query;

			if (this.timelineMode === "stacked")
			{
				var query = baseQuery + "&facet((pivot,(collection_year,serovar)),(mincount,1))&limit(0)";

				this._createChartWhenReady(
					this.timelineChartNode,
					StackedBar,
					{ title: "", theme: "maage-muted" },
					lang.hitch(this, function (chart)
					{
						var queryOptions = { headers: { Accept: "application/solr+json" } };
						this.genomeStore.query(query, queryOptions).then(
							lang.hitch(this, function (res)
							{
								var pivotKey = "collection_year,serovar";
								var pivotData = res.facet_counts.facet_pivot[pivotKey];
								if (pivotData)
								{
									chart.updateChart(this._processPivotFacets(pivotData));
								}
								chart.hideLoading();
								setTimeout(function () { if (chart.resize) chart.resize(); }, 50);
							}),
							function () { chart.hideLoading(); }
						);
					})
				);
			} else
			{
				var query = baseQuery + "&facet((field,collection_year),(mincount,1))&limit(0)";

				this._createChartWhenReady(
					this.timelineChartNode,
					VerticalBar,
					{ title: "", theme: "maage-echarts-theme" },
					lang.hitch(this, function (chart)
					{
						var queryOptions = { headers: { Accept: "application/solr+json" } };
						this.genomeStore.query(query, queryOptions).then(
							lang.hitch(this, function (res)
							{
								if (res && res.facet_counts && res.facet_counts.facet_fields.collection_year)
								{
									var yearFacets = res.facet_counts.facet_fields.collection_year;
									var chartData = [];
									for (var i = 0; i < yearFacets.length; i += 2)
									{
										var year = parseInt(yearFacets[i], 10);
										var count = yearFacets[i + 1];
										if (!isNaN(year) && count > 0)
										{
											chartData.push({ name: year.toString(), value: count });
										}
									}
									chartData.sort(function (a, b) { return parseInt(a.name) - parseInt(b.name); });
									chart.updateChart(chartData.slice(-10));
								}
								chart.hideLoading();
								setTimeout(function () { if (chart.resize) chart.resize(); }, 50);
							}),
							function () { chart.hideLoading(); }
						);
					})
				);
			}
		},

		createPathogenChart: function ()
		{
			if (!this.pathogenChartNode) return;

			var baseQuery = this.query;
			var field = this.pathogenField;
			var query = baseQuery + "&facet((field," + field + "),(mincount,1),(limit,10))&limit(0)";

			this._createChartWhenReady(
				this.pathogenChartNode,
				Doughnut,
				{ title: "", theme: "maage-muted" },
				lang.hitch(this, function (chart)
				{
					var queryOptions = { headers: { Accept: "application/solr+json" } };
					this.genomeStore.query(query, queryOptions).then(
						lang.hitch(this, function (res)
						{
							if (res && res.facet_counts && res.facet_counts.facet_fields[field])
							{
								var data = this._processFacets(res.facet_counts.facet_fields[field]);
								var displayField = field.charAt(0).toUpperCase() + field.slice(1);

								var option = {
									tooltip: {
										trigger: "item",
										formatter: "{b}: {c} ({d}%)"
									},
									legend: {
										type: data.length > 10 ? "scroll" : "plain",
										orient: "horizontal",
										bottom: "5%",
										left: "center",
										width: "90%",
										data: data.map(function (item) { return item.name; }),
										itemGap: 8,
										itemWidth: 18,
										itemHeight: 10,
										textStyle: { fontSize: 11 }
									},
									series: [{
										name: displayField + " Distribution",
										type: "pie",
										radius: ["40%", "60%"],
										center: ["50%", "40%"],
										avoidLabelOverlap: false,
										label: { show: false },
										emphasis: {
											label: { show: true, fontSize: "14", fontWeight: "bold" }
										},
										labelLine: { show: false },
										data: data
									}]
								};
								chart.chart.setOption(option);

								// Click to navigate to genome list
								chart.chart.on("click", lang.hitch(this, function (params)
								{
									if (params.componentType === "series" && params.seriesType === "pie")
									{
										var val = params.name;
										var encodedVal = /[^a-zA-Z0-9_.-]/.test(val)
											? '"' + val.replace(/\//g, '%2F').replace(/:/g, '%3A').replace(/\s/g, '%20') + '"'
											: val;
										var q = this.query;
										var newQuery = q.startsWith("and(")
											? q.slice(0, -1) + ",eq(" + field + "," + encodedVal + "))"
											: "and(" + q + ",eq(" + field + "," + encodedVal + "))";
										Topic.publish("/navigate", {
											href: "/view/GenomeList/?" + newQuery + "#view_tab=genomes"
										});
									}
								}));
							}
							chart.hideLoading();
							setTimeout(function () { if (chart.resize) chart.resize(); }, 50);
						}),
						function () { chart.hideLoading(); }
					);
				})
			);
		},

		createClusterChart: function ()
		{
			if (!this.clusterChartNode) return;

			var baseQuery = this.query;
			var field = this.currentClusterField;
			var query = baseQuery + "&facet((field," + field + "),(mincount,1),(limit,15))&limit(0)";

			if (this.clusterChart)
			{
				this.clusterChart.destroy();
				this.clusterChart = null;
			}

			var fieldLabel = field.replace("cgmlst_", "").toUpperCase();

			this._createChartWhenReady(
				this.clusterChartNode,
				Doughnut,
				{ title: "", theme: "maage-muted" },
				lang.hitch(this, function (chart)
				{
					var queryOptions = { headers: { Accept: "application/solr+json" } };
					this.genomeStore.query(query, queryOptions).then(
						lang.hitch(this, function (res)
						{
							if (res && res.facet_counts && res.facet_counts.facet_fields[field])
							{
								var data = this._processFacets(res.facet_counts.facet_fields[field]);

								var option = {
									tooltip: {
										trigger: "item",
										formatter: "{b}: {c} ({d}%)"
									},
									legend: {
										type: data.length > 10 ? "scroll" : "plain",
										orient: "horizontal",
										bottom: "5%",
										left: "center",
										width: "90%",
										data: data.map(function (item) { return item.name; }),
										itemGap: 8,
										itemWidth: 18,
										itemHeight: 10,
										textStyle: { fontSize: 11 }
									},
									series: [{
										name: fieldLabel + " Clusters",
										type: "pie",
										radius: ["40%", "60%"],
										center: ["50%", "40%"],
										avoidLabelOverlap: false,
										label: { show: false },
										emphasis: {
											label: { show: true, fontSize: "14", fontWeight: "bold" }
										},
										labelLine: { show: false },
										data: data
									}]
								};
								chart.chart.setOption(option);

								// Click to navigate
								chart.chart.on("click", lang.hitch(this, function (params)
								{
									if (params.componentType === "series" && params.seriesType === "pie")
									{
										var val = params.name;
										var encodedVal = /[^a-zA-Z0-9_.-]/.test(val) ? '"' + val + '"' : val;
										var q = this.query;
										var newQuery = q.startsWith("and(")
											? q.slice(0, -1) + ",eq(" + field + "," + encodedVal + "))"
											: "and(" + q + ",eq(" + field + "," + encodedVal + "))";
										Topic.publish("/navigate", {
											href: "/view/GenomeList/?" + newQuery + "#view_tab=genomes"
										});
									}
								}));
							}
							chart.hideLoading();
							setTimeout(function () { if (chart.resize) chart.resize(); }, 50);
						}),
						function () { chart.hideLoading(); }
					);

					this.clusterChart = chart;
				})
			);
		},

		createHostChart: function ()
		{
			if (!this.hostChartNode) return;

			var baseQuery = this.query;
			var query = baseQuery + "&facet((field,host_common_name),(mincount,1),(limit,10))&limit(0)";

			this._createChartWhenReady(
				this.hostChartNode,
				Doughnut,
				{ title: "", theme: "maage-muted" },
				lang.hitch(this, function (chart)
				{
					var queryOptions = { headers: { Accept: "application/solr+json" } };
					this.genomeStore.query(query, queryOptions).then(
						lang.hitch(this, function (res)
						{
							if (res && res.facet_counts && res.facet_counts.facet_fields.host_common_name)
							{
								var data = this._processFacets(res.facet_counts.facet_fields.host_common_name);
								chart.updateChart(data);

								chart.chart.on("click", lang.hitch(this, function (params)
								{
									if (params.componentType === "series")
									{
										var val = params.name;
										var encodedVal = /[^a-zA-Z0-9_.-]/.test(val)
											? '"' + val.replace(/\//g, '%2F').replace(/:/g, '%3A').replace(/\s/g, '%20') + '"'
											: val;
										var q = this.query;
										var newQuery = q.startsWith("and(")
											? q.slice(0, -1) + ",eq(host_common_name," + encodedVal + "))"
											: "and(" + q + ",eq(host_common_name," + encodedVal + "))";
										Topic.publish("/navigate", {
											href: "/view/GenomeList/?" + newQuery + "#view_tab=genomes"
										});
									}
								}));
							}
							chart.hideLoading();
							setTimeout(function () { if (chart.resize) chart.resize(); }, 50);
						}),
						function () { chart.hideLoading(); }
					);
				})
			);
		},

		createAMRChart: function ()
		{
			if (!this.amrChartNode) return;

			if (this.amrChart)
			{
				this.amrChart.destroy();
				this.amrChart = null;
			}

			this._createChartWhenReady(
				this.amrChartNode,
				AMRStackedBar,
				{ title: "", theme: "maage-echarts-theme" },
				lang.hitch(this, function (chart)
				{
					var baseQuery = this.query;
					var queryOptions = { headers: { Accept: "application/solr+json" } };

					this.genomeStore.query(baseQuery + "&select(genome_id)&limit(25000)", queryOptions).then(
						lang.hitch(this, function (genomeRes)
						{
							if (!genomeRes || !genomeRes.response || !genomeRes.response.docs)
							{
								chart.hideLoading();
								return;
							}

							var genomeIds = genomeRes.response.docs.map(function (d) { return d.genome_id; });
							if (genomeIds.length === 0)
							{
								chart.hideLoading();
								return;
							}

							var amrQuery = "in(genome_id,(" + genomeIds.join(",") + "))"
								+ "&in(resistant_phenotype,(Resistant,Susceptible,Intermediate))"
								+ "&facet((pivot,(antibiotic,resistant_phenotype)),(mincount,1),(limit,-1))&json(nl,map)&limit(1)";

							this.amrStore.query(amrQuery, queryOptions).then(
								lang.hitch(this, function (res)
								{
									if (res && res.facet_counts && res.facet_counts.facet_pivot)
									{
										chart.updateChart(res.facet_counts);
									}
									chart.hideLoading();
								}),
								function ()
								{
									chart.hideLoading();
								}
							);
						}),
						function ()
						{
							chart.hideLoading();
						}
					);

					this.amrChart = chart;
				})
			);
		},

		createRecentGenomesTable: function ()
		{
			if (!this.recentGenomesNode) return;

			domConstruct.empty(this.recentGenomesNode);

			var loadingNode = domConstruct.create("div", {
				className: "flex items-center justify-center p-8",
				innerHTML: '<div class="text-center">'
					+ '<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-maage-primary-500"></div>'
					+ '<div class="mt-2 text-sm text-maage-text-muted">Loading recent genomes...</div>'
					+ '</div>'
			}, this.recentGenomesNode);

			var baseQuery = this.query;
			var query = baseQuery + "&select(genome_id,genome_name,species,serovar,state_province,collection_date,host_common_name,genome_status)&sort(-date_inserted)&limit(20)";
			var queryOptions = { headers: { Accept: "application/json" } };

			this.genomeStore.query(query, queryOptions).then(
				lang.hitch(this, function (res)
				{
					domConstruct.destroy(loadingNode);

					var docs = res;
					if (!docs || docs.length === 0)
					{
						domConstruct.create("div", {
							className: "p-6 text-center text-sm text-maage-text-muted",
							textContent: "No genomes found matching the current filters."
						}, this.recentGenomesNode);
						return;
					}

					var tableWrapper = domConstruct.create("div", {
						className: "overflow-x-auto"
					}, this.recentGenomesNode);

					var table = domConstruct.create("table", {
						className: "w-full text-sm"
					}, tableWrapper);

					var thead = domConstruct.create("thead", {}, table);
					var headerRow = domConstruct.create("tr", {
						className: "border-b border-maage-border bg-maage-surface"
					}, thead);

					var columns = [
						{ label: "Genome Name", field: "genome_name" },
						{ label: "Species", field: "species" },
						{ label: "Serotype", field: "serovar" },
						{ label: "Location", field: "state_province" },
						{ label: "Collection Date", field: "collection_date" },
						{ label: "Host", field: "host_common_name" },
						{ label: "Status", field: "genome_status" }
					];

					columns.forEach(function (col)
					{
						domConstruct.create("th", {
							className: "px-3 py-2 text-left text-xs font-medium text-maage-text-muted uppercase tracking-wider",
							textContent: col.label
						}, headerRow);
					});

					var tbody = domConstruct.create("tbody", {}, table);

					docs.forEach(lang.hitch(this, function (doc, idx)
					{
						var row = domConstruct.create("tr", {
							className: (idx % 2 === 0 ? "bg-white" : "bg-maage-surface/50")
								+ " border-b border-maage-border/50 hover:bg-maage-primary-50 cursor-pointer transition-colors"
						}, tbody);

						on(row, "click", function ()
						{
							Topic.publish("/navigate", {
								href: "/view/Genome/" + doc.genome_id + "#view_tab=overview"
							});
						});

						columns.forEach(function (col)
						{
							var val = doc[col.field] || "-";
							var td = domConstruct.create("td", {
								className: "px-3 py-2 text-maage-text whitespace-nowrap"
							}, row);

							if (col.field === "genome_name")
							{
								domConstruct.create("span", {
									className: "text-maage-primary-600 font-medium",
									textContent: val.length > 50 ? val.substring(0, 47) + "..." : val,
									title: val
								}, td);
							} else if (col.field === "genome_status")
							{
								var statusColors = {
									"Complete": "bg-green-100 text-green-800",
									"WGS": "bg-blue-100 text-blue-800",
									"Plasmid": "bg-purple-100 text-purple-800"
								};
								domConstruct.create("span", {
									className: "inline-flex px-2 py-0.5 rounded-full text-xs font-medium "
										+ (statusColors[val] || "bg-gray-100 text-gray-800"),
									textContent: val
								}, td);
							} else
							{
								td.textContent = val;
							}
						});
					}));

					var footer = domConstruct.create("div", {
						className: "p-3 text-center border-t border-maage-border"
					}, this.recentGenomesNode);

					var viewAllLink = domConstruct.create("a", {
						className: "text-sm text-maage-primary-600 hover:text-maage-primary-800 font-medium cursor-pointer",
						textContent: "View all matching genomes"
					}, footer);

					on(viewAllLink, "click", lang.hitch(this, function ()
					{
						Topic.publish("/navigate", {
							href: "/view/GenomeList/?" + this.query + "#view_tab=genomes"
						});
					}));
				}),
				lang.hitch(this, function (err)
				{
					domConstruct.destroy(loadingNode);
					domConstruct.create("div", {
						className: "p-6 text-center text-sm text-red-600",
						textContent: "Failed to load recent genomes."
					}, this.recentGenomesNode);
					console.error("Dashboard: Failed to load recent genomes:", err);
				})
			);
		},

		// ----- Cleanup -----

		destroyCharts: function ()
		{
			if (this.charts)
			{
				this.charts.forEach(function (c) { c.destroy(); });
			}
			this.charts = [];

			if (this.mapChart)
			{
				this.mapChart.destroy();
				this.mapChart = null;
			}
			if (this.amrChart)
			{
				this.amrChart.destroy();
				this.amrChart = null;
			}
			if (this.clusterChart)
			{
				this.clusterChart.destroy();
				this.clusterChart = null;
			}
			if (this.summaryWidget)
			{
				this.summaryWidget.destroy();
				this.summaryWidget = null;
			}

			if (this.mapChartNode) domConstruct.empty(this.mapChartNode);
			if (this.timelineChartNode) domConstruct.empty(this.timelineChartNode);
			if (this.pathogenChartNode) domConstruct.empty(this.pathogenChartNode);
			if (this.clusterChartNode) domConstruct.empty(this.clusterChartNode);
			if (this.hostChartNode) domConstruct.empty(this.hostChartNode);
			if (this.amrChartNode) domConstruct.empty(this.amrChartNode);
			if (this.summaryNode) domConstruct.empty(this.summaryNode);
			if (this.recentGenomesNode) domConstruct.empty(this.recentGenomesNode);
		},

		resize: function ()
		{
			this.inherited(arguments);
			if (this.charts) this.charts.forEach(function (c) { c.resize(); });
			if (this.mapChart) this.mapChart.resize();
			if (this.amrChart) this.amrChart.resize();
			if (this.clusterChart) this.clusterChart.resize();
		},

		destroy: function ()
		{
			this.destroyCharts();
			this.inherited(arguments);
		}
	});
});
