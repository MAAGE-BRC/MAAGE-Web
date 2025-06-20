define(["dojo/_base/declare", "./EChart", "dojo/_base/lang", "dojo/request", "echarts"], function (
	declare,
	EChart,
	lang,
	request,
	echarts
) {
	return declare([EChart], {
		baseClass: "EChartMap",
		mapData: null,
		countyData: {},

		postCreate: function () {
			this.inherited(arguments);

			if (!window.topojson) {
				console.error("TopoJSON library not loaded");
				return;
			}

			this.loadMapData();
		},

		loadMapData: function () {
			this.showLoading();

			request("/maage/maps/usa-counties-albers-10m.json", {
				handleAs: "json",
			}).then(
				lang.hitch(this, function (topoData) {
					const geoData = topojson.feature(topoData, topoData.objects.counties);

					geoData.features.forEach(function (feature) {
						if (feature.geometry && feature.geometry.coordinates) {
							const flipCoordinates = function (coords) {
								if (Array.isArray(coords[0]) && typeof coords[0][0] === "number") {
									return coords.map(function (coord) {
										return [coord[0], -coord[1]];
									});
								} else {
									return coords.map(flipCoordinates);
								}
							};
							feature.geometry.coordinates = flipCoordinates(feature.geometry.coordinates);
						}
					});

					echarts.registerMap("USA-counties", geoData);

					this.mapData = geoData;
					this.hideLoading();

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
				if (data && data.countyData) {
					this.countyData = data.countyData;
				}
				return;
			}

			const chartData = [];
			const countyData = data.countyData || data;

			const countyLookup = {};
			Object.keys(countyData).forEach(function (county) {
				const normalizedName = county.toLowerCase().replace(/[^a-z0-9]/g, "");
				countyLookup[normalizedName] = countyData[county];
			});

			this.mapData.features.forEach(function (feature) {
				const properties = feature.properties || {};
				const countyName = properties.name || properties.NAME || "";
				const normalizedName = countyName.toLowerCase().replace(/[^a-z0-9]/g, "");

				if (countyLookup[normalizedName]) {
					chartData.push({
						name: countyName,
						value: countyLookup[normalizedName],
						properties: properties,
					});
				}
			});

			const values = chartData.map((item) => item.value).filter((v) => v > 0);
			const min = Math.min(...values) || 0;
			const max = Math.max(...values) || 100;

			const option = {
				tooltip: {
					trigger: "item",
					formatter: function (params) {
						if (params.data && params.data.value) {
							return params.name + ": " + params.data.value + " genomes";
						}
						return params.name + ": No data";
					},
				},
				visualMap: {
					min: min,
					max: max,
					text: ["High", "Low"],
					realtime: false,
					calculable: true,
					inRange: {
						color: ["#e7f5f8", "#98bdac", "#5f94ab", "#467386"],
					},
					left: "left",
					top: "bottom",
				},
				series: [
					{
						name: "Genome Count",
						type: "map",
						map: "USA-counties",
						roam: true,
						scaleLimit: {
							min: 0.5,
							max: 10,
						},
						// Let ECharts auto-calculate the best view
						layoutCenter: ['50%', '50%'],
						layoutSize: '95%',
						emphasis: {
							label: {
								show: true,
							},
							itemStyle: {
								areaColor: "#e7c788",
							},
						},
						data: chartData,
					},
				],
			};

			this.chart.setOption(option, true);
			
			// Force a resize to ensure map fits properly
			setTimeout(lang.hitch(this, function() {
				if (this.chart) {
					this.chart.resize();
				}
			}), 100);
		},
	});
});
