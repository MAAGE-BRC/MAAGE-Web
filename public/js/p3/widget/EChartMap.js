define([
	"dojo/_base/declare",
	"./EChart",
	"dojo/_base/lang",
	"dojo/request",
	"echarts",
], function (declare, EChart, lang, request, echarts) {
	return declare([EChart], {
		baseClass: "EChartMap",
		mapData: null,
		countyData: {},
		
		postCreate: function () {
			this.inherited(arguments);
			
			// Load TopoJSON library if not already loaded
			if (!window.topojson) {
				console.error("TopoJSON library not loaded");
				return;
			}
			
			// Load the US counties map data
			this.loadMapData();
		},
		
		loadMapData: function () {
			this.showLoading();
			
			// Use the TopoJSON file from the maps directory
			request("/maage/maps/usa-counties-albers-10m.json", {
				handleAs: "json"
			}).then(
				lang.hitch(this, function (topoData) {
					// Convert TopoJSON to GeoJSON
					const geoData = topojson.feature(topoData, topoData.objects.counties);
					
					// Register the map with ECharts
					echarts.registerMap("USA-counties", geoData);
					
					this.mapData = geoData;
					this.hideLoading();
					
					// If we already have county data, update the chart
					if (Object.keys(this.countyData).length > 0) {
						this.updateChart(this.countyData);
					}
				}),
				lang.hitch(this, function (err) {
					console.error("Failed to load map data:", err);
					this.hideLoading();
				})
			);
		},
		
		updateChart: function (data) {
			if (!this.chart || !this.mapData) {
				// Store the data for when map is loaded
				if (data && data.countyData) {
					this.countyData = data.countyData;
				}
				return;
			}
			
			// Process the data to match ECharts format
			const chartData = [];
			const countyData = data.countyData || data;
			
			// Create lookup for county names to values
			const countyLookup = {};
			Object.keys(countyData).forEach(function (county) {
				// Normalize county name for matching
				const normalizedName = county.toLowerCase().replace(/[^a-z0-9]/g, "");
				countyLookup[normalizedName] = countyData[county];
			});
			
			// Match features with data
			this.mapData.features.forEach(function (feature) {
				const properties = feature.properties || {};
				const countyName = properties.name || properties.NAME || "";
				const normalizedName = countyName.toLowerCase().replace(/[^a-z0-9]/g, "");
				
				if (countyLookup[normalizedName]) {
					chartData.push({
						name: countyName,
						value: countyLookup[normalizedName],
						properties: properties
					});
				}
			});
			
			// Calculate min and max for color scale
			const values = chartData.map(item => item.value).filter(v => v > 0);
			const min = Math.min(...values) || 0;
			const max = Math.max(...values) || 100;
			
			const option = {
				title: {
					text: this.title || "Genome Count by County",
					left: "center",
					top: 10
				},
				tooltip: {
					trigger: "item",
					formatter: function (params) {
						if (params.data && params.data.value) {
							return params.name + ": " + params.data.value + " genomes";
						}
						return params.name + ": No data";
					}
				},
				visualMap: {
					min: min,
					max: max,
					text: ["High", "Low"],
					realtime: false,
					calculable: true,
					inRange: {
						color: ["#e7f5f8", "#98bdac", "#5f94ab", "#467386"]
					},
					left: "left",
					top: "bottom"
				},
				series: [
					{
						name: "Genome Count",
						type: "map",
						map: "USA-counties",
						roam: true,
						scaleLimit: {
							min: 1,
							max: 10
						},
						emphasis: {
							label: {
								show: true
							},
							itemStyle: {
								areaColor: "#e7c788"
							}
						},
						data: chartData
					}
				]
			};
			
			this.chart.setOption(option, true);
		}
	});
});