define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/dom-style',
  'dojo/query',
  'dojo/on',
  'dijit/_WidgetBase',
  'dijit/layout/ContentPane',
  '../../WorkspaceManager',
  '../Uploader',
  '../WorkspaceObjectSelector'
], function (
  declare,
  lang,
  domConstruct,
  domStyle,
  query,
  on,
  WidgetBase,
  ContentPane,
  WorkspaceManager,
  Uploader,
  WorkspaceObjectSelector
) {
  return declare([WidgetBase], {
    baseClass: 'App',
    style: 'width: 100%; height: 100%; overflow: auto;',

    buildRendering: function () {
      this.inherited(arguments);
      domStyle.set(this.domNode, { width: '100%', height: '100%', overflowY: 'auto' });
    },

    postCreate: function () {
      this.inherited(arguments);

      var userId = WorkspaceManager.userId || (window.App.user && window.App.user.id);
      var defaultPath = '/' + userId + '/home';

      // ---- Outer shell matching the PanelForm / appTemplate structure ----
      var form = domConstruct.create('div', { 'class': 'PanelForm App' }, this.domNode);
      var appTemplate = domConstruct.create('div', { 'class': 'appTemplate' }, form);

      // ---- Title block ----
      var appTitle = domConstruct.create('div', { 'class': 'appTitle' }, appTemplate);
      domConstruct.create('span', { 'class': 'breadcrumb', innerHTML: 'Services' }, appTitle);
      domConstruct.create('h1', {
        'class': 'appHeader',
        innerHTML: 'Upload Files'
      }, appTitle);
      domConstruct.create('p', {
        innerHTML: 'Upload sequencing reads or assembled genome files to your MAAGE workspace. ' +
          'Select a destination folder, then choose files from your computer or drag and drop them into the upload area.'
      }, appTitle);

      // ---- Form fields container ----
      var fieldsContainer = domConstruct.create('div', { 'class': 'formFieldsContainer' }, appTemplate);

      // ---- Destination folder box ----
      var folderBox = domConstruct.create('div', {
        'class': 'appBox appShadow',
        style: 'width: 500px; margin-bottom: 16px;'
      }, fieldsContainer);

      domConstruct.create('div', {
        'class': 'headerrow',
        innerHTML: '<label class="appBoxLabel">Upload Folder</label>'
      }, folderBox);

      var folderRow = domConstruct.create('div', { 'class': 'appRow' }, folderBox);

      this._folderSelector = new WorkspaceObjectSelector({
        type: ['folder'],
        multi: false,
        autoSelectCurrent: true,
        selectionText: 'Destination',
        style: 'width: 450px;'
      });
      this._folderSelector.set('value', defaultPath);
      domConstruct.place(this._folderSelector.domNode, folderRow);

      // ---- Uploader widget box ----
      var uploadBox = domConstruct.create('div', {
        'class': 'appBox appShadow',
        style: 'width: 700px;'
      }, fieldsContainer);

      domConstruct.create('div', {
        'class': 'headerrow',
        innerHTML: '<label class="appBoxLabel">Select Files</label>'
      }, uploadBox);

      this._uploader = new Uploader({
        path: defaultPath,
        multiple: true,
        types: ['reads', 'contigs']
      });

      domConstruct.place(this._uploader.domNode, uploadBox);

      // Reduce the DnD zone vertical padding
      var dndZone = query('#dnd-zone', this._uploader.domNode)[0];
      if (dndZone) {
        domStyle.set(dndZone, 'padding', '18px 85px');
      }

      // Hide the uploader's own path header and cancel button
      if (this._uploader.destinationPath && this._uploader.destinationPath.parentNode) {
        domStyle.set(this._uploader.destinationPath.parentNode, 'display', 'none');
      }
      if (this._uploader.cancelButton) {
        domStyle.set(this._uploader.cancelButton.domNode, 'display', 'none');
      }

      // Sync folder selector → uploader path via onChange (watch doesn't fire for WorkspaceObjectSelector)
      on(this._folderSelector, 'change', lang.hitch(this, function (newVal) {
        if (newVal) {
          this._uploader.set('path', newVal);
        }
      }));
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);

      if (this._folderSelector && this._folderSelector.startup) {
        this._folderSelector.startup();
      }
      if (this._uploader && this._uploader.startup) {
        this._uploader.startup();
      }

      // Re-hide after startup once all domNodes are fully rendered
      if (this._uploader && this._uploader.cancelButton) {
        domStyle.set(this._uploader.cancelButton.domNode, 'display', 'none');
      }
      if (this._uploader && this._uploader.destinationPath && this._uploader.destinationPath.parentNode) {
        domStyle.set(this._uploader.destinationPath.parentNode, 'display', 'none');
      }
    },

    destroy: function () {
      if (this._folderSelector && this._folderSelector.destroyRecursive) {
        this._folderSelector.destroyRecursive();
      }
      if (this._uploader && this._uploader.destroyRecursive) {
        this._uploader.destroyRecursive();
      }
      this.inherited(arguments);
    }
  });
});
