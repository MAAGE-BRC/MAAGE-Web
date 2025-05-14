define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dijit/_WidgetBase', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/GenomeListOverview.html',
  './ReferenceGenomeSummary', './GenomeMetaSummary',
  './AMRPanelMetaSummary', './SpecialtyGeneSummary',
  './ECDoughnut'
], function (
  declare, lang,
  WidgetBase, Templated, WidgetsInTemplateMixin,
  Template,
  ReferenceGenomeSummary, GenomeMetaSummary,
  AMRPanelMetaSummary, SpecialtyGeneSummary,
  ECDoughnut
) {
  return declare([WidgetBase, Templated, WidgetsInTemplateMixin], {
    baseClass: 'GenomeListOverview',
    templateString: Template,
    apiServiceUrl: window.App.dataServiceURL,
    query: null,

    startup: function() {
      if (this._started) return;
      this.inherited(arguments);
      
      if (this.query) this.set('query', this.query);
    },

    _setQueryAttr: function(query) {
      this.query = query;
      
      // Propagate query to child widgets
      ['rgSummaryWidget', 'gmSummaryWidget', 'apmSummaryWidget', 
       'spgSummaryWidget', 'isolationSourceWidget'].forEach(widget => {
        if (this[widget]) this[widget].set('query', query);
      });
      
      if (this.isolationSourceWidget) {
        this.isolationSourceWidget.set('chartTitle', 'Isolation Sources');
        this.isolationSourceWidget.set('facetField', 'isolation_source');
      }
    },

    _setStateAttr: function(state) {
      this._set('state', state);
      if (state.search) this.set('query', state.search);
    }
  });
});