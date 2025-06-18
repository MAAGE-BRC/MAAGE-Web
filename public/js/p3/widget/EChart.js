define([
  "dojo/_base/declare",
  "dijit/_WidgetBase",
  "dijit/_TemplatedMixin",
  "dojo/text!./templates/EChart.html",
  "dojo/_base/lang",
  "dojo/on",
  "dojo/dom-construct",
  "echarts",
  "maage-themes/maage-echarts-theme",
  "maage-themes/theme-new",
], function (
  declare,
  _WidgetBase,
  _TemplatedMixin,
  template,
  lang,
  on,
  domConstruct,
  echarts
) {
  return declare([_WidgetBase, _TemplatedMixin], {
    templateString: template,
    baseClass: "EChart",
    chart: null,
    title: "",

    // The default theme for any chart that doesn't specify one
    theme: "maage-echarts-theme",

    postCreate: function () {
      this.inherited(arguments);

      if (!this.chartNode) {
        console.error("EChart: chartNode is not defined in the template.");
        return;
      }

      // Initialize the ECharts instance. It will use the 'theme' property
      // passed in during widget construction, or the default defined above.
      this.chart = echarts.init(this.chartNode, this.theme);

      on(
        window,
        "resize",
        lang.hitch(this, function () {
          if (this.chart) {
            this.chart.resize();
          }
        })
      );
    },

    showLoading: function () {
      if (this.chart) {
        this.chart.showLoading();
      }
    },

    hideLoading: function () {
      if (this.chart) {
        this.chart.hideLoading();
      }
    },

    updateChart: function (data) {
      console.warn("EChart: updateChart() method not implemented.");
    },

    resize: function () {
      if (this.chart) {
        setTimeout(
          lang.hitch(this, function () {
            this.chart.resize();
          }),
          100
        );
      }
    },

    destroy: function () {
      this.inherited(arguments);
      if (this.chart) {
        this.chart.dispose();
      }
    },
  });
});
