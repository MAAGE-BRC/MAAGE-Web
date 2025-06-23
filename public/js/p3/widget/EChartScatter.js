define(["dojo/_base/declare", "./EChart", "dojo/_base/lang"], function (
	declare,
	EChart,
	lang
)
{
	return declare([EChart], {
		baseClass: "EChartScatter",

		updateChart: function (data)
		{
			if (!this.chart || !data)
			{
				return;
			}

			let seriesData = [];
			let xAxisConfig = { type: "value", name: data.xAxisName || "" };
			let yAxisConfig = { type: "value", name: data.yAxisName || "" };

			if (data.series && Array.isArray(data.series))
			{
				seriesData = data.series.map(function (series)
				{
					return {
						name: series.name || "Series",
						type: "scatter",
						data: series.data,
						symbolSize: series.symbolSize || 10,
						itemStyle: series.itemStyle || {},
						emphasis: {
							scale: true,
							focus: "self",
						},
					};
				});
			} else if (data.data && Array.isArray(data.data))
			{
				seriesData = [
					{
						name: data.name || "Data",
						type: "scatter",
						data: data.data,
						symbolSize:
							data.symbolSize ||
							function (val)
							{
								return val[2] ? Math.sqrt(val[2]) * 2 : 10;
							},
						emphasis: {
							scale: true,
							focus: "self",
						},
					},
				];
			}

			const option = {
				title: {
					text: this.title,
					left: "center",
				},
				tooltip: {
					trigger: "item",
					formatter: function (params)
					{
						if (params.value.length === 2)
						{
							return (
								params.seriesName +
								"<br/>" +
								(data.xAxisName || "X") +
								": " +
								params.value[0] +
								"<br/>" +
								(data.yAxisName || "Y") +
								": " +
								params.value[1]
							);
						} else if (params.value.length === 3)
						{
							return (
								params.seriesName +
								"<br/>" +
								(data.xAxisName || "X") +
								": " +
								params.value[0] +
								"<br/>" +
								(data.yAxisName || "Y") +
								": " +
								params.value[1] +
								"<br/>" +
								(data.sizeMetricName || "Value") +
								": " +
								params.value[2]
							);
						} else if (params.value.length >= 4)
						{
							return (
								params.seriesName +
								"<br/>" +
								(data.xAxisName || "X") +
								": " +
								params.value[0] +
								"<br/>" +
								(data.yAxisName || "Y") +
								": " +
								params.value[1] +
								"<br/>" +
								(data.sizeMetricName || "Size") +
								": " +
								params.value[2] +
								"<br/>" +
								"Label: " +
								params.value[3]
							);
						}
						return params.seriesName;
					},
				},
				legend: {
					bottom: 10,
					data: seriesData.map(function (s)
					{
						return s.name;
					}),
				},
				grid: {
					left: "10%",
					right: "10%",
					bottom: "15%",
					top: "10%",
					containLabel: true,
				},
				xAxis: xAxisConfig,
				yAxis: yAxisConfig,
				series: seriesData,
			};

			if (data.visualMap)
			{
				option.visualMap = lang.mixin(
					{
						show: true,
						dimension: 2,
						min: data.visualMapMin || 0,
						max: data.visualMapMax || 100,
						inRange: {
							color: ["#e0f3f8", "#abd9e9", "#74add1", "#4575b4", "#313695"],
						},
						calculable: true,
					},
					data.visualMap
				);
			}

			if (data.enableZoom !== false)
			{
				option.dataZoom = [
					{
						type: "inside",
						xAxisIndex: 0,
						start: 0,
						end: 100,
					},
					{
						type: "inside",
						yAxisIndex: 0,
						start: 0,
						end: 100,
					},
				];
			}

			this.chart.setOption(option);
		},
	});
});
