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
		baseClass: "EChartMap",
		stateMapData: null,
		countyMapData: null,
		individualStateData: {},
		genomeData: {},
		currentView: "state",
		toggleButtonNode: null,
		backButtonNode: null,

		stateNameToFips: {
			Alabama: "01",
			Alaska: "02",
			Arizona: "04",
			Arkansas: "05",
			California: "06",
			Colorado: "08",
			Connecticut: "09",
			Delaware: "10",
			"District of Columbia": "11",
			Florida: "12",
			Georgia: "13",
			Hawaii: "15",
			Idaho: "16",
			Illinois: "17",
			Indiana: "18",
			Iowa: "19",
			Kansas: "20",
			Kentucky: "21",
			Louisiana: "22",
			Maine: "23",
			Maryland: "24",
			Massachusetts: "25",
			Michigan: "26",
			Minnesota: "27",
			Mississippi: "28",
			Missouri: "29",
			Montana: "30",
			Nebraska: "31",
			Nevada: "32",
			"New Hampshire": "33",
			"New Jersey": "34",
			"New Mexico": "35",
			"New York": "36",
			"North Carolina": "37",
			"North Dakota": "38",
			Ohio: "39",
			Oklahoma: "40",
			Oregon: "41",
			Pennsylvania: "42",
			"Rhode Island": "44",
			"South Carolina": "45",
			"South Dakota": "46",
			Tennessee: "47",
			Texas: "48",
			Utah: "49",
			Vermont: "50",
			Virginia: "51",
			Washington: "53",
			"West Virginia": "54",
			Wisconsin: "55",
			Wyoming: "56",
		},

		stateAbbreviations: {
			Alabama: "AL",
			Alaska: "AK",
			Arizona: "AZ",
			Arkansas: "AR",
			California: "CA",
			Colorado: "CO",
			Connecticut: "CT",
			Delaware: "DE",
			"District of Columbia": "DC",
			Florida: "FL",
			Georgia: "GA",
			Hawaii: "HI",
			Idaho: "ID",
			Illinois: "IL",
			Indiana: "IN",
			Iowa: "IA",
			Kansas: "KS",
			Kentucky: "KY",
			Louisiana: "LA",
			Maine: "ME",
			Maryland: "MD",
			Massachusetts: "MA",
			Michigan: "MI",
			Minnesota: "MN",
			Mississippi: "MS",
			Missouri: "MO",
			Montana: "MT",
			Nebraska: "NE",
			Nevada: "NV",
			"New Hampshire": "NH",
			"New Jersey": "NJ",
			"New Mexico": "NM",
			"New York": "NY",
			"North Carolina": "NC",
			"North Dakota": "ND",
			Ohio: "OH",
			Oklahoma: "OK",
			Oregon: "OR",
			Pennsylvania: "PA",
			"Rhode Island": "RI",
			"South Carolina": "SC",
			"South Dakota": "SD",
			Tennessee: "TN",
			Texas: "TX",
			Utah: "UT",
			Vermont: "VT",
			Virginia: "VA",
			Washington: "WA",
			"West Virginia": "WV",
			Wisconsin: "WI",
			Wyoming: "WY",
		},

		postCreate: function ()
		{
			this.inherited(arguments);

			if (!window.topojson)
			{
				console.error("TopoJSON library not loaded");
				return;
			}

			if (this.domNode && this.chartNode)
			{
				this.domNode.style.height = "100%";
				this.domNode.style.display = "flex";
				this.domNode.style.flexDirection = "column";

				this.controlsNode = domConstruct.create(
					"div",
					{
						style:
							"display: flex; gap: 8px; margin-bottom: 8px; flex-shrink: 0; align-items: center;",
					},
					this.domNode,
					"first"
				);

				this.toggleButtonNode = domConstruct.create(
					"button",
					{
						style:
							"padding: 4px 12px; background-color: #98bdac; color: white; border-radius: 4px; border: none; cursor: pointer; font-size: 14px;",
						innerHTML: "Show Counties",
					},
					this.controlsNode
				);

				this.stateDropdownNode = domConstruct.create(
					"select",
					{
						style:
							"padding: 4px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; cursor: pointer; background-color: white;",
					},
					this.controlsNode
				);

				domConstruct.create(
					"option",
					{
						value: "",
						innerHTML: "Select a state...",
						selected: true,
					},
					this.stateDropdownNode
				);

				Object.keys(this.stateNameToFips).forEach(
					lang.hitch(this, function (stateName)
					{
						domConstruct.create(
							"option",
							{
								value: this.stateNameToFips[stateName],
								innerHTML: stateName,
							},
							this.stateDropdownNode
						);
					})
				);

				this.backButtonNode = domConstruct.create(
					"button",
					{
						style:
							"padding: 4px 12px; background-color: #5f94ab; color: white; border-radius: 4px; border: none; cursor: pointer; font-size: 14px; display: none;",
						innerHTML: "Back to US Map",
					},
					this.controlsNode
				);

				this.chartNode.style.flex = "1";
				this.chartNode.style.minHeight = "0";

				on(this.toggleButtonNode, "click", lang.hitch(this, this.toggleView));
				on(this.backButtonNode, "click", lang.hitch(this, this.backToUSMap));
				on(
					this.stateDropdownNode,
					"change",
					lang.hitch(this, function (evt)
					{
						const stateCode = evt.target.value;
						if (stateCode)
						{
							let stateName = "";
							Object.keys(this.stateNameToFips).forEach(
								lang.hitch(this, function (name)
								{
									if (this.stateNameToFips[name] === stateCode)
									{
										stateName = name;
									}
								})
							);

							if (stateName)
							{
								this.showStateDetail(stateCode, stateName);
							}
						}
					})
				);
			}

			this.loadMapData();
		},

		loadMapData: function ()
		{
			this.showLoading();

			const stateMapPromise = request(
				"/maage/maps/usa-states-albers-10m.json",
				{
					handleAs: "json",
				}
			);

			const countyMapPromise = request(
				"/maage/maps/usa-counties-albers-10m.json",
				{
					handleAs: "json",
				}
			);

			Promise.all([stateMapPromise, countyMapPromise]).then(
				lang.hitch(this, function ([stateTopoData, countyTopoData])
				{
					const stateGeoData = topojson.feature(
						stateTopoData,
						stateTopoData.objects.states
					);
					this.flipCoordinates(stateGeoData);
					echarts.registerMap("USA-states", stateGeoData);
					this.stateMapData = stateGeoData;

					const countyGeoData = topojson.feature(
						countyTopoData,
						countyTopoData.objects.counties
					);
					this.flipCoordinates(countyGeoData);
					echarts.registerMap("USA-counties", countyGeoData);
					this.countyMapData = countyGeoData;

					this.loadIndividualStateMaps();

					this.hideLoading();

					if (Object.keys(this.genomeData).length > 0)
					{
						this.updateChart(this.genomeData);
					}
				}),
				lang.hitch(this, function (err)
				{
					console.error("Failed to load map data:", err);
					this.hideLoading();
				})
			);
		},

		flipCoordinates: function (geoData)
		{
			geoData.features.forEach(function (feature)
			{
				if (feature.geometry && feature.geometry.coordinates)
				{
					const flipCoords = function (coords)
					{
						if (Array.isArray(coords[0]) && typeof coords[0][0] === "number")
						{
							return coords.map(function (coord)
							{
								return [coord[0], -coord[1]];
							});
						} else
						{
							return coords.map(flipCoords);
						}
					};
					feature.geometry.coordinates = flipCoords(
						feature.geometry.coordinates
					);
				}
			});
		},

		loadIndividualStateMaps: function () { },

		toggleView: function ()
		{
			if (this.currentView === "state")
			{
				this.currentView = "county";
				this.toggleButtonNode.innerHTML = "Show States";
			} else if (this.currentView === "county")
			{
				this.currentView = "state";
				this.toggleButtonNode.innerHTML = "Show Counties";
			}
			this.updateChart(this.genomeData);
		},

		backToUSMap: function ()
		{
			this.currentView = "state";
			this.toggleButtonNode.style.display = "";
			this.backButtonNode.style.display = "none";
			this.stateDropdownNode.value = "";
			this.updateChart(this.genomeData);
		},

		updateChart: function (data)
		{
			if (!this.chart)
			{
				if (data && data.countyData)
				{
					this.genomeData = data;
				}
				return;
			}

			this.genomeData = data;

			let chartData = [];
			let mapName = "USA-states";

			if (this.currentView === "state")
			{
				if (this.genomeData.stateData)
				{
					chartData = this.processStateData(this.genomeData.stateData);
				} else
				{
					chartData = this.aggregateToStates(
						this.genomeData.countyData || this.genomeData
					);
				}
				mapName = "USA-states";
			} else if (this.currentView === "county")
			{
				chartData = this.processCountyData(
					this.genomeData.countyData || this.genomeData,
					this.countyMapData
				);
				mapName = "USA-counties";
			} else
			{
				const stateCode = this.currentView;
				mapName = "state-" + stateCode;

				const countyData = this.genomeData.countyData || this.genomeData;
				this._stateCountyData = countyData;
				this._currentStateCode = stateCode;

				chartData = [];
			}

			const values = chartData.map((item) => item.value).filter((v) => v > 0);
			const min = Math.min(...values) || 0;
			const max = Math.max(...values) || 100;

			console.log(
				"Map data values - min:",
				min,
				"max:",
				max,
				"total items:",
				chartData.length
			);

			let title = "";
			if (this.currentView !== "state" && this.currentView !== "county")
			{
				Object.keys(this.stateNameToFips).forEach(
					lang.hitch(this, function (name)
					{
						if (this.stateNameToFips[name] === this.currentView)
						{
							title = name + " Counties";
						}
					})
				);
			}

			const option = {
				title: title
					? {
						text: title,
						left: "center",
						top: 10,
						textStyle: {
							fontSize: 16,
							fontWeight: "bold",
						},
					}
					: undefined,
				tooltip: {
					trigger: "item",
					formatter: function (params)
					{
						if (params.data && params.data.value)
						{
							return params.name + ": " + params.data.value + " genomes";
						}
						return params.name + ": No data";
					},
				},
				visualMap: {
					type: "piecewise",
					pieces: [
						{ min: 1, max: 10, label: "1-10", color: "#e7f5f8" },
						{ min: 11, max: 50, label: "11-50", color: "#b4d0c3" },
						{ min: 51, max: 100, label: "51-100", color: "#98bdac" },
						{ min: 101, max: 500, label: "101-500", color: "#6ea089" },
						{ min: 501, max: 1000, label: "501-1K", color: "#57856f" },
						{ min: 1001, label: ">1K", color: "#496f5d" },
					],
					left: "left",
					top: "bottom",
					textStyle: {
						fontSize: 12,
					},
					itemWidth: 20,
					itemHeight: 12,
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

						layoutCenter: ["50%", "50%"],
						layoutSize: "95%",
						emphasis: {
							label: {
								show: true,
							},
							itemStyle: {
								areaColor: "#e7c788",
							},
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
							borderWidth: 0.5,
						},
						data: chartData.length > 0 ? chartData : undefined,
					},
				],
			};

			if (this.currentView === "state")
			{
				this.chart.off("click");
				this.chart.on(
					"click",
					lang.hitch(this, function (params)
					{
						if (params.data && params.data.stateCode)
						{
							this.showStateDetail(params.data.stateCode, params.data.name);
						}
					})
				);
			} else
			{
				this.chart.off("click");
			}

			this.chart.setOption(option, true);

			setTimeout(
				lang.hitch(this, function ()
				{
					if (this.chart)
					{
						this.chart.resize();
					}
				}),
				100
			);
		},

		processStateData: function (stateData)
		{
			if (!this.stateMapData || !stateData) return [];

			const chartData = [];
			const stateLookup = {};

			Object.keys(stateData).forEach(function (state)
			{
				const normalizedName = state.toLowerCase().replace(/[^a-z]/g, "");
				stateLookup[normalizedName] = stateData[state];
			});

			console.log("State lookup created:", stateLookup);
			console.log("State map features:", this.stateMapData.features.length);

			this.stateMapData.features.forEach(
				lang.hitch(this, function (feature)
				{
					const properties = feature.properties || {};
					const stateName = properties.name || properties.NAME || "";
					const stateCode =
						properties.STATE || properties.STUSPS || properties.postal || "";
					const normalizedName = stateName.toLowerCase().replace(/[^a-z]/g, "");

					const fipsCode = this.stateNameToFips[stateName] || stateCode;

					if (chartData.length < 5)
					{
						console.log(
							"Map state:",
							stateName,
							"normalized:",
							normalizedName,
							"has data:",
							!!stateLookup[normalizedName]
						);
					}

					chartData.push({
						name: stateName,
						value: stateLookup[normalizedName] || 0,
						stateCode: fipsCode,
						properties: properties,
					});
				})
			);

			console.log("Chart data created:", chartData.length, "states with data");

			return chartData;
		},

		aggregateToStates: function (countyData)
		{
			if (!this.stateMapData || !countyData) return [];

			const stateData = {};

			Object.keys(countyData).forEach(function (countyKey)
			{
				const parts = countyKey.split(", ");
				if (parts.length >= 2)
				{
					const stateName = parts[parts.length - 1].trim();
					if (!stateData[stateName])
					{
						stateData[stateName] = 0;
					}
					stateData[stateName] += countyData[countyKey];
				}
			});

			const chartData = [];
			this.stateMapData.features.forEach(
				lang.hitch(this, function (feature)
				{
					const properties = feature.properties || {};
					const stateName = properties.name || properties.NAME || "";
					const stateCode =
						properties.STATE || properties.STUSPS || properties.postal || "";

					if (stateData[stateName])
					{
						chartData.push({
							name: stateName,
							value: stateData[stateName],
							stateCode: stateCode,
							properties: properties,
						});
					}
				})
			);

			return chartData;
		},

		processCountyData: function (countyData, mapData)
		{
			if (!countyData) return [];

			const chartData = [];
			const countyLookup = {};

			Object.keys(countyData).forEach(function (county)
			{
				chartData.push({
					name: county,
					value: countyData[county],
				});
			});

			return chartData;
		},

		processStateCounties: function (countyData, stateCode)
		{
			return this.processCountyData(countyData);
		},

		getStateMapData: function (stateCode)
		{
			if (!this.countyMapData) return null;

			const stateFeatures = this.countyMapData.features.filter(function (
				feature
			)
			{
				return feature.properties && feature.properties.STATE === stateCode;
			});

			return {
				type: "FeatureCollection",
				features: stateFeatures,
			};
		},

		showStateDetail: function (stateCode, stateName)
		{
			this.currentView = stateCode;
			this.toggleButtonNode.style.display = "none";
			this.backButtonNode.style.display = "";
			this.backButtonNode.innerHTML = "Back to US Map";

			this.loadStateGeoJSON(stateCode, stateName);
		},

		loadStateGeoJSON: function (stateCode, stateName)
		{
			this.showLoading();

			request("/maage/maps/geojson/cb_2024_us_county_5m.geojson", {
				handleAs: "json",
			}).then(
				lang.hitch(this, function (geoData)
				{
					const stateCounties = {
						type: "FeatureCollection",
						features: geoData.features.filter(function (feature)
						{
							return (
								feature.properties && feature.properties.STATEFP === stateCode
							);
						}),
					};

					if (stateCounties.features.length > 0)
					{
						echarts.registerMap("state-" + stateCode, stateCounties);

						const allCountyData =
							this._stateCountyData || this.genomeData.countyData || {};
						const chartData = [];

						const countyData = {};

						let hasStateInfo = false;
						Object.keys(allCountyData).forEach(function (countyName)
						{
							if (countyName.includes(","))
							{
								hasStateInfo = true;
							}
						});

						if (!hasStateInfo)
						{
							console.log(
								"County data does not include state information. Showing all counties."
							);
							Object.keys(allCountyData).forEach(function (countyName)
							{
								countyData[countyName] = allCountyData[countyName];
							});
						} else
						{
							const stateAbbr = this.stateAbbreviations[stateName];

							Object.keys(allCountyData).forEach(
								lang.hitch(this, function (countyName)
								{
									const countyLower = countyName.toLowerCase();
									const stateLower = stateName.toLowerCase();
									const stateAbbrLower = stateAbbr
										? stateAbbr.toLowerCase()
										: "";

									if (
										countyLower.includes(", " + stateLower) ||
										(stateAbbrLower &&
											countyLower.includes(", " + stateAbbrLower))
									)
									{
										countyData[countyName] = allCountyData[countyName];
									}
								})
							);
						}

						console.log(
							"Filtered counties for",
							stateName + ":",
							Object.keys(countyData).length,
							"counties"
						);

						const countyLookup = {};

						console.log("All county names from API (first 20):");
						const allCountyNames = Object.keys(allCountyData);
						allCountyNames.slice(0, 20).forEach(function (countyName)
						{
							console.log(
								"  API county:",
								countyName,
								"value:",
								allCountyData[countyName]
							);
						});

						console.log("\nCounties containing 'Illinois' or 'IL':");
						allCountyNames.forEach(function (countyName)
						{
							if (
								countyName.toLowerCase().includes("illinois") ||
								countyName.toLowerCase().includes(", il")
							)
							{
								console.log(
									"  Found:",
									countyName,
									"value:",
									allCountyData[countyName]
								);
							}
						});

						console.log("\nAfter filtering for", stateName + ":");
						Object.keys(countyData)
							.slice(0, 5)
							.forEach(function (countyName)
							{
								console.log(
									"  Filtered county:",
									countyName,
									"value:",
									countyData[countyName]
								);
							});

						Object.keys(countyData).forEach(function (countyName)
						{
							let countyOnly = countyName;
							if (countyName.includes(","))
							{
								countyOnly = countyName.split(",")[0].trim();
							}

							const normalized1 = countyOnly
								.toLowerCase()
								.replace(/[^a-z0-9]/g, "");
							const normalized2 = countyOnly
								.toLowerCase()
								.replace(" county", "")
								.replace(/[^a-z0-9]/g, "");
							const normalized3 = countyOnly.toLowerCase();
							const normalized4 = countyName
								.toLowerCase()
								.replace(/[^a-z0-9]/g, "");

							const value = countyData[countyName];
							countyLookup[normalized1] = value;
							countyLookup[normalized2] = value;
							countyLookup[normalized3] = value;
							countyLookup[normalized4] = value;

							countyLookup[countyOnly] = value;
							countyLookup[countyOnly.toLowerCase()] = value;
						});

						console.log("County matching for", stateName + ":");

						stateCounties.features.forEach(function (feature, index)
						{
							const props = feature.properties;
							const geoJsonName = props.NAME || props.NAME20 || "";
							const geoJsonFullName = props.NAMELSAD || geoJsonName;

							let value = 0;
							let matched = false;
							let matchedKey = null;

							const variations = [
								geoJsonName,
								geoJsonFullName,
								geoJsonName + " County",
								geoJsonName + ", " + stateName,
								geoJsonName + " County, " + stateName,
							];

							for (let variation of variations)
							{
								if (countyData[variation])
								{
									value = countyData[variation];
									matched = true;
									matchedKey = variation;
									break;
								}
							}

							if (!matched)
							{
								const normalizedGeo1 = geoJsonName
									.toLowerCase()
									.replace(/[^a-z0-9]/g, "");
								const normalizedGeo2 = geoJsonName
									.toLowerCase()
									.replace(" county", "")
									.replace(/[^a-z0-9]/g, "");
								const normalizedGeo3 = geoJsonName.toLowerCase();

								if (countyLookup[normalizedGeo1])
								{
									value = countyLookup[normalizedGeo1];
									matched = true;
									matchedKey = "normalized: " + normalizedGeo1;
								} else if (countyLookup[normalizedGeo2])
								{
									value = countyLookup[normalizedGeo2];
									matched = true;
									matchedKey = "normalized: " + normalizedGeo2;
								} else if (countyLookup[normalizedGeo3])
								{
									value = countyLookup[normalizedGeo3];
									matched = true;
									matchedKey = "normalized: " + normalizedGeo3;
								}
							}

							if (index < 5)
							{
								console.log(
									"  County:",
									geoJsonName,
									"(" + geoJsonFullName + ") - matched:",
									matched,
									"value:",
									value,
									matchedKey ? "key: " + matchedKey : ""
								);
							}

							chartData.push({
								name: geoJsonName,
								value: value,
							});
						});

						console.log(
							"Total counties matched:",
							chartData.filter((d) => d.value > 0).length,
							"of",
							chartData.length
						);

						this.hideLoading();

						if (this.chart)
						{
							const option = this.chart.getOption();
							if (option && option.series && option.series[0])
							{
								option.series[0].data = chartData;
								this.chart.setOption(option, true);
							}
						}
					} else
					{
						console.error("No counties found for state:", stateCode);
						this.hideLoading();

						this.backToUSMap();
					}
				}),
				lang.hitch(this, function (err)
				{
					console.error("Failed to load state GeoJSON:", err);
					this.hideLoading();

					this.backToUSMap();
				})
			);
		},
	});
});
