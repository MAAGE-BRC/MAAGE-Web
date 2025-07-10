define(["dojo/_base/declare", "./EChart"], function (declare, EChart)
{
	return declare([EChart], {
		baseClass: "EChartDoughnut",

		updateChart: function (data)
		{
			if (!this.chart || !data)
			{
				return;
			}

			const option = {
				title: {
					text: this.title,
					left: "center",
				},
				tooltip: {
					trigger: "item",
					formatter: "{a} <br/>{b}: {c} ({d}%)",
				},
				legend: {
					type: data.length > 20 ? 'scroll' : 'plain',
					orient: 'horizontal',
					bottom: '5%',
					left: 'center',
					width: '90%',
					data: data.map((item) => item.name),
					itemGap: 8,
					itemWidth: 18,
					itemHeight: 10,
					textStyle: {
						fontSize: 11
					},
					pageButtonItemGap: 5,
					pageButtonGap: 15,
					pageIconSize: 12,
					pageTextStyle: {
						fontSize: 10
					}
				},
				grid: {
					top: '10%',
					bottom: '25%'
				},
				series: [
					{
						name: "Status",
						type: "pie",
						radius: ["40%", "60%"],
						center: ['50%', '40%'],
						avoidLabelOverlap: false,
						label: { show: false, position: "center" },
						emphasis: {
							label: { show: true, fontSize: "14", fontWeight: "bold" },
						},
						labelLine: { show: false },
						data: data,
					},
				],
			};
			this.chart.setOption(option);
		},
	});
});
