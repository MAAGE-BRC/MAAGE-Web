define([
  'dojo/_base/declare',
  'dijit/layout/BorderContainer',
  'dijit/layout/ContentPane',
  'dojo/dom-construct',
  '../search/GenomeSearch'
], function (
  declare,
  BorderContainer,
  ContentPane,
  domConstruct,
  GenomeSearch
) {
  return declare([BorderContainer], {
    gutters: false,
    liveSplitters: false,
    style: 'width: 100%; height: 100%;',

    postCreate: function () {
      this.inherited(arguments);

      this._pane = new ContentPane({
        region: 'center',
        style: 'overflow: auto; padding: 0;'
      });
      this.addChild(this._pane);

      this._search = new GenomeSearch({});
      domConstruct.place(this._search.domNode, this._pane.containerNode);
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      if (this._search && this._search.startup) {
        this._search.startup();
      }
    },

    resize: function () {
      this.inherited(arguments);
      if (this._pane && this._pane.resize) {
        this._pane.resize();
      }
    },

    destroy: function () {
      if (this._search && this._search.destroyRecursive) {
        this._search.destroyRecursive();
        this._search = null;
      }
      this.inherited(arguments);
    }
  });
});
