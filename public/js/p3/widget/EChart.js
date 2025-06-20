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
], function (declare, _WidgetBase, _TemplatedMixin, template, lang, on, domConstruct, echarts) {
	return declare([_WidgetBase, _TemplatedMixin], {
		templateString: template,
		baseClass: "EChart",
		chart: null,
		title: "",

		theme: "maage-echarts-theme",

		postCreate: function () {
			this.inherited(arguments);

			if (!this.chartNode) {
				console.error("EChart: chartNode is not defined in the template.");
				return;
			}

			// Don't initialize echarts yet - wait for startup when DOM is ready
			this._theme = this.theme;

			this._resizeHandler = on(
				window,
				"resize",
				lang.hitch(this, function () {
					if (this.chart) {
						this.chart.resize();
					}
				})
			);
		},

		startup: function () {
			this.inherited(arguments);

			// Initialize echarts in startup when DOM is ready
			if (this.chartNode && !this.chart) {
				// Check if container has dimensions
				const rect = this.chartNode.getBoundingClientRect();
				if (rect.width > 0 && rect.height > 0) {
					this.chart = echarts.init(this.chartNode, this._theme);
				} else {
					// If no dimensions yet, defer initialization
					this._deferredInit = true;
				}
			}
		},

		_ensureChartInit: function () {
			if (this._deferredInit && !this.chart && this.chartNode) {
				const rect = this.chartNode.getBoundingClientRect();
				if (rect.width > 0 && rect.height > 0) {
					this.chart = echarts.init(this.chartNode, this._theme);
					this._deferredInit = false;
					return true;
				}
			}
			return false;
		},

		showLoading: function () {
			// Try to initialize if deferred
			if (!this.chart && this._deferredInit) {
				this._ensureChartInit();
			}
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
			// Try to initialize if deferred
			if (!this.chart && this._deferredInit) {
				if (this._ensureChartInit()) {
					// If we just initialized, call updateChart in the next tick
					setTimeout(lang.hitch(this, function() {
						this.updateChart(data);
					}), 0);
					return;
				}
			}
			console.warn("EChart: updateChart() method not implemented.");
		},

		resize: function () {
			// Try to initialize if deferred
			if (!this.chart && this._deferredInit) {
				this._ensureChartInit();
			}
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
			if (this._resizeHandler) {
				this._resizeHandler.remove();
			}
		},
	});
});
