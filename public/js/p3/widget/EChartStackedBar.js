define(["dojo/_base/declare", "./EChart"], function (declare, EChart) {
  return declare([EChart], {
    baseClass: "EChartStackedBar",

    updateChart: function (data) {
      if (!this.chart || !data || !data.series) {
        this.chart.clear();
        return;
      }

      const chartSeries = data.series.map((s) => ({
        name: s.name,
        type: "bar",
        stack: "total",
        emphasis: {
          focus: "series",
        },
        data: s.data,
      }));

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
        },
        legend: {
          type: "scroll",
          bottom: 10,
        },
        grid: {
          left: "3%",
          right: "4%",
          bottom: "15%",
          containLabel: true,
        },
        xAxis: {
          type: "category",
          data: data.categories,
        },
        yAxis: {
          type: "value",
        },
        series: chartSeries,
      };

      this.chart.setOption(option);
    },
  });
});
