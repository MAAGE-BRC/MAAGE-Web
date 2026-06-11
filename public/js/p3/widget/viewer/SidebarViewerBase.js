define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/on', 'dojo/topic', 'dojo/dom-class', 'dojo/dom-construct',
  'dijit/layout/BorderContainer', 'dijit/layout/ContentPane'
], function (
  declare, lang,
  on, Topic, domClass, domConstruct,
  BorderContainer, ContentPane
) {

  // SidebarViewerBase
  //
  // A reusable two-panel layout with a sidebar "table of contents" on the left
  // and a main content panel on the right. Subclasses declare a `panels` array
  // to define what appears in the sidebar and what gets loaded into the main panel.
  //
  // Usage:
  //   declare([SidebarViewerBase], {
  //     perspectiveLabel: 'My Page',
  //     perspectiveIconClass: 'icon-something',
  //     sidebarTitle: 'Contents',
  //     panels: [
  //       { id: 'overview', title: 'Overview', content: '<h2>Hello</h2>' },
  //       { id: 'myTool',  title: 'My Tool',  widgetClass: 'p3/widget/app/MyTool' }
  //     ]
  //   });
  //
  // Panel entry shape:
  //   id          - unique string identifier (used in URL hash: #view_tab=<id>)
  //   title       - display label in the sidebar
  //   icon        - (optional) CSS class for an icon next to the title
  //   content     - (optional) static HTML string to display in the main panel
  //   widgetClass - (optional) AMD module path to a widget to instantiate in the main panel
  //   description - (optional) short subtitle shown below the title in the sidebar

  return declare([BorderContainer], {
    baseClass: 'SidebarViewer',
    gutters: false,
    liveSplitters: false,
    state: null,
    apiServiceUrl: window.App.dataAPI,

    // -- Subclass configuration properties --
    perspectiveLabel: 'Sidebar Viewer',
    perspectiveIconClass: 'icon-info',
    sidebarTitle: 'Contents',
    panels: [],       // Array of { id, title, icon?, content?, widgetClass?, description? }
    defaultPanel: null, // defaults to first panel id if not set

    // -- Internal state --
    _activePanel: null,
    _activePanelWidget: null,
    _tocItems: null,

    postCreate: function () {
      this.inherited(arguments);
      this._tocItems = {};

      // --- Header (top region) ---
      this.viewHeader = new ContentPane({
        content: '',
        'class': 'breadcrumb',
        region: 'top'
      });

      var headerContent = domConstruct.create('div', { 'class': 'PerspectiveHeader' });
      domConstruct.place(headerContent, this.viewHeader.containerNode, 'last');

      domConstruct.create('i', { 'class': 'fa PerspectiveIcon ' + this.perspectiveIconClass }, headerContent);
      domConstruct.create('div', {
        'class': 'PerspectiveType',
        innerHTML: this.perspectiveLabel
      }, headerContent);

      var queryRow = domConstruct.create('div', { 'class': 'PerspectiveQueryRow' }, headerContent);
      this.queryNode = domConstruct.create('span', { 'class': 'PerspectiveQuery' }, queryRow);
      this.totalCountNode = domConstruct.create('span', {
        'class': 'PerspectiveTotalCount'
      }, queryRow);

      this.addChild(this.viewHeader);

      // --- Sidebar (leading region) ---
      this.sidebarPane = new ContentPane({
        region: 'leading',
        'class': 'SidebarTOC',
        style: 'width: 260px; overflow-y: auto; padding: 0;'
      });

      var sidebarContainer = domConstruct.create('div', {
        'class': 'sidebar-toc-container'
      });

      // Sidebar title
      domConstruct.create('div', {
        'class': 'sidebar-toc-title',
        innerHTML: this.sidebarTitle
      }, sidebarContainer);

      // Sidebar list
      var tocList = domConstruct.create('div', {
        'class': 'sidebar-toc-list'
      }, sidebarContainer);

      // Build TOC items from panels array
      for (var i = 0; i < this.panels.length; i++) {
        var panel = this.panels[i];
        var tocItem = domConstruct.create('div', {
          'class': 'sidebar-toc-item',
          'data-panel-id': panel.id
        }, tocList);

        if (panel.icon) {
          domConstruct.create('i', { 'class': 'sidebar-toc-item-icon ' + panel.icon }, tocItem);
        }

        var tocText = domConstruct.create('div', { 'class': 'sidebar-toc-item-text' }, tocItem);
        domConstruct.create('span', {
          'class': 'sidebar-toc-item-title',
          innerHTML: panel.title
        }, tocText);

        if (panel.description) {
          domConstruct.create('span', {
            'class': 'sidebar-toc-item-desc',
            innerHTML: panel.description
          }, tocText);
        }

        this._tocItems[panel.id] = tocItem;

        on(tocItem, 'click', lang.hitch(this, '_onTocItemClick', panel.id));
      }

      domConstruct.place(sidebarContainer, this.sidebarPane.containerNode, 'last');
      this.addChild(this.sidebarPane);

      // --- Main content panel (center region) ---
      this.mainPanel = new ContentPane({
        region: 'center',
        'class': 'SidebarMainPanel',
        style: 'overflow-y: auto; padding: 0;'
      });
      this.addChild(this.mainPanel);

      // Listen for state changes
      this.watch('state', lang.hitch(this, 'onSetState'));
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);

      // Determine the initial panel from the URL hash or state
      var initialPanel = this.defaultPanel || (this.panels.length > 0 ? this.panels[0].id : null);

      // Check state hash params (set by the router when the page first loads)
      if (this.state && this.state.hashParams && this.state.hashParams.view_tab) {
        var requestedPanel = this.state.hashParams.view_tab;
        if (this._findPanel(requestedPanel)) {
          initialPanel = requestedPanel;
        }
      }

      // Also check the actual URL hash directly (for /app/* routes where
      // the router's populateState may not parse hash params)
      var hash = window.location.hash;
      if (hash) {
        var hashStr = hash.charAt(0) === '#' ? hash.substr(1) : hash;
        var hashParts = hashStr.split('&');
        for (var i = 0; i < hashParts.length; i++) {
          var kv = hashParts[i].split('=');
          if (kv[0] === 'view_tab' && kv[1] && this._findPanel(kv[1])) {
            initialPanel = kv[1];
            break;
          }
        }
      }

      if (initialPanel) {
        this._activatePanel(initialPanel);
      }

      // Listen for browser back/forward to switch panels
      this._popstateHandler = lang.hitch(this, function () {
        var h = window.location.hash;
        if (h) {
          var hs = h.charAt(0) === '#' ? h.substr(1) : h;
          var parts = hs.split('&');
          for (var j = 0; j < parts.length; j++) {
            var pair = parts[j].split('=');
            if (pair[0] === 'view_tab' && pair[1] && this._findPanel(pair[1])) {
              this._activatePanel(pair[1]);
              return;
            }
          }
        }
      });
      on(window, 'popstate', this._popstateHandler);
    },

    onSetState: function (attr, oldState, state) {
      if (!state) {
        return;
      }

      if (state.hashParams && state.hashParams.view_tab) {
        var panelId = state.hashParams.view_tab;
        if (this._findPanel(panelId) && this._activePanel !== panelId) {
          this._activatePanel(panelId);
        }
      }
    },

    _setStateAttr: function (state) {
      this._set('state', state);
    },

    // Handle the `set('params', value)` call from _doNavigation for /app/* routes
    _setParamsAttr: function (value) {
      this._set('params', value);
    },

    _onTocItemClick: function (panelId) {
      if (this._activePanel === panelId) {
        return;
      }

      // Update URL hash for bookmarkability without going through the router.
      // The /app/* route handler doesn't use getState() to parse URLs, so hash
      // fragments would get included in the widget class path. Instead, we update
      // the browser URL directly and activate the panel ourselves.
      var newHash = '#view_tab=' + panelId;
      var newUrl = window.location.pathname + window.location.search + newHash;
      window.history.pushState({}, '', newUrl);

      this._activatePanel(panelId);
    },

    _findPanel: function (panelId) {
      for (var i = 0; i < this.panels.length; i++) {
        if (this.panels[i].id === panelId) {
          return this.panels[i];
        }
      }
      return null;
    },

    _activatePanel: function (panelId) {
      var panel = this._findPanel(panelId);
      if (!panel) {
        return;
      }

      // Update TOC active state
      for (var id in this._tocItems) {
        if (this._tocItems.hasOwnProperty(id)) {
          domClass.remove(this._tocItems[id], 'active');
        }
      }
      domClass.add(this._tocItems[panelId], 'active');

      // Destroy previous panel widget if it exists
      if (this._activePanelWidget && this._activePanelWidget.destroyRecursive) {
        this._activePanelWidget.destroyRecursive();
        this._activePanelWidget = null;
      }

      // Clear main panel
      domConstruct.empty(this.mainPanel.containerNode);

      this._activePanel = panelId;

      if (panel.content) {
        // Static HTML content
        domConstruct.place(domConstruct.toDom(panel.content), this.mainPanel.containerNode, 'only');
        this.mainPanel.resize();
      } else if (panel.widgetClass) {
        // Dynamic widget loading
        var self = this;
        require([panel.widgetClass], function (WidgetCtor) {
          var widget = new WidgetCtor({
            style: 'width: 100%; height: 100%;'
          });
          domConstruct.place(widget.domNode, self.mainPanel.containerNode, 'only');
          widget.startup();
          self._activePanelWidget = widget;
          self.mainPanel.resize();
        });
      }
    },

    destroy: function () {
      if (this._activePanelWidget && this._activePanelWidget.destroyRecursive) {
        this._activePanelWidget.destroyRecursive();
      }
      this.inherited(arguments);
    }
  });
});
