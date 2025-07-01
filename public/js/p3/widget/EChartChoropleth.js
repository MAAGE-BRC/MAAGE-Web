define([
	"dojo/_base/declare",
	"./EChart",
	"dojo/_base/lang",
	"dojo/request",
	"echarts",
	"dojo/dom-construct",
	"dojo/on",
	"d3v7"
], function (declare, EChart, lang, request, echarts, domConstruct, on, d3)
{
	return declare([EChart], {
		baseClass: "EChartChoropleth",
		title: "",

		worldMapData: null,
		usStatesMapData: null,
		usCountiesMapData: null,
		stateCountiesMapData: {},

		currentView: "us",
		selectedState: null,
		selectedStateName: null,

		controlsNode: null,
		viewToggleNode: null,
		stateDropdownNode: null,
		backButtonNode: null,

		genomeData: null,
		metadata: null,

		stateNameToFips: {
			"Alabama": "01",
			"Alaska": "02",
			"Arizona": "04",
			"Arkansas": "05",
			"California": "06",
			"Colorado": "08",
			"Connecticut": "09",
			"Delaware": "10",
			"District of Columbia": "11",
			"Florida": "12",
			"Georgia": "13",
			"Hawaii": "15",
			"Idaho": "16",
			"Illinois": "17",
			"Indiana": "18",
			"Iowa": "19",
			"Kansas": "20",
			"Kentucky": "21",
			"Louisiana": "22",
			"Maine": "23",
			"Maryland": "24",
			"Massachusetts": "25",
			"Michigan": "26",
			"Minnesota": "27",
			"Mississippi": "28",
			"Missouri": "29",
			"Montana": "30",
			"Nebraska": "31",
			"Nevada": "32",
			"New Hampshire": "33",
			"New Jersey": "34",
			"New Mexico": "35",
			"New York": "36",
			"North Carolina": "37",
			"North Dakota": "38",
			"Ohio": "39",
			"Oklahoma": "40",
			"Oregon": "41",
			"Pennsylvania": "42",
			"Rhode Island": "44",
			"South Carolina": "45",
			"South Dakota": "46",
			"Tennessee": "47",
			"Texas": "48",
			"Utah": "49",
			"Vermont": "50",
			"Virginia": "51",
			"Washington": "53",
			"West Virginia": "54",
			"Wisconsin": "55",
			"Wyoming": "56"
		},

		countryNameToISO: {
			"United States": "USA",
			"United Kingdom": "GBR",
			"Canada": "CAN",
			"China": "CHN",
			"India": "IND",
			"Brazil": "BRA",
			"Russia": "RUS",
			"Japan": "JPN",
			"Germany": "DEU",
			"France": "FRA",
			"Italy": "ITA",
			"Spain": "ESP",
			"Australia": "AUS",
			"Mexico": "MEX",
			"South Korea": "KOR",
			"Netherlands": "NLD",
			"Switzerland": "CHE",
			"Belgium": "BEL",
			"Sweden": "SWE",
			"Poland": "POL"

		},

		postCreate: function ()
		{
			this.inherited(arguments);

			if (!window.topojson)
			{
				console.error("TopoJSON library not loaded");
				return;
			}

			this._createControls();

			this.loadMapData();
		},

		_createControls: function ()
		{
			if (!this.domNode || !this.chartNode) return;

			this.domNode.style.height = "100%";
			this.domNode.style.display = "flex";
			this.domNode.style.flexDirection = "column";

			this.controlsNode = domConstruct.create("div", {
				style: "display: flex; gap: 12px; margin-bottom: 12px; flex-shrink: 0; align-items: center; justify-content: space-between;"
			}, this.domNode, "first");

			const toggleContainer = domConstruct.create("div", {
				style: "display: flex; gap: 4px; background-color: #f3f4f6; border-radius: 8px; padding: 4px;"
			}, this.controlsNode);

			this.worldViewBtn = domConstruct.create("button", {
				innerHTML: "World",
				style: "padding: 6px 16px; background-color: transparent; color: #6c757d; border-radius: 6px; border: none; cursor: pointer; font-size: 15px; font-weight: 500; transition: all 0.2s;"
			}, toggleContainer);

			this.usViewBtn = domConstruct.create("button", {
				innerHTML: "United States",
				style: "padding: 6px 16px; background-color: #98bdac; color: white; border-radius: 6px; border: none; cursor: pointer; font-size: 15px; font-weight: 500; transition: all 0.2s;"
			}, toggleContainer);

			this.stateDropdownNode = domConstruct.create("select", {
				style: "padding: 6px 16px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 15px; cursor: pointer; background-color: white;"
			}, this.controlsNode);

			domConstruct.create("option", {
				value: "",
				innerHTML: "Select a state...",
				selected: true
			}, this.stateDropdownNode);

			Object.keys(this.stateNameToFips).forEach(lang.hitch(this, function (stateName)
			{
				domConstruct.create("option", {
					value: this.stateNameToFips[stateName],
					innerHTML: stateName
				}, this.stateDropdownNode);
			}));

			this.backButtonNode = domConstruct.create("button", {
				style: "padding: 6px 16px; background-color: #5f94ab; color: white; border-radius: 6px; border: none; cursor: pointer; font-size: 15px; font-weight: 500; display: none;",
				innerHTML: "← Back"
			}, this.controlsNode);

			const leftControls = domConstruct.create("div", {
				style: "display: flex; gap: 12px; align-items: center;"
			}, this.controlsNode, "first");

			domConstruct.place(toggleContainer, leftControls);
			domConstruct.place(this.stateDropdownNode, leftControls);
			domConstruct.place(this.backButtonNode, leftControls);

			const zoomControls = domConstruct.create("div", {
				style: "display: flex; gap: 4px; background-color: #f3f4f6; border-radius: 8px; padding: 4px;"
			}, this.controlsNode);

			this.zoomInBtn = domConstruct.create("button", {
				innerHTML: "+",
				style: "width: 32px; height: 32px; background-color: #98bdac; color: white; border-radius: 6px; border: none; cursor: pointer; font-size: 18px; font-weight: bold; display: flex; align-items: center; justify-content: center;"
			}, zoomControls);

			this.zoomOutBtn = domConstruct.create("button", {
				innerHTML: "−",
				style: "width: 32px; height: 32px; background-color: #5f94ab; color: white; border-radius: 6px; border: none; cursor: pointer; font-size: 18px; font-weight: bold; display: flex; align-items: center; justify-content: center;"
			}, zoomControls);

			this.zoomResetBtn = domConstruct.create("button", {
				innerHTML: "⟲",
				style: "width: 32px; height: 32px; background-color: #6c757d; color: white; border-radius: 6px; border: none; cursor: pointer; font-size: 18px; font-weight: bold; display: flex; align-items: center; justify-content: center;"
			}, zoomControls);

			this.chartNode.style.flex = "1";
			this.chartNode.style.minHeight = "450px";
			this.chartNode.style.height = "450px";
			this.chartNode.style.position = "relative";

			this.statsPanel = domConstruct.create("div", {
				style: "position: absolute; top: 20px; left: 20px; background: rgba(255, 255, 255, 0.95); " +
					"border: 1px solid #e0e0e0; border-radius: 4px; padding: 12px; min-width: 200px; " +
					"display: none; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
			}, this.chartNode);

			on(this.worldViewBtn, "click", lang.hitch(this, function ()
			{
				this.switchToWorldView();
			}));

			on(this.usViewBtn, "click", lang.hitch(this, function ()
			{
				this.switchToUSView();
			}));

			on(this.stateDropdownNode, "change", lang.hitch(this, function (evt)
			{
				const stateCode = evt.target.value;
				if (stateCode)
				{
					const stateName = this._getStateNameByCode(stateCode);
					if (stateName)
					{
						this.switchToStateView(stateCode, stateName);
					}
				}
			}));

			on(this.backButtonNode, "click", lang.hitch(this, function ()
			{
				if (this.currentView !== "world" && this.currentView !== "us")
				{

					this.switchToUSView();
				}
			}));

			on(this.zoomInBtn, "click", lang.hitch(this, function ()
			{
				if (this.chart)
				{
					const zoom = this.chart.getOption().series[0].zoom || 1;
					this.chart.setOption({
						series: [{
							zoom: zoom * 1.2
						}]
					});
				}
			}));

			on(this.zoomOutBtn, "click", lang.hitch(this, function ()
			{
				if (this.chart)
				{
					const zoom = this.chart.getOption().series[0].zoom || 1;
					this.chart.setOption({
						series: [{
							zoom: zoom * 0.8
						}]
					});
				}
			}));

			on(this.zoomResetBtn, "click", lang.hitch(this, function ()
			{
				if (this.chart)
				{

					this.updateChart(this.genomeData);
				}
			}));
		},

		startup: function ()
		{
			this.inherited(arguments);

			if (this.genomeData && this.chart)
			{
				this.updateChart(this.genomeData);
			}
		},

		initializeChart: function ()
		{
			this.inherited(arguments);

			if (this.genomeData && this.chart)
			{
				this.updateChart(this.genomeData);
			}
		},

		loadMapData: function ()
		{

			if (this.chart)
			{
				this.showLoading();
			}

			const promises = [
				// World atlas for world view
				request("/maage/maps/world-atlas/countries-110m.json", { handleAs: "json" }),
				// US counties atlas for both states and counties (will extract states)
				request("/maage/maps/us-atlas/counties-10m.json", { handleAs: "json" })
			];

			Promise.all(promises).then(
				lang.hitch(this, function ([worldTopo, usAtlas])
				{
					// Process world map data
					const worldGeo = topojson.feature(worldTopo, worldTopo.objects.countries);
					echarts.registerMap("world", worldGeo);
					this.worldMapData = worldGeo;

					// Extract states from US atlas and apply AlbersUSA projection
					const statesGeo = topojson.feature(usAtlas, usAtlas.objects.states);
					const projectedStatesGeo = this._applyAlbersUSAProjection(statesGeo);
					echarts.registerMap("usa-states", projectedStatesGeo);
					this.usStatesMapData = projectedStatesGeo;

					// Use counties for detailed views
					const countiesGeo = topojson.feature(usAtlas, usAtlas.objects.counties);
					echarts.registerMap("usa-counties", countiesGeo);
					this.usCountiesMapData = countiesGeo;

					if (this.chart)
					{
						this.hideLoading();
					}

					if (this.genomeData)
					{
						this.updateChart(this.genomeData);
					}
				}),
				lang.hitch(this, function (err)
				{
					console.error("Failed to load map data:", err);
					if (this.chart)
					{
						this.hideLoading();
					}
				})
			);
		},

		_applyAlbersUSAProjection: function (geoData)
		{
			// Check if D3 is available
			if (!d3) {
				console.warn("D3 not available, using original coordinates");
				return geoData;
			}

			// Create a copy of the geoData to avoid modifying the original
			const projectedGeoData = JSON.parse(JSON.stringify(geoData));
			
			// Create AlbersUSA projection similar to demo
			// This automatically repositions Alaska and Hawaii and flattens the projection
			const projection = d3.geoAlbersUsa()
				.scale(1000)   // Larger scale for better visibility
				.translate([500, 300]);  // Center in widget coordinate space
			
			// Transform all coordinates using the projection
			projectedGeoData.features.forEach(function (feature) {
				if (feature.geometry && feature.geometry.coordinates) {
					const transformCoords = function (coords) {
						if (Array.isArray(coords[0]) && typeof coords[0][0] === "number") {
							// This is a coordinate pair [lng, lat]
							return coords.map(function (coord) {
								const projected = projection(coord);
								if (projected) {
									// Flip Y coordinate for ECharts (screen coordinates)
									// ECharts expects Y to increase downward
									return [projected[0], -projected[1]];
								}
								return coord; // Fallback to original if projection fails
							});
						} else {
							// This is a nested array of coordinates
							return coords.map(transformCoords);
						}
					};
					feature.geometry.coordinates = transformCoords(feature.geometry.coordinates);
				}
			});
			
			return projectedGeoData;
		},

		switchToWorldView: function ()
		{
			this.currentView = "world";
			this._updateButtonStates();
			this.stateDropdownNode.style.display = "none";
			this.backButtonNode.style.display = "none";
			this.updateChart(this.genomeData);
		},

		switchToUSView: function ()
		{
			this.currentView = "us";
			this._updateButtonStates();
			this.stateDropdownNode.style.display = "";
			this.stateDropdownNode.value = "";
			this.backButtonNode.style.display = "none";
			this.updateChart(this.genomeData);
		},

		switchToStateView: function (stateCode, stateName)
		{
			this.currentView = stateCode;
			this.selectedState = stateCode;
			this.selectedStateName = stateName;
			this._updateButtonStates();
			this.backButtonNode.style.display = "";
			this.backButtonNode.innerHTML = "← Back to US";

			if (!this.stateCountiesMapData[stateCode])
			{
				this._loadStateCounties(stateCode, stateName);
			} else
			{
				this.updateChart(this.genomeData);
			}
		},

		_updateButtonStates: function ()
		{

			if (this.currentView === "world")
			{
				this.worldViewBtn.style.backgroundColor = "#98bdac";
				this.worldViewBtn.style.color = "white";
				this.usViewBtn.style.backgroundColor = "transparent";
				this.usViewBtn.style.color = "#6c757d";
			} else
			{
				this.worldViewBtn.style.backgroundColor = "transparent";
				this.worldViewBtn.style.color = "#6c757d";
				this.usViewBtn.style.backgroundColor = "#98bdac";
				this.usViewBtn.style.color = "white";
			}
		},

		_loadStateCounties: function (stateCode, stateName)
		{

			if (!this.usCountiesMapData) return;

			const stateCounties = {
				type: "FeatureCollection",
				features: this.usCountiesMapData.features.filter(function (feature)
				{

					return feature.id && feature.id.substring(0, 2) === stateCode;
				})
			};

			if (stateCounties.features.length > 0)
			{
				echarts.registerMap("state-" + stateCode, stateCounties);
				this.stateCountiesMapData[stateCode] = stateCounties;
				this.updateChart(this.genomeData);
			} else
			{
				console.error("No counties found for state:", stateName);
				this.switchToUSView();
			}
		},

		updateChart: function (data)
		{

			this.genomeData = data || {};
			this.metadata = {
				country: data.countryMetadata || {},
				state: data.stateMetadata || {},
				county: data.countyMetadata || {}
			};

			if (!this.chart)
			{

				if (this.chartNode && this._started)
				{
					this.initializeChart();
				}

				if (!this.chart)
				{
					console.log("EChartChoropleth: Chart not ready yet, deferring update");
					return;
				}
			}

			let chartData = [];
			let mapName = "world";
			let zoom = 1;
			let center = null;

			if (this.currentView === "world")
			{
				mapName = "world";
				chartData = this._processWorldData(this.genomeData.countryData || {});
				// Slightly increase zoom for world view
				zoom = 1.2;
			} else if (this.currentView === "us")
			{
				mapName = "usa-states";
				chartData = this._processUSStateData(this.genomeData.stateData || {});
				// Lower zoom since projection coordinates are already scaled
				zoom = 1.0;
				center = ["50%", "50%"];
			} else
			{

				mapName = "state-" + this.currentView;
				chartData = this._processStateCountyData(
					this.genomeData.countyData || {},
					this.currentView,
					this.selectedStateName
				);
				// Increase zoom for state views as well
				zoom = 1.3;
			}

			const values = chartData.map(item => item.value).filter(v => v > 0);
			const max = Math.max(...values) || 100;

			const option = {

				tooltip: {
					trigger: "item",
					backgroundColor: "rgba(255, 255, 255, 0.95)",
					borderColor: "#ddd",
					borderWidth: 1,
					padding: 12,
					textStyle: {
						fontSize: 13,
						color: "#333"
					},
					formatter: lang.hitch(this, function (params)
					{
						if (!params.data || params.data.value === 0)
						{
							return params.name + ": No data";
						}

						let html = `<div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #212529;">${params.name}</div>`;
						html += `<div style="margin-bottom: 6px;"><strong>Total Genomes:</strong> ${params.data.value.toLocaleString()}</div>`;

						let metadata = null;
						if (this.currentView === "world" && this.metadata.country[params.name])
						{
							metadata = this.metadata.country[params.name];
						} else if (this.currentView === "us" && this.metadata.state[params.name])
						{
							metadata = this.metadata.state[params.name];
						} else if (this.currentView !== "world" && this.currentView !== "us")
						{

							metadata = this.metadata.county[params.name];
						}

						if (metadata)
						{

							if (metadata.genera && Object.keys(metadata.genera).length > 0)
							{
								html += '<div style="margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px;">';
								html += '<div style="font-weight: 600; margin-bottom: 4px;">Top Genera:</div>';
								const topGenera = Object.entries(metadata.genera)
									.sort((a, b) => b[1] - a[1])
									.slice(0, 5);

								topGenera.forEach(([genus, count]) =>
								{
									const percent = ((count / params.data.value) * 100).toFixed(1);
									html += `<div style="display: flex; justify-content: space-between; margin-bottom: 2px;">`;
									html += `<span style="font-style: italic;">${genus}</span>`;
									html += `<span style="color: #666;">${count} (${percent}%)</span>`;
									html += `</div>`;
								});
								html += '</div>';
							}

							if (metadata.hosts && Object.keys(metadata.hosts).length > 0)
							{
								html += '<div style="margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px;">';
								html += '<div style="font-weight: 600; margin-bottom: 4px;">Top Hosts:</div>';
								const topHosts = Object.entries(metadata.hosts)
									.sort((a, b) => b[1] - a[1])
									.slice(0, 5);

								topHosts.forEach(([host, count]) =>
								{
									const percent = ((count / params.data.value) * 100).toFixed(1);
									html += `<div style="display: flex; justify-content: space-between; margin-bottom: 2px;">`;
									html += `<span>${host || "Unknown"}</span>`;
									html += `<span style="color: #666;">${count} (${percent}%)</span>`;
									html += `</div>`;
								});
								html += '</div>';
							}
						}

						return html;
					})
				},
				visualMap: {
					type: "piecewise",
					pieces: this._getVisualMapPieces(max),
					left: 20,
					bottom: 20,
					text: ["High", "Low"],
					textStyle: {
						fontSize: 12,
						color: "#495057"
					},
					itemWidth: 24,
					itemHeight: 14,
					itemGap: 8,
					orient: "vertical",
					backgroundColor: "rgba(255, 255, 255, 0.9)",
					borderColor: "#e0e0e0",
					borderWidth: 1,
					padding: 10,
					borderRadius: 4
				},
				series: [{
					name: "Genome Count",
					type: "map",
					map: mapName,
					roam: true,
					scaleLimit: {
						min: 0.5,
						max: 10
					},
					layoutCenter: center || ["50%", "50%"],
					layoutSize: zoom * 100 + "%",
					emphasis: {
						label: {
							show: true,
							fontSize: 14,
							fontWeight: "bold"
						},
						itemStyle: {
							areaColor: "#e7c788",
							shadowBlur: 10,
							shadowColor: "rgba(0, 0, 0, 0.2)"
						}
					},
					select: {
						label: {
							show: true,
							fontSize: 14,
							fontWeight: "bold"
						},
						itemStyle: {
							areaColor: "#d4b575"
						}
					},
					itemStyle: {
						areaColor: function (params)
						{
							if (!params.data || params.data.value === 0)
							{
								return "#f8f9fa";
							}
							return null;
						},
						borderColor: "#d1d5db",
						borderWidth: 0.5
					},
					data: chartData
				}]
			};

			// Set up click handlers based on current view
			this.chart.off("click");
			
			if (this.currentView === "world")
			{
				// Click on USA to navigate to US view
				this.chart.on("click", lang.hitch(this, function (params)
				{
					if (params.data && params.data.name)
					{
						// Check if clicked country is USA
						if (params.data.name === "United States of America" || 
							params.data.name === "United States" ||
							params.data.name === "USA")
						{
							this.switchToUSView();
						}
					}
				}));
			}
			else if (this.currentView === "us")
			{
				// Click on state to navigate to state view
				this.chart.on("click", lang.hitch(this, function (params)
				{
					if (params.data && params.data.stateCode)
					{
						this.stateDropdownNode.value = params.data.stateCode;
						this.switchToStateView(params.data.stateCode, params.data.name);
					}
				}));
			}

			this.chart.setOption(option, true);

			setTimeout(lang.hitch(this, function ()
			{
				if (this.chart)
				{
					this.chart.resize();
				}
			}), 100);

			this._updateStatsPanel(chartData);
		},

		_updateStatsPanel: function (chartData)
		{
			if (!this.statsPanel) return;

			const validData = chartData.filter(item => item.value > 0);
			const totalGenomes = validData.reduce((sum, item) => sum + item.value, 0);
			const locations = validData.length;
			const maxLocation = validData.reduce((max, item) => item.value > max.value ? item : max, { value: 0 });
			const avgGenomes = locations > 0 ? Math.round(totalGenomes / locations) : 0;

			let html = '<div style="font-weight: 600; margin-bottom: 8px; color: #212529;">Summary Statistics</div>';
			html += `<div style="margin-bottom: 4px;"><strong>Total Genomes:</strong> ${totalGenomes.toLocaleString()}</div>`;
			html += `<div style="margin-bottom: 4px;"><strong>Locations with Data:</strong> ${locations}</div>`;
			html += `<div style="margin-bottom: 4px;"><strong>Average per Location:</strong> ${avgGenomes.toLocaleString()}</div>`;

			if (maxLocation.value > 0)
			{
				html += `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">`;
				html += `<strong>Highest Concentration:</strong><br>`;
				html += `${maxLocation.name}: ${maxLocation.value.toLocaleString()} genomes`;
				html += `</div>`;
			}

			this.statsPanel.innerHTML = html;
			this.statsPanel.style.display = "block";
		},

		_processWorldData: function (countryData)
		{
			if (!this.worldMapData || !countryData) return [];

			const chartData = [];

			const countryLookup = {};
			Object.keys(countryData).forEach(function (country)
			{
				const normalized = country.toLowerCase().replace(/[^a-z]/g, "");
				countryLookup[normalized] = countryData[country];

				countryLookup[country] = countryData[country];
			});

			this.worldMapData.features.forEach(lang.hitch(this, function (feature)
			{
				const props = feature.properties || {};
				const countryName = props.NAME || props.name || "";
				const normalized = countryName.toLowerCase().replace(/[^a-z]/g, "");

				let value = 0;
				if (countryLookup[countryName])
				{
					value = countryLookup[countryName];
				} else if (countryLookup[normalized])
				{
					value = countryLookup[normalized];
				}

				chartData.push({
					name: countryName,
					value: value
				});
			}));

			return chartData;
		},

		_processUSStateData: function (stateData)
		{
			if (!this.usStatesMapData || !stateData) return [];

			const chartData = [];

			const stateLookup = {};
			Object.keys(stateData).forEach(function (state)
			{
				const normalized = state.toLowerCase().replace(/[^a-z]/g, "");
				stateLookup[normalized] = stateData[state];
				stateLookup[state] = stateData[state];
			});

			this.usStatesMapData.features.forEach(lang.hitch(this, function (feature)
			{
				const props = feature.properties || {};
				const stateName = props.name || props.NAME || "";
				const normalized = stateName.toLowerCase().replace(/[^a-z]/g, "");
				const stateCode = this.stateNameToFips[stateName] || "";

				let value = 0;
				if (stateLookup[stateName])
				{
					value = stateLookup[stateName];
				} else if (stateLookup[normalized])
				{
					value = stateLookup[normalized];
				}

				chartData.push({
					name: stateName,
					value: value,
					stateCode: stateCode
				});
			}));

			return chartData;
		},

		_processStateCountyData: function (countyData, stateCode, stateName)
		{
			if (!this.stateCountiesMapData[stateCode] || !countyData) return [];

			console.log("Processing county data for state:", stateName, "code:", stateCode);
			console.log("All county data keys (first 10):", Object.keys(countyData).slice(0, 10));

			const chartData = [];
			const stateGeoData = this.stateCountiesMapData[stateCode];

			const stateCountyData = {};
			const stateAbbr = this._getStateAbbreviation(stateName);
			console.log("Looking for counties with state:", stateName, "or abbreviation:", stateAbbr);

			const hasStateInfo = Object.keys(countyData).some(name => name.includes(","));

			if (!hasStateInfo)
			{

				console.log("County data doesn't include state info, using all counties");
				Object.keys(countyData).forEach(function (countyName)
				{
					stateCountyData[countyName] = countyData[countyName];
				});
			}
			else
			{

				Object.keys(countyData).forEach(lang.hitch(this, function (countyName)
				{

					if (countyName.includes(", " + stateName) ||
						countyName.includes(", " + stateAbbr))
					{
						console.log("Found matching county:", countyName);

						const countyOnly = countyName.split(",")[0].trim();
						stateCountyData[countyOnly] = countyData[countyName];
					}
				}));
			}

			console.log("Filtered state county data:", stateCountyData);
			console.log("Number of counties found for state:", Object.keys(stateCountyData).length);

			const countyLookup = {};
			Object.keys(stateCountyData).forEach(function (county)
			{
				const normalized = county.toLowerCase().replace(/[^a-z0-9]/g, "");
				const withoutCounty = county.toLowerCase().replace(" county", "").trim();
				const titleCase = county.charAt(0).toUpperCase() + county.slice(1).toLowerCase();

				countyLookup[county] = stateCountyData[county];
				countyLookup[county.toLowerCase()] = stateCountyData[county];
				countyLookup[county.toUpperCase()] = stateCountyData[county];
				countyLookup[titleCase] = stateCountyData[county];
				countyLookup[normalized] = stateCountyData[county];
				countyLookup[withoutCounty] = stateCountyData[county];

				if (county.toLowerCase() === "dupage")
				{
					countyLookup["DuPage"] = stateCountyData[county];
					countyLookup["Du Page"] = stateCountyData[county];
				}

				if (county.toLowerCase() === "mchenry")
				{
					countyLookup["McHenry"] = stateCountyData[county];
				}

				if (county.toLowerCase() === "dekalb")
				{
					countyLookup["DeKalb"] = stateCountyData[county];
				}
			});

			console.log("Map features (first 5):", stateGeoData.features.slice(0, 5).map(f => ({
				name: f.properties.NAME || f.properties.name,
				props: f.properties
			})));

			stateGeoData.features.forEach(function (feature, index)
			{
				const props = feature.properties || {};
				const countyName = props.NAME || props.name || "";

				let value = 0;
				let matched = false;

				const namesToTry = [
					countyName,
					countyName.toLowerCase(),
					countyName.toUpperCase(),
					countyName + " County",
					countyName.toLowerCase().replace(/[^a-z0-9]/g, ""),
					countyName.toLowerCase().replace(" county", "").trim(),

					countyName.replace(/Mc([A-Z])/g, "Mc$1"),
					countyName.replace(/Mc([A-Z])/g, (match, p1) => "Mc" + p1.toLowerCase())
				];

				for (let name of namesToTry)
				{
					if (countyLookup[name])
					{
						value = countyLookup[name];
						matched = true;
						break;
					}
				}

				if (!matched && index < 10)
				{
					console.log("No match for county:", countyName, "Tried:", namesToTry);
				}

				chartData.push({
					name: countyName,
					value: value
				});
			});

			return chartData;
		},

		_getVisualMapPieces: function (max)
		{
			// MAAGE green color scheme based on #98bdac (matching demo)
			const greenShades = [
				"#f0f5f3",  // Lightest shade
				"#e1ebe6",
				"#d2e1d9",
				"#c3d7cc",
				"#b4cdbf",
				"#a5c3b2",
				"#98bdac",  // Base color
				"#8ba89c",
				"#7e938c"   // Darkest shade
			];

			if (max <= 10)
			{
				return [
					{ min: 1, max: 2, label: "1-2", color: greenShades[0] },
					{ min: 3, max: 5, label: "3-5", color: greenShades[3] },
					{ min: 6, max: 10, label: "6-10", color: greenShades[6] }
				];
			} else if (max <= 100)
			{
				return [
					{ min: 1, max: 10, label: "1-10", color: greenShades[0] },
					{ min: 11, max: 25, label: "11-25", color: greenShades[2] },
					{ min: 26, max: 50, label: "26-50", color: greenShades[4] },
					{ min: 51, max: 100, label: "51-100", color: greenShades[6] }
				];
			} else if (max <= 1000)
			{
				return [
					{ min: 1, max: 10, label: "1-10", color: greenShades[0] },
					{ min: 11, max: 50, label: "11-50", color: greenShades[2] },
					{ min: 51, max: 100, label: "51-100", color: greenShades[4] },
					{ min: 101, max: 500, label: "101-500", color: greenShades[6] },
					{ min: 501, max: 1000, label: "501-1K", color: greenShades[8] }
				];
			} else
			{
				return [
					{ min: 1, max: 50, label: "1-50", color: greenShades[0] },
					{ min: 51, max: 100, label: "51-100", color: greenShades[2] },
					{ min: 101, max: 500, label: "101-500", color: greenShades[4] },
					{ min: 501, max: 1000, label: "501-1K", color: greenShades[6] },
					{ min: 1001, max: 5000, label: "1K-5K", color: greenShades[7] },
					{ min: 5001, label: ">5K", color: greenShades[8] }
				];
			}
		},

		_getStateNameByCode: function (code)
		{
			for (let name in this.stateNameToFips)
			{
				if (this.stateNameToFips[name] === code)
				{
					return name;
				}
			}
			return null;
		},

		_getStateAbbreviation: function (stateName)
		{
			const abbreviations = {
				"Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
				"California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
				"District of Columbia": "DC", "Florida": "FL", "Georgia": "GA", "Hawaii": "HI",
				"Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
				"Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME",
				"Maryland": "MD", "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN",
				"Mississippi": "MS", "Missouri": "MO", "Montana": "MT", "Nebraska": "NE",
				"Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM",
				"New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
				"Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI",
				"South Carolina": "SC", "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX",
				"Utah": "UT", "Vermont": "VT", "Virginia": "VA", "Washington": "WA",
				"West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY"
			};
			return abbreviations[stateName] || "";
		}
	});
});