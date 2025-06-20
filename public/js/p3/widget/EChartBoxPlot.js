define(["dojo/_base/declare", "./EChart", "dojo/_base/lang"], function (
	declare,
	EChart,
	lang
) {
	return declare([EChart], {
		baseClass: "EChartBoxPlot",

		updateChart: function (data) {
			if (!this.chart || !data) {
				return;
			}

			let source = [];
			let categories = [];
			let boxplotData = [];
			let outliers = [];

			if (data.boxplotData && data.categories) {
				boxplotData = data.boxplotData;
				categories = data.categories;
				outliers = data.outliers || [];
			} else if (data.source) {
				source = data.source;
				categories = data.categories || [];

				categories.forEach(function (category, categoryIndex) {
					const categoryData = source[category] || [];
					if (categoryData.length > 0) {
						const sorted = categoryData.slice().sort(function (a, b) {
							return a - b;
						});

						const q1Index = Math.floor(sorted.length * 0.25);
						const q2Index = Math.floor(sorted.length * 0.5);
						const q3Index = Math.floor(sorted.length * 0.75);

						const q1 = sorted[q1Index];
						const q2 = sorted[q2Index];
						const q3 = sorted[q3Index];
						const iqr = q3 - q1;

						const lowerBound = q1 - 1.5 * iqr;
						const upperBound = q3 + 1.5 * iqr;

						let min = sorted[0];
						let max = sorted[sorted.length - 1];

						sorted.forEach(function (value) {
							if (value < lowerBound || value > upperBound) {
								outliers.push([categoryIndex, value]);
							} else {
								if (value >= lowerBound && value < min) min = value;
								if (value <= upperBound && value > max) max = value;
							}
						});

						boxplotData.push([min, q1, q2, q3, max]);
					} else {
						boxplotData.push([]);
					}
				});
			} else if (data.series) {
				data.series.forEach(function (series, index) {
					if (series.data && series.data.length > 0) {
						categories.push(series.name || "Series " + (index + 1));
						const sorted = series.data.slice().sort(function (a, b) {
							return a - b;
						});

						const q1Index = Math.floor(sorted.length * 0.25);
						const q2Index = Math.floor(sorted.length * 0.5);
						const q3Index = Math.floor(sorted.length * 0.75);

						const q1 = sorted[q1Index];
						const q2 = sorted[q2Index];
						const q3 = sorted[q3Index];
						const iqr = q3 - q1;

						const lowerBound = q1 - 1.5 * iqr;
						const upperBound = q3 + 1.5 * iqr;

						let min = sorted[0];
						let max = sorted[sorted.length - 1];

						sorted.forEach(function (value) {
							if (value < lowerBound || value > upperBound) {
								outliers.push([index, value]);
							} else {
								if (value >= lowerBound && value < min) min = value;
								if (value <= upperBound && value > max) max = value;
							}
						});

						boxplotData.push([min, q1, q2, q3, max]);
					}
				});
			}

			const option = {
				title: {
					text: this.title,
					left: "center",
				},
				tooltip: {
					trigger: "item",
					axisPointer: {
						type: "shadow",
					},
					formatter: function (param) {
						if (param.componentSubType === "boxplot") {
							return [
								param.name + ":",
								"Upper: " + param.data[4],
								"Q3: " + param.data[3],
								"Median: " + param.data[2],
								"Q1: " + param.data[1],
								"Lower: " + param.data[0],
							].join("<br/>");
						} else {
							return (
								param.seriesName + "<br/>" + param.name + ": " + param.data[1]
							);
						}
					},
				},
				grid: {
					left: "10%",
					right: "10%",
					bottom: "15%",
					containLabel: true,
				},
				xAxis: {
					type: "category",
					data: categories,
					axisLabel: {
						rotate: data.rotateLabels || 0,
						interval: 0,
					},
				},
				yAxis: {
					type: "value",
					name: data.yAxisName || "",
				},
				series: [
					{
						name: "boxplot",
						type: "boxplot",
						data: boxplotData,
						itemStyle: {
							borderWidth: 2,
						},
					},
					{
						name: "outlier",
						type: "scatter",
						data: outliers,
						itemStyle: {
							color: "#ff6b6b",
						},
					},
				],
			};

			if (data.orientation === "horizontal") {
				const temp = option.xAxis;
				option.xAxis = option.yAxis;
				option.yAxis = temp;
				option.xAxis.type = "value";
				option.yAxis.type = "category";
			}

			if (data.colors) {
				option.color = data.colors;
			}

			this.chart.setOption(option);
		},
	});
});
