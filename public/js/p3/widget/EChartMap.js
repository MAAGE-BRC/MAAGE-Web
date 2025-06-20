define(["dojo/_base/declare", "./EChart", "dojo/_base/lang", "dojo/request", "echarts", "dojo/dom-construct", "dojo/on"], function (
	declare,
	EChart,
	lang,
	request,
	echarts,
	domConstruct,
	on
) {
	return declare([EChart], {
		baseClass: "EChartMap",
		stateMapData: null,
		countyMapData: null,
		individualStateData: {},
		genomeData: {},
		currentView: "state", // "state" or "county" or specific state code
		toggleButtonNode: null,
		backButtonNode: null,

		postCreate: function () {
			this.inherited(arguments);

			if (!window.topojson) {
				console.error("TopoJSON library not loaded");
				return;
			}

			// Modify the template structure to add controls
			if (this.domNode && this.chartNode) {
				// Change the main container height to accommodate controls
				this.domNode.style.height = "100%";
				this.domNode.style.display = "flex";
				this.domNode.style.flexDirection = "column";
				
				// Create controls container
				this.controlsNode = domConstruct.create("div", {
					style: "display: flex; gap: 8px; margin-bottom: 8px; flex-shrink: 0;"
				}, this.domNode, "first");

				// Create toggle button
				this.toggleButtonNode = domConstruct.create("button", {
					style: "padding: 4px 12px; background-color: #98bdac; color: white; border-radius: 4px; border: none; cursor: pointer; font-size: 14px;",
					innerHTML: "Show Counties"
				}, this.controlsNode);

				// Create back button (initially hidden)
				this.backButtonNode = domConstruct.create("button", {
					style: "padding: 4px 12px; background-color: #5f94ab; color: white; border-radius: 4px; border: none; cursor: pointer; font-size: 14px; display: none;",
					innerHTML: "Back to US Map"
				}, this.controlsNode);
				
				// Adjust chart node to fill remaining space
				this.chartNode.style.flex = "1";
				this.chartNode.style.minHeight = "0";

				// Add event handlers
				on(this.toggleButtonNode, "click", lang.hitch(this, this.toggleView));
				on(this.backButtonNode, "click", lang.hitch(this, this.backToUSMap));
			}

			this.loadMapData();
		},

		loadMapData: function () {
			this.showLoading();

			// Load both state and county maps
			const stateMapPromise = request("/maage/maps/usa-states-albers-10m.json", {
				handleAs: "json",
			});

			const countyMapPromise = request("/maage/maps/usa-counties-albers-10m.json", {
				handleAs: "json",
			});

			Promise.all([stateMapPromise, countyMapPromise]).then(
				lang.hitch(this, function ([stateTopoData, countyTopoData]) {
					// Process state map
					const stateGeoData = topojson.feature(stateTopoData, stateTopoData.objects.states);
					this.flipCoordinates(stateGeoData);
					echarts.registerMap("USA-states", stateGeoData);
					this.stateMapData = stateGeoData;

					// Process county map
					const countyGeoData = topojson.feature(countyTopoData, countyTopoData.objects.counties);
					this.flipCoordinates(countyGeoData);
					echarts.registerMap("USA-counties", countyGeoData);
					this.countyMapData = countyGeoData;

					// Load individual state maps
					this.loadIndividualStateMaps();

					this.hideLoading();

					// Update chart if data is already available
					if (Object.keys(this.genomeData).length > 0) {
						this.updateChart(this.genomeData);
					}
				}),
				lang.hitch(this, function (err) {
					console.error("Failed to load map data:", err);
					this.hideLoading();
				})
			);
		},

		flipCoordinates: function (geoData) {
			geoData.features.forEach(function (feature) {
				if (feature.geometry && feature.geometry.coordinates) {
					const flipCoords = function (coords) {
						if (Array.isArray(coords[0]) && typeof coords[0][0] === "number") {
							return coords.map(function (coord) {
								return [coord[0], -coord[1]];
							});
						} else {
							return coords.map(flipCoords);
						}
					};
					feature.geometry.coordinates = flipCoords(feature.geometry.coordinates);
				}
			});
		},

		loadIndividualStateMaps: function () {
			// For now, we'll use the county data filtered by state
			// In the future, you can load individual state TopoJSON files here
			// Example: load illinois.json, michigan.json, etc.
		},

		toggleView: function () {
			if (this.currentView === "state") {
				this.currentView = "county";
				this.toggleButtonNode.innerHTML = "Show States";
			} else if (this.currentView === "county") {
				this.currentView = "state";
				this.toggleButtonNode.innerHTML = "Show Counties";
			}
			this.updateChart(this.genomeData);
		},

		backToUSMap: function () {
			this.currentView = "state";
			this.toggleButtonNode.style.display = "";
			this.backButtonNode.style.display = "none";
			this.updateChart(this.genomeData);
		},

		updateChart: function (data) {
			if (!this.chart || (!this.stateMapData && !this.countyMapData)) {
				if (data && data.countyData) {
					this.genomeData = data;
				}
				return;
			}

			// Store the data for later use
			this.genomeData = data;
			
			let chartData = [];
			let mapName = "USA-states";
			let mapData = this.stateMapData;

			if (this.currentView === "state") {
				// Use state data directly if provided, otherwise aggregate from counties
				if (this.genomeData.stateData) {
					chartData = this.processStateData(this.genomeData.stateData);
				} else {
					chartData = this.aggregateToStates(this.genomeData.countyData || this.genomeData);
				}
				mapName = "USA-states";
				mapData = this.stateMapData;
			} else if (this.currentView === "county") {
				// Show all counties
				chartData = this.processCountyData(this.genomeData.countyData || this.genomeData, this.countyMapData);
				mapName = "USA-counties";
				mapData = this.countyMapData;
			} else {
				// Show specific state's counties
				const stateCode = this.currentView;
				chartData = this.processStateCounties(this.genomeData.countyData || this.genomeData, stateCode);
				mapName = "state-" + stateCode;
				mapData = this.getStateMapData(stateCode);
			}

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
						map: mapName,
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

			// Add click handler for states
			if (this.currentView === "state") {
				this.chart.off("click");
				this.chart.on("click", lang.hitch(this, function (params) {
					if (params.data && params.data.stateCode) {
						this.showStateDetail(params.data.stateCode, params.data.name);
					}
				}));
			} else {
				this.chart.off("click");
			}

			this.chart.setOption(option, true);
			
			// Force a resize to ensure map fits properly
			setTimeout(lang.hitch(this, function() {
				if (this.chart) {
					this.chart.resize();
				}
			}), 100);
		},

		processStateData: function (stateData) {
			if (!this.stateMapData || !stateData) return [];

			const chartData = [];
			const stateLookup = {};
			
			// Create lookup for state data
			Object.keys(stateData).forEach(function (state) {
				const normalizedName = state.toLowerCase().replace(/[^a-z]/g, "");
				stateLookup[normalizedName] = stateData[state];
			});
			
			console.log("State lookup created:", stateLookup);
			console.log("State map features:", this.stateMapData.features.length);

			this.stateMapData.features.forEach(lang.hitch(this, function (feature) {
				const properties = feature.properties || {};
				const stateName = properties.name || properties.NAME || "";
				const stateCode = properties.STATE || properties.STUSPS || properties.postal || "";
				const normalizedName = stateName.toLowerCase().replace(/[^a-z]/g, "");
				
				// Debug: Log first few state names from map
				if (chartData.length < 5) {
					console.log("Map state:", stateName, "normalized:", normalizedName, "has data:", !!stateLookup[normalizedName]);
				}

				if (stateLookup[normalizedName]) {
					chartData.push({
						name: stateName,
						value: stateLookup[normalizedName],
						stateCode: stateCode,
						properties: properties,
					});
				}
			}));
			
			console.log("Chart data created:", chartData.length, "states with data");

			return chartData;
		},

		aggregateToStates: function (countyData) {
			if (!this.stateMapData || !countyData) return [];

			const stateData = {};

			// Aggregate county data to states
			Object.keys(countyData).forEach(function (countyKey) {
				// Extract state from county name (assuming format like "Cook, Illinois")
				const parts = countyKey.split(", ");
				if (parts.length >= 2) {
					const stateName = parts[parts.length - 1].trim();
					if (!stateData[stateName]) {
						stateData[stateName] = 0;
					}
					stateData[stateName] += countyData[countyKey];
				}
			});

			// Map to chart data format
			const chartData = [];
			this.stateMapData.features.forEach(lang.hitch(this, function (feature) {
				const properties = feature.properties || {};
				const stateName = properties.name || properties.NAME || "";
				const stateCode = properties.STATE || properties.STUSPS || properties.postal || "";
				
				if (stateData[stateName]) {
					chartData.push({
						name: stateName,
						value: stateData[stateName],
						stateCode: stateCode,
						properties: properties
					});
				}
			}));

			return chartData;
		},

		processCountyData: function (countyData, mapData) {
			if (!mapData || !countyData) return [];

			const chartData = [];
			const countyLookup = {};
			
			Object.keys(countyData).forEach(function (county) {
				const normalizedName = county.toLowerCase().replace(/[^a-z0-9]/g, "");
				countyLookup[normalizedName] = countyData[county];
			});

			mapData.features.forEach(function (feature) {
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

			return chartData;
		},

		processStateCounties: function (countyData, stateCode) {
			// Filter counties for the specific state
			const stateCountyData = {};
			Object.keys(countyData).forEach(function (countyKey) {
				// This is a simplified approach - you may need to adjust based on your data format
				if (countyKey.includes(stateCode)) {
					stateCountyData[countyKey] = countyData[countyKey];
				}
			});

			return this.processCountyData(stateCountyData, this.getStateMapData(stateCode));
		},

		getStateMapData: function (stateCode) {
			// For now, return filtered county data for the state
			// In the future, this could return dedicated state map data
			if (!this.countyMapData) return null;

			const stateFeatures = this.countyMapData.features.filter(function (feature) {
				return feature.properties && feature.properties.STATE === stateCode;
			});

			return {
				type: "FeatureCollection",
				features: stateFeatures
			};
		},

		showStateDetail: function (stateCode, stateName) {
			this.currentView = stateCode;
			this.toggleButtonNode.style.display = "none";
			this.backButtonNode.style.display = "";
			this.backButtonNode.innerHTML = "Back to US Map";
			
			// Register the state-specific map if needed
			const stateMapData = this.getStateMapData(stateCode);
			if (stateMapData && stateMapData.features.length > 0) {
				echarts.registerMap("state-" + stateCode, stateMapData);
			}
			
			this.updateChart(this.genomeData);
		},
	});
});
