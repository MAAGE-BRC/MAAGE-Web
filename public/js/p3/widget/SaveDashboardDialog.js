define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/on",
	"dojo/when",
	"dojo/dom-construct",
	"dojo/topic",
	"./Confirmation",
	"p3/util/DashboardStorage"
], function (
	declare,
	lang,
	on,
	when,
	domConstruct,
	Topic,
	Confirmation,
	DashboardStorage
)
{
	return declare([Confirmation], {
		title: "Save as Dashboard",
		content: "",
		okLabel: "Save Dashboard",
		cancelLabel: "Cancel",
		closeOnOK: false,

		// The RQL filter query to save
		filter: "",

		// Optional pre-detected display hints
		timelineMode: null,
		pathogenField: null,

		// Optional layout config to save with the dashboard
		layoutConfig: null,

		_nameInput: null,
		_errorNode: null,
		_saving: false,

		postCreate: function ()
		{
			this.inherited(arguments);
			this._buildContent();
		},

		_buildContent: function ()
		{
			var container = domConstruct.create("div", {
				className: "save-dashboard-dialog",
				style: "min-width: 380px;"
			});

			// Login check
			if (!DashboardStorage.isLoggedIn())
			{
				domConstruct.create("div", {
					style: "padding: 16px; color: #dc2626; font-weight: 500;",
					textContent: "You must be logged in to save dashboards."
				}, container);

				domConstruct.place(container, this.containerNode, "first");

				// Disable the OK button
				if (this.okButton)
				{
					this.okButton.set("disabled", true);
				}
				return;
			}

			// Name field
			var nameGroup = domConstruct.create("div", {
				className: "field-group"
			}, container);

			domConstruct.create("label", {
				className: "field-label",
				textContent: "Dashboard Name"
			}, nameGroup);

			this._nameInput = domConstruct.create("input", {
				className: "field-input",
				type: "text",
				placeholder: "e.g., Illinois Salmonella 2025",
				maxLength: 100
			}, nameGroup);

			this._errorNode = domConstruct.create("div", {
				className: "error-msg",
				style: "display: none;"
			}, nameGroup);

			// Query preview
			var queryGroup = domConstruct.create("div", {
				className: "field-group"
			}, container);

			domConstruct.create("label", {
				className: "field-label",
				textContent: "Filter Query"
			}, queryGroup);

			var queryPreview = this.filter || "(no filter)";
			if (queryPreview.length > 200)
			{
				queryPreview = queryPreview.substring(0, 197) + "...";
			}

			domConstruct.create("div", {
				className: "query-preview",
				textContent: queryPreview
			}, queryGroup);

			domConstruct.place(container, this.containerNode, "first");

			// Focus name input after dialog opens
			setTimeout(lang.hitch(this, function ()
			{
				if (this._nameInput) this._nameInput.focus();
			}), 200);

			// Allow Enter key to submit
			on(this._nameInput, "keydown", lang.hitch(this, function (evt)
			{
				if (evt.key === "Enter")
				{
					evt.preventDefault();
					this._onSubmit(evt);
				}
			}));
		},

		_getHints: function ()
		{
			if (this.timelineMode && this.pathogenField)
			{
				return { timelineMode: this.timelineMode, pathogenField: this.pathogenField };
			}
			return DashboardStorage.detectDisplayHints(this.filter);
		},

		onConfirm: function ()
		{
			if (this._saving) return;

			if (!DashboardStorage.isLoggedIn())
			{
				this._showError("You must be logged in to save dashboards.");
				return;
			}

			var name = this._nameInput ? this._nameInput.value.trim() : "";

			// Validate
			if (!name)
			{
				this._showError("Please enter a name for this dashboard.");
				return;
			}

			if (name.length > 100)
			{
				this._showError("Name must be 100 characters or fewer.");
				return;
			}

			if (DashboardStorage.nameExists(name))
			{
				this._showError("A dashboard with this name already exists. Please choose a different name.");
				return;
			}

			// Save (async)
			this._saving = true;
			var hints = this._getHints();
			var layout = this.layoutConfig || DashboardStorage.getDefaultLayout();
			var self = this;

			when(DashboardStorage.saveDashboard(name, this.filter, hints, layout), function (saved)
			{
				self._saving = false;
				self.hideAndDestroy();
				self._showSuccessNotification(saved);
			}, function (err)
			{
				self._saving = false;
				console.error("SaveDashboardDialog: save failed", err);
				self._showError("Failed to save dashboard. Please try again.");
			});
		},

		_showError: function (msg)
		{
			if (this._errorNode)
			{
				this._errorNode.textContent = msg;
				this._errorNode.style.display = "";
			}
			if (this._nameInput)
			{
				this._nameInput.style.borderColor = "#dc2626";
				this._nameInput.focus();
			}
		},

		_showSuccessNotification: function (saved)
		{
			// Create a brief toast-style notification
			var toast = domConstruct.create("div", {
				style: "position: fixed; bottom: 24px; right: 24px; z-index: 10000;"
					+ "background: #ffffff; border: 1px solid #d1d5db; border-radius: 8px;"
					+ "box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 12px 16px;"
					+ "max-width: 360px; font-size: 0.875rem; color: #374151;"
					+ "transition: opacity 0.3s;"
			}, document.body);

			var msgNode = domConstruct.create("div", {
				style: "margin-bottom: 8px; font-weight: 500;"
			}, toast);
			msgNode.textContent = 'Dashboard "' + saved.name + '" saved.';

			var linkNode = domConstruct.create("a", {
				style: "color: #2d6a4f; font-weight: 500; cursor: pointer; text-decoration: underline;",
				textContent: "Open in Dashboard"
			}, toast);

			on(linkNode, "click", function ()
			{
				Topic.publish("/navigate", {
					href: "/view/Dashboard/#filter=" + saved.filter
				});
				domConstruct.destroy(toast);
			});

			// Auto-dismiss after 6 seconds
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
			}, 6000);
		}
	});
});
