define(["dojo/_base/declare", "./EChart"], function (declare, EChart) {
  return declare([EChart], {
    baseClass: "EChartVerticalBar",

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
          trigger: "axis",
          axisPointer: { type: "shadow" },
        },
        grid: {
          left: "3%",
          right: "4%",
          bottom: "3%",
          containLabel: true,
        },
        xAxis: [
          {
            type: "category",
            data: data.map((item) => item.name),
            axisLabel: {
              rotate: 45,
              interval: 0,
            },
          },
        ],
        yAxis: [{ type: "value" }],
        series: [
          {
            name: "Count",
            type: "bar",
            data: data.map((item) => item.value),
          },
        ],
      };

      this.chart.setOption(option);
    },
  });
});
