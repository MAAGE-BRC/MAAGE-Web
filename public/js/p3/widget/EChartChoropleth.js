define([
	"dojo/_base/declare",
	"./EChart",
	"dojo/_base/lang",
	"dojo/request",
	"echarts",
	"dojo/dom-construct",
	"dojo/on",
], function (declare, EChart, lang, request, echarts, domConstruct, on)
{
	return declare([EChart], {
		baseClass: "EChartChoropleth",
		title: "Geographic Distribution",
		
		// Map data storage
		worldMapData: null,
		usStatesMapData: null,
		usCountiesMapData: null,
		stateCountiesMapData: {},
		
		// Current view state
		currentView: "us", // "world", "us", or state code (e.g., "17" for Illinois)
		selectedState: null,
		selectedStateName: null,
		
		// UI controls
		controlsNode: null,
		viewToggleNode: null,
		stateDropdownNode: null,
		backButtonNode: null,
		
		// Data storage
		genomeData: null,
		
		// State FIPS code mapping
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
		
		// ISO country codes
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
			// Add more as needed
		},
		
		postCreate: function ()
		{
			this.inherited(arguments);
			
			if (!window.topojson)
			{
				console.error("TopoJSON library not loaded");
				return;
			}
			
			// Create controls UI
			this._createControls();
			
			// Start loading map data
			this.loadMapData();
		},
		
		_createControls: function ()
		{
			if (!this.domNode || !this.chartNode) return;
			
			// Set up container styling
			this.domNode.style.height = "100%";
			this.domNode.style.display = "flex";
			this.domNode.style.flexDirection = "column";
			
			// Create controls container
			this.controlsNode = domConstruct.create("div", {
				style: "display: flex; gap: 12px; margin-bottom: 12px; flex-shrink: 0; align-items: center;"
			}, this.domNode, "first");
			
			// Create view toggle buttons
			const toggleContainer = domConstruct.create("div", {
				style: "display: flex; gap: 4px; background-color: #f3f4f6; border-radius: 8px; padding: 4px;"
			}, this.controlsNode);
			
			// World view button
			this.worldViewBtn = domConstruct.create("button", {
				innerHTML: "World",
				style: "padding: 6px 16px; background-color: transparent; color: #6c757d; border-radius: 6px; border: none; cursor: pointer; font-size: 15px; font-weight: 500; transition: all 0.2s;"
			}, toggleContainer);
			
			// US view button (active by default)
			this.usViewBtn = domConstruct.create("button", {
				innerHTML: "United States",
				style: "padding: 6px 16px; background-color: #98bdac; color: white; border-radius: 6px; border: none; cursor: pointer; font-size: 15px; font-weight: 500; transition: all 0.2s;"
			}, toggleContainer);
			
			// State dropdown (shown for US view)
			this.stateDropdownNode = domConstruct.create("select", {
				style: "padding: 6px 16px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 15px; cursor: pointer; background-color: white;"
			}, this.controlsNode);
			
			// Populate state dropdown
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
			
			// Back button (hidden by default)
			this.backButtonNode = domConstruct.create("button", {
				style: "padding: 6px 16px; background-color: #5f94ab; color: white; border-radius: 6px; border: none; cursor: pointer; font-size: 15px; font-weight: 500; display: none;",
				innerHTML: "← Back"
			}, this.controlsNode);
			
			// Set up chart node styling
			this.chartNode.style.flex = "1";
			this.chartNode.style.minHeight = "450px";
			this.chartNode.style.height = "450px";
			
			// Bind events
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
					// Coming from state view, go back to US
					this.switchToUSView();
				}
			}));
		},
		
		startup: function ()
		{
			this.inherited(arguments);
			// After base startup, check if we have pending data
			if (this.genomeData && this.chart)
			{
				this.updateChart(this.genomeData);
			}
		},
		
		initializeChart: function ()
		{
			this.inherited(arguments);
			// After chart initialization, update with any pending data
			if (this.genomeData && this.chart)
			{
				this.updateChart(this.genomeData);
			}
		},
		
		loadMapData: function ()
		{
			// Don't show loading until chart is ready
			if (this.chart)
			{
				this.showLoading();
			}
			
			// Load all map data in parallel
			const promises = [
				// World map
				request("/maage/maps/world-atlas/countries-110m.json", { handleAs: "json" }),
				// US states (non-Albers for straight projection)
				request("/maage/maps/us-atlas/states-10m.json", { handleAs: "json" }),
				// US counties (non-Albers for straight projection)
				request("/maage/maps/us-atlas/counties-10m.json", { handleAs: "json" })
			];
			
			Promise.all(promises).then(
				lang.hitch(this, function ([worldTopo, statesTopo, countiesTopo])
				{
					// Process world map
					const worldGeo = topojson.feature(worldTopo, worldTopo.objects.countries);
					echarts.registerMap("world", worldGeo);
					this.worldMapData = worldGeo;
					
					// Process US states map
					const statesGeo = topojson.feature(statesTopo, statesTopo.objects.states);
					// Don't flip coordinates - use maps as they are
					echarts.registerMap("usa-states", statesGeo);
					this.usStatesMapData = statesGeo;
					
					// Process US counties map
					const countiesGeo = topojson.feature(countiesTopo, countiesTopo.objects.counties);
					// Don't flip coordinates - use maps as they are
					echarts.registerMap("usa-counties", countiesGeo);
					this.usCountiesMapData = countiesGeo;
					
					// Hide loading only if chart exists
					if (this.chart)
					{
						this.hideLoading();
					}
					
					// Update chart if we have data
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
		
		// Note: _flipCoordinates function removed - using standard projection maps instead
		
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
			
			// Load state-specific county data if not already loaded
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
			// Update button styling based on current view
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
			// Extract state counties from the full counties dataset
			if (!this.usCountiesMapData) return;
			
			const stateCounties = {
				type: "FeatureCollection",
				features: this.usCountiesMapData.features.filter(function (feature)
				{
					// County FIPS codes start with state FIPS
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
			// Store data for later use
			this.genomeData = data || {};
			
			// If chart not initialized yet, ensure it gets initialized
			if (!this.chart)
			{
				// Try to initialize if we have a chartNode
				if (this.chartNode && this._started)
				{
					this.initializeChart();
				}
				// If still no chart, wait for initialization
				if (!this.chart)
				{
					console.log("EChartChoropleth: Chart not ready yet, deferring update");
					return;
				}
			}
			
			let chartData = [];
			let mapName = "world";
			let title = this.title;
			let zoom = 1;
			let center = null;
			
			// Process data based on current view
			if (this.currentView === "world")
			{
				mapName = "world";
				title = "World Distribution";
				chartData = this._processWorldData(this.genomeData.countryData || {});
			} else if (this.currentView === "us")
			{
				mapName = "usa-states";
				title = "United States Distribution";
				chartData = this._processUSStateData(this.genomeData.stateData || {});
				zoom = 0.95;
			} else
			{
				// State view
				mapName = "state-" + this.currentView;
				title = this.selectedStateName + " Counties";
				chartData = this._processStateCountyData(
					this.genomeData.countyData || {},
					this.currentView,
					this.selectedStateName
				);
				zoom = 0.9;
			}
			
			// Calculate value range
			const values = chartData.map(item => item.value).filter(v => v > 0);
			const max = Math.max(...values) || 100;
			
			const option = {
				title: {
					text: title,
					left: "center",
					textStyle: {
						fontSize: 18,
						fontWeight: "500"
					}
				},
				tooltip: {
					trigger: "item",
					formatter: function (params)
					{
						if (params.data && params.data.value)
						{
							return params.name + ": " + params.data.value + " genomes";
						}
						return params.name + ": No data";
					}
				},
				visualMap: {
					type: "piecewise",
					pieces: this._getVisualMapPieces(max),
					left: "left",
					top: "bottom",
					textStyle: {
						fontSize: 12
					},
					itemWidth: 20,
					itemHeight: 12
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
							show: true
						},
						itemStyle: {
							areaColor: "#e7c788"
						}
					},
					itemStyle: {
						areaColor: function (params)
						{
							if (!params.data || params.data.value === 0)
							{
								return "#f3f4f6";
							}
							return null;
						},
						borderColor: "#d1d5db",
						borderWidth: 0.5
					},
					data: chartData
				}]
			};
			
			// Add click handler for US view
			if (this.currentView === "us")
			{
				this.chart.off("click");
				this.chart.on("click", lang.hitch(this, function (params)
				{
					if (params.data && params.data.stateCode)
					{
						this.stateDropdownNode.value = params.data.stateCode;
						this.switchToStateView(params.data.stateCode, params.data.name);
					}
				}));
			} else
			{
				this.chart.off("click");
			}
			
			this.chart.setOption(option, true);
			
			// Ensure proper sizing
			setTimeout(lang.hitch(this, function ()
			{
				if (this.chart)
				{
					this.chart.resize();
				}
			}), 100);
		},
		
		_processWorldData: function (countryData)
		{
			if (!this.worldMapData || !countryData) return [];
			
			const chartData = [];
			
			// Create normalized lookup
			const countryLookup = {};
			Object.keys(countryData).forEach(function (country)
			{
				const normalized = country.toLowerCase().replace(/[^a-z]/g, "");
				countryLookup[normalized] = countryData[country];
				// Also store with original key
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
			
			// Create normalized lookup
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
			
			// Filter county data for this state
			const stateCountyData = {};
			const stateAbbr = this._getStateAbbreviation(stateName);
			console.log("Looking for counties with state:", stateName, "or abbreviation:", stateAbbr);
			
			// Check if county data includes state information
			const hasStateInfo = Object.keys(countyData).some(name => name.includes(","));
			
			if (!hasStateInfo)
			{
				// County data doesn't include state info, so we'll use all counties
				// This assumes we're viewing data filtered by state already
				console.log("County data doesn't include state info, using all counties");
				Object.keys(countyData).forEach(function (countyName)
				{
					stateCountyData[countyName] = countyData[countyName];
				});
			}
			else
			{
				// County data includes state info, filter by state
				Object.keys(countyData).forEach(lang.hitch(this, function (countyName)
				{
					// Check if county belongs to this state
					if (countyName.includes(", " + stateName) || 
						countyName.includes(", " + stateAbbr))
					{
						console.log("Found matching county:", countyName);
						// Extract just county name
						const countyOnly = countyName.split(",")[0].trim();
						stateCountyData[countyOnly] = countyData[countyName];
					}
				}));
			}
			
			console.log("Filtered state county data:", stateCountyData);
			console.log("Number of counties found for state:", Object.keys(stateCountyData).length);
			
			// Create lookup with various normalizations
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
				
				// Handle special cases
				// DuPage/Dupage
				if (county.toLowerCase() === "dupage")
				{
					countyLookup["DuPage"] = stateCountyData[county];
					countyLookup["Du Page"] = stateCountyData[county];
				}
				// McHenry/Mchenry
				if (county.toLowerCase() === "mchenry")
				{
					countyLookup["McHenry"] = stateCountyData[county];
				}
				// DeKalb/Dekalb
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
				
				// Try various name formats
				const namesToTry = [
					countyName,
					countyName.toLowerCase(),
					countyName.toUpperCase(),
					countyName + " County",
					countyName.toLowerCase().replace(/[^a-z0-9]/g, ""),
					countyName.toLowerCase().replace(" county", "").trim(),
					// Handle special cases like McHenry
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
				
				// Log unmatched counties for debugging
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
			// Dynamic visual map based on max value
			if (max <= 10)
			{
				return [
					{ min: 1, max: 2, label: "1-2", color: "#e7f5f8" },
					{ min: 3, max: 5, label: "3-5", color: "#b4d0c3" },
					{ min: 6, max: 10, label: "6-10", color: "#98bdac" }
				];
			} else if (max <= 100)
			{
				return [
					{ min: 1, max: 10, label: "1-10", color: "#e7f5f8" },
					{ min: 11, max: 25, label: "11-25", color: "#b4d0c3" },
					{ min: 26, max: 50, label: "26-50", color: "#98bdac" },
					{ min: 51, max: 100, label: "51-100", color: "#6ea089" }
				];
			} else
			{
				return [
					{ min: 1, max: 10, label: "1-10", color: "#e7f5f8" },
					{ min: 11, max: 50, label: "11-50", color: "#b4d0c3" },
					{ min: 51, max: 100, label: "51-100", color: "#98bdac" },
					{ min: 101, max: 500, label: "101-500", color: "#6ea089" },
					{ min: 501, max: 1000, label: "501-1K", color: "#57856f" },
					{ min: 1001, label: ">1K", color: "#496f5d" }
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