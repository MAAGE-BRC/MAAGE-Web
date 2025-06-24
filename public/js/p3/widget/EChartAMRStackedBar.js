define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"./EChart"
], function (
	declare,
	lang,
	EChart
)
{
	return declare([EChart], {
		title: "Antimicrobial Resistance Profile",
		viewMode: "count",
		sortBy: "name",

		constructor: function ()
		{
			this.phenotypeColors = {
				"Resistant": "#c56e6e",
				"Intermediate": "#e7c788",
				"Susceptible": "#98bdac"
			};
		},

		updateChart: function (data)
		{
			if (!this.chart || !data) return;

			this._currentData = data;

			let processedData = this._processAMRData(data);

			if (!processedData || processedData.length === 0)
			{
				this.chart.setOption({
					title: {
						text: this.title,
						left: "center",
						textStyle: {
							fontSize: 16,
							fontWeight: "normal"
						}
					},
					graphic: [{
						type: 'text',
						left: 'center',
						top: 'center',
						style: {
							text: 'No AMR data available',
							fontSize: 14,
							fill: '#999'
						}
					}]
				});
				return;
			}

			this._sortData(processedData);

			const antibiotics = processedData.map(d => d.antibiotic);
			const phenotypes = ["Resistant", "Intermediate", "Susceptible"];

			const series = phenotypes.map((phenotype, index) => ({
				name: phenotype,
				type: "bar",
				stack: "total",
				emphasis: {
					focus: "series"
				},
				itemStyle: {
					color: this.phenotypeColors[phenotype]
				},
				data: processedData.map(item =>
				{
					const value = item.distribution[phenotype] || 0;
					return this.viewMode === "percent" && item.total > 0
						? ((value / item.total) * 100).toFixed(1)
						: value;
				})
			}));

			const option = {
				title: {
					text: this.title,
					left: "center",
					textStyle: {
						fontSize: 16,
						fontWeight: "normal"
					}
				},
				tooltip: {
					trigger: "axis",
					axisPointer: {
						type: "shadow"
					},
					formatter: lang.hitch(this, function (params)
					{
						const antibiotic = params[0].axisValue;
						const dataItem = processedData.find(d => d.antibiotic === antibiotic);
						let tooltip = `<strong>${antibiotic}</strong><br/>`;

						params.forEach(param =>
						{
							const count = dataItem.distribution[param.seriesName] || 0;
							const percent = dataItem.total > 0
								? ((count / dataItem.total) * 100).toFixed(1)
								: 0;
							tooltip += `${param.marker} ${param.seriesName}: ${count} (${percent}%)<br/>`;
						});

						tooltip += `<br/>Total: ${dataItem.total}`;
						return tooltip;
					})
				},
				legend: {
					data: phenotypes,
					bottom: 10,
					itemWidth: 20,
					itemHeight: 12
				},
				grid: {
					left: "3%",
					right: "4%",
					bottom: "15%",
					top: "15%",
					containLabel: true
				},
				xAxis: {
					type: "category",
					data: antibiotics,
					axisLabel: {
						interval: 0,
						rotate: 45,
						textStyle: {
							fontSize: 11
						}
					}
				},
				yAxis: {
					type: "value",
					name: this.viewMode === "percent" ? "Percentage (%)" : "Number of Isolates",
					axisLabel: {
						formatter: this.viewMode === "percent" ? "{value}%" : "{value}"
					}
				},
				series: series,
				dataZoom: antibiotics.length > 20 ? [{
					type: "slider",
					show: true,
					xAxisIndex: [0],
					start: 0,
					end: 100,
					bottom: 40,
					height: 20
				}] : []
			};

			this.chart.setOption(option);
		},

		_processAMRData: function (data)
		{

			if (data.processedData)
			{
				return data.processedData;
			}

			if (data.facet_pivot)
			{

				const pivotData = Object.values(data.facet_pivot)[0];
				return this._processPivotFacets(pivotData);
			}

			if (Array.isArray(data))
			{
				return data;
			}

			return [];
		},

		_processPivotFacets: function (pivotData)
		{
			if (!pivotData || !Array.isArray(pivotData)) return [];

			const antibioticMap = {};

			pivotData.forEach(antibioticData =>
			{
				const antibiotic = antibioticData.value;
				if (!antibiotic) return;

				if (!antibioticMap[antibiotic])
				{
					antibioticMap[antibiotic] = {
						antibiotic: antibiotic,
						distribution: {
							"Resistant": 0,
							"Intermediate": 0,
							"Susceptible": 0
						},
						total: 0
					};
				}

				if (antibioticData.pivot)
				{
					antibioticData.pivot.forEach(phenotypeData =>
					{
						const phenotype = phenotypeData.value;
						const count = phenotypeData.count || 0;

						if (this.phenotypeColors[phenotype])
						{
							antibioticMap[antibiotic].distribution[phenotype] = count;
							antibioticMap[antibiotic].total += count;
						}
					});
				}
			});

			return Object.values(antibioticMap).filter(item => item.total > 0);
		},

		_sortData: function (data)
		{
			if (this.sortBy === "name")
			{
				data.sort((a, b) => a.antibiotic.localeCompare(b.antibiotic));
			} else if (this.sortBy === "value")
			{

				data.sort((a, b) => b.distribution.Resistant - a.distribution.Resistant);
			}
		},

		setViewMode: function (mode)
		{
			if (mode === "count" || mode === "percent")
			{
				this.viewMode = mode;

				if (this._currentData)
				{
					this.updateChart(this._currentData);
				}
			}
		},

		setSortBy: function (sortBy)
		{
			if (sortBy === "name" || sortBy === "value")
			{
				this.sortBy = sortBy;

				if (this._currentData)
				{
					this.updateChart(this._currentData);
				}
			}
		}
	});
});