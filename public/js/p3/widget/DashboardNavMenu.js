define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/on",
	"dojo/when",
	"dojo/dom-construct",
	"dojo/topic",
	"dijit/TooltipDialog",
	"dijit/popup",
	"p3/util/DashboardStorage"
], function (
	declare,
	lang,
	on,
	when,
	domConstruct,
	Topic,
	TooltipDialog,
	Popup,
	DashboardStorage
)
{
	// Built-in preset definitions (same as DashboardContainer PRESETS)
	var PRESETS = [
		{
			id: "midwest-amr",
			title: "Midwest AMR Monitoring",
			description: "Midwest region genomic surveillance",
			filter: "and(eq(collection_year,YEAR_CURRENT),in(state_province,(Illinois,Indiana,Iowa,Kansas,Michigan,Minnesota,Missouri,Nebraska,%22North%20Dakota%22,Ohio,%22South%20Dakota%22,Wisconsin)))"
		},
		{
			id: "us-amr",
			title: "US AMR Monitoring",
			description: "United States genomic surveillance",
			filter: "and(eq(collection_year,YEAR_CURRENT),eq(isolation_country,USA))"
		},
		{
			id: "salmonella-clusters",
			title: "Salmonella Cluster Tracker",
			description: "Salmonella cgMLST cluster tracking",
			filter: "and(gt(collection_year,YEAR_MINUS_2),eq(genus,Salmonella))"
		}
	];

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

	return declare([TooltipDialog], {

		_populated: false,
		_savedSection: null,

		startup: function ()
		{
			this.inherited(arguments);

			// Close dropdown on click (same as p3/widget/TooltipDialog)
			var self = this;
			on(this.domNode, "click", function ()
			{
				Popup.close(self);
			});
		},

		onOpen: function ()
		{
			this.inherited(arguments);
			this._buildMenu();
		},

		_buildMenu: function ()
		{
			// Always rebuild to pick up new saved dashboards
			domConstruct.empty(this.containerNode);
			this._populated = false;
			this._savedSection = null;

			// Built-in presets section
			var presetHeader = domConstruct.create("div", {
				className: "menuHeader maage-menu-header",
				textContent: "Built-in Dashboards"
			}, this.containerNode);

			var self = this;
			PRESETS.forEach(function (preset)
			{
				var item = domConstruct.create("div", {
					className: "maage-nav-item"
				}, self.containerNode);

				var link = domConstruct.create("a", {
					className: "navigationLink maage-nav-link",
					href: "/dashboard/#filter=" + resolveQuery(preset.filter),
					textContent: preset.title
				}, item);
			});

			// Saved dashboards section (async, only if logged in)
			if (DashboardStorage.isLoggedIn())
			{
				// Divider
				this._savedDivider = domConstruct.create("div", {
					style: "height: 0.5px; background-color: #548fa6; margin: 0.6rem 0; display: none;"
				}, this.containerNode);

				this._savedHeader = domConstruct.create("div", {
					className: "menuHeader maage-menu-header",
					textContent: "Saved Dashboards",
					style: "display: none;"
				}, this.containerNode);

				this._savedSection = domConstruct.create("div", {
					style: "display: none;"
				}, this.containerNode);

				when(DashboardStorage.getSavedDashboards(), lang.hitch(this, function (dashboards)
				{
					if (dashboards && dashboards.length > 0)
					{
						this._savedDivider.style.display = "";
						this._savedHeader.style.display = "";
						this._savedSection.style.display = "";

						dashboards.forEach(lang.hitch(this, function (sd)
						{
							var item = domConstruct.create("div", {
								className: "maage-nav-item"
							}, this._savedSection);

							domConstruct.create("a", {
								className: "navigationLink maage-nav-link",
								href: "/dashboard/#filter=" + sd.filter,
								textContent: sd.name
							}, item);
						}));
					}
				}));
			}

			this._populated = true;
		}
	});
});
