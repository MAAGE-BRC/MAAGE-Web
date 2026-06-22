define([
  'dojo/_base/declare',
  'dijit/layout/BorderContainer',
  '../GenomeGridContainer'
], function (
  declare,
  BorderContainer,
  GenomeGridContainer
) {
  return declare([BorderContainer], {
    gutters: false,
    liveSplitters: false,
    style: 'width: 100%; height: 100%;',

    postCreate: function () {
      this.inherited(arguments);

      this._grid = new GenomeGridContainer({
        region: 'center',
        title: 'My Genomes',
        visible: true,
        enableFilterPanel: true,
        showAutoFilterMessage: false,
        state: {
          search: '',
          hashParams: {
            filter: 'eq(public,false)',
            defaultSort: '-date_inserted'
          }
        }
      });

      this.addChild(this._grid);
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      if (this._grid && this._grid.startup) {
        this._grid.startup();
      }
    },

    resize: function () {
      this.inherited(arguments);
      if (this._grid && this._grid.resize) {
        this._grid.resize();
      }
    },

    destroy: function () {
      if (this._grid && this._grid.destroyRecursive) {
        this._grid.destroyRecursive();
        this._grid = null;
      }
      this.inherited(arguments);
    }
  });
});
