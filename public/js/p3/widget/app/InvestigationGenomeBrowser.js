define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/on', 'dojo/dom-construct', 'dojo/dom-style',
  'dijit/_WidgetBase', 'dijit/layout/BorderContainer', 'dijit/layout/ContentPane',
  '../GenomeNameSelector', '../GenomeBrowser'
], function (
  declare, lang,
  on, domConstruct, domStyle,
  WidgetBase, BorderContainer, ContentPane,
  GenomeNameSelector, GenomeBrowser
) {

  // InvestigationGenomeBrowser
  //
  // A wrapper widget that pairs a GenomeNameSelector (autocomplete search)
  // with an embedded GenomeBrowser (JBrowse). The user searches for a genome
  // by name or ID, selects it, and the browser loads that genome.
  //
  // Defaults to E. coli K-12 (511145.12) on first load.

  var DEFAULT_GENOME_ID = '511145.12';
  var DEFAULT_GENOME_LABEL = 'Escherichia coli str. K-12 substr. MG1655';

  // Static counter to ensure unique IDs across JBrowse instances
  // (JBrowse container IDs must be globally unique in the DOM)
  var _instanceCounter = 0;

  return declare([BorderContainer], {
    gutters: false,
    liveSplitters: false,
    style: 'width: 100%; height: 100%;',

    // Internal references
    _genomeBrowser: null,
    _currentGenomeId: null,
    _statusNode: null,

    postCreate: function () {
      this.inherited(arguments);

      // --- Top region: genome selector bar ---
      var selectorPane = new ContentPane({
        region: 'top',
        style: 'padding: 12px 16px; background: #f8f9fa; border-bottom: 1px solid #e0e0e0; overflow: visible;'
      });

      var selectorContainer = domConstruct.create('div', {
        style: 'display: flex; align-items: center; gap: 12px; flex-wrap: wrap;'
      }, selectorPane.containerNode);

      // Label
      domConstruct.create('label', {
        textContent: 'Select Genome:',
        style: 'font-weight: 600; font-size: 14px; color: #333; white-space: nowrap;'
      }, selectorContainer);

      // Selector widget container
      var selectorWrapper = domConstruct.create('div', {
        style: 'flex: 1; min-width: 300px; max-width: 600px;'
      }, selectorContainer);

      this._genomeNameSelector = new GenomeNameSelector({
        style: 'width: 100%;',
        includePrivate: true,
        includeOtherPublic: true,
        placeHolder: 'Search by genome name or ID...'
      });
      domConstruct.place(this._genomeNameSelector.domNode, selectorWrapper);

      // Status text showing currently loaded genome
      this._statusNode = domConstruct.create('span', {
        textContent: 'Loading: ' + DEFAULT_GENOME_LABEL,
        style: 'font-size: 13px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 400px;'
      }, selectorContainer);

      this.addChild(selectorPane);

      // --- Center region: genome browser ---
      this._browserPane = new ContentPane({
        region: 'center',
        style: 'padding: 0; overflow: hidden;'
      });
      this.addChild(this._browserPane);

      // Wire up genome selection
      on(this._genomeNameSelector, 'change', lang.hitch(this, function (genomeId) {
        this._onGenomeSelected(this._genomeNameSelector, genomeId);
      }));

      // Load default genome
      this._loadGenome(DEFAULT_GENOME_ID, DEFAULT_GENOME_LABEL);
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this._genomeNameSelector.startup();
    },

    _onGenomeSelected: function (selectorWidget, genomeId) {
      if (!genomeId || genomeId === this._currentGenomeId) {
        return;
      }

      // Get the display label from the selector item
      var item = selectorWidget.get('item');
      var label = item ? (item.genome_name || genomeId) : genomeId;

      this._loadGenome(genomeId, label);
    },

    _loadGenome: function (genomeId, label) {
      // Destroy existing browser instance (JBrowse doesn't support reconfiguration)
      if (this._genomeBrowser) {
        this._genomeBrowser.destroyRecursive();
        this._genomeBrowser = null;
      }

      // Clear the browser pane
      domConstruct.empty(this._browserPane.containerNode);

      this._currentGenomeId = genomeId;

      // Update status text
      if (this._statusNode) {
        this._statusNode.textContent = 'Viewing: ' + label;
      }

      // Create a new GenomeBrowser instance
      this._genomeBrowser = new GenomeBrowser({
        id: this.id + '_jbrowse_' + (++_instanceCounter),
        style: 'width: 100%; height: 100%;'
      });

      domConstruct.place(this._genomeBrowser.domNode, this._browserPane.containerNode, 'only');
      this._genomeBrowser.startup();
      this._genomeBrowser.set('visible', true);
      this._genomeBrowser.set('state', {
        genome_id: genomeId,
        genome_ids: [genomeId],
        hashParams: {}
      });

      // Trigger a resize so JBrowse calculates its dimensions correctly
      this._resizeBrowser();
    },

    _resizeBrowser: function () {
      if (this._genomeBrowser && this._browserPane) {
        // Defer resize to allow the DOM to settle
        setTimeout(lang.hitch(this, function () {
          if (this._browserPane._contentBox) {
            this._genomeBrowser.resize({
              w: this._browserPane._contentBox.w,
              h: this._browserPane._contentBox.h
            });
          } else {
            this._browserPane.resize();
          }
        }), 100);
      }
    },

    resize: function () {
      this.inherited(arguments);
      this._resizeBrowser();
    },

    destroy: function () {
      if (this._genomeBrowser) {
        this._genomeBrowser.destroyRecursive();
        this._genomeBrowser = null;
      }
      if (this._genomeNameSelector) {
        this._genomeNameSelector.destroyRecursive();
        this._genomeNameSelector = null;
      }
      this.inherited(arguments);
    }
  });
});
