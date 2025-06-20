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
					// Create monochromatic gradient based on MAAGE primary colors
					// Using primary-50 to primary-600 for light to dark scale
					const colors = [
						"#f3f7f5", // primary-50
						"#ecf3f0", // primary-100
						"#d6e5de", // primary-200
						"#b4d0c3", // primary-300
						"#98bdac", // primary-400 (base)
						"#6ea089", // primary-500
						"#57856f", // primary-600
					];
					const max = Math.max(...values);
					const min = Math.min(...values);
					const range = max - min;
					
					// Normalize value to 0-1 range
					const normalizedValue = range > 0 ? (params.value - min) / range : 0.5;
					
					// Map to color index
					const index = Math.floor(normalizedValue * (colors.length - 1));
					return colors[Math.min(index, colors.length - 1)];
				};
			}

			this.chart.setOption(option);
		},
	});
});