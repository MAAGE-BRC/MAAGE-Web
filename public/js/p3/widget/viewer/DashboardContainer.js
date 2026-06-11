define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/on",
	"dojo/dom-construct",
	"dojo/topic",
	"./Base",
	"dijit/layout/ContentPane",
	"../FilterContainerActionBar",
	"../AdvancedSearchFields",
	"./SurveillanceDashboard",
	"p3/util/DashboardStorage",
	"../DashboardLayoutEditor",
	"../Confirmation"
], function (
	declare,
	lang,
	on,
	domConstruct,
	Topic,
	Base,
	ContentPane,
	FilterContainerActionBar,
	AdvancedSearchFields,
	SurveillanceDashboard,
	DashboardStorage,
	DashboardLayoutEditor,
	Confirmation
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

			// Sync preset selector to match current filter
			var currentFilter = state.hashParams.filter || "";
			var presetId = detectPreset(currentFilter);
			var savedDashboard = DashboardStorage.findDashboardByFilter(currentFilter);

			if (presetId && presetId !== this._currentPresetId)
			{
				this._currentPresetId = presetId;
				this._currentSavedDashboard = null;
				this.presetSelector.value = presetId;
				this._updateHeaderForPreset(presetId);
			}
			else if (savedDashboard)
			{
				this._currentPresetId = null;
				this._currentSavedDashboard = savedDashboard;
				this.presetSelector.value = savedDashboard.id;
				this.dashboardTitleNode.textContent = savedDashboard.name;
				this.dashboardDescriptionNode.textContent = "Saved dashboard";
			}
			else if (!presetId && this._currentPresetId)
			{
				// Custom query, not a known preset or saved dashboard
				this._currentPresetId = null;
				this._currentSavedDashboard = null;
				this.dashboardTitleNode.textContent = "Surveillance Dashboard";
				this.dashboardDescriptionNode.textContent = "Custom filtered view";
			}

			// Forward state to filter panel — this is what makes facets load
			// and renders filter buttons for the preset filters.
			// The filter panel needs state.search as a base query for facet counts.
			// The dashboard route doesn't have a URL search query, so we provide
			// a catch-all base so getFacets() constructs valid RQL.
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

				// Determine display hints: saved dashboard > preset > defaults
				var timelineMode = "bar";
				var pathogenField = "species";

				if (savedDashboard)
				{
					timelineMode = savedDashboard.timelineMode || "bar";
					pathogenField = savedDashboard.pathogenField || "species";
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
			var layoutConfig = DashboardStorage.getEffectiveLayout();

			this.dashboardContent = new SurveillanceDashboard({
				region: "center",
				query: (initialState.hashParams && initialState.hashParams.filter) || "",
				layoutConfig: layoutConfig
			});

			this.addChild(this.viewHeader);
			this.addChild(this.filterPanel);
			this.addChild(this.dashboardContent);

			this._listen();

			this._firstView = true;
		},

		_createViewHeader: function ()
		{
			this.viewHeader = new ContentPane({
				region: "top",
				"class": "DashboardHeader",
				style: "padding: 12px 16px 8px 16px; background: var(--maage-bg, #f8f9fa); overflow: hidden;"
			});

			var headerWrapper = domConstruct.create("div", {
				className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2"
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
				className: "flex items-center gap-3"
			}, headerWrapper);

			domConstruct.create("label", {
				className: "text-sm font-medium text-maage-text-muted",
				textContent: "Dashboard:"
			}, controlsArea);

			this.presetSelector = domConstruct.create("select", {
				className: "px-3 py-1.5 text-sm bg-maage-surface border border-maage-border rounded-md text-maage-text focus:outline-none focus:ring-2 focus:ring-maage-primary-300 cursor-pointer min-w-[220px]"
			}, controlsArea);

			this._populatePresetSelector();

			// On preset change, navigate with the preset filter as the hash
			on(this.presetSelector, "change", lang.hitch(this, function (evt)
			{
				var selectedValue = evt.target.value;

				// Check built-in presets first
				var preset = PRESETS[selectedValue];
				if (preset)
				{
					var filter = resolveQuery(preset.filter);
					Topic.publish("/navigate", {
						href: "/dashboard/#filter=" + filter
					});
					return;
				}

				// Check saved dashboards
				var savedDashboards = DashboardStorage.getSavedDashboards();
				var saved = null;
				for (var i = 0; i < savedDashboards.length; i++)
				{
					if (savedDashboards[i].id === selectedValue)
					{
						saved = savedDashboards[i];
						break;
					}
				}
				if (saved)
				{
					Topic.publish("/navigate", {
						href: "/dashboard/#filter=" + saved.filter
					});
				}
			}));

			// Customize button
			var customizeBtn = domConstruct.create("button", {
				className: "px-3 py-1.5 text-sm bg-maage-surface border border-maage-border rounded-md text-maage-text hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-maage-primary-300 cursor-pointer transition-colors",
				title: "Customize dashboard layout",
				innerHTML: '<span class="fa icon-cog2" style="margin-right: 4px;"></span>Customize'
			}, controlsArea);

			on(customizeBtn, "click", lang.hitch(this, "_openLayoutEditor"));

			// Manage saved dashboards button
			this.manageSavedBtn = domConstruct.create("button", {
				className: "px-3 py-1.5 text-sm bg-maage-surface border border-maage-border rounded-md text-maage-text hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-maage-primary-300 cursor-pointer transition-colors",
				title: "Manage saved dashboards",
				innerHTML: '<span class="fa icon-list2" style="margin-right: 4px;"></span>Manage'
			}, controlsArea);

			// Only show manage button if there are saved dashboards
			var savedCount = DashboardStorage.getSavedDashboards().length;
			this.manageSavedBtn.style.display = savedCount > 0 ? "" : "none";

			on(this.manageSavedBtn, "click", lang.hitch(this, "_openManageSavedDialog"));
		},

		_populatePresetSelector: function ()
		{
			domConstruct.empty(this.presetSelector);

			// Built-in presets group
			var builtInGroup = domConstruct.create("optgroup", {
				label: "Built-in Dashboards"
			}, this.presetSelector);

			var keys = Object.keys(PRESETS);
			for (var i = 0; i < keys.length; i++)
			{
				domConstruct.create("option", {
					value: keys[i],
					textContent: PRESETS[keys[i]].title
				}, builtInGroup);
			}

			// Saved dashboards group
			var savedDashboards = DashboardStorage.getSavedDashboards();
			if (savedDashboards.length > 0)
			{
				var savedGroup = domConstruct.create("optgroup", {
					label: "Saved Dashboards"
				}, this.presetSelector);

				savedDashboards.forEach(function (sd)
				{
					domConstruct.create("option", {
						value: sd.id,
						textContent: sd.name
					}, savedGroup);
				});
			}

			// Update manage button visibility
			if (this.manageSavedBtn)
			{
				this.manageSavedBtn.style.display = savedDashboards.length > 0 ? "" : "none";
			}
		},

		_updateHeaderForPreset: function (presetId)
		{
			var preset = PRESETS[presetId];
			if (!preset) return;

			this.dashboardTitleNode.textContent = preset.title;
			this.dashboardDescriptionNode.textContent = preset.description;
		},

		_openLayoutEditor: function ()
		{
			var self = this;
			var editor = new DashboardLayoutEditor({
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

		_openManageSavedDialog: function ()
		{
			var self = this;
			var savedDashboards = DashboardStorage.getSavedDashboards();

			if (savedDashboards.length === 0)
			{
				return;
			}

			var dlg = new Confirmation({
				title: "Manage Saved Dashboards",
				okLabel: "Done",
				cancelLabel: null,
				closeOnOK: true,
				onConfirm: function ()
				{
					// Refresh preset selector in case names changed or items deleted
					self._populatePresetSelector();
				}
			});

			var container = domConstruct.create("div", {
				className: "dashboard-manage-list",
				style: "min-width: 340px;"
			});

			savedDashboards.forEach(function (sd)
			{
				var row = domConstruct.create("div", {
					className: "manage-row"
				}, container);

				// Editable name
				var nameInput = domConstruct.create("input", {
					className: "manage-name",
					type: "text",
					value: sd.name
				}, row);

				on(nameInput, "blur", function ()
				{
					var newName = nameInput.value.trim();
					if (newName && newName !== sd.name)
					{
						DashboardStorage.renameDashboard(sd.id, newName);
						sd.name = newName;
					}
					else if (!newName)
					{
						nameInput.value = sd.name;
					}
				});

				on(nameInput, "keydown", function (evt)
				{
					if (evt.key === "Enter")
					{
						nameInput.blur();
					}
				});

				// Delete button
				var deleteBtn = domConstruct.create("button", {
					className: "manage-delete-btn",
					innerHTML: "&#10005;",
					title: "Delete this saved dashboard"
				}, row);

				on(deleteBtn, "click", function ()
				{
					DashboardStorage.deleteDashboard(sd.id);
					domConstruct.destroy(row);

					// If no more saved dashboards, close the dialog
					var remaining = DashboardStorage.getSavedDashboards();
					if (remaining.length === 0)
					{
						dlg.hideAndDestroy();
						self._populatePresetSelector();
					}
				});
			});

			domConstruct.place(container, dlg.containerNode, "first");
			dlg.show();
		},

		_createFilterPanel: function ()
		{
			this.filterPanel = new FilterContainerActionBar({
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
			on(this.domNode, "ToggleFilters", lang.hitch(this, function ()
			{
				if (!this.filterPanel && this.getFilterPanel)
				{
					this.filterPanel = this.getFilterPanel();
					this.filterPanel.region = "top";
					this.filterPanel.splitter = true;
					this.layoutPriority = 2;
					this.addChild(this.filterPanel);
				}
				else if (this.filterPanel)
				{
					if (this.filterPanel.minimized)
					{
						this.filterPanel.set("minimized", false);
						this.filterPanel.resize({
							h: this.filterPanel.minSize + 150
						});
					}
					else
					{
						this.filterPanel.set("minimized", true);
						this.filterPanel.resize({
							h: this.filterPanel.minSize
						});
					}
					this.resize();
				}
			}));
		}
	});
});
