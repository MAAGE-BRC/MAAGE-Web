define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/on',
  'dojo/topic',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/GenomeListOverview.html',
  'p3/store/GenomeJsonRest'
], function (
  declare, lang, on, Topic,
  WidgetBase, Templated, WidgetsInTemplate,
  template, GenomeJsonRest
)
{
  return declare([WidgetBase, Templated, WidgetsInTemplate], {
    baseClass: 'GenomeListOverview',
    templateString: template,

    query: null,
    state: null,

    constructor: function ()
    {
      this.genomeStore = new GenomeJsonRest();
    },

    postCreate: function ()
    {
      this.inherited(arguments);

      this.setupEventHandlers();
    },

    startup: function ()
    {
      if (this._started)
      {
        return;
      }
      this.inherited(arguments);

      this.initializeDashboard();
    },

    set: function (attr, val)
    {
      if (attr === 'state')
      {
        this._set('state', val);
        this.updateDashboard();
      } else if (attr === 'query')
      {
        this._set('query', val);
        this.updateDashboard();
      }
      this.inherited(arguments);
    },

    setupEventHandlers: function ()
    {

      this.own(
        Topic.subscribe('/select', lang.hitch(this, function (selection)
        {

        }))
      );
    },

    initializeDashboard: function ()
    {
      console.log('Initializing GenomeListOverview dashboard...');

      this.loadDashboardData();
    },

    loadDashboardData: function ()
    {
      if (!this.query)
      {
        console.log('No query set, using default');

      }

    },

    updateDashboard: function ()
    {
      console.log('Updating dashboard with new state/query');
      this.loadDashboardData();
    },

    destroy: function ()
    {

      this.inherited(arguments);
    }
  });
});