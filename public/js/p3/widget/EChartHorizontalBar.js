define(["dojo/_base/declare", "./EChart"], function (declare, EChart)
{
	return declare([EChart], {
		baseClass: "EChartHorizontalBar",

		updateChart: function (data)
		{
			if (!this.chart || !data)
			{
				return;
			}

			let categories = [];
			let values = [];

			if (Array.isArray(data))
			{
				categories = data.map(
					(item) => item.name || item.label || item.year || ""
				);
				values = data.map((item) => item.value || item.count || 0);
			} else if (data.categories && data.values)
			{
				categories = data.categories;
				values = data.values;
			} else if (data.data)
			{
				categories = data.data.map(
					(item) => item.name || item.label || item.year || ""
				);
				values = data.data.map((item) => item.value || item.count || 0);
			}

			const option = {
				title: {
					text: this.title,
					left: "20",
					top: "10",
					textStyle: {
						fontSize: 16,
						fontWeight: "500"
					}
				},
				tooltip: {
					trigger: "axis",
					axisPointer: {
						type: "shadow",
					},
					formatter: function (params)
					{
						if (params && params[0])
						{
							return (
								params[0].name +
								": " +
								params[0].value.toLocaleString() +
								" genomes"
							);
						}
						return "";
					},
				},
				grid: {
					left: "10%",
					right: "15%",
					top: "60",
					bottom: "10%",
					containLabel: true,
				},
				xAxis: {
					type: "value",
					axisLabel: {
						formatter: function (value)
						{
							return value.toLocaleString();
						},
					},
				},
				yAxis: {
					type: "category",
					data: categories,
					inverse: true,
					axisLabel: {
						interval: 0,
					},
				},
				series: [
					{
						name: "Genomes",
						type: "bar",
						data: values,
						itemStyle: {
							borderRadius: [0, 4, 4, 0],
						},
						emphasis: {
							itemStyle: {
								shadowBlur: 10,
								shadowOffsetX: 0,
								shadowColor: "rgba(0, 0, 0, 0.5)",
							},
						},
						label: {
							show: true,
							position: "right",
							formatter: function (params)
							{
								return params.value.toLocaleString();
							},
						},
					},
				],
			};

			if (data.colorGradient === false)
			{

				const distinctColors = [
					"#c56e6e",
					"#5f94ab",
					"#98bdac",
					"#e7c788",
					"#7ba3b8",
					"#a4c5b5",
					"#d8b066",
					"#8fa8b5",
					"#b3cfc3",
					"#c9a876",
					"#6c8fa1",
					"#8eb1a3",
				];

				option.series[0].itemStyle.color = function (params)
				{
					return distinctColors[params.dataIndex % distinctColors.length];
				};
			}
			else if (values && values.length > 0)
			{

				option.series[0].itemStyle.color = function (params)
				{
					if (params.value === undefined || params.value === null)
					{
						return "#98bdac";
					}

					const colors = [
						"#f3f7f5",
						"#ecf3f0",
						"#d6e5de",
						"#b4d0c3",
						"#98bdac",
						"#6ea089",
						"#57856f",
					];

					const validValues = values.filter(v => v !== undefined && v !== null);
					if (validValues.length === 0)
					{
						return colors[4];
					}

					const max = Math.max(...validValues);
					const min = Math.min(...validValues);
					const range = max - min;

					const normalizedValue =
						range > 0 ? (params.value - min) / range : 0.5;

					const index = Math.floor(normalizedValue * (colors.length - 1));
					return colors[Math.min(index, colors.length - 1)];
				};
			}

			this.chart.setOption(option);
		},
	});
});
