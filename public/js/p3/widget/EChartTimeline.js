define(["dojo/_base/declare", "./EChart", "dojo/_base/lang"], function (
	declare,
	EChart,
	lang
)
{
	return declare([EChart], {
		baseClass: "EChartTimeline",

		updateChart: function (data)
		{
			if (!this.chart || !data)
			{
				return;
			}

			let seriesData = [];
			let legendData = [];

			if (data.series && Array.isArray(data.series))
			{
				seriesData = data.series.map(function (series)
				{
					legendData.push(series.name);
					return {
						name: series.name,
						type: series.type || "line",
						smooth: series.smooth !== false,
						data: series.data,
						emphasis: {
							focus: "series",
						},

						areaStyle: series.showArea ? {} : null,

						lineStyle: series.lineStyle || {},

						showSymbol: series.showSymbol !== false,
						symbol: series.symbol || "circle",
						symbolSize: series.symbolSize || 6,
					};
				});
			} else if (data.data && Array.isArray(data.data))
			{
				seriesData = [
					{
						name: data.name || "Timeline",
						type: "line",
						smooth: true,
						data: data.data,
						emphasis: {
							focus: "series",
						},
						areaStyle: data.showArea ? {} : null,
					},
				];
				legendData = [data.name || "Timeline"];
			}

			const option = {
				title: {
					text: this.title,
					left: "center",
				},
				tooltip: {
					trigger: "axis",
					axisPointer: {
						type: "cross",
						label: {
							backgroundColor: "#6a7985",
						},
					},
					formatter: function (params)
					{
						let result = params[0].axisValueLabel + "<br/>";
						params.forEach(function (param)
						{
							result +=
								param.marker +
								" " +
								param.seriesName +
								": " +
								param.value[1] +
								"<br/>";
						});
						return result;
					},
				},
				legend: {
					data: legendData,
					bottom: 10,
				},
				grid: {
					left: "3%",
					right: "4%",
					bottom: "15%",
					top: "10%",
					containLabel: true,
				},
				xAxis: {
					type: "time",
					boundaryGap: false,
					axisLabel: {
						formatter: function (value)
						{
							const date = new Date(value);
							return (
								date.getFullYear() +
								"-" +
								String(date.getMonth() + 1).padStart(2, "0")
							);
						},
					},
				},
				yAxis: {
					type: "value",
					name: data.yAxisName || "",
				},
				series: seriesData,
			};

			if (data.enableZoom !== false)
			{
				option.dataZoom = [
					{
						type: "slider",
						show: true,
						xAxisIndex: 0,
						start: data.zoomStart || 0,
						end: data.zoomEnd || 100,
						height: 20,
						bottom: 40,
					},
					{
						type: "inside",
						xAxisIndex: 0,
						start: data.zoomStart || 0,
						end: data.zoomEnd || 100,
					},
				];
			}

			if (data.stack)
			{
				seriesData.forEach(function (series)
				{
					series.stack = "total";
					series.areaStyle = {};
				});
			}

			if (data.markLines && Array.isArray(data.markLines))
			{
				seriesData[0].markLine = {
					silent: true,
					data: data.markLines.map(function (line)
					{
						return {
							xAxis: line.date,
							label: {
								show: true,
								formatter: line.label || "",
								position: "end",
							},
							lineStyle: line.lineStyle || {
								color: "#999",
								type: "dashed",
							},
						};
					}),
				};
			}

			if (data.markAreas && Array.isArray(data.markAreas))
			{
				seriesData[0].markArea = {
					silent: true,
					data: data.markAreas.map(function (area)
					{
						return [
							{
								xAxis: area.start,
								itemStyle: area.itemStyle || {
									color: "rgba(255, 173, 177, 0.4)",
								},
							},
							{
								xAxis: area.end,
								label: {
									show: true,
									formatter: area.label || "",
								},
							},
						];
					}),
				};
			}

			this.chart.setOption(option);
		},
	});
});
