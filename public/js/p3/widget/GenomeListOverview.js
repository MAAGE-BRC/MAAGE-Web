define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/on",
	"dojo/dom-class",
	"dijit/_WidgetBase",
	"dijit/_WidgetsInTemplateMixin",
	"dijit/_TemplatedMixin",
	"dojo/text!./templates/GenomeListOverview.html",
	"p3/store/GenomeJsonRest",
	"./EChartVerticalBar",
	"./EChartDoughnut",
	"./EChartStackedBar",
	"./EChartHorizontalBar",
	"./EChartAMRStackedBar",
	"./D3Choropleth",
	"p3/store/AMRJsonRest",
	"./GenomeListSummary"
], function (
	declare,
	lang,
	on,
	domClass,
	WidgetBase,
	_WidgetsInTemplateMixin,
	Templated,
	Template,
	GenomeStore,
	VerticalBar,
	Doughnut,
	StackedBar,
	HorizontalBar,
	AMRStackedBar,
	Choropleth,
	AMRStore,
	GenomeListSummary
)
{
	return declare([WidgetBase, Templated, _WidgetsInTemplateMixin], {
		baseClass: "GenomeListOverview",
		templateString: Template,
		state: null,
		charts: [],
		locationChart: null,
		currentLocationView: "state",
		amrChart: null,
		mapChart: null,
		summaryWidget: null,

		postCreate: function ()
		{
			this.inherited(arguments);
			this.genomeStore = new GenomeStore({});
			this.amrStore = new AMRStore({});

			this.own(
				on(this.countryToggleBtn, "click", lang.hitch(this, function ()
				{
					this.switchLocationView("country");
				})),
				on(this.stateToggleBtn, "click", lang.hitch(this, function ()
				{
					this.switchLocationView("state");
				})),
				on(this.countyToggleBtn, "click", lang.hitch(this, function ()
				{
					this.switchLocationView("county");
				})),
				on(this.cityToggleBtn, "click", lang.hitch(this, function ()
				{
					this.switchLocationView("city");
				})),
				on(this.amrCountBtn, "click", lang.hitch(this, function ()
				{
					this.switchAMRView("count");
				})),
				on(this.amrPercentBtn, "click", lang.hitch(this, function ()
				{
					this.switchAMRView("percent");
				})),
				on(this.amrSortNameBtn, "click", lang.hitch(this, function ()
				{
					this.switchAMRSort("name");
				})),
				on(this.amrSortValueBtn, "click", lang.hitch(this, function ()
				{
					this.switchAMRSort("value");
				}))
			);
		},

		startup: function ()
		{
			this.inherited(arguments);

			if (this.state && this.state.search)
			{
				setTimeout(lang.hitch(this, function ()
				{
					this.createCharts();
				}), 100);
			}
		},

		_setStateAttr: function (state)
		{
			this._set("state", state);
			if (this._started && this.state && this.state.search)
			{

				setTimeout(lang.hitch(this, function ()
				{
					this.createCharts();
				}), 100);
			}
		},

		switchLocationView: function (viewType)
		{
			if (this.currentLocationView === viewType) return;

			this.currentLocationView = viewType;

			domClass.toggle(this.countryToggleBtn, "active", viewType === "country");
			domClass.toggle(this.stateToggleBtn, "active", viewType === "state");
			domClass.toggle(this.countyToggleBtn, "active", viewType === "county");
			domClass.toggle(this.cityToggleBtn, "active", viewType === "city");

			if (this.locationChart)
			{
				this.locationChart.destroy();
				this.locationChart = null;
			}

			this.createLocationChart();
		},

		switchAMRView: function (viewMode)
		{
			if (!this.amrChart) return;

			domClass.toggle(this.amrCountBtn, "active", viewMode === "count");
			domClass.toggle(this.amrPercentBtn, "active", viewMode === "percent");

			this.amrChart.setViewMode(viewMode);
		},

		switchAMRSort: function (sortBy)
		{
			if (!this.amrChart) return;

			domClass.toggle(this.amrSortNameBtn, "active", sortBy === "name");
			domClass.toggle(this.amrSortValueBtn, "active", sortBy === "value");

			this.amrChart.setSortBy(sortBy);
		},

		_processFacets: function (facets)
		{
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
			for (let i = 0; i < facets.length; i += 2)
			{
				const name = facets[i] || "N/A",
					count = facets[i + 1] || 0;
				if (count > 0)
				{
					const finalName = normMap[name.toLowerCase()] || name.charAt(0).toUpperCase() + name.slice(1);
					agg[finalName] = (agg[finalName] || 0) + count;
				}
			}
			return Object.keys(agg)
				.map((k) => ({ name: k, value: agg[k] }))
				.sort((a, b) => b.value - a.value);
		},

		_processPivotFacets: function (pivotData)
		{
			if (!pivotData || pivotData.length === 0) return { categories: [], series: [] };
			const allYears = [...new Set(pivotData.map((p) => parseInt(p.value, 10)))].filter((y) => !isNaN(y)).sort();
			if (allYears.length === 0) return { categories: [], series: [] };
			const maxYearInCategories = allYears[allYears.length - 1];
			const startYear = maxYearInCategories - 9;
			const recentPivotData = pivotData.filter((p) => parseInt(p.value, 10) >= startYear);
			const categories = [...new Set(recentPivotData.map((p) => p.value))].sort();
			const seriesCounts = {};
			recentPivotData.forEach((yearData) =>
			{
				if (yearData.pivot)
				{
					yearData.pivot.forEach((seriesData) =>
					{
						seriesCounts[seriesData.value] = (seriesCounts[seriesData.value] || 0) + seriesData.count;
					});
				}
			});
			const topSeriesNames = Object.keys(seriesCounts)
				.sort((a, b) => seriesCounts[b] - seriesCounts[a])
				.slice(0, 10);
			const series = topSeriesNames.map((seriesName) => ({
				name: seriesName || "N/A",
				data: categories.map((category) =>
				{
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

		createCharts: function ()
		{
			this.charts.forEach((chart) => chart.destroy());
			this.charts = [];

			const baseQuery = this.state.search;
			const queryOptions = { headers: { Accept: "application/solr+json" } };

			const createChart = (widgetClass, node, query, theme) =>
			{
				if (!node) return;

				const checkAndCreate = () =>
				{
					const rect = node.getBoundingClientRect();
					if (rect.width > 0 && rect.height > 0)
					{
						const chart = new widgetClass({
							title: "",
							theme: theme || "maage-echarts-theme",
						});
						chart.placeAt(node);
						chart.startup();
						chart.showLoading();

						setTimeout(() =>
						{
							if (chart.resize)
							{
								chart.resize();
							}
						}, 100);

						this.genomeStore.query(query, queryOptions).then(
							lang.hitch(this, (res) =>
							{
								const field = query.match(/facet\(\(field,(\w+)\)/)[1];
								if (res && res.facet_counts && res.facet_counts.facet_fields[field])
								{
									const data = this._processFacets(res.facet_counts.facet_fields[field]);
									chart.updateChart(data);
								}
								chart.hideLoading();

								setTimeout(() =>
								{
									if (chart.resize)
									{
										chart.resize();
									}
								}, 50);
							}),
							lang.hitch(this, () =>
							{
								chart.hideLoading();
							})
						);
						this.charts.push(chart);
					} else
					{

						setTimeout(checkAndCreate, 100);
					}
				};

				checkAndCreate();
			};

			const createPivotChart = (widgetClass, node, query, theme) =>
			{
				if (!node) return;

				const checkAndCreate = () =>
				{
					const rect = node.getBoundingClientRect();
					if (rect.width > 0 && rect.height > 0)
					{
						const chart = new widgetClass({
							title: "",
							theme: theme || "maage-echarts-theme",
						});
						chart.placeAt(node);
						chart.startup();
						chart.showLoading();

						setTimeout(() =>
						{
							if (chart.resize)
							{
								chart.resize();
							}
						}, 100);

						this.genomeStore.query(query, queryOptions).then(
							lang.hitch(this, (res) =>
							{
								const pivotField = query.match(/facet\(\(pivot,\(([^,]+),([^)]+)\)\)/);
								const pivotKey = `${pivotField[1]},${pivotField[2]}`;
								const pivotData = res.facet_counts.facet_pivot[pivotKey];
								if (pivotData)
								{
									const data = this._processPivotFacets(pivotData);
									chart.updateChart(data);
								}
								chart.hideLoading();

								setTimeout(() =>
								{
									if (chart.resize)
									{
										chart.resize();
									}
								}, 50);
							}),
							lang.hitch(this, () =>
							{
								chart.hideLoading();
							})
						);
						this.charts.push(chart);
					} else
					{

						setTimeout(checkAndCreate, 100);
					}
				};

				checkAndCreate();
			};

			this.createSummaryWidget();

			this.createLocationChart();
			this.createMapChart();
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

			this.createYearlyCountChart();
			this.createAMRChart();
		},

		_createChartWhenReady: function (node, widgetClass, options, dataLoader)
		{
			if (!node) return;

			const checkAndCreate = () =>
			{
				const rect = node.getBoundingClientRect();
				if (rect.width > 0 && rect.height > 0)
				{
					const chart = new widgetClass(options);
					chart.placeAt(node);
					chart.startup();
					chart.showLoading();

					setTimeout(() =>
					{
						if (chart.resize)
						{
							chart.resize();
						}
					}, 100);

					dataLoader(chart);

					this.charts.push(chart);
				} else
				{

					setTimeout(checkAndCreate, 100);
				}
			};

			checkAndCreate();
		},

		createLocationChart: function ()
		{
			if (!this.locationChartNode || !this.state || !this.state.search) return;

			const baseQuery = this.state.search;

			const fieldMap = {
				country: "isolation_country",
				state: "state_province",
				county: "county",
				city: "city"
			};

			const field = fieldMap[this.currentLocationView];

			const needsLimit = this.currentLocationView === "county" || this.currentLocationView === "city";
			const query = `${baseQuery}&facet((field,${field}),(mincount,1)${needsLimit ? ",(limit,10)" : ""})&limit(0)`;

			this._createChartWhenReady(
				this.locationChartNode,
				Doughnut,
				{
					title: "",
					theme: "maage-muted"
				},
				lang.hitch(this, function (chart)
				{
					const queryOptions = { headers: { Accept: "application/solr+json" } };

					this.genomeStore.query(query, queryOptions).then(
						lang.hitch(this, function (res)
						{
							if (res && res.facet_counts && res.facet_counts.facet_fields[field])
							{
								const data = this._processFacets(res.facet_counts.facet_fields[field]);

								const option = {
									tooltip: {
										trigger: "item",
										formatter: "{b}: {c} ({d}%)",
									},
									legend: {
										type: data.length > 20 ? 'scroll' : 'plain',
										orient: 'horizontal',
										bottom: '5%',
										left: 'center',
										width: '90%',
										data: data.map((item) => item.name),
										itemGap: 8,
										itemWidth: 18,
										itemHeight: 10,
										textStyle: {
											fontSize: 11
										},
										pageButtonItemGap: 5,
										pageButtonGap: 15,
										pageIconSize: 12,
										pageTextStyle: {
											fontSize: 10
										}
									},
									grid: {
										top: '10%',
										bottom: '25%'
									},
									series: [
										{
											name: "Distribution",
											type: "pie",
											radius: ["40%", "60%"],
											center: ['50%', '40%'],
											avoidLabelOverlap: false,
											label: { show: false },
											emphasis: {
												label: { show: true, fontSize: "14", fontWeight: "bold" },
											},
											labelLine: { show: false },
											data: data,
										},
									],
								};
								chart.chart.setOption(option);
							}
							chart.hideLoading();

							setTimeout(() =>
							{
								if (chart.resize)
								{
									chart.resize();
								}
							}, 50);
						}),
						lang.hitch(this, function ()
						{
							chart.hideLoading();
						})
					);

					this.locationChart = chart;
				})
			);
		},

		createMapChart: function ()
		{
			if (!this.mapChartNode || !this.state || !this.state.search) return;

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
					const baseQuery = this.state.search;
					const queryOptions = { headers: { Accept: "application/solr+json" } };

					const countryQuery = `${baseQuery}&facet((field,isolation_country),(mincount,1))&limit(0)`;
					const countryPivotQuery = `${baseQuery}&facet((pivot,(isolation_country,genus)),(mincount,1))&limit(0)`;
					const countryHostQuery = `${baseQuery}&facet((pivot,(isolation_country,host_common_name)),(mincount,1))&limit(0)`;

					const stateQuery = `${baseQuery}&facet((field,state_province),(mincount,1))&limit(0)`;
					const statePivotQuery = `${baseQuery}&facet((pivot,(state_province,genus)),(mincount,1))&limit(0)`;
					const stateHostQuery = `${baseQuery}&facet((pivot,(state_province,host_common_name)),(mincount,1))&limit(0)`;

					const countyQuery = `${baseQuery}&facet((field,county),(mincount,1),(limit,1000))&limit(0)`;
					const countyPivotQuery = `${baseQuery}&facet((pivot,(county,genus)),(mincount,1),(limit,1000))&limit(0)`;

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
						lang.hitch(this, function ([
							countryRes, countryPivotRes, countryHostRes,
							stateRes, statePivotRes, stateHostRes,
							countyRes, countyPivotRes
						])
						{
							const data = {
								countryData: {},
								countryMetadata: {},
								stateData: {},
								stateMetadata: {},
								countyData: {},
								countyMetadata: {}
							};

							const processPivotData = (pivotData, parentField) =>
							{
								const metadata = {};
								if (pivotData && pivotData.facet_counts && pivotData.facet_counts.facet_pivot)
								{
									const pivotKey = Object.keys(pivotData.facet_counts.facet_pivot)[0];
									const pivots = pivotData.facet_counts.facet_pivot[pivotKey] || [];

									pivots.forEach(item =>
									{
										const location = item.value;
										metadata[location] = {
											total: item.count,
											breakdown: {}
										};

										if (item.pivot)
										{
											item.pivot.forEach(subItem =>
											{
												metadata[location].breakdown[subItem.value] = subItem.count;
											});
										}
									});
								}
								return metadata;
							};

							if (countryRes && countryRes.facet_counts && countryRes.facet_counts.facet_fields.isolation_country)
							{
								const facets = countryRes.facet_counts.facet_fields.isolation_country;
								for (let i = 0; i < facets.length; i += 2)
								{
									const name = facets[i];
									const count = facets[i + 1];
									if (name && count > 0)
									{
										data.countryData[name] = count;
									}
								}
							}

							const countryGenusData = processPivotData(countryPivotRes, "isolation_country");
							const countryHostData = processPivotData(countryHostRes, "isolation_country");

							Object.keys(data.countryData).forEach(country =>
							{
								data.countryMetadata[country] = {
									genera: countryGenusData[country]?.breakdown || {},
									hosts: countryHostData[country]?.breakdown || {}
								};
							});

							if (stateRes && stateRes.facet_counts && stateRes.facet_counts.facet_fields.state_province)
							{
								const facets = stateRes.facet_counts.facet_fields.state_province;
								for (let i = 0; i < facets.length; i += 2)
								{
									const name = facets[i];
									const count = facets[i + 1];
									if (name && count > 0)
									{
										data.stateData[name] = count;
									}
								}
							}

							const stateGenusData = processPivotData(statePivotRes, "state_province");
							const stateHostData = processPivotData(stateHostRes, "state_province");

							Object.keys(data.stateData).forEach(state =>
							{
								data.stateMetadata[state] = {
									genera: stateGenusData[state]?.breakdown || {},
									hosts: stateHostData[state]?.breakdown || {}
								};
							});

							if (countyRes && countyRes.facet_counts && countyRes.facet_counts.facet_fields.county)
							{
								const facets = countyRes.facet_counts.facet_fields.county;
								for (let i = 0; i < facets.length; i += 2)
								{
									const name = facets[i];
									const count = facets[i + 1];
									if (name && count > 0)
									{
										data.countyData[name] = count;
									}
								}
							}

							const countyGenusData = processPivotData(countyPivotRes, "county");

							Object.keys(data.countyData).forEach(county =>
							{
								data.countyMetadata[county] = {
									genera: countyGenusData[county]?.breakdown || {}
								};
							});

							console.log("Map data loaded:", data);
							chart.updateChart(data);
							chart.hideLoading();

							setTimeout(() =>
							{
								if (chart.resize)
								{
									chart.resize();
								}
							}, 50);
						}),
						lang.hitch(this, function (err)
						{
							console.error("Failed to load map data:", err);
							chart.hideLoading();
						})
					);

					this.mapChart = chart;
				})
			);
		},

		createYearlyCountChart: function ()
		{
			if (!this.yearlyCountChartNode) return;

			this._createChartWhenReady(
				this.yearlyCountChartNode,
				HorizontalBar,
				{
					title: "",
					theme: "maage-echarts-theme"
				},
				lang.hitch(this, function (chart)
				{

					const query = `${this.state.search}&facet((field,collection_year),(mincount,1))&limit(0)`;
					const queryOptions = { headers: { Accept: "application/solr+json" } };

					this.genomeStore.query(query, queryOptions).then(
						lang.hitch(this, function (res)
						{
							if (res && res.facet_counts && res.facet_counts.facet_fields.collection_year)
							{
								const yearFacets = res.facet_counts.facet_fields.collection_year;
								const chartData = [];

								for (let i = 0; i < yearFacets.length; i += 2)
								{
									const year = parseInt(yearFacets[i], 10);
									const count = yearFacets[i + 1];
									if (!isNaN(year) && count > 0)
									{
										chartData.push({
											year: year.toString(),
											value: count
										});
									}
								}

								chartData.sort((a, b) => parseInt(b.year) - parseInt(a.year));

								chart.updateChart({
									data: chartData,
									colorGradient: false
								});
							}
							chart.hideLoading();

							setTimeout(() =>
							{
								if (chart.resize)
								{
									chart.resize();
								}
							}, 50);
						}),
						lang.hitch(this, function (err)
						{
							console.error("Failed to load yearly genome data:", err);
							chart.hideLoading();
						})
					);
				})
			);
		},

		createAMRChart: function ()
		{
			if (!this.amrChartNode || !this.state || !this.state.search) return;

			if (this.amrChart)
			{
				this.amrChart.destroy();
				this.amrChart = null;
			}

			this._createChartWhenReady(
				this.amrChartNode,
				AMRStackedBar,
				{
					title: "",
					theme: "maage-echarts-theme"
				},
				lang.hitch(this, function (chart)
				{

					const baseQuery = this.state.search;
					const amrQuery = `${baseQuery}&facet((pivot,(antibiotic,resistant_phenotype,genome_id)),(mincount,1),(limit,-1))&json(nl,map)&limit(1)`;
					const queryOptions = { headers: { Accept: "application/solr+json" } };

					this.genomeStore.query(baseQuery + "&select(genome_id)&limit(25000)", queryOptions).then(
						lang.hitch(this, function (genomeRes)
						{
							if (!genomeRes || !genomeRes.response || !genomeRes.response.docs)
							{
								chart.hideLoading();
								return;
							}

							const genomeIds = genomeRes.response.docs.map(d => d.genome_id);
							if (genomeIds.length === 0)
							{
								chart.hideLoading();
								return;
							}

							const amrQuery = `in(genome_id,(${genomeIds.join(",")}))`
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
								lang.hitch(this, function (err)
								{
									console.error("Failed to load AMR data:", err);
									chart.hideLoading();
								})
							);
						}),
						lang.hitch(this, function (err)
						{
							console.error("Failed to load genome data for AMR:", err);
							chart.hideLoading();
						})
					);

					this.amrChart = chart;
				})
			);
		},

		resize: function ()
		{
			this.inherited(arguments);
			if (this.charts) this.charts.forEach((c) => c.resize());
			if (this.locationChart) this.locationChart.resize();
			if (this.amrChart) this.amrChart.resize();
			if (this.mapChart) this.mapChart.resize();
		},

		createSummaryWidget: function ()
		{
			if (!this.summaryNode || !this.state || !this.state.search) return;

			if (this.summaryWidget)
			{
				this.summaryWidget.destroy();
			}

			this.summaryWidget = new GenomeListSummary({
				state: this.state
			});

			this.summaryWidget.placeAt(this.summaryNode);
			this.summaryWidget.startup();
		},

		destroy: function ()
		{
			this.inherited(arguments);
			if (this.charts) this.charts.forEach((c) => c.destroy());
			if (this.locationChart)
			{
				this.locationChart.destroy();
				this.locationChart = null;
			}
			if (this.amrChart)
			{
				this.amrChart.destroy();
				this.amrChart = null;
			}
			if (this.mapChart)
			{
				this.mapChart.destroy();
				this.mapChart = null;
			}
			if (this.summaryWidget)
			{
				this.summaryWidget.destroy();
				this.summaryWidget = null;
			}
		},
	});
});

