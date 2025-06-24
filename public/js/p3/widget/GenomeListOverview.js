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
	"./EChartHorizontalBar"
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
	HorizontalBar
)
{
	return declare([WidgetBase, Templated, _WidgetsInTemplateMixin], {
		baseClass: "GenomeListOverview",
		templateString: Template,
		state: null,
		charts: [],
		locationChart: null,
		currentLocationView: "state",

		postCreate: function ()
		{
			this.inherited(arguments);
			this.genomeStore = new GenomeStore({});

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

			this.createLocationChart();
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
			
			// Map view types to field names
			const fieldMap = {
				country: "isolation_country",
				state: "state_province",
				county: "county",
				city: "city"
			};
			
			const field = fieldMap[this.currentLocationView];
			// Apply limit for county and city to show top 10
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
								
								// Custom configuration for location charts with bottom legend
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

		createYearlyCountChart: function ()
		{
			if (!this.yearlyCountChartNode) return;

			this._createChartWhenReady(
				this.yearlyCountChartNode,
				HorizontalBar,
				{
					title: "Total Genomes by Year",
					theme: "maage-echarts-theme"
				},
				lang.hitch(this, function (chart)
				{

					const currentYear = new Date().getFullYear();
					const startYear = currentYear - 9;

					const query = `${this.state.search}&facet((field,collection_year),(mincount,1))&limit(0)`;
					const queryOptions = { headers: { Accept: "application/solr+json" } };

					this.genomeStore.query(query, queryOptions).then(
						lang.hitch(this, function (res)
						{
							if (res && res.facet_counts && res.facet_counts.facet_fields.collection_year)
							{
								const yearFacets = res.facet_counts.facet_fields.collection_year;
								const yearData = {};

								for (let i = 0; i < yearFacets.length; i += 2)
								{
									const year = parseInt(yearFacets[i], 10);
									const count = yearFacets[i + 1];
									if (!isNaN(year) && year >= startYear && year <= currentYear)
									{
										yearData[year] = count;
									}
								}

								const chartData = [];
								for (let year = startYear; year <= currentYear; year++)
								{
									chartData.push({
										year: year.toString(),
										value: yearData[year] || 0
									});
								}

								chartData.sort((a, b) => parseInt(a.year) - parseInt(b.year));

								chart.updateChart({
									data: chartData,
									colorGradient: true
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

		resize: function ()
		{
			this.inherited(arguments);
			if (this.charts) this.charts.forEach((c) => c.resize());
			if (this.locationChart) this.locationChart.resize();
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
		},
	});
});

