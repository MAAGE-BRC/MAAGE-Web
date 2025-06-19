define(["dojo/_base/declare", "./EChart"], function (declare, EChart) {
	return declare([EChart], {
		baseClass: "EChartDoughnut",

		updateChart: function (data) {
			if (!this.chart || !data) {
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
					orient: "vertical",
					left: "left",
					top: "10%",
					data: data.map((item) => item.name),
				},
				series: [
					{
						name: "Status",
						type: "pie",
						radius: ["50%", "70%"],
						avoidLabelOverlap: false,
						label: { show: false, position: "center" },
						emphasis: {
							label: { show: true, fontSize: "20", fontWeight: "bold" },
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
