define(["dojo/_base/declare", "./EChart"], function (declare, EChart) {
	return declare([EChart], {
		baseClass: "EChartHorizontalBar",

		updateChart: function (data) {
			if (!this.chart || !data) {
				return;
			}

			// Support both array of objects and separate arrays format
			let categories = [];
			let values = [];
			
			if (Array.isArray(data)) {
				// Array of objects format [{name: "2024", value: 100}, ...]
				categories = data.map((item) => item.name || item.label || item.year || "");
				values = data.map((item) => item.value || item.count || 0);
			} else if (data.categories && data.values) {
				// Separate arrays format
				categories = data.categories;
				values = data.values;
			} else if (data.data) {
				// Nested data format
				categories = data.data.map((item) => item.name || item.label || item.year || "");
				values = data.data.map((item) => item.value || item.count || 0);
			}

			const option = {
				title: {
					text: this.title,
					left: "center",
				},
				tooltip: {
					trigger: "axis",
					axisPointer: {
						type: "shadow",
					},
					formatter: function (params) {
						if (params && params[0]) {
							return params[0].name + ": " + params[0].value.toLocaleString() + " genomes";
						}
						return "";
					}
				},
				grid: {
					left: "3%",
					right: "4%",
					bottom: "3%",
					containLabel: true,
				},
				xAxis: {
					type: "value",
					axisLabel: {
						formatter: function (value) {
							return value.toLocaleString();
						}
					}
				},
				yAxis: {
					type: "category",
					data: categories,
					inverse: true, // Show newest years at top
					axisLabel: {
						interval: 0, // Show all labels
					}
				},
				series: [
					{
						name: "Genomes",
						type: "bar",
						data: values,
						itemStyle: {
							borderRadius: [0, 4, 4, 0], // Rounded right edges
						},
						emphasis: {
							itemStyle: {
								shadowBlur: 10,
								shadowOffsetX: 0,
								shadowColor: "rgba(0, 0, 0, 0.5)",
							}
						},
						label: {
							show: true,
							position: "right",
							formatter: function (params) {
								return params.value.toLocaleString();
							}
						}
					},
				],
			};

			// Add color gradient if specified
			if (data.colorGradient !== false) {
				option.series[0].itemStyle.color = function (params) {
					// Create gradient from light to dark based on value
					const colors = ["#e7f5f8", "#abd9e9", "#74add1", "#4575b4", "#313695"];
					const max = Math.max(...values);
					const percent = params.value / max;
					const index = Math.floor(percent * (colors.length - 1));
					return colors[index];
				};
			}

			this.chart.setOption(option);
		},
	});
});