define([
	"dojo/_base/declare",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dojo/_base/lang",
	"dojo/request",
	"dojo/dom-construct",
	"dojo/on"
], function (declare, WidgetBase, TemplatedMixin, lang, request, domConstruct, on) {
	
	return declare([WidgetBase, TemplatedMixin], {
		baseClass: "D3Choropleth",
		templateString: "<div></div>",
		title: "",

		// Map data storage
		worldMapData: null,
		usMapData: null,
		
		// Current state
		currentView: "us",
		selectedState: null,
		selectedStateName: null,
		
		// DOM nodes
		controlsNode: null,
		mapContainer: null,
		svg: null,
		g: null,
		tooltip: null,
		
		// D3 objects
		projection: null,
		path: null,
		colorScale: null,
		
		// Data
		genomeData: null,
		metadata: null,
		
		// State mappings
		stateNameToFips: {
			"Alabama": "01", "Alaska": "02", "Arizona": "04", "Arkansas": "05",
			"California": "06", "Colorado": "08", "Connecticut": "09", "Delaware": "10",
			"District of Columbia": "11", "Florida": "12", "Georgia": "13", "Hawaii": "15",
			"Idaho": "16", "Illinois": "17", "Indiana": "18", "Iowa": "19",
			"Kansas": "20", "Kentucky": "21", "Louisiana": "22", "Maine": "23",
			"Maryland": "24", "Massachusetts": "25", "Michigan": "26", "Minnesota": "27",
			"Mississippi": "28", "Missouri": "29", "Montana": "30", "Nebraska": "31",
			"Nevada": "32", "New Hampshire": "33", "New Jersey": "34", "New Mexico": "35",
			"New York": "36", "North Carolina": "37", "North Dakota": "38", "Ohio": "39",
			"Oklahoma": "40", "Oregon": "41", "Pennsylvania": "42", "Rhode Island": "44",
			"South Carolina": "45", "South Dakota": "46", "Tennessee": "47", "Texas": "48",
			"Utah": "49", "Vermont": "50", "Virginia": "51", "Washington": "53",
			"West Virginia": "54", "Wisconsin": "55", "Wyoming": "56"
		},

		countryNameToISO: {
			"United States": "USA", "United Kingdom": "GBR", "Canada": "CAN",
			"China": "CHN", "India": "IND", "Brazil": "BRA", "Russia": "RUS",
			"Japan": "JPN", "Germany": "DEU", "France": "FRA", "Italy": "ITA",
			"Spain": "ESP", "Australia": "AUS"
		},

		postCreate: function () {
			this.inherited(arguments);
			this._setupDOM();
			this._setupColorScale();
			this._loadDependencies();
		},

		_loadDependencies: function () {
			// Load D3 and topojson dynamically
			require(["d3v7", "topojson-client"], lang.hitch(this, function (d3, topojson) {
				// Make available to widget
				this.d3 = d3;
				this.topojson = topojson;
				// Now load map data
				this.loadMapData();
			}));
		},

		startup: function () {
			this.inherited(arguments);
			if (this.genomeData) {
				this.updateChart(this.genomeData);
			}
		},

		_setupDOM: function () {
			// Create main container
			this.domNode.style.cssText = "display: flex; flex-direction: column; height: 100%; min-height: 450px;";
			
			// Create controls
			this.controlsNode = domConstruct.create("div", {
				style: "display: flex; justify-content: space-between; align-items: center; padding: 12px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef;"
			}, this.domNode);

			// View toggle buttons
			const toggleContainer = domConstruct.create("div", {
				style: "display: flex; gap: 8px;"
			}, this.controlsNode);

			this.worldViewBtn = domConstruct.create("button", {
				innerHTML: "World",
				style: "padding: 6px 16px; background-color: #6c757d; color: white; border-radius: 6px; border: none; cursor: pointer; font-size: 15px; font-weight: 500;"
			}, toggleContainer);

			this.usViewBtn = domConstruct.create("button", {
				innerHTML: "United States",
				style: "padding: 6px 16px; background-color: #98bdac; color: white; border-radius: 6px; border: none; cursor: pointer; font-size: 15px; font-weight: 500;"
			}, toggleContainer);

			// State dropdown
			this.stateDropdownNode = domConstruct.create("select", {
				style: "padding: 6px 16px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 15px; cursor: pointer; background-color: white;"
			}, this.controlsNode);

			domConstruct.create("option", {
				value: "",
				innerHTML: "Select a state...",
				selected: true
			}, this.stateDropdownNode);

			Object.keys(this.stateNameToFips).forEach(lang.hitch(this, function (stateName) {
				domConstruct.create("option", {
					value: this.stateNameToFips[stateName],
					innerHTML: stateName
				}, this.stateDropdownNode);
			}));

			// Back button
			this.backButtonNode = domConstruct.create("button", {
				style: "padding: 6px 16px; background-color: #5f94ab; color: white; border-radius: 6px; border: none; cursor: pointer; font-size: 15px; font-weight: 500; display: none;",
				innerHTML: "← Back"
			}, this.controlsNode);

			// Zoom controls
			const zoomControls = domConstruct.create("div", {
				style: "display: flex; gap: 4px; background-color: #f3f4f6; border-radius: 8px; padding: 4px;"
			}, this.controlsNode);

			this.zoomInBtn = domConstruct.create("button", {
				innerHTML: "+",
				style: "width: 32px; height: 32px; background-color: #98bdac; color: white; border-radius: 6px; border: none; cursor: pointer; font-size: 18px; font-weight: bold;"
			}, zoomControls);

			this.zoomOutBtn = domConstruct.create("button", {
				innerHTML: "−",
				style: "width: 32px; height: 32px; background-color: #5f94ab; color: white; border-radius: 6px; border: none; cursor: pointer; font-size: 18px; font-weight: bold;"
			}, zoomControls);

			this.zoomResetBtn = domConstruct.create("button", {
				innerHTML: "⟲",
				style: "width: 32px; height: 32px; background-color: #6c757d; color: white; border-radius: 6px; border: none; cursor: pointer; font-size: 18px; font-weight: bold;"
			}, zoomControls);

			// Map container
			this.mapContainer = domConstruct.create("div", {
				style: "flex: 1; position: relative; overflow: hidden;"
			}, this.domNode);

			// SVG and tooltip will be created when map data loads
			this._setupEventHandlers();
		},

		_setupEventHandlers: function () {
			on(this.worldViewBtn, "click", lang.hitch(this, "switchToWorldView"));
			on(this.usViewBtn, "click", lang.hitch(this, "switchToUSView"));
			on(this.stateDropdownNode, "change", lang.hitch(this, function (evt) {
				const stateCode = evt.target.value;
				if (stateCode) {
					const stateName = this._getStateNameByCode(stateCode);
					if (stateName) {
						this.switchToStateView(stateCode, stateName);
					}
				}
			}));
			on(this.backButtonNode, "click", lang.hitch(this, function () {
				if (this.currentView !== "world" && this.currentView !== "us") {
					this.switchToUSView();
				}
			}));
			on(this.zoomInBtn, "click", lang.hitch(this, "zoomIn"));
			on(this.zoomOutBtn, "click", lang.hitch(this, "zoomOut"));
			on(this.zoomResetBtn, "click", lang.hitch(this, "resetZoom"));
		},

		_setupColorScale: function (maxValue) {
			// MAAGE green color scale
			const domain = maxValue ? [0, maxValue] : [0, 10];
			if (this.d3) {
				this.colorScale = this.d3.scaleSequential()
					.domain(domain)
					.interpolator(this.d3.interpolateRgb("#e8f5e8", "#98bdac"));
			}
		},

		_setupSVG: function () {
			if (!this.d3) return;
			
			if (this.svg) {
				this.svg.remove();
			}

			const containerRect = this.mapContainer.getBoundingClientRect();
			const width = containerRect.width || 800;
			const height = containerRect.height || 450;

			this.svg = this.d3.select(this.mapContainer)
				.append("svg")
				.attr("width", width)
				.attr("height", height)
				.style("display", "block");

			this.g = this.svg.append("g");

			// Setup zoom behavior
			const zoom = this.d3.zoom()
				.scaleExtent([0.5, 8])
				.on("zoom", (event) => {
					this.g.attr("transform", event.transform);
				});

			this.svg.call(zoom);
			this.zoomBehavior = zoom;

			// Create tooltip
			if (this.tooltip) {
				this.tooltip.remove();
			}
			
			this.tooltip = this.d3.select(this.mapContainer)
				.append("div")
				.style("position", "absolute")
				.style("background", "rgba(15, 23, 42, 0.95)")
				.style("color", "white")
				.style("padding", "12px")
				.style("border-radius", "6px")
				.style("font-size", "13px")
				.style("pointer-events", "none")
				.style("opacity", 0)
				.style("box-shadow", "0 4px 6px rgba(0, 0, 0, 0.1)")
				.style("border", "1px solid rgba(255, 255, 255, 0.1)");
		},

		loadMapData: function () {
			if (!this.d3 || !this.topojson) {
				console.warn("D3 or topojson not available");
				return;
			}

			const promises = [
				request("/maage/maps/world-atlas/countries-110m.json", { handleAs: "json" }),
				request("/maage/maps/us-atlas/counties-10m.json", { handleAs: "json" })
			];

			Promise.all(promises).then(
				lang.hitch(this, function ([worldTopo, usAtlas]) {
					this.worldMapData = worldTopo;
					this.usMapData = usAtlas;
					
					this._setupSVG();
					
					if (this.genomeData) {
						this.updateChart(this.genomeData);
					} else {
						this.switchToUSView();
					}
				}),
				lang.hitch(this, function (err) {
					console.error("Failed to load map data:", err);
				})
			);
		},

		updateChart: function (data) {
			this.genomeData = data;
			
			if (!this.worldMapData || !this.usMapData || !this.svg) {
				return;
			}

			// Calculate max value for color scale
			let maxValue = 0;
			if (data) {
				const allCounts = [
					...Object.values(data.countryData || {}),
					...Object.values(data.stateData || {}),
					...Object.values(data.countyData || {})
				];
				maxValue = Math.max(...allCounts, 0);
			}
			
			this._setupColorScale(maxValue);

			if (this.currentView === "world") {
				this.drawWorldView();
			} else if (this.currentView === "us") {
				this.drawUSView();
			} else {
				this.drawStateView(this.selectedState, this.selectedStateName);
			}
		},

		switchToWorldView: function () {
			this.currentView = "world";
			this._updateButtonStyles();
			this.drawWorldView();
		},

		switchToUSView: function () {
			this.currentView = "us";
			this.selectedState = null;
			this.selectedStateName = null;
			this._updateButtonStyles();
			this.drawUSView();
		},

		switchToStateView: function (stateCode, stateName) {
			this.currentView = "state";
			this.selectedState = stateCode;
			this.selectedStateName = stateName;
			this._updateButtonStyles();
			this.drawStateView(stateCode, stateName);
		},

		drawWorldView: function () {
			if (!this.d3 || !this.topojson || !this.worldMapData) return;
			
			this.g.selectAll("*").remove();

			const containerRect = this.mapContainer.getBoundingClientRect();
			const width = containerRect.width || 800;
			const height = containerRect.height || 450;

			// World projection
			this.projection = this.d3.geoNaturalEarth1()
				.scale(150)
				.translate([width / 2, height / 2]);

			this.path = this.d3.geoPath().projection(this.projection);

			const countries = this.topojson.feature(this.worldMapData, this.worldMapData.objects.countries);

			this.g.selectAll(".country")
				.data(countries.features)
				.join("path")
				.attr("class", "country")
				.attr("d", this.path)
				.attr("fill", (d) => {
					const countryData = this._getCountryData(d);
					return countryData ? this.colorScale(countryData.value) : "#f8f9fa";
				})
				.attr("stroke", "#334155")
				.attr("stroke-width", 0.5)
				.style("cursor", "pointer")
				.on("mouseover", (event, d) => this._showTooltip(event, d, "country"))
				.on("mouseout", () => this._hideTooltip())
				.on("click", (event, d) => {
					if (d.properties.NAME === "United States of America") {
						this.switchToUSView();
					}
				});

			this.resetZoom();
		},

		drawUSView: function () {
			if (!this.d3 || !this.topojson || !this.usMapData) return;
			
			this.g.selectAll("*").remove();

			const containerRect = this.mapContainer.getBoundingClientRect();
			const width = containerRect.width || 800;
			const height = containerRect.height || 450;

			// US AlbersUSA projection for proper Alaska/Hawaii positioning
			this.projection = this.d3.geoAlbersUsa()
				.scale(1000)
				.translate([width / 2, height / 2]);

			this.path = this.d3.geoPath().projection(this.projection);

			const states = this.topojson.feature(this.usMapData, this.usMapData.objects.states);

			this.g.selectAll(".state")
				.data(states.features)
				.join("path")
				.attr("class", "state")
				.attr("d", this.path)
				.attr("fill", (d) => {
					const stateData = this._getStateData(d);
					return stateData ? this.colorScale(stateData.value) : "#f8f9fa";
				})
				.attr("stroke", "#334155")
				.attr("stroke-width", 0.5)
				.style("cursor", "pointer")
				.on("mouseover", (event, d) => this._showTooltip(event, d, "state"))
				.on("mouseout", () => this._hideTooltip())
				.on("click", (event, d) => {
					const stateCode = d.id;
					const stateName = d.properties.name;
					if (stateCode && stateName) {
						this.switchToStateView(stateCode, stateName);
					}
				});

			// Add state borders
			this.g.append("path")
				.datum(this.topojson.mesh(this.usMapData, this.usMapData.objects.states, (a, b) => a !== b))
				.attr("fill", "none")
				.attr("stroke", "#e2e8f0")
				.attr("stroke-linejoin", "round")
				.attr("d", this.path);

			this.resetZoom();
		},

		drawStateView: function (stateCode, stateName) {
			if (!this.d3 || !this.topojson || !this.usMapData) return;
			
			this.g.selectAll("*").remove();

			const containerRect = this.mapContainer.getBoundingClientRect();
			const width = containerRect.width || 800;
			const height = containerRect.height || 450;

			// Filter counties for the selected state
			const allCounties = this.topojson.feature(this.usMapData, this.usMapData.objects.counties);
			const stateCounties = allCounties.features.filter(d => d.id.startsWith(stateCode));

			if (stateCounties.length === 0) {
				console.warn("No county data for state:", stateName);
				this.switchToUSView();
				return;
			}

			// Create state bounds for projection
			const stateBounds = { type: "FeatureCollection", features: stateCounties };

			// Mercator projection fitted to state bounds
			this.projection = this.d3.geoMercator();
			const padding = 20;
			this.projection.fitExtent(
				[[padding, padding], [width - padding, height - padding]], 
				stateBounds
			);

			this.path = this.d3.geoPath().projection(this.projection);

			this.g.selectAll(".county")
				.data(stateCounties)
				.join("path")
				.attr("class", "county")
				.attr("d", this.path)
				.attr("fill", (d) => {
					const countyData = this._getCountyData(d);
					return countyData ? this.colorScale(countyData.value) : "#f8f9fa";
				})
				.attr("stroke", "#334155")
				.attr("stroke-width", 0.5)
				.style("cursor", "pointer")
				.on("mouseover", (event, d) => this._showTooltip(event, d, "county"))
				.on("mouseout", () => this._hideTooltip());

			// Add county borders
			this.g.append("path")
				.datum(this.topojson.mesh(this.usMapData, this.usMapData.objects.counties, 
					(a, b) => a !== b && a.id.slice(0, 2) === stateCode && b.id.slice(0, 2) === stateCode))
				.attr("fill", "none")
				.attr("stroke", "#e2e8f0")
				.attr("stroke-linejoin", "round")
				.attr("stroke-width", 0.25)
				.attr("d", this.path);

			this.resetZoom();
		},

		_showTooltip: function (event, d, type) {
			let data, content;
			
			if (type === "country") {
				data = this._getCountryData(d);
				content = `<div><strong>${d.properties.NAME || "Unknown"}</strong></div>`;
			} else if (type === "state") {
				data = this._getStateData(d);
				content = `<div><strong>${d.properties.name || "Unknown"}</strong></div>`;
			} else {
				data = this._getCountyData(d);
				content = `<div><strong>${d.properties.name || "Unknown"}</strong></div>`;
			}

			if (data) {
				content += `<div>Genomes: ${data.count || 0}</div>`;
				if (data.genera && data.genera.length > 0) {
					content += `<div style="margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 8px;">`;
					content += `<div style="font-weight: bold; margin-bottom: 4px;">Top Genera:</div>`;
					data.genera.slice(0, 5).forEach(g => {
						content += `<div><em>${g.genus}</em>: ${g.count} (${g.percentage}%)</div>`;
					});
					content += `</div>`;
				}
			} else {
				content += `<div>No data available</div>`;
			}

			const [x, y] = this.d3.pointer(event, this.mapContainer);
			this.tooltip
				.style("opacity", 1)
				.html(content)
				.style("left", (x + 15) + "px")
				.style("top", (y - 15) + "px");
		},

		_hideTooltip: function () {
			this.tooltip.style("opacity", 0);
		},

		_getCountryData: function (feature) {
			if (!this.genomeData || !this.genomeData.countryData) return null;
			const countryName = feature.properties.NAME;
			const count = this.genomeData.countryData[countryName];
			const metadata = this.genomeData.countryMetadata && this.genomeData.countryMetadata[countryName];
			
			if (!count) return null;
			
			return {
				count: count,
				value: count,
				genera: this._formatGenera(metadata?.genera),
				hosts: this._formatBreakdown(metadata?.hosts)
			};
		},

		_getStateData: function (feature) {
			if (!this.genomeData || !this.genomeData.stateData) return null;
			const stateName = feature.properties.name;
			const count = this.genomeData.stateData[stateName];
			const metadata = this.genomeData.stateMetadata && this.genomeData.stateMetadata[stateName];
			
			if (!count) return null;
			
			return {
				count: count,
				value: count,
				genera: this._formatGenera(metadata?.genera),
				hosts: this._formatBreakdown(metadata?.hosts)
			};
		},

		_getCountyData: function (feature) {
			if (!this.genomeData || !this.genomeData.countyData) return null;
			const countyKey = feature.properties.name;
			const count = this.genomeData.countyData[countyKey];
			const metadata = this.genomeData.countyMetadata && this.genomeData.countyMetadata[countyKey];
			
			if (!count) return null;
			
			return {
				count: count,
				value: count,
				genera: this._formatGenera(metadata?.genera)
			};
		},

		_formatGenera: function (genera) {
			if (!genera) return [];
			
			const total = Object.values(genera).reduce((sum, count) => sum + count, 0);
			return Object.entries(genera)
				.map(([genus, count]) => ({
					genus: genus,
					count: count,
					percentage: Math.round((count / total) * 100)
				}))
				.sort((a, b) => b.count - a.count);
		},

		_formatBreakdown: function (breakdown) {
			if (!breakdown) return [];
			
			const total = Object.values(breakdown).reduce((sum, count) => sum + count, 0);
			return Object.entries(breakdown)
				.map(([name, count]) => ({
					name: name,
					count: count,
					percentage: Math.round((count / total) * 100)
				}))
				.sort((a, b) => b.count - a.count);
		},

		_getStateNameByCode: function (code) {
			for (const [name, fips] of Object.entries(this.stateNameToFips)) {
				if (fips === code) return name;
			}
			return null;
		},

		_updateButtonStyles: function () {
			// Reset all buttons
			[this.worldViewBtn, this.usViewBtn].forEach(btn => {
				btn.style.backgroundColor = "#6c757d";
			});

			// Set active button
			if (this.currentView === "world") {
				this.worldViewBtn.style.backgroundColor = "#98bdac";
				this.stateDropdownNode.style.display = "none";
				this.backButtonNode.style.display = "none";
			} else if (this.currentView === "us") {
				this.usViewBtn.style.backgroundColor = "#98bdac";
				this.stateDropdownNode.style.display = "inline-block";
				this.backButtonNode.style.display = "none";
			} else {
				this.usViewBtn.style.backgroundColor = "#98bdac";
				this.stateDropdownNode.style.display = "inline-block";
				this.backButtonNode.style.display = "inline-block";
			}
		},

		zoomIn: function () {
			if (this.zoomBehavior && this.svg) {
				this.svg.transition().duration(300).call(
					this.zoomBehavior.scaleBy, 1.5
				);
			}
		},

		zoomOut: function () {
			if (this.zoomBehavior && this.svg) {
				this.svg.transition().duration(300).call(
					this.zoomBehavior.scaleBy, 1 / 1.5
				);
			}
		},

		resetZoom: function () {
			if (this.zoomBehavior && this.svg && this.d3) {
				this.svg.transition().duration(500).call(
					this.zoomBehavior.transform,
					this.d3.zoomIdentity
				);
			}
		},

		resize: function () {
			if (this.svg) {
				const containerRect = this.mapContainer.getBoundingClientRect();
				const width = containerRect.width || 800;
				const height = containerRect.height || 450;
				
				this.svg
					.attr("width", width)
					.attr("height", height);
					
				// Redraw current view with new dimensions
				this.updateChart(this.genomeData);
			}
		},

		destroy: function () {
			if (this.svg) {
				this.svg.remove();
			}
			if (this.tooltip) {
				this.tooltip.remove();
			}
			this.inherited(arguments);
		}
	});
});