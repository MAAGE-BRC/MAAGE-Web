define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dijit/_WidgetBase', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/GenomeListOverview.html',
  './ReferenceGenomeSummary', './GenomeMetaSummary',
  './AMRPanelMetaSummary', './SpecialtyGeneSummary',
  './ECDoughnut', './ECBarchart'
], function (
  declare, lang,
  WidgetBase, Templated, WidgetsInTemplateMixin,
  Template,
  ReferenceGenomeSummary, GenomeMetaSummary,
  AMRPanelMetaSummary, SpecialtyGeneSummary,
  ECDoughnut, ECBarchart
) {
  return declare([WidgetBase, Templated, WidgetsInTemplateMixin], {
    baseClass: 'GenomeListOverview',
    templateString: Template,
    apiServiceUrl: window.App.dataServiceURL,
    query: null,

    startup: function () {
      if (this._started) return;
      this.inherited(arguments);

      if (this.query) this.set('query', this.query);
    },

    _setQueryAttr: function (query) {
      this.query = query;

      // Update all widgets with the new query
      [
        'countryWidget', 
        'hostGroupWidget', 
        'yearWidget', 
        'serovarWidget', 
        'amrWidget', 
        'gmSummaryWidget'
      ].forEach(widget => {
        if (this[widget]) this[widget].set('query', query);
      });
    },

    _setStateAttr: function (state) {
      this._set('state', state);
      if (state.search) this.set('query', state.search);
    }
  });
});