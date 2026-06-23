define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/on",
	"dojo/when",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dijit/_WidgetBase",
	"dijit/Dialog",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/DashboardLayoutEditor.html",
	"p3/util/DashboardStorage"
], function (
	declare,
	lang,
	on,
	when,
	domClass,
	domConstruct,
	_WidgetBase,
	Dialog,
	Templated,
	WidgetsInTemplate,
	template,
	DashboardStorage
)
{
	var EditorContent = declare([_WidgetBase, Templated, WidgetsInTemplate], {
		templateString: template,
		baseClass: "DashboardLayoutEditorContent",

		// Working copies of layout
		_visibleCharts: null,
		_chartOrder: null,
		_rowNodes: null,

		// The active saved dashboard (if any) — set by the dialog wrapper
		activeDashboard: null,

		// The current layout config to initialize from
		layoutConfig: null,

		// Callback set by the dialog wrapper
		onSave: function (config) {},
		onCancel: function () {},

		postCreate: function ()
		{
			this.inherited(arguments);
			this._rowNodes = {};

			// Initialize from provided layout config or defaults
			var layout = this.layoutConfig || DashboardStorage.getDefaultLayout();
			this._visibleCharts = layout.visibleCharts.slice();
			this._chartOrder = layout.chartOrder.slice();

			this._renderList();

			this.own(
				on(this.saveBtn, "click", lang.hitch(this, "_onSave")),
				on(this.cancelBtn, "click", lang.hitch(this, "_onCancel")),
				on(this.resetBtn, "click", lang.hitch(this, "_onReset"))
			);
		},

		_dragSrcIndex: null,

		_renderList: function ()
		{
			domConstruct.empty(this.chartListNode);
			this._rowNodes = {};

			var defs = DashboardStorage.CHART_DEFINITIONS;
			var self = this;

			this._chartOrder.forEach(function (chartId, index)
			{
				var def = null;
				for (var i = 0; i < defs.length; i++)
				{
					if (defs[i].id === chartId) { def = defs[i]; break; }
				}
				if (!def) return;

				var isVisible = self._visibleCharts.indexOf(chartId) !== -1;

				var row = domConstruct.create("div", {
					className: "chart-row" + (isVisible ? "" : " disabled"),
					draggable: "true"
				}, self.chartListNode);
				row.setAttribute("data-index", index);

				// Drag handle
				domConstruct.create("span", {
					className: "chart-row-drag-handle",
					innerHTML: "&#x2630;",
					title: "Drag to reorder"
				}, row);

				// Checkbox
				var cb = domConstruct.create("input", {
					type: "checkbox",
					checked: isVisible,
					style: "cursor: pointer; width: 16px; height: 16px;"
				}, row);

				on(cb, "change", lang.hitch(self, function (id, evt)
				{
					if (evt.target.checked)
					{
						if (this._visibleCharts.indexOf(id) === -1)
						{
							this._visibleCharts.push(id);
						}
					}
					else
					{
						this._visibleCharts = this._visibleCharts.filter(function (c) { return c !== id; });
					}
					this._renderList();
				}, chartId));

				// Label
				domConstruct.create("span", {
					className: "chart-row-label",
					textContent: def.label
				}, row);

				// Drag events
				on(row, "dragstart", lang.hitch(self, function (idx, evt)
				{
					this._dragSrcIndex = idx;
					evt.dataTransfer.effectAllowed = "move";
					evt.dataTransfer.setData("text/plain", idx.toString());
					setTimeout(function () { domClass.add(row, "dragging"); }, 0);
				}, index));

				on(row, "dragend", function ()
				{
					domClass.remove(row, "dragging");
					// Clean up all drop indicators
					var rows = self.chartListNode.querySelectorAll(".chart-row");
					for (var r = 0; r < rows.length; r++)
					{
						domClass.remove(rows[r], "drag-over-above");
						domClass.remove(rows[r], "drag-over-below");
					}
				});

				on(row, "dragover", lang.hitch(self, function (idx, evt)
				{
					evt.preventDefault();
					evt.dataTransfer.dropEffect = "move";

					var rect = row.getBoundingClientRect();
					var midY = rect.top + rect.height / 2;

					// Clean up indicators on all rows first
					var rows = self.chartListNode.querySelectorAll(".chart-row");
					for (var r = 0; r < rows.length; r++)
					{
						domClass.remove(rows[r], "drag-over-above");
						domClass.remove(rows[r], "drag-over-below");
					}

					if (evt.clientY < midY)
					{
						domClass.add(row, "drag-over-above");
					}
					else
					{
						domClass.add(row, "drag-over-below");
					}
				}, index));

				on(row, "dragleave", function ()
				{
					domClass.remove(row, "drag-over-above");
					domClass.remove(row, "drag-over-below");
				});

				on(row, "drop", lang.hitch(self, function (targetIdx, evt)
				{
					evt.preventDefault();
					evt.stopPropagation();

					var srcIdx = self._dragSrcIndex;
					if (srcIdx === null || srcIdx === targetIdx) return;

					var rect = row.getBoundingClientRect();
					var midY = rect.top + rect.height / 2;
					var insertBefore = evt.clientY < midY;

					var item = self._chartOrder.splice(srcIdx, 1)[0];
					var dest = insertBefore ? targetIdx : targetIdx + 1;
					if (srcIdx < targetIdx) dest--;
					self._chartOrder.splice(dest, 0, item);

					self._dragSrcIndex = null;
					self._renderList();
				}, index));

				self._rowNodes[chartId] = row;
			});
		},

		_onSave: function ()
		{
			var config = {
				visibleCharts: this._visibleCharts.slice(),
				chartOrder: this._chartOrder.slice()
			};

			// If there's an active saved dashboard, persist the layout to workspace
			if (this.activeDashboard && this.activeDashboard._wsPath && DashboardStorage.isLoggedIn())
			{
				when(DashboardStorage.updateDashboard(this.activeDashboard, { layout: config }), lang.hitch(this, function ()
				{
					this.onSave(config);
				}), lang.hitch(this, function (err)
				{
					console.error("DashboardLayoutEditor: failed to save layout to workspace", err);
					// Still apply locally even if workspace save fails
					this.onSave(config);
				}));
			}
			else
			{
				// No active dashboard — layout is transient (applies to current session only)
				this.onSave(config);
			}
		},

		_onCancel: function ()
		{
			this.onCancel();
		},

		_onReset: function ()
		{
			this._visibleCharts = DashboardStorage.DEFAULT_CHART_IDS.slice();
			this._chartOrder = DashboardStorage.DEFAULT_CHART_IDS.slice();
			this._renderList();
		}
	});

	// The public API: a Dialog wrapping the editor content widget
	return declare([], {
		_dialog: null,
		_editor: null,

		// The active saved dashboard (if any)
		activeDashboard: null,

		// The current layout config to initialize the editor with
		layoutConfig: null,

		/**
		 * Callback invoked when user saves a new layout.
		 * @param {{ visibleCharts: string[], chartOrder: string[] }} config
		 */
		onSave: function (config) {},

		constructor: function (opts)
		{
			lang.mixin(this, opts || {});
		},

		show: function ()
		{
			if (this._dialog)
			{
				this._dialog.destroyRecursive();
			}

			var self = this;

			this._editor = new EditorContent({
				activeDashboard: this.activeDashboard,
				layoutConfig: this.layoutConfig,
				onSave: function (config)
				{
					self._dialog.hide();
					setTimeout(function () { self._dialog.destroyRecursive(); self._dialog = null; }, 500);
					self.onSave(config);
				},
				onCancel: function ()
				{
					self._dialog.hide();
					setTimeout(function () { self._dialog.destroyRecursive(); self._dialog = null; }, 500);
				}
			});

			this._dialog = new Dialog({
				title: "Customize Dashboard Layout",
				style: "width: 420px;"
			});

			domConstruct.place(this._editor.domNode, this._dialog.containerNode);
			this._editor.startup();
			this._dialog.show();
		},

		destroy: function ()
		{
			if (this._dialog)
			{
				this._dialog.destroyRecursive();
				this._dialog = null;
			}
		}
	});
});
