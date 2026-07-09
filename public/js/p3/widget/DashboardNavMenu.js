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
	var NATIONAL_FILTER = "and(gt(collection_year,YEAR_MINUS_1),eq(isolation_country,USA))";

	var REGIONS = [
		{
			id: "northeast",
			title: "Northeast",
			states: ["Connecticut", "Maine", "Massachusetts", "New Hampshire", "New Jersey", "New York", "Pennsylvania", "Rhode Island", "Vermont"]
		},
		{
			id: "midwest",
			title: "Midwest",
			states: ["Illinois", "Indiana", "Iowa", "Kansas", "Michigan", "Minnesota", "Missouri", "Nebraska", "North Dakota", "Ohio", "South Dakota", "Wisconsin"]
		},
		{
			id: "south",
			title: "South",
			states: ["Alabama", "Arkansas", "Delaware", "District of Columbia", "Florida", "Georgia", "Kentucky", "Louisiana", "Maryland", "Mississippi", "North Carolina", "Oklahoma", "South Carolina", "Tennessee", "Texas", "Virginia", "West Virginia"]
		},
		{
			id: "west",
			title: "West",
			states: ["Alaska", "Arizona", "California", "Colorado", "Hawaii", "Idaho", "Montana", "Nevada", "New Mexico", "Oregon", "Utah", "Washington", "Wyoming"]
		}
	];

	var ALL_STATES = [
		"Alabama", "Alaska", "Arizona", "Arkansas", "California",
		"Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
		"Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
		"Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
		"Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri",
		"Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
		"New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
		"Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
		"South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
		"Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
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

	function encodeStateForQuery(name)
	{
		if (name.indexOf(' ') !== -1)
		{
			return '%22' + name.replace(/ /g, '%20') + '%22';
		}
		return name;
	}

	function buildRegionFilter(states)
	{
		var encoded = states.map(encodeStateForQuery).join(',');
		return "and(gt(collection_year,YEAR_MINUS_1),in(state_province,(" + encoded + ")))";
	}

	function buildStateFilter(state)
	{
		return "and(gt(collection_year,YEAR_MINUS_1),eq(state_province," + encodeStateForQuery(state) + "))";
	}

	return declare([TooltipDialog], {

		_populated: false,
		_savedSection: null,

		startup: function ()
		{
			this.inherited(arguments);

			var self = this;
			on(this.domNode, "click", function (evt)
			{
				// Don't close when clicking a flyout trigger (no href)
				if (evt.target.tagName !== 'A')
				{
					return;
				}
				Popup.close(self);
			});
		},

		onOpen: function ()
		{
			this.inherited(arguments);
			this._buildMenu();
		},

		_buildSubmenuPanel: function (items, hrefFn, titleFn, extraClass)
		{
			var panel = domConstruct.create("div", {
				className: "maage-submenu" + (extraClass ? " " + extraClass : "")
			});

			items.forEach(function (item)
			{
				var subItem = domConstruct.create("div", {
					className: "maage-nav-item"
				}, panel);

				domConstruct.create("a", {
					className: "navigationLink maage-nav-link",
					href: "/view/Dashboard/#filter=" + resolveQuery(hrefFn(item)),
					textContent: titleFn(item)
				}, subItem);
			});

			return panel;
		},

		_buildFlyoutItem: function (label, submenuPanel, container)
		{
			var wrapper = domConstruct.create("div", {
				className: "maage-nav-item maage-has-submenu"
			}, container);

			domConstruct.create("div", {
				className: "maage-nav-link maage-submenu-trigger",
				textContent: label
			}, wrapper);

			domConstruct.place(submenuPanel, wrapper);
		},

		_buildMenu: function ()
		{
			domConstruct.empty(this.containerNode);
			this._populated = false;
			this._savedSection = null;

			// Public Dashboards header
			domConstruct.create("div", {
				className: "menuHeader maage-menu-header",
				textContent: "Public Dashboards"
			}, this.containerNode);

			// National Genomic Surveillance
			var nationalItem = domConstruct.create("div", {
				className: "maage-nav-item"
			}, this.containerNode);

			domConstruct.create("a", {
				className: "navigationLink maage-nav-link",
				href: "/view/Dashboard/#filter=" + resolveQuery(NATIONAL_FILTER),
				textContent: "National Genomic Surveillance"
			}, nationalItem);

			// Regional Genomic Surveillance (flyout)
			var regionalPanel = this._buildSubmenuPanel(
				REGIONS,
				function (region) { return buildRegionFilter(region.states); },
				function (region) { return region.title; }
			);
			this._buildFlyoutItem("Regional Genomic Surveillance", regionalPanel, this.containerNode);

			// State/Local Surveillance (flyout)
			var statePanel = this._buildSubmenuPanel(
				ALL_STATES,
				function (state) { return buildStateFilter(state); },
				function (state) { return state; },
				"maage-submenu-states"
			);
			this._buildFlyoutItem("State Genomic Surveillance", statePanel, this.containerNode);

			// My Dashboards section (async, only if logged in)
			if (DashboardStorage.isLoggedIn())
			{
				this._savedDivider = domConstruct.create("div", {
					style: "height: 0.5px; background-color: #548fa6; margin: 0.6rem 0; display: none;"
				}, this.containerNode);

				this._savedHeader = domConstruct.create("div", {
					className: "menuHeader maage-menu-header",
					textContent: "My Dashboards",
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
								href: "/view/Dashboard/#filter=" + sd.filter,
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
