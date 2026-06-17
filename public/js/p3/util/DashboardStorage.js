define([], function ()
{
	var STORAGE_KEY = "maage_dashboard_config";

	// Canonical chart definitions — order here is the default order
	var DEFAULT_CHARTS = [
		{ id: "summary", label: "Summary" },
		{ id: "map", label: "Geographic Distribution" },
		{ id: "serovarTimeline", label: "Serovars Over Time" },
		{ id: "amr", label: "AMR Profile" },
		{ id: "timeline", label: "Collection Timeline" },
		{ id: "pathogen", label: "Serovar" },
		{ id: "cluster", label: "Cluster Summary" },
		{ id: "host", label: "Host Distribution" },
		{ id: "isolationSource", label: "Isolation Source" },
		{ id: "genomeQuality", label: "Genome Quality" },
		{ id: "hostGroup", label: "Host Group" },
		{ id: "recentGenomes", label: "Recent Genomes" }
	];

	var DEFAULT_CHART_IDS = DEFAULT_CHARTS.map(function (c) { return c.id; });

	function _read()
	{
		try
		{
			var raw = localStorage.getItem(STORAGE_KEY);
			if (raw)
			{
				return JSON.parse(raw);
			}
		}
		catch (e)
		{
			console.warn("DashboardStorage: failed to read localStorage", e);
		}
		return null;
	}

	function _write(data)
	{
		try
		{
			localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
		}
		catch (e)
		{
			console.warn("DashboardStorage: failed to write localStorage", e);
		}
	}

	function _getOrInit()
	{
		var data = _read();
		if (!data)
		{
			data = {
				layout: null,
				savedDashboards: []
			};
		}
		if (!data.savedDashboards)
		{
			data.savedDashboards = [];
		}
		return data;
	}

	return {

		/**
		 * All available chart definitions with id and label.
		 */
		CHART_DEFINITIONS: DEFAULT_CHARTS,

		/**
		 * Default chart IDs in default order.
		 */
		DEFAULT_CHART_IDS: DEFAULT_CHART_IDS,

		/**
		 * Get the current layout config.
		 * Returns { visibleCharts: string[], chartOrder: string[] } or null if using defaults.
		 */
		getLayout: function ()
		{
			var data = _getOrInit();
			return data.layout || null;
		},

		/**
		 * Save a layout config.
		 * @param {Object} config - { visibleCharts: string[], chartOrder: string[] }
		 */
		saveLayout: function (config)
		{
			var data = _getOrInit();
			data.layout = {
				visibleCharts: config.visibleCharts || DEFAULT_CHART_IDS.slice(),
				chartOrder: config.chartOrder || DEFAULT_CHART_IDS.slice()
			};
			_write(data);
		},

		/**
		 * Reset layout to defaults (remove custom layout).
		 */
		resetLayout: function ()
		{
			var data = _getOrInit();
			data.layout = null;
			_write(data);
		},

		/**
		 * Get the effective layout — saved or default.
		 * Always returns a valid config object.
		 */
		getEffectiveLayout: function ()
		{
			var layout = this.getLayout();
			if (layout)
			{
				return layout;
			}
			return {
				visibleCharts: DEFAULT_CHART_IDS.slice(),
				chartOrder: DEFAULT_CHART_IDS.slice()
			};
		},

		/**
		 * Get all saved dashboards.
		 * Returns an array of { id, name, filter, timelineMode, pathogenField, createdAt }.
		 */
		getSavedDashboards: function ()
		{
			var data = _getOrInit();
			return data.savedDashboards || [];
		},

		/**
		 * Save a new dashboard configuration.
		 * @param {string} name - user-provided name
		 * @param {string} filter - the RQL filter query
		 * @param {Object} hints - { timelineMode, pathogenField } (optional, will auto-detect if omitted)
		 * @returns {Object} the saved dashboard object
		 */
		saveDashboard: function (name, filter, hints)
		{
			var data = _getOrInit();

			var detected = this.detectDisplayHints(filter);
			var dashboard = {
				id: "sd_" + Date.now(),
				name: name,
				filter: filter,
				timelineMode: (hints && hints.timelineMode) || detected.timelineMode,
				pathogenField: (hints && hints.pathogenField) || detected.pathogenField,
				createdAt: Date.now()
			};

			data.savedDashboards.push(dashboard);
			_write(data);
			return dashboard;
		},

		/**
		 * Delete a saved dashboard by ID.
		 * @param {string} id
		 * @returns {boolean} true if found and deleted
		 */
		deleteDashboard: function (id)
		{
			var data = _getOrInit();
			var before = data.savedDashboards.length;
			data.savedDashboards = data.savedDashboards.filter(function (d) { return d.id !== id; });
			_write(data);
			return data.savedDashboards.length < before;
		},

		/**
		 * Rename a saved dashboard.
		 * @param {string} id
		 * @param {string} newName
		 * @returns {boolean} true if found and renamed
		 */
		renameDashboard: function (id, newName)
		{
			var data = _getOrInit();
			var dashboard = data.savedDashboards.find(function (d) { return d.id === id; });
			if (dashboard)
			{
				dashboard.name = newName;
				_write(data);
				return true;
			}
			return false;
		},

		/**
		 * Find a saved dashboard by its resolved filter string.
		 * @param {string} filter
		 * @returns {Object|null}
		 */
		findDashboardByFilter: function (filter)
		{
			if (!filter) return null;
			var dashboards = this.getSavedDashboards();
			for (var i = 0; i < dashboards.length; i++)
			{
				if (dashboards[i].filter === filter)
				{
					return dashboards[i];
				}
			}
			return null;
		},

		/**
		 * Auto-detect display hints from a filter query.
		 * @param {string} filter - RQL filter string
		 * @returns {{ timelineMode: string, pathogenField: string }}
		 */
		detectDisplayHints: function (filter)
		{
			if (!filter) return { timelineMode: "bar", pathogenField: "species" };

			var lowerFilter = filter.toLowerCase();
			// Salmonella-specific: use serovar + stacked timeline
			if (lowerFilter.indexOf("salmonella") !== -1)
			{
				return { timelineMode: "stacked", pathogenField: "serovar" };
			}

			return { timelineMode: "bar", pathogenField: "species" };
		},

		/**
		 * Check if a dashboard name already exists.
		 * @param {string} name
		 * @returns {boolean}
		 */
		nameExists: function (name)
		{
			var dashboards = this.getSavedDashboards();
			var lowerName = name.toLowerCase().trim();
			return dashboards.some(function (d)
			{
				return d.name.toLowerCase().trim() === lowerName;
			});
		}
	};
});
