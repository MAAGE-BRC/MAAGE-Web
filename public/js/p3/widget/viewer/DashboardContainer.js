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
	"./SurveillanceDashboard"
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
	SurveillanceDashboard
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
			if (presetId && presetId !== this._currentPresetId)
			{
				this._currentPresetId = presetId;
				this.presetSelector.value = presetId;
				this._updateHeaderForPreset(presetId);
			}
			else if (!presetId && this._currentPresetId)
			{
				// Custom query, not a known preset
				this._currentPresetId = null;
				this.dashboardTitleNode.textContent = "Surveillance Dashboard";
				this.dashboardDescriptionNode.textContent = "Custom filtered view";
			}

			// Forward state to filter panel — this is what makes facets load
			// and renders filter buttons for the preset filters.
			if (this.filterPanel)
			{
				this.filterPanel.set("state", lang.mixin({}, state, {
					hashParams: lang.mixin({}, state.hashParams)
				}));
			}

			// Push the filter as the query to charts
			if (this.dashboardContent)
			{
				var query = state.hashParams.filter || "";

				// Pass display hints from the current preset (or last known)
				var preset = presetId ? PRESETS[presetId] : (this._currentPresetId ? PRESETS[this._currentPresetId] : null);
				this.dashboardContent.set("timelineMode", preset ? preset.timelineMode : "bar");
				this.dashboardContent.set("pathogenField", preset ? preset.pathogenField : "species");
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
			this.dashboardContent = new SurveillanceDashboard({
				region: "center",
				query: (initialState.hashParams && initialState.hashParams.filter) || ""
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

			var keys = Object.keys(PRESETS);
			for (var i = 0; i < keys.length; i++)
			{
				domConstruct.create("option", {
					value: keys[i],
					textContent: PRESETS[keys[i]].title
				}, this.presetSelector);
			}

			// On preset change, navigate with the preset filter as the hash
			on(this.presetSelector, "change", lang.hitch(this, function (evt)
			{
				var presetId = evt.target.value;
				var preset = PRESETS[presetId];
				if (!preset) return;

				var filter = resolveQuery(preset.filter);
				Topic.publish("/navigate", {
					href: "/dashboard/#filter=" + filter
				});
			}));
		},

		_updateHeaderForPreset: function (presetId)
		{
			var preset = PRESETS[presetId];
			if (!preset) return;

			this.dashboardTitleNode.textContent = preset.title;
			this.dashboardDescriptionNode.textContent = preset.description;
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
