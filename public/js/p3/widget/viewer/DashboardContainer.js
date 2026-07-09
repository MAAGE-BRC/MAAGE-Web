define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/on",
	"dojo/when",
	"dojo/dom-construct",
	"dojo/topic",
	"./Base",
	"dijit/layout/ContentPane",
	"../TabContainer",
	"../DashboardFilterActionBar",
	"../AdvancedSearchFields",
	"./SurveillanceDashboard",
	"../GenomeGridContainer",
	"../AMRPanelGridContainer",
	"../SequenceGridContainer",
	"../FeatureGridContainer",
	"../SpecialtyGeneGridContainer",
	"p3/util/DashboardStorage",
	"../DashboardLayoutEditor",
	"../SaveDashboardDialog"
], function (
	declare,
	lang,
	on,
	when,
	domConstruct,
	Topic,
	Base,
	ContentPane,
	TabContainer,
	DashboardFilterActionBar,
	AdvancedSearchFields,
	SurveillanceDashboard,
	GenomeGridContainer,
	AMRPanelGridContainer,
	SequenceGridContainer,
	FeatureGridContainer,
	SpecialtyGeneGridContainer,
	DashboardStorage,
	DashboardLayoutEditor,
	SaveDashboardDialog
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
		defaultTab: "overview",
		apiServer: window.App.dataServiceURL,
		dataModel: "genome",

		_firstView: false,
		_currentPresetId: null,
		_currentSavedDashboard: null,
		_originDashboard: null,
		_isDirty: false,
		_filterVisible: false,
		filterPanel: null,
		dashboardContent: null,
		viewer: null,
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

		/**
		 * Override Base.onUpdateHash to preserve the dashboard filter when
		 * switching tabs. The default handler replaces hashParams entirely
		 * when evt.hashParams is present (e.g., from TabController), which
		 * would drop the filter hash param.
		 */
		onUpdateHash: function (evt)
		{
			if (!this.state)
			{
				this.state = {};
			}
			if (!this.state.hashParams)
			{
				this.state.hashParams = {};
			}

			// Preserve the current filter value before merging
			var currentFilter = this.state.hashParams.filter;

			if (evt.hashParams)
			{
				this.state.hashParams = evt.hashParams;
			}
			if (evt.hashProperty)
			{
				this.state.hashParams[evt.hashProperty] = evt.value;
			}

			// Restore the filter if it was dropped during a tab switch
			if (currentFilter && !this.state.hashParams.filter)
			{
				this.state.hashParams.filter = currentFilter;
			}

			var l = window.location.pathname + window.location.search + "#" + Object.keys(this.state.hashParams).map(function (key)
			{
				if (key && this.state.hashParams[key])
				{
					return key + "=" + this.state.hashParams[key];
				}
				return "";
			}, this).filter(function (x)
			{
				return !!x;
			}).join("&");

			Topic.publish("/navigate", { href: l });
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
			if (state.hash)
			{
				// Parse the raw hash to extract filter and view_tab values
				// The hash may contain: filter=<rql>&view_tab=<tab>
				// But RQL expressions can contain "&", so we parse carefully.
				var hash = state.hash;

				// Extract view_tab if present (always at the end, simple value)
				var viewTabMatch = hash.match(/[&]view_tab=([^&]*)/);
				if (viewTabMatch)
				{
					state.hashParams.view_tab = viewTabMatch[1];
					// Remove view_tab from hash before extracting filter
					hash = hash.replace(/[&]view_tab=[^&]*/, "");
				}

				// Extract filter (everything after "filter=")
				if (hash.indexOf("filter=") === 0)
				{
					state.hashParams.filter = hash.substring("filter=".length);
				}
			}

			// Validate that the filter has balanced parentheses.
			// Malformed filters (from bad URL hashes) would cause API 400 errors.
			if (state.hashParams.filter && !this._hasBalancedParens(state.hashParams.filter))
			{
				console.warn("DashboardContainer: discarding malformed filter (unbalanced parens):",
					state.hashParams.filter);
				state.hashParams.filter = null;
			}

			// Ensure view_tab has a default
			if (!state.hashParams.view_tab)
			{
				state.hashParams.view_tab = this.defaultTab;
			}

			// If no filter, apply the default preset filter and update the URL
			if (!state.hashParams.filter)
			{
				var defaultPreset = PRESETS[DEFAULT_PRESET];
				state.hashParams.filter = resolveQuery(defaultPreset.filter);
				window.history.replaceState(
					state, "",
					"/view/Dashboard/#filter=" + state.hashParams.filter
						+ "&view_tab=" + state.hashParams.view_tab
				);
			}

			// Lazy-init on first real state
			if (!this._firstView)
			{
				this.onFirstView();
			}

			// Select the active tab
			if (this.viewer && state.hashParams.view_tab)
			{
				var vt = this[state.hashParams.view_tab];
				if (vt)
				{
					vt.set("visible", true);
					this.viewer.selectChild(vt);
				}
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

			if (presetId)
			{
				this._currentPresetId = presetId;
				this._currentSavedDashboard = null;
				this._originDashboard = null;
				this._isDirty = false;
				this._updateHeaderForPreset(presetId);
			}
			else if (savedDashboard)
			{
				this._currentPresetId = null;
				this._currentSavedDashboard = savedDashboard;
				this._originDashboard = savedDashboard;
				this._isDirty = false;
				this.dashboardTitleNode.textContent = savedDashboard.name;
				this.dashboardDescriptionNode.textContent = "Saved dashboard";
			}
			else
			{
				this._currentPresetId = null;
				this._currentSavedDashboard = null;

				if (this._originDashboard)
				{
					// Filter was modified from a saved dashboard
					this._isDirty = true;
					this.dashboardTitleNode.textContent = this._originDashboard.name;
					this.dashboardDescriptionNode.textContent = "Unsaved changes";
				}
				else
				{
					this._isDirty = false;
					this.dashboardTitleNode.textContent = "Surveillance Dashboard";
					this.dashboardDescriptionNode.textContent = "Custom filtered view";
				}
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

			// Propagate state to the active tab
			this.setActivePanelState();

			this._updateSaveButton();
		},

		/**
		 * Propagate state to the currently active tab panel.
		 * For the Overview tab, passes query + layout/display config to SurveillanceDashboard.
		 * For grid tabs (genomes, amr, etc.), constructs a state object with the
		 * dashboard filter as the search query.
		 */
		setActivePanelState: function ()
		{
			if (!this.state) return;

			var active = (this.state.hashParams && this.state.hashParams.view_tab)
				? this.state.hashParams.view_tab
				: this.defaultTab;
			var activeTab = this[active];

			if (!activeTab)
			{
				console.warn("DashboardContainer: active tab not found:", active);
				return;
			}

			var currentFilter = (this.state.hashParams && this.state.hashParams.filter) || "";
			var presetId = detectPreset(currentFilter);
			var savedDashboard = DashboardStorage.findDashboardByFilter(currentFilter);

			if (active === "overview")
			{
				// Overview tab is the SurveillanceDashboard — push query + display hints
				var query = currentFilter;
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
			else
			{
				// Grid tabs — construct a state object with the filter as the search query.
				// The grid containers expect state.search to contain an RQL query.
				// For feature/sequence tabs, we need to wrap in genome() join.
				var gridSearch;
				if (active === "features" || active === "sequences" || active === "specialtyGenes")
				{
					// These tabs query non-genome endpoints and need a join
					gridSearch = "genome(" + currentFilter + ")";
				}
				else
				{
					// genomes and amr tabs query the genome/amr endpoints directly
					gridSearch = currentFilter;
				}

				var activeQueryState = {
					search: gridSearch ? ("?" + gridSearch) : "",
					hashParams: {
						view_tab: active
					}
				};

				activeTab.set("state", activeQueryState);
			}

			// Update page title
			if (activeTab.title)
			{
				var pageTitle = "Dashboard " + activeTab.title + " | MAAGE";
				if (window.document.title !== pageTitle)
				{
					window.document.title = pageTitle;
				}
			}
		},

		onFirstView: function ()
		{
			if (this._firstView) return;

			// 1. Header bar
			this._createViewHeader();

			// 2. Filter panel (region: top, splitter — same pattern as GridContainer)
			this._createFilterPanel();

			// 3. Tab container (region: center)
			this.viewer = new TabContainer({
				region: "center",
				"class": "DashboardTabContainer"
			});

			// 4. Create tabs
			var initialState = this.state || {};
			var layoutConfig = DashboardStorage.getDefaultLayout();

			// Overview tab — the existing SurveillanceDashboard
			this.dashboardContent = new SurveillanceDashboard({
				title: "Overview",
				id: this.viewer.id + "_overview",
				query: (initialState.hashParams && initialState.hashParams.filter) || "",
				layoutConfig: layoutConfig
			});
			this.overview = this.dashboardContent;

			// Genomes tab
			this.genomes = new GenomeGridContainer({
				title: "Genomes",
				id: this.viewer.id + "_genomes",
				enableFilterPanel: false,
				disabled: false
			});

			// AMR Phenotypes tab
			this.amr = new AMRPanelGridContainer({
				title: "AMR Phenotypes",
				id: this.viewer.id + "_amr",
				enableFilterPanel: false,
				disabled: false
			});

			// Sequences tab
			this.sequences = new SequenceGridContainer({
				title: "Sequences",
				id: this.viewer.id + "_sequences",
				enableFilterPanel: false,
				disabled: false
			});

			// Features tab
			this.features = new FeatureGridContainer({
				title: "Features",
				id: this.viewer.id + "_features",
				enableFilterPanel: false,
				disabled: false
			});

			// Specialty Genes tab
			this.specialtyGenes = new SpecialtyGeneGridContainer({
				title: "Specialty Genes",
				id: this.viewer.id + "_specialtyGenes",
				enableFilterPanel: false,
				disabled: false
			});

			// Add tabs to the tab container
			this.viewer.addChild(this.overview);
			this.viewer.addChild(this.genomes);
			this.viewer.addChild(this.amr);
			this.viewer.addChild(this.sequences);
			this.viewer.addChild(this.features);
			this.viewer.addChild(this.specialtyGenes);

			// Add children to the BorderContainer
			this.addChild(this.viewHeader);
			this.addChild(this.filterPanel);
			this.addChild(this.viewer);

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
				style: "padding: 12px 16px 8px 16px; background: var(--maage-bg, #f8f9fa); overflow: visible;"
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

			// Save button area (contextual: save / save-as / dropdown)
			this._saveArea = domConstruct.create("span", {
				className: "dashboard-save-area",
				style: "position: relative; display: inline-flex;"
			}, controlsArea);

			this._saveBtn = domConstruct.create("button", {
				className: BTN_CLASS + " dashboard-save-btn",
				title: "Save dashboard",
				innerHTML: '<span class="fa icon-save2" style="margin-right: 5px;"></span>Save'
			}, this._saveArea);

			on(this._saveBtn, "click", lang.hitch(this, "_onSaveClick"));

			// Dropdown caret for "Save as New" when overwrite is available
			this._saveDropdownBtn = domConstruct.create("button", {
				className: BTN_CLASS + " dashboard-save-dropdown-btn",
				title: "More save options",
				innerHTML: '<span class="fa icon-chevron-down"></span>',
				style: "display: none;"
			}, this._saveArea);

			on(this._saveDropdownBtn, "click", lang.hitch(this, "_onSaveDropdownClick"));

			// Dropdown menu
			this._saveMenu = domConstruct.create("div", {
				className: "dashboard-save-menu",
				style: "display: none;"
			}, this._saveArea);

			var saveOverwriteItem = domConstruct.create("button", {
				className: "dashboard-save-menu-item",
				textContent: "Save"
			}, this._saveMenu);
			on(saveOverwriteItem, "click", lang.hitch(this, "_doSaveOverwrite"));

			var saveAsNewItem = domConstruct.create("button", {
				className: "dashboard-save-menu-item",
				textContent: "Save as New Dashboard"
			}, this._saveMenu);
			on(saveAsNewItem, "click", lang.hitch(this, "_doSaveAsNew"));

			// Close the dropdown when clicking elsewhere
			on(document.body, "click", lang.hitch(this, function (evt)
			{
				if (this._saveMenu && this._saveMenu.style.display !== "none"
					&& !this._saveArea.contains(evt.target))
				{
					this._saveMenu.style.display = "none";
				}
			}));
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

		/**
		 * Update the save button appearance based on current state.
		 * - Saved dashboard, no changes: hidden (nothing to save)
		 * - Saved dashboard, dirty: show "Save" with dropdown for "Save as New"
		 * - Preset or custom (no origin): show "Save as Dashboard"
		 */
		_updateSaveButton: function ()
		{
			if (!this._saveBtn) return;

			var loggedIn = DashboardStorage.isLoggedIn();

			if (!loggedIn)
			{
				this._saveArea.style.display = "none";
				return;
			}

			this._saveArea.style.display = "";

			if (this._originDashboard && this._isDirty)
			{
				// Modified from a saved dashboard — primary action is overwrite, dropdown has "Save as New"
				this._saveBtn.innerHTML = '<span class="fa icon-save2" style="margin-right: 5px;"></span>Save';
				this._saveBtn.title = 'Save changes to "' + this._originDashboard.name + '"';
				this._saveBtn.disabled = false;
				this._saveBtn.classList.add("dashboard-save-primary");
				this._saveDropdownBtn.style.display = "";
			}
			else if (this._currentSavedDashboard && !this._isDirty)
			{
				// Viewing a saved dashboard with no changes — nothing to save
				this._saveBtn.innerHTML = '<span class="fa icon-checkmark" style="margin-right: 5px;"></span>Saved';
				this._saveBtn.title = "No unsaved changes";
				this._saveBtn.disabled = true;
				this._saveBtn.classList.remove("dashboard-save-primary");
				this._saveDropdownBtn.style.display = "none";
			}
			else
			{
				// Preset or custom filter — offer "Save as Dashboard"
				this._saveBtn.innerHTML = '<span class="fa icon-save2" style="margin-right: 5px;"></span>Save as Dashboard';
				this._saveBtn.title = "Save current view as a named dashboard";
				this._saveBtn.disabled = false;
				this._saveBtn.classList.remove("dashboard-save-primary");
				this._saveDropdownBtn.style.display = "none";
			}

			// Always close the menu on state change
			if (this._saveMenu) this._saveMenu.style.display = "none";
		},

		_onSaveClick: function ()
		{
			if (this._originDashboard && this._isDirty)
			{
				this._doSaveOverwrite();
			}
			else
			{
				this._doSaveAsNew();
			}
		},

		_onSaveDropdownClick: function (evt)
		{
			evt.stopPropagation();
			if (!this._saveMenu) return;
			var visible = this._saveMenu.style.display !== "none";
			this._saveMenu.style.display = visible ? "none" : "";
		},

		_doSaveOverwrite: function ()
		{
			if (this._saveMenu) this._saveMenu.style.display = "none";

			var origin = this._originDashboard;
			if (!origin || !origin._wsPath) return;

			var currentFilter = "";
			if (this.state && this.state.hashParams)
			{
				currentFilter = this.state.hashParams.filter || "";
			}

			var updates = {
				filter: currentFilter,
				timelineMode: this.dashboardContent ? this.dashboardContent.timelineMode : origin.timelineMode,
				pathogenField: this.dashboardContent ? this.dashboardContent.pathogenField : origin.pathogenField,
				layout: this.getCurrentLayoutConfig()
			};

			var self = this;
			when(DashboardStorage.updateDashboard(origin, updates), function ()
			{
				// The origin dashboard object was updated in cache by DashboardStorage.
				// Re-apply state so identity match works again.
				self._currentSavedDashboard = origin;
				self._isDirty = false;
				self.dashboardDescriptionNode.textContent = "Saved dashboard";
				self._updateSaveButton();
				self._showToast('Dashboard "' + origin.name + '" saved.');
			}, function (err)
			{
				console.error("DashboardContainer: overwrite failed", err);
				self._showToast("Failed to save. Please try again.", true);
			});
		},

		_doSaveAsNew: function ()
		{
			if (this._saveMenu) this._saveMenu.style.display = "none";

			var currentFilter = "";
			if (this.state && this.state.hashParams)
			{
				currentFilter = this.state.hashParams.filter || "";
			}

			var self = this;
			var dialog = new SaveDashboardDialog({
				filter: currentFilter,
				timelineMode: this.dashboardContent ? this.dashboardContent.timelineMode : null,
				pathogenField: this.dashboardContent ? this.dashboardContent.pathogenField : null,
				layoutConfig: this.getCurrentLayoutConfig()
			});

			// After the dialog saves successfully, refresh state so the
			// new dashboard is recognized as the active saved dashboard.
			var origHideAndDestroy = dialog.hideAndDestroy;
			dialog.hideAndDestroy = function ()
			{
				origHideAndDestroy.apply(dialog, arguments);
				// Re-apply state so identity picks up the newly saved dashboard
				when(DashboardStorage.getSavedDashboards(), function (dashboards)
				{
					var saved = DashboardStorage.findDashboardByFilter(currentFilter);
					if (saved)
					{
						self._originDashboard = saved;
						self._currentSavedDashboard = saved;
						self._isDirty = false;
						self.dashboardTitleNode.textContent = saved.name;
						self.dashboardDescriptionNode.textContent = "Saved dashboard";
						self._updateSaveButton();
					}
				});
			};

			dialog.show();
		},

		_showToast: function (message, isError)
		{
			var bgColor = isError ? "#fef2f2" : "#ffffff";
			var borderColor = isError ? "#fca5a5" : "#d1d5db";
			var textColor = isError ? "#991b1b" : "#374151";

			var toast = domConstruct.create("div", {
				style: "position: fixed; bottom: 24px; right: 24px; z-index: 10000;"
					+ "background: " + bgColor + "; border: 1px solid " + borderColor + "; border-radius: 8px;"
					+ "box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 12px 16px;"
					+ "max-width: 360px; font-size: 0.875rem; color: " + textColor + ";"
					+ "transition: opacity 0.3s;"
			}, document.body);

			toast.textContent = message;

			setTimeout(function ()
			{
				if (toast && toast.parentNode)
				{
					toast.style.opacity = "0";
					setTimeout(function ()
					{
						if (toast && toast.parentNode) domConstruct.destroy(toast);
					}, 300);
				}
			}, 4000);
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
