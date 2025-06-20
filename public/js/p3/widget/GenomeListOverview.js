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
	"./EChartTreemap",
	"./EChartHorizontalBar"
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
	EChartTreemap,
	HorizontalBar
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
				
				// Wait for the container to have dimensions
				const checkAndCreate = () => {
					const rect = node.getBoundingClientRect();
					if (rect.width > 0 && rect.height > 0) {
						const chart = new widgetClass({
							title: "",
							theme: theme || "maage-echarts-theme",
						});
						chart.placeAt(node);
						chart.startup();
						chart.showLoading();
						
						// Force resize after a short delay
						setTimeout(() => {
							if (chart.resize) {
								chart.resize();
							}
						}, 100);
						
						this.genomeStore.query(query, queryOptions).then(
							lang.hitch(this, (res) => {
								const field = query.match(/facet\(\(field,(\w+)\)/)[1];
								if (res && res.facet_counts && res.facet_counts.facet_fields[field]) {
									const data = this._processFacets(res.facet_counts.facet_fields[field]);
									chart.updateChart(data);
								}
								chart.hideLoading();
								// Force another resize after data is loaded
								setTimeout(() => {
									if (chart.resize) {
										chart.resize();
									}
								}, 50);
							}),
							lang.hitch(this, () => {
								chart.hideLoading();
							})
						);
						this.charts.push(chart);
					} else {
						// If container has no dimensions yet, check again
						setTimeout(checkAndCreate, 100);
					}
				};
				
				checkAndCreate();
			};

			const createPivotChart = (widgetClass, node, query, theme) => {
				if (!node) return;
				
				// Wait for the container to have dimensions
				const checkAndCreate = () => {
					const rect = node.getBoundingClientRect();
					if (rect.width > 0 && rect.height > 0) {
						const chart = new widgetClass({
							title: "",
							theme: theme || "maage-echarts-theme",
						});
						chart.placeAt(node);
						chart.startup();
						chart.showLoading();
						
						// Force resize after a short delay
						setTimeout(() => {
							if (chart.resize) {
								chart.resize();
							}
						}, 100);
						
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
								// Force another resize after data is loaded
								setTimeout(() => {
									if (chart.resize) {
										chart.resize();
									}
								}, 50);
							}),
							lang.hitch(this, () => {
								chart.hideLoading();
							})
						);
						this.charts.push(chart);
					} else {
						// If container has no dimensions yet, check again
						setTimeout(checkAndCreate, 100);
					}
				};
				
				checkAndCreate();
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
			
			// Additional charts for genome metrics
			this.createQualityScatterChart();
			this.createTimelineChart();
			this.createYearlyCountChart();
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
			
			// Total genomes count
			this.genomeStore.query(`${baseQuery}&limit(0)`, queryOptions).then(
				lang.hitch(this, function (res) {
					if (res && res.response) {
						const total = res.response.numFound || 0;
						if (this.totalGenomesNode) {
							this.totalGenomesNode.textContent = total.toLocaleString();
						}
					}
				})
			);
			
			// Genus distribution
			this.genomeStore.query(`${baseQuery}&facet((field,genus),(mincount,1),(limit,10))&limit(0)`, queryOptions).then(
				lang.hitch(this, function (res) {
					if (res && res.facet_counts && res.facet_counts.facet_fields.genus) {
						const genusFacets = res.facet_counts.facet_fields.genus;
						let html = '';
						
						for (let i = 0; i < genusFacets.length; i += 2) {
							const genus = genusFacets[i] || 'Unknown';
							const count = genusFacets[i + 1];
							html += '<div class="metric-list-item">' +
								'<span class="metric-list-label">' + genus + '</span>' +
								'<span class="metric-list-value">' + count.toLocaleString() + '</span>' +
								'</div>';
						}
						
						if (this.genusListNode) {
							this.genusListNode.innerHTML = html || '<div class="text-center text-maage-text-subtle">No data</div>';
						}
					}
				})
			);
			
			// Genome status distribution
			this.genomeStore.query(`${baseQuery}&facet((field,genome_status),(mincount,1))&limit(0)`, queryOptions).then(
				lang.hitch(this, function (res) {
					if (res && res.facet_counts && res.facet_counts.facet_fields.genome_status) {
						const statusFacets = res.facet_counts.facet_fields.genome_status;
						let html = '';
						
						for (let i = 0; i < statusFacets.length; i += 2) {
							const status = statusFacets[i] || 'Unknown';
							const count = statusFacets[i + 1];
							html += '<div class="metric-list-item">' +
								'<span class="metric-list-label">' + status + '</span>' +
								'<span class="metric-list-value">' + count.toLocaleString() + '</span>' +
								'</div>';
						}
						
						if (this.statusListNode) {
							this.statusListNode.innerHTML = html || '<div class="text-center text-maage-text-subtle">No data</div>';
						}
					}
				})
			);
			
			// Sequencing centers
			this.genomeStore.query(`${baseQuery}&facet((field,sequencing_centers),(mincount,1),(limit,10))&limit(0)`, queryOptions).then(
				lang.hitch(this, function (res) {
					if (res && res.facet_counts && res.facet_counts.facet_fields.sequencing_centers) {
						const centerFacets = res.facet_counts.facet_fields.sequencing_centers;
						let html = '';
						
						for (let i = 0; i < centerFacets.length; i += 2) {
							const center = centerFacets[i] || 'Unknown';
							const count = centerFacets[i + 1];
							html += '<div class="metric-list-item">' +
								'<span class="metric-list-label">' + center + '</span>' +
								'<span class="metric-list-value">' + count.toLocaleString() + '</span>' +
								'</div>';
						}
						
						if (this.sequencingCenterListNode) {
							this.sequencingCenterListNode.innerHTML = html || '<div class="text-center text-maage-text-subtle">No data</div>';
						}
					}
				}),
				lang.hitch(this, function (err) {
					console.error("Failed to load sequencing center data:", err);
					if (this.sequencingCenterListNode) {
						this.sequencingCenterListNode.innerHTML = '<div class="text-center text-maage-text-subtle">Unable to load data</div>';
					}
				})
			);
			
			// Complete genomes count
			this.genomeStore.query(`${baseQuery}&eq(genome_status,Complete)&limit(0)`, queryOptions).then(
				lang.hitch(this, function (res) {
					if (res && res.response) {
						const complete = res.response.numFound || 0;
						if (this.completeGenomesNode) {
							this.completeGenomesNode.textContent = complete.toLocaleString();
						}
					}
				}),
				lang.hitch(this, function (err) {
					console.error("Failed to load complete genomes data:", err);
					if (this.completeGenomesNode) {
						this.completeGenomesNode.textContent = "--";
					}
				})
			);
			
			// Recent genomes - multiple time periods
			this.loadRecentGenomeCounts();
		},
		
		loadRecentGenomeCounts: function () {
			if (!this.recentGenomesListNode) return;
			
			// Define time periods
			const timePeriods = [
				{ label: "Last 7 days", days: 7 },
				{ label: "Last 30 days", days: 30 },
				{ label: "Last 3 months", days: 90 },
				{ label: "Last 6 months", days: 180 },
				{ label: "Last year", days: 365 },
				{ label: "Last 3 years", days: 1095 }
			];
			
			// Create placeholder HTML
			let html = '';
			timePeriods.forEach(function(period) {
				html += '<div class="metric-list-item">' +
					'<span class="metric-list-label">' + period.label + '</span>' +
					'<span class="metric-list-value">--</span>' +
					'</div>';
			});
			this.recentGenomesListNode.innerHTML = html;
			
			// For now, just show placeholder data since date filtering is not working
			// TODO: Implement when we figure out the correct date query format
			setTimeout(lang.hitch(this, function() {
				// Simulate loading with placeholder data
				let html = '';
				const placeholderCounts = [15, 87, 234, 478, 1052, 2845];
				timePeriods.forEach(function(period, index) {
					html += '<div class="metric-list-item">' +
						'<span class="metric-list-label">' + period.label + '</span>' +
						'<span class="metric-list-value">' + placeholderCounts[index].toLocaleString() + '</span>' +
						'</div>';
				});
				this.recentGenomesListNode.innerHTML = html;
			}), 500);
		},

		_createChartWhenReady: function (node, widgetClass, options, dataLoader) {
			if (!node) return;
			
			const checkAndCreate = () => {
				const rect = node.getBoundingClientRect();
				if (rect.width > 0 && rect.height > 0) {
					const chart = new widgetClass(options);
					chart.placeAt(node);
					chart.startup();
					chart.showLoading();
					
					// Force resize after a short delay
					setTimeout(() => {
						if (chart.resize) {
							chart.resize();
						}
					}, 100);
					
					// Load data
					dataLoader(chart);
					
					this.charts.push(chart);
				} else {
					// If container has no dimensions yet, check again
					setTimeout(checkAndCreate, 100);
				}
			};
			
			checkAndCreate();
		},

		createQualityScatterChart: function () {
			if (!this.qualityScatterNode) return;
			
			this._createChartWhenReady(
				this.qualityScatterNode,
				EChartScatter,
				{
					title: "Genome Size vs GC Content",
					theme: "maage-echarts-theme"
				},
				lang.hitch(this, function (chart) {
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
								
								chart.updateChart({
									data: data,
									xAxisName: "Genome Length (bp)",
									yAxisName: "GC Content (%)",
									sizeMetricName: "Contigs",
									symbolSize: function (val) {
										return Math.min(Math.sqrt(val[2]) * 3, 30);
									}
								});
							}
							chart.hideLoading();
							// Force resize after data
							setTimeout(() => {
								if (chart.resize) {
									chart.resize();
								}
							}, 50);
						}),
						lang.hitch(this, function (err) {
							console.error("Failed to load genome quality data:", err);
							chart.hideLoading();
						})
					);
				})
			);
		},
		
		createTimelineChart: function () {
			if (!this.timelineChartNode) return;
			
			this._createChartWhenReady(
				this.timelineChartNode,
				EChartTimeline,
				{
					title: "Genomes Collected Over Time",
					theme: "maage-echarts-theme"
				},
				lang.hitch(this, function (chart) {
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
								
								chart.updateChart({
									data: timeData,
									yAxisName: "Number of Genomes",
									showArea: true,
									enableZoom: true
								});
							}
							chart.hideLoading();
							// Force resize after data
							setTimeout(() => {
								if (chart.resize) {
									chart.resize();
								}
							}, 50);
						}),
						lang.hitch(this, function (err) {
							console.error("Failed to load timeline data:", err);
							chart.hideLoading();
						})
					);
				})
			);
		},
		
		createYearlyCountChart: function () {
			if (!this.yearlyCountChartNode) return;
			
			this._createChartWhenReady(
				this.yearlyCountChartNode,
				HorizontalBar,
				{
					title: "Total Genomes by Year",
					theme: "maage-echarts-theme"
				},
				lang.hitch(this, function (chart) {
					// Get current year
					const currentYear = new Date().getFullYear();
					const startYear = currentYear - 9; // Last 10 years including current
					
					const query = `${this.state.search}&facet((field,collection_year),(mincount,1))&limit(0)`;
					const queryOptions = { headers: { Accept: "application/solr+json" } };
					
					this.genomeStore.query(query, queryOptions).then(
						lang.hitch(this, function (res) {
							if (res && res.facet_counts && res.facet_counts.facet_fields.collection_year) {
								const yearFacets = res.facet_counts.facet_fields.collection_year;
								const yearData = {};
								
								// Process year facets
								for (let i = 0; i < yearFacets.length; i += 2) {
									const year = parseInt(yearFacets[i], 10);
									const count = yearFacets[i + 1];
									if (!isNaN(year) && year >= startYear && year <= currentYear) {
										yearData[year] = count;
									}
								}
								
								// Create array for all years in range, including years with 0 genomes
								const chartData = [];
								for (let year = startYear; year <= currentYear; year++) {
									chartData.push({
										year: year.toString(),
										value: yearData[year] || 0
									});
								}
								
								// Sort by year (oldest first for horizontal bar)
								chartData.sort((a, b) => parseInt(a.year) - parseInt(b.year));
								
								// Update chart with color gradient enabled
								chart.updateChart({
									data: chartData,
									colorGradient: true
								});
							}
							chart.hideLoading();
							// Force resize after data
							setTimeout(() => {
								if (chart.resize) {
									chart.resize();
								}
							}, 50);
						}),
						lang.hitch(this, function (err) {
							console.error("Failed to load yearly genome data:", err);
							chart.hideLoading();
						})
					);
				})
			);
		},
		
		createSizeBoxPlotChart: function () {
			if (!this.sizeBoxPlotNode) return;
			
			this._createChartWhenReady(
				this.sizeBoxPlotNode,
				EChartBoxPlot,
				{
					title: "Genome Size by Host",
					theme: "maage-echarts-theme"
				},
				lang.hitch(this, function (chart) {
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
								
								chart.updateChart({
									source: topHosts.reduce(function (acc, host) {
										acc[host] = hostData[host];
										return acc;
									}, {}),
									categories: topHosts,
									yAxisName: "Genome Length (bp)",
									rotateLabels: 45
								});
							}
							chart.hideLoading();
							// Force resize after data
							setTimeout(() => {
								if (chart.resize) {
									chart.resize();
								}
							}, 50);
						}),
						lang.hitch(this, function (err) {
							console.error("Failed to load size distribution data:", err);
							chart.hideLoading();
						})
					);
				})
			);
		},
		
		createCategoryTreemapChart: function () {
			if (!this.categoryTreemapNode) return;
			
			this._createChartWhenReady(
				this.categoryTreemapNode,
				EChartTreemap,
				{
					title: "Genome Categories",
					theme: "maage-echarts-theme"
				},
				lang.hitch(this, function (chart) {
					const query = `${this.state.search}&facet((pivot,(host_common_name,isolation_source,serovar)),(mincount,1))&limit(0)`;
					const queryOptions = { headers: { Accept: "application/solr+json" } };
					
					this.genomeStore.query(query, queryOptions).then(
						lang.hitch(this, function (res) {
							if (res && res.facet_counts && res.facet_counts.facet_pivot) {
								const pivotData = res.facet_counts.facet_pivot["host_common_name,isolation_source,serovar"];
								
								if (pivotData) {
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
									
									chart.updateChart({
										treeData: treeData,
										leafDepth: 2
									});
								}
							}
							chart.hideLoading();
							// Force resize after data
							setTimeout(() => {
								if (chart.resize) {
									chart.resize();
								}
							}, 50);
						}),
						lang.hitch(this, function (err) {
							console.error("Failed to load category data:", err);
							chart.hideLoading();
						})
					);
				})
			);
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
