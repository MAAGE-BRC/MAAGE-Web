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
		
		// State name to FIPS code mapping
		stateNameToFips: {
			"Alabama": "01", "Alaska": "02", "Arizona": "04", "Arkansas": "05", "California": "06",
			"Colorado": "08", "Connecticut": "09", "Delaware": "10", "District of Columbia": "11",
			"Florida": "12", "Georgia": "13", "Hawaii": "15", "Idaho": "16", "Illinois": "17",
			"Indiana": "18", "Iowa": "19", "Kansas": "20", "Kentucky": "21", "Louisiana": "22",
			"Maine": "23", "Maryland": "24", "Massachusetts": "25", "Michigan": "26", "Minnesota": "27",
			"Mississippi": "28", "Missouri": "29", "Montana": "30", "Nebraska": "31", "Nevada": "32",
			"New Hampshire": "33", "New Jersey": "34", "New Mexico": "35", "New York": "36",
			"North Carolina": "37", "North Dakota": "38", "Ohio": "39", "Oklahoma": "40", "Oregon": "41",
			"Pennsylvania": "42", "Rhode Island": "44", "South Carolina": "45", "South Dakota": "46",
			"Tennessee": "47", "Texas": "48", "Utah": "49", "Vermont": "50", "Virginia": "51",
			"Washington": "53", "West Virginia": "54", "Wisconsin": "55", "Wyoming": "56"
		},

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
					style: "display: flex; gap: 8px; margin-bottom: 8px; flex-shrink: 0; align-items: center;"
				}, this.domNode, "first");

				// Create toggle button
				this.toggleButtonNode = domConstruct.create("button", {
					style: "padding: 4px 12px; background-color: #98bdac; color: white; border-radius: 4px; border: none; cursor: pointer; font-size: 14px;",
					innerHTML: "Show Counties"
				}, this.controlsNode);

				// Create state dropdown
				this.stateDropdownNode = domConstruct.create("select", {
					style: "padding: 4px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; cursor: pointer; background-color: white;",
				}, this.controlsNode);
				
				// Add default option
				domConstruct.create("option", {
					value: "",
					innerHTML: "Select a state...",
					selected: true
				}, this.stateDropdownNode);
				
				// Add state options
				Object.keys(this.stateNameToFips).forEach(lang.hitch(this, function(stateName) {
					domConstruct.create("option", {
						value: this.stateNameToFips[stateName],
						innerHTML: stateName
					}, this.stateDropdownNode);
				}));

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
				on(this.stateDropdownNode, "change", lang.hitch(this, function(evt) {
					const stateCode = evt.target.value;
					if (stateCode) {
						// Find state name from FIPS code
						let stateName = "";
						Object.keys(this.stateNameToFips).forEach(lang.hitch(this, function(name) {
							if (this.stateNameToFips[name] === stateCode) {
								stateName = name;
							}
						}));
						
						if (stateName) {
							this.showStateDetail(stateCode, stateName);
						}
					}
				}));
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
			this.stateDropdownNode.value = ""; // Reset dropdown
			this.updateChart(this.genomeData);
		},

		updateChart: function (data) {
			if (!this.chart) {
				if (data && data.countyData) {
					this.genomeData = data;
				}
				return;
			}

			// Store the data for later use
			this.genomeData = data;
			
			let chartData = [];
			let mapName = "USA-states";

			if (this.currentView === "state") {
				// Use state data directly if provided, otherwise aggregate from counties
				if (this.genomeData.stateData) {
					chartData = this.processStateData(this.genomeData.stateData);
				} else {
					chartData = this.aggregateToStates(this.genomeData.countyData || this.genomeData);
				}
				mapName = "USA-states";
			} else if (this.currentView === "county") {
				// Show all counties
				chartData = this.processCountyData(this.genomeData.countyData || this.genomeData, this.countyMapData);
				mapName = "USA-counties";
			} else {
				// Show specific state's counties
				const stateCode = this.currentView;
				mapName = "state-" + stateCode;
				
				// For state view, we need to process county data specially
				const countyData = this.genomeData.countyData || this.genomeData;
				chartData = [];
				
				// Create a map of county names to values for quick lookup
				const countyLookup = {};
				Object.keys(countyData).forEach(function(countyName) {
					// Normalize county name for matching
					const normalizedName = countyName.toLowerCase().replace(/[^a-z0-9]/g, "");
					countyLookup[normalizedName] = countyData[countyName];
				});
				
				// Process the data to match with map features
				// The actual matching will happen in the series data function
				this._countyLookup = countyLookup;
			}

			const values = chartData.map((item) => item.value).filter((v) => v > 0);
			const min = Math.min(...values) || 0;
			const max = Math.max(...values) || 100;

			// Add title for state view
			let title = "";
			if (this.currentView !== "state" && this.currentView !== "county") {
				// Find state name from code
				Object.keys(this.stateNameToFips).forEach(lang.hitch(this, function(name) {
					if (this.stateNameToFips[name] === this.currentView) {
						title = name + " Counties";
					}
				}));
			}
			
			const option = {
				title: title ? {
					text: title,
					left: 'center',
					top: 10,
					textStyle: {
						fontSize: 16,
						fontWeight: 'bold'
					}
				} : undefined,
				tooltip: {
					trigger: "item",
					formatter: lang.hitch(this, function (params) {
						// For state view showing counties
						if (this.currentView !== "state" && this.currentView !== "county") {
							const countyName = params.name;
							const normalizedName = countyName.toLowerCase().replace(/[^a-z0-9]/g, "");
							const value = this._countyLookup ? this._countyLookup[normalizedName] : 0;
							
							if (value > 0) {
								return countyName + ": " + value + " genomes";
							}
							return countyName + ": No data";
						}
						
						// For regular state/county view
						if (params.data && params.data.value) {
							return params.name + ": " + params.data.value + " genomes";
						}
						return params.name + ": No data";
					}),
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
						data: chartData.length > 0 ? chartData : undefined,
						// For state view, use dynamic color mapping
						itemStyle: this.currentView !== "state" && this.currentView !== "county" ? {
							color: lang.hitch(this, function(params) {
								const countyName = params.name;
								const normalizedName = countyName.toLowerCase().replace(/[^a-z0-9]/g, "");
								const value = this._countyLookup ? this._countyLookup[normalizedName] : 0;
								
								if (value === 0) {
									return "#f3f4f6"; // Light gray for no data
								}
								
								// Calculate relative color based on value
								const allValues = Object.values(this._countyLookup || {});
								const maxValue = Math.max(...allValues, 1);
								const relativeValue = (value / maxValue) * 100;
								
								// Use the color scale
								const colors = ["#e7f5f8", "#98bdac", "#5f94ab", "#467386"];
								const index = Math.floor((relativeValue / 100) * (colors.length - 1));
								return colors[Math.min(index, colors.length - 1)];
							})
						} : undefined,
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
				
				// Get FIPS code for this state
				const fipsCode = this.stateNameToFips[stateName] || stateCode;
				
				// Debug: Log first few state names from map
				if (chartData.length < 5) {
					console.log("Map state:", stateName, "normalized:", normalizedName, "has data:", !!stateLookup[normalizedName]);
				}

				if (stateLookup[normalizedName]) {
					chartData.push({
						name: stateName,
						value: stateLookup[normalizedName],
						stateCode: fipsCode,
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
			if (!countyData) return [];

			const chartData = [];
			const countyLookup = {};
			
			// Store all county data - we'll match it when rendering
			Object.keys(countyData).forEach(function (county) {
				chartData.push({
					name: county,
					value: countyData[county]
				});
			});

			return chartData;
		},

		processStateCounties: function (countyData, stateCode) {
			// For state view, we'll process all county data available
			// The map will be filtered by state when we load the GeoJSON
			return this.processCountyData(countyData);
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
			
			// We need to load state-specific GeoJSON data
			this.loadStateGeoJSON(stateCode, stateName);
		},
		
		loadStateGeoJSON: function(stateCode, stateName) {
			this.showLoading();
			
			// Try to load the state-specific GeoJSON file
			request("/maage/maps/geojson/cb_2024_us_county_5m.geojson", {
				handleAs: "json",
			}).then(
				lang.hitch(this, function (geoData) {
					// Filter counties for this specific state
					const stateCounties = {
						type: "FeatureCollection",
						features: geoData.features.filter(function(feature) {
							// GeoJSON uses STATEFP property for state FIPS code
							return feature.properties && feature.properties.STATEFP === stateCode;
						})
					};
					
					if (stateCounties.features.length > 0) {
						// Register the filtered state map
						echarts.registerMap("state-" + stateCode, stateCounties);
						this.hideLoading();
						this.updateChart(this.genomeData);
					} else {
						console.error("No counties found for state:", stateCode);
						this.hideLoading();
						// Fallback to showing US map
						this.backToUSMap();
					}
				}),
				lang.hitch(this, function (err) {
					console.error("Failed to load state GeoJSON:", err);
					this.hideLoading();
					// Fallback to showing US map
					this.backToUSMap();
				})
			);
		},
	});
});
