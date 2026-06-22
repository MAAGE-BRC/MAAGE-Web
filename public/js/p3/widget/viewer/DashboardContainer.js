define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/on",
	"dojo/when",
	"dojo/dom-construct",
	"./Base",
	"dijit/layout/ContentPane",
	"../DashboardFilterActionBar",
	"../AdvancedSearchFields",
	"./SurveillanceDashboard",
	"p3/util/DashboardStorage",
	"../DashboardLayoutEditor"
], function (
	declare,
	lang,
	on,
	when,
	domConstruct,
	Base,
	ContentPane,
	DashboardFilterActionBar,
	AdvancedSearchFields,
	SurveillanceDashboard,
	DashboardStorage,
	DashboardLayoutEditor
) {

	var DASHBOARD_FACET_FIELDS = AdvancedSearchFields["genome"].filter(function (ff)
	{
		return ff.facet;
	});

	var DASHBOARD_SEARCH_FIELDS = AdvancedSearchFields["genome"].filter(function (ff)
	{
		return ff.search;
	});

	// Preset configurations
	// filter: applied via the filter action bar so all criteria are visible and directly editable
	var PRESETS = {
		"midwest-amr": {
			title: "Midwest AMR Monitoring",
			description: "Genomes from the Midwest region with antimicrobial resistance annotations",
			filter: 'and(eq(collection_year,YEAR_CURRENT),in(state_province,(Illinois,Indiana,Iowa,Kansas,Michigan,Minnesota,Missouri,Nebraska,%22North%20Dakota%22,Ohio,%22South%20Dakota%22,Wisconsin)))',
			timelineMode: "bar",
			pathogenField: "species"
		},
		"us-amr": {
			title: "US AMR Monitoring",
			description: "Genomes from the United States with antimicrobial resistance annotations",
			filter: 'and(eq(collection_year,YEAR_CURRENT),eq(isolation_country,USA))',
			timelineMode: "bar",
			pathogenField: "species"
		},
		"salmonella-clusters": {
			title: "Salmonella Cluster Tracker",
			description: "Salmonella genomes with cgMLST cluster assignments and trend analysis",
			filter: 'and(gt(collection_year,YEAR_MINUS_2),eq(genus,Salmonella))',
			timelineMode: "stacked",
			pathogenField: "serovar"
		}
	};

	function resolveQuery(queryTemplate)
	{
		var now = new Date();
		var currentYear = now.getFullYear();
		return queryTemplate
			.replace(/YEAR_CURRENT/g, currentYear.toString())
			.replace(/YEAR_MINUS_1/g, (currentYear - 1).toString())
			.replace(/YEAR_MINUS_2/g, (currentYear - 2).toString())
			.replace(/YEAR_MINUS_3/g, (currentYear - 3).toString());
	}

	// Determine which preset ID matches the current filter, or null
	function detectPreset(filter)
	{
		if (!filter) return null;
		var keys = Object.keys(PRESETS);
		for (var i = 0; i < keys.length; i++)
		{
			var resolvedFilter = resolveQuery(PRESETS[keys[i]].filter);
			if (resolvedFilter === filter)
			{
				return keys[i];
			}
		}
		return null;
	}

	var DEFAULT_PRESET = "midwest-amr";

	return declare([Base], {
		baseClass: "DashboardContainer",
		design: "headline",
		gutters: false,
		state: null,
		apiServer: window.App.dataServiceURL,
		dataModel: "genome",

		_firstView: false,
		_currentPresetId: null,
		_currentSavedDashboard: null,
		_filterVisible: false,
		filterPanel: null,
		dashboardContent: null,
		viewHeader: null,

		postCreate: function ()
		{
			this.inherited(arguments);
		},

		startup: function ()
		{
			if (this._started) return;
			this.inherited(arguments);
		},

		onSetState: function (attr, oldVal, state)
		{
			if (!state) return;

			if (!state.hashParams)
			{
				state.hashParams = {};
			}

			// The global hash parser in p3app.js splits on "&", which breaks
			// RQL expressions that contain "&" (e.g., from genome list URLs).
			// Re-extract the filter from the raw hash to get the full value.
			if (state.hash && state.hash.indexOf("filter=") === 0)
			{
				state.hashParams.filter = state.hash.substring("filter=".length);
			}

			// Validate that the filter has balanced parentheses.
			// Malformed filters (from bad URL hashes) would cause API 400 errors.
			if (state.hashParams.filter && !this._hasBalancedParens(state.hashParams.filter))
			{
				console.warn("DashboardContainer: discarding malformed filter (unbalanced parens):",
					state.hashParams.filter);
				state.hashParams.filter = null;
			}

			// If no filter, apply the default preset filter and update the URL
			if (!state.hashParams.filter)
			{
				var defaultPreset = PRESETS[DEFAULT_PRESET];
				state.hashParams.filter = resolveQuery(defaultPreset.filter);
				window.history.replaceState(
					state, "",
					"/dashboard/#filter=" + state.hashParams.filter
				);
			}

			// Lazy-init on first real state
			if (!this._firstView)
			{
				this.onFirstView();
			}

			// Load saved dashboards from workspace (async), then apply state
			var self = this;
			when(DashboardStorage.getSavedDashboards(), function (dashboards)
			{
				self._applyState(state, dashboards);
			}, function (err)
			{
				console.warn("DashboardContainer: failed to load saved dashboards", err);
				self._applyState(state, []);
			});
		},

		/**
		 * Apply state after dashboards have been loaded.
		 * This was previously inline in onSetState but is now deferred
		 * until the workspace dashboards are available.
		 */
		_applyState: function (state, dashboards)
		{
			// Identify the current dashboard from the filter
			var currentFilter = state.hashParams.filter || "";
			var presetId = detectPreset(currentFilter);
			var savedDashboard = DashboardStorage.findDashboardByFilter(currentFilter);

			if (presetId && presetId !== this._currentPresetId)
			{
				this._currentPresetId = presetId;
				this._currentSavedDashboard = null;
				this._updateHeaderForPreset(presetId);
			}
			else if (savedDashboard)
			{
				this._currentPresetId = null;
				this._currentSavedDashboard = savedDashboard;
				this.dashboardTitleNode.textContent = savedDashboard.name;
				this.dashboardDescriptionNode.textContent = "Saved dashboard";
			}
			else if (!presetId)
			{
				// Custom query, not a known preset or saved dashboard
				this._currentPresetId = null;
				this._currentSavedDashboard = null;
				this.dashboardTitleNode.textContent = "Surveillance Dashboard";
				this.dashboardDescriptionNode.textContent = "Custom filtered view";
			}

			// Forward state to filter panel
			if (this.filterPanel)
			{
				var filterState = lang.mixin({}, state, {
					hashParams: lang.mixin({}, state.hashParams)
				});
				if (!filterState.search)
				{
					filterState.search = "keyword(*)";
				}
				this.filterPanel.set("state", filterState);
			}

			// Push the filter as the query to charts
			if (this.dashboardContent)
			{
				var query = state.hashParams.filter || "";

				// Determine display hints and layout
				var timelineMode = "bar";
				var pathogenField = "species";
				var layoutConfig = DashboardStorage.getDefaultLayout();

				if (savedDashboard)
				{
					timelineMode = savedDashboard.timelineMode || "bar";
					pathogenField = savedDashboard.pathogenField || "species";
					if (savedDashboard.layout)
					{
						layoutConfig = savedDashboard.layout;
					}
				}
				else if (presetId && PRESETS[presetId])
				{
					timelineMode = PRESETS[presetId].timelineMode;
					pathogenField = PRESETS[presetId].pathogenField;
				}
				else
				{
					// Auto-detect for custom queries
					var hints = DashboardStorage.detectDisplayHints(query);
					timelineMode = hints.timelineMode;
					pathogenField = hints.pathogenField;
				}

				this.dashboardContent.set("layoutConfig", layoutConfig);
				this.dashboardContent.set("timelineMode", timelineMode);
				this.dashboardContent.set("pathogenField", pathogenField);
				this.dashboardContent.set("query", query);
			}
		},

		onFirstView: function ()
		{
			if (this._firstView) return;

			// 1. Header bar
			this._createViewHeader();

			// 2. Filter panel (region: top, splitter — same pattern as GridContainer)
			this._createFilterPanel();

			// 3. Dashboard chart content (region: center)
			var initialState = this.state || {};
			var layoutConfig = DashboardStorage.getDefaultLayout();

			this.dashboardContent = new SurveillanceDashboard({
				region: "center",
				query: (initialState.hashParams && initialState.hashParams.filter) || "",
				layoutConfig: layoutConfig
			});

			this.addChild(this.viewHeader);
			this.addChild(this.filterPanel);
			this.addChild(this.dashboardContent);

			// Hide the splitter that BorderContainer created for the filter panel
			if (this.filterPanel._splitterWidget && this.filterPanel._splitterWidget.domNode)
			{
				this.filterPanel._splitterWidget.domNode.style.display = "none";
			}

			this._listen();

			this._firstView = true;
		},

		_createViewHeader: function ()
		{
			var BTN_CLASS = "dashboard-header-btn";

			this.viewHeader = new ContentPane({
				region: "top",
				"class": "DashboardHeader",
				style: "padding: 12px 16px 8px 16px; background: var(--maage-bg, #f8f9fa); overflow: hidden;"
			});

			var headerWrapper = domConstruct.create("div", {
				style: "display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;"
			}, this.viewHeader.containerNode);

			var titleArea = domConstruct.create("div", {}, headerWrapper);

			this.dashboardTitleNode = domConstruct.create("h1", {
				className: "text-xl sm:text-2xl font-heading font-semibold text-maage-text",
				textContent: "Surveillance Dashboard"
			}, titleArea);

			this.dashboardDescriptionNode = domConstruct.create("p", {
				className: "text-sm text-maage-text-muted mt-1",
				textContent: "Monitoring recent genomic surveillance activity"
			}, titleArea);

			var controlsArea = domConstruct.create("div", {
				style: "display: flex; align-items: center; gap: 8px; margin-left: auto;"
			}, headerWrapper);

			// Filters toggle button
			this.filterToggleBtn = domConstruct.create("button", {
				className: BTN_CLASS,
				title: "Show or hide the filter panel",
				innerHTML: '<span class="fa icon-filter" style="margin-right: 5px;"></span>Filters'
			}, controlsArea);

			on(this.filterToggleBtn, "click", lang.hitch(this, "_toggleFilterPanel"));

			// Customize button
			var customizeBtn = domConstruct.create("button", {
				className: BTN_CLASS,
				title: "Customize dashboard layout",
				innerHTML: '<span class="fa icon-cog2" style="margin-right: 5px;"></span>Customize'
			}, controlsArea);

			on(customizeBtn, "click", lang.hitch(this, "_openLayoutEditor"));
		},

		_updateHeaderForPreset: function (presetId)
		{
			var preset = PRESETS[presetId];
			if (!preset) return;

			this.dashboardTitleNode.textContent = preset.title;
			this.dashboardDescriptionNode.textContent = preset.description;
		},

		_toggleFilterPanel: function ()
		{
			if (!this.filterPanel) return;

			this._filterVisible = !this._filterVisible;

			// The splitter is a separate DOM node created by BorderContainer
			var splitter = this.filterPanel._splitterWidget;

			if (this._filterVisible)
			{
				this.filterPanel.set("minimized", false);
				this.filterPanel.domNode.style.display = "";
				if (splitter && splitter.domNode)
				{
					splitter.domNode.style.display = "";
				}
				this.filterPanel.resize({ h: this.filterPanel.minSize + 150 });

				if (this.filterToggleBtn)
				{
					this.filterToggleBtn.classList.add("active");
				}
			}
			else
			{
				this.filterPanel.set("minimized", true);
				this.filterPanel.domNode.style.display = "none";
				if (splitter && splitter.domNode)
				{
					splitter.domNode.style.display = "none";
				}

				if (this.filterToggleBtn)
				{
					this.filterToggleBtn.classList.remove("active");
				}
			}
			this.resize();
		},

		/**
		 * Get the currently active dashboard (saved or null).
		 */
		getActiveDashboard: function ()
		{
			return this._currentSavedDashboard || null;
		},

		/**
		 * Get the current layout config from the dashboard content widget.
		 */
		getCurrentLayoutConfig: function ()
		{
			if (this.dashboardContent && this.dashboardContent.layoutConfig)
			{
				return this.dashboardContent.layoutConfig;
			}
			return DashboardStorage.getDefaultLayout();
		},

		_openLayoutEditor: function ()
		{
			var self = this;
			var editor = new DashboardLayoutEditor({
				activeDashboard: this._currentSavedDashboard,
				layoutConfig: this.getCurrentLayoutConfig(),
				onSave: function (config)
				{
					// Refresh the dashboard with new layout
					if (self.dashboardContent)
					{
						self.dashboardContent.set("layoutConfig", config);
						// Force reload to re-create charts in new order
						if (self.dashboardContent.query)
						{
							self.dashboardContent.loadDashboard();
						}
					}
				}
			});
			editor.show();
		},

		_createFilterPanel: function ()
		{
			this.filterPanel = new DashboardFilterActionBar({
				region: "top",
				layoutPriority: 7,
				splitter: true,
				className: "BrowserHeader",
				dataModel: this.dataModel,
				facetFields: DASHBOARD_FACET_FIELDS,
				advancedSearchFields: DASHBOARD_SEARCH_FIELDS,
				state: lang.mixin({}, this.state),
				currentContainerWidget: this
			});

			// Start hidden — user toggles via the Filters button
			this.filterPanel.set("minimized", true);
			this.filterPanel.domNode.style.display = "none";
			this._filterVisible = false;

			this.filterPanel.watch("filter", lang.hitch(this, function (attr, oldVal, newVal)
			{
				if ((oldVal != newVal) && (newVal != this.state.hashParams.filter))
				{
					on.emit(this.domNode, "UpdateHash", {
						bubbles: true,
						cancelable: true,
						hashProperty: "filter",
						value: newVal,
						oldValue: oldVal
					});
				}
			}));
		},

		_hasBalancedParens: function (str)
		{
			if (!str) return true;
			var count = 0;
			for (var i = 0; i < str.length; i++)
			{
				if (str[i] === "(") count++;
				else if (str[i] === ")") count--;
				if (count < 0) return false;
			}
			return count === 0;
		},

		_listen: function ()
		{
			on(this.domNode, "ToggleFilters", lang.hitch(this, "_toggleFilterPanel"));
		}
	});
});
