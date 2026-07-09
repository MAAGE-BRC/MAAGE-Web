define([
  'dojo/_base/declare',
  'dojo/dom-class',
  './FilterContainerActionBar'
], function (
  declare,
  domClass,
  FilterContainerActionBar
) {
  return declare([FilterContainerActionBar], {
    style: 'height: 116px; margin:0px; padding:0px; overflow: hidden;',
    minimized: false,

    postCreate: function () {
      this.inherited(arguments);

      domClass.add(this.domNode, 'DashboardFilterActionBar');

      if (this.smallContentNode) {
        domClass.add(this.smallContentNode, 'dashboardFilterToolbar');
      }

      if (this.filterWidget) {
        domClass.add(this.filterWidget, 'dashboardFacetPanel');
      }

      if (this.leftButtons) {
        domClass.add(this.leftButtons, 'dashboardFilterLeft');
      }

      if (this.centerButtons) {
        domClass.add(this.centerButtons, 'dashboardFilterCenter');
      }

      if (this.rightButtons) {
        domClass.add(this.rightButtons, 'dashboardFilterRight');
      }

      if (this._actions && this._actions.ToggleFilters) {
        domClass.add(this._actions.ToggleFilters.button, 'dijitHidden');
      }
    },

    startup: function () {
      this.inherited(arguments);
      this.set('minimized', false);
    }
  });
});
