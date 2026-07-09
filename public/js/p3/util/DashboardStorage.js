define([
	"dojo/Deferred",
	"dojo/when",
	"p3/WorkspaceManager"
], function (
	Deferred,
	when,
	WorkspaceManager
)
{
	// Canonical chart definitions — order and sizing matches GenomeListOverview (Taxon view).
	// hidden: true means the chart is not shown in the default layout (but can be enabled by the user).
	var DEFAULT_CHARTS = [
		{ id: "summary",         label: "Summary",                hidden: false },
		{ id: "map",             label: "Geographic Distribution", hidden: false },
		{ id: "timeline",        label: "Collection Timeline",    hidden: false },
		{ id: "pathogen",        label: "Serovar",                hidden: false },
		{ id: "host",            label: "Host Distribution",      hidden: false },
		{ id: "isolationSource", label: "Isolation Source",        hidden: false },
		{ id: "genomeQuality",   label: "Genome Quality",         hidden: true },
		{ id: "cluster",         label: "Cluster Summary",        hidden: false },
		{ id: "serovarTimeline", label: "Serovars Over Time",     hidden: true },
		{ id: "hostGroup",       label: "Host Group",             hidden: true },
		{ id: "amr",             label: "AMR Profile",            hidden: false },
		{ id: "recentGenomes",   label: "Recent Genomes",         hidden: false }
	];

	var DEFAULT_CHART_IDS = DEFAULT_CHARTS.map(function (c) { return c.id; });

	// Charts visible by default (those without hidden: true)
	var DEFAULT_VISIBLE_CHART_IDS = DEFAULT_CHARTS.filter(function (c) { return !c.hidden; }).map(function (c) { return c.id; });

	var FOLDER_NAME = ".dashboards";

	// In-memory cache
	var _cache = null;       // Array of dashboard objects, or null if not loaded
	var _cacheLoaded = false;
	var _folderEnsured = false;

	/**
	 * Get the WorkspaceManager singleton (imported as AMD dependency).
	 */
	function _getWM()
	{
		return WorkspaceManager;
	}

	/**
	 * Get the hidden .dashboards folder path for the current user.
	 * Returns null if not logged in.
	 */
	function _getFolderPath()
	{
		var wm = _getWM();
		if (!wm || !wm.userId) return null;
		return "/" + wm.userId + "/home/" + FOLDER_NAME;
	}

	/**
	 * Check if the user is logged in.
	 */
	function _isLoggedIn()
	{
		return !!(window.App && window.App.user);
	}

	/**
	 * Ensure the .dashboards folder exists. Creates it if missing.
	 * Returns a Deferred that resolves when the folder is ready.
	 */
	function _ensureFolder()
	{
		var def = new Deferred();

		if (_folderEnsured)
		{
			def.resolve(true);
			return def;
		}

		var folderPath = _getFolderPath();
		if (!folderPath)
		{
			def.reject(new Error("Not logged in"));
			return def;
		}

		var wm = _getWM();
		when(wm.createFolder(folderPath), function ()
		{
			_folderEnsured = true;
			def.resolve(true);
		}, function (err)
		{
			// Folder likely already exists — that's fine
			_folderEnsured = true;
			def.resolve(true);
		});

		return def;
	}

	/**
	 * Sanitize a dashboard name for use as a workspace object name.
	 * Removes characters that are problematic in workspace paths.
	 */
	function _sanitizeName(name)
	{
		// Remove path separators and leading dots
		return name.replace(/[\/\\]/g, "_").replace(/^\.+/, "").trim();
	}

	/**
	 * Build the full workspace path for a dashboard by name.
	 */
	function _dashboardPath(name)
	{
		var folderPath = _getFolderPath();
		if (!folderPath) return null;
		return folderPath + "/" + _sanitizeName(name);
	}

	/**
	 * Parse dashboard content from workspace object data.
	 * The workspace may return data as string or object.
	 */
	function _parseData(data)
	{
		if (!data) return null;
		if (typeof data === "string")
		{
			try { return JSON.parse(data); }
			catch (e) { return null; }
		}
		return data;
	}

	/**
	 * Load all dashboards from the workspace into cache.
	 * Returns a Deferred that resolves with the array of dashboards.
	 */
	function _loadAll()
	{
		var def = new Deferred();

		if (_cacheLoaded && _cache !== null)
		{
			def.resolve(_cache);
			return def;
		}

		if (!_isLoggedIn())
		{
			_cache = [];
			_cacheLoaded = true;
			def.resolve(_cache);
			return def;
		}

		when(_ensureFolder(), function ()
		{
			var folderPath = _getFolderPath();
			var wm = _getWM();

			// List all objects in .dashboards (showHidden=true since the folder itself is hidden)
			when(wm.getFolderContents(folderPath, true, false), function (items)
			{
				if (!items || items.length === 0)
				{
					_cache = [];
					_cacheLoaded = true;
					def.resolve(_cache);
					return;
				}

				// Fetch full content for each dashboard object
				var paths = items.map(function (item) { return item.path; });
				when(wm.getObjects(paths, false), function (results)
				{
					_cache = [];
					if (results && results.length)
					{
						results.forEach(function (obj)
						{
							var data = _parseData(obj.data);
							if (data && data.name)
							{
								// Attach workspace metadata for path-based operations
								data._wsPath = obj.metadata.path;
								data._wsName = obj.metadata.name;
								_cache.push(data);
							}
						});
					}
					_cacheLoaded = true;
					def.resolve(_cache);
				}, function (err)
				{
					console.warn("DashboardStorage: error loading dashboard contents", err);
					_cache = [];
					_cacheLoaded = true;
					def.resolve(_cache);
				});
			}, function (err)
			{
				console.warn("DashboardStorage: error listing .dashboards folder", err);
				_cache = [];
				_cacheLoaded = true;
				def.resolve(_cache);
			});
		}, function (err)
		{
			console.warn("DashboardStorage: error ensuring folder", err);
			_cache = [];
			_cacheLoaded = true;
			def.resolve(_cache);
		});

		return def;
	}

	return {

		/**
		 * All available chart definitions with id and label.
		 */
		CHART_DEFINITIONS: DEFAULT_CHARTS,

		/**
		 * All chart IDs in default order.
		 */
		DEFAULT_CHART_IDS: DEFAULT_CHART_IDS,

		/**
		 * Chart IDs that are visible by default (excludes hidden charts).
		 */
		DEFAULT_VISIBLE_CHART_IDS: DEFAULT_VISIBLE_CHART_IDS,

		/**
		 * Check if the user is logged in (required for workspace operations).
		 */
		isLoggedIn: function ()
		{
			return _isLoggedIn();
		},

		/**
		 * Get all saved dashboards.
		 * Returns a Deferred that resolves with an array of dashboard objects.
		 * Each dashboard: { name, filter, timelineMode, pathogenField, layout, createdAt, _wsPath, _wsName }
		 */
		getSavedDashboards: function ()
		{
			return _loadAll();
		},

		/**
		 * Save a new dashboard configuration to the workspace.
		 * @param {string} name - user-provided name
		 * @param {string} filter - the RQL filter query
		 * @param {Object} hints - { timelineMode, pathogenField }
		 * @param {Object} layout - { visibleCharts: string[], chartOrder: string[] }
		 * @returns {Deferred} resolves with the saved dashboard object
		 */
		saveDashboard: function (name, filter, hints, layout)
		{
			var def = new Deferred();

			if (!_isLoggedIn())
			{
				def.reject(new Error("Login required to save dashboards"));
				return def;
			}

			var self = this;
			var detected = this.detectDisplayHints(filter);
			var dashboard = {
				name: name,
				filter: filter,
				timelineMode: (hints && hints.timelineMode) || detected.timelineMode,
				pathogenField: (hints && hints.pathogenField) || detected.pathogenField,
				layout: layout || {
					visibleCharts: DEFAULT_VISIBLE_CHART_IDS.slice(),
					chartOrder: DEFAULT_CHART_IDS.slice()
				},
				createdAt: Date.now()
			};

			var sanitizedName = _sanitizeName(name);
			var folderPath = _getFolderPath();

			when(_ensureFolder(), function ()
			{
				var wm = _getWM();
				when(wm.create({
					path: folderPath + "/",
					name: sanitizedName,
					type: "unspecified",
					userMeta: {},
					content: JSON.stringify(dashboard)
				}, false, false), function (meta)
				{
					// Add workspace path info and update cache
					dashboard._wsPath = meta.path;
					dashboard._wsName = meta.name;
					if (_cache)
					{
						_cache.push(dashboard);
					}
					def.resolve(dashboard);
				}, function (err)
				{
					console.error("DashboardStorage: error saving dashboard", err);
					def.reject(err);
				});
			}, function (err)
			{
				def.reject(err);
			});

			return def;
		},

		/**
		 * Update an existing dashboard in the workspace.
		 * @param {Object} dashboard - dashboard object with _wsPath and _wsName
		 * @param {Object} updates - fields to update (merged into existing data)
		 * @returns {Deferred}
		 */
		updateDashboard: function (dashboard, updates)
		{
			var def = new Deferred();

			if (!_isLoggedIn() || !dashboard || !dashboard._wsPath)
			{
				def.reject(new Error("Invalid dashboard or not logged in"));
				return def;
			}

			// Merge updates into dashboard data
			var updated = {};
			var fields = ["name", "filter", "timelineMode", "pathogenField", "layout", "createdAt"];
			fields.forEach(function (f)
			{
				updated[f] = (updates && updates[f] !== undefined) ? updates[f] : dashboard[f];
			});

			var wm = _getWM();
			var meta = {
				path: dashboard._wsPath.substring(0, dashboard._wsPath.lastIndexOf("/") + 1),
				name: dashboard._wsName,
				type: "unspecified",
				userMeta: {}
			};

			when(wm.updateObject(meta, updated), function ()
			{
				// Update cache entry
				if (_cache)
				{
					for (var i = 0; i < _cache.length; i++)
					{
						if (_cache[i]._wsPath === dashboard._wsPath)
						{
							fields.forEach(function (f)
							{
								_cache[i][f] = updated[f];
							});
							break;
						}
					}
				}
				def.resolve(updated);
			}, function (err)
			{
				console.error("DashboardStorage: error updating dashboard", err);
				def.reject(err);
			});

			return def;
		},

		/**
		 * Delete a saved dashboard by its workspace path.
		 * @param {string} wsPath - the full workspace path
		 * @returns {Deferred} resolves with true if deleted
		 */
		deleteDashboard: function (wsPath)
		{
			var def = new Deferred();

			if (!_isLoggedIn() || !wsPath)
			{
				def.reject(new Error("Invalid path or not logged in"));
				return def;
			}

			var wm = _getWM();
			when(wm.deleteObjects([wsPath], false, true), function ()
			{
				// Remove from cache
				if (_cache)
				{
					_cache = _cache.filter(function (d) { return d._wsPath !== wsPath; });
				}
				def.resolve(true);
			}, function (err)
			{
				console.error("DashboardStorage: error deleting dashboard", err);
				def.reject(err);
			});

			return def;
		},

		/**
		 * Rename a saved dashboard.
		 * Since the name is the workspace object name, this requires a copy+delete (move).
		 * @param {Object} dashboard - dashboard object with _wsPath, _wsName
		 * @param {string} newName
		 * @returns {Deferred}
		 */
		renameDashboard: function (dashboard, newName)
		{
			var def = new Deferred();

			if (!_isLoggedIn() || !dashboard || !dashboard._wsPath)
			{
				def.reject(new Error("Invalid dashboard or not logged in"));
				return def;
			}

			var sanitizedNew = _sanitizeName(newName);
			var folderPath = _getFolderPath();
			var oldPath = dashboard._wsPath;
			var newPath = folderPath + "/" + sanitizedNew;
			var self = this;

			// Update the content's name field as well
			var updatedContent = {
				name: newName,
				filter: dashboard.filter,
				timelineMode: dashboard.timelineMode,
				pathogenField: dashboard.pathogenField,
				layout: dashboard.layout,
				createdAt: dashboard.createdAt
			};

			var wm = _getWM();

			// Create new object with updated name, then delete old
			when(wm.create({
				path: folderPath + "/",
				name: sanitizedNew,
				type: "unspecified",
				userMeta: {},
				content: JSON.stringify(updatedContent)
			}, false, false), function (meta)
			{
				// Delete old object
				when(wm.deleteObjects([oldPath], false, true), function ()
				{
					// Update cache
					if (_cache)
					{
						for (var i = 0; i < _cache.length; i++)
						{
							if (_cache[i]._wsPath === oldPath)
							{
								_cache[i].name = newName;
								_cache[i]._wsPath = meta.path;
								_cache[i]._wsName = meta.name;
								break;
							}
						}
					}
					def.resolve(updatedContent);
				}, function (err)
				{
					// New object was created but old wasn't deleted — not ideal but recoverable
					console.warn("DashboardStorage: rename created new but failed to delete old", err);
					def.resolve(updatedContent);
				});
			}, function (err)
			{
				console.error("DashboardStorage: error renaming dashboard", err);
				def.reject(err);
			});

			return def;
		},

		/**
		 * Find a saved dashboard by its filter string.
		 * Requires dashboards to be pre-loaded in cache.
		 * Returns the dashboard object or null (synchronous, uses cache).
		 * Call getSavedDashboards() first to ensure cache is populated.
		 */
		findDashboardByFilter: function (filter)
		{
			if (!filter || !_cache) return null;
			for (var i = 0; i < _cache.length; i++)
			{
				if (_cache[i].filter === filter)
				{
					return _cache[i];
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
		 * Check if a dashboard name already exists (synchronous, uses cache).
		 * Call getSavedDashboards() first to ensure cache is populated.
		 * @param {string} name
		 * @returns {boolean}
		 */
		nameExists: function (name)
		{
			if (!_cache) return false;
			var lowerName = name.toLowerCase().trim();
			return _cache.some(function (d)
			{
				return d.name.toLowerCase().trim() === lowerName;
			});
		},

		/**
		 * Get the default layout configuration (hardcoded defaults).
		 * Used when no saved dashboard is active.
		 * @returns {{ visibleCharts: string[], chartOrder: string[] }}
		 */
		getDefaultLayout: function ()
		{
			return {
				visibleCharts: DEFAULT_VISIBLE_CHART_IDS.slice(),
				chartOrder: DEFAULT_CHART_IDS.slice()
			};
		},

		/**
		 * Invalidate the in-memory cache, forcing a reload on next access.
		 */
		invalidateCache: function ()
		{
			_cache = null;
			_cacheLoaded = false;
		}
	};
});
