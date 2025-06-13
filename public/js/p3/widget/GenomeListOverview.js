define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/on', 'dojo/dom-class', 'dojo/request', 'dojo/dom-construct',
  'dijit/_WidgetBase', 'dijit/_WidgetsInTemplateMixin', 'dijit/_TemplatedMixin',
  './EChartsGenomeStats',
  './IsolationSourceBarChart',
  './GenomeQualityPieChart',
  './GenomeYearDistributionChart',
  './HostOrganismQualityStackedChart',
  'dojo/text!./templates/GenomeListOverview.html'

], function (
  declare, lang,
  on, domClass, xhr, domConstruct,
  WidgetBase, _WidgetsInTemplateMixin, Templated,
  GenomeStats, IsolationSourceBarChart, GenomeQualityPieChart, GenomeYearDistributionChart,
  HostOrganismQualityStackedChart,
  Template
) {

  return declare([WidgetBase, Templated, _WidgetsInTemplateMixin], {
    baseClass: 'GenomeListOverview',
    disabled: false,
    templateString: Template,
    apiServiceUrl: window.App.dataAPI,
    state: null,
    genome_ids: null,
    isGenomeGroup: false,
    
    // Widget references
    statsWidget: null,
    barChart: null,
    pieChart: null,
    yearChart: null,
    stackedChart: null,

    constructor: function (opts) {
      this.isGenomeGroup = opts && opts.isGenomeGroup || false;
      this.inherited(arguments);
    },
    
    postCreate: function () {
      this.inherited(arguments);
      
      // Create stats widget
      this.statsWidget = new GenomeStats({});
      domConstruct.place(this.statsWidget.domNode, this.statsContainer);
      
      // Create bar chart
      this.barChart = new IsolationSourceBarChart({});
      domConstruct.place(this.barChart.domNode, this.barChartContainer);
      
      // Create pie chart
      this.pieChart = new GenomeQualityPieChart({});
      domConstruct.place(this.pieChart.domNode, this.pieChartContainer);
      
      // Create year distribution chart
      this.yearChart = new GenomeYearDistributionChart({});
      domConstruct.place(this.yearChart.domNode, this.yearChartContainer);
      
      // Create stacked chart
      this.stackedChart = new HostOrganismQualityStackedChart({});
      domConstruct.place(this.stackedChart.domNode, this.stackedChartContainer);
      
    },

    _setStateAttr: function (state) {
      this._set('state', state);
      

      if (state && state.search) {
        var search = state.search;
        
        
        // Remove leading question mark if present
        if (search.charAt(0) === '?') {
          search = search.substring(1);
        }
        
        // Fix malformed genome list queries
        // Convert "eq(*,*)&genome(in(genome_id,(...)))" to "in(genome_id,(...))"
        var genomeMatch = search.match(/^eq\(\*,\*\)&genome\((in\(genome_id,\([^)]+\)\))\)$/);
        if (genomeMatch) {
          search = genomeMatch[1];
        }
        
        
        // Store the query for later use
        this.currentQuery = search;
        
        // Update widgets with the cleaned query
        if (this.statsWidget) {
          this.statsWidget.setQuery(search);
        }
        if (this.barChart) {
          this.barChart.setQuery(search);
        }
        if (this.pieChart) {
          this.pieChart.setQuery(search);
        }
        if (this.yearChart) {
          this.yearChart.setQuery(search);
        }
        if (this.stackedChart) {
          this.stackedChart.setQuery(search);
        }
      }
    },
    
    onShow: function() {
      // Called when the overview tab becomes visible
      if (this.barChart) {
        this.barChart.resize();
      }
      if (this.pieChart) {
        this.pieChart.resize();
      }
      if (this.yearChart) {
        this.yearChart.resize();
      }
      if (this.stackedChart) {
        this.stackedChart.resize();
      }
    },
    
    resize: function() {
      this.inherited(arguments);
      if (this.barChart) {
        this.barChart.resize();
      }
      if (this.pieChart) {
        this.pieChart.resize();
      }
      if (this.yearChart) {
        this.yearChart.resize();
      }
      if (this.stackedChart) {
        this.stackedChart.resize();
      }
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      
      
      // Startup widgets
      if (this.statsWidget) {
        this.statsWidget.startup();
      }
      if (this.barChart) {
        this.barChart.startup();
      }
      if (this.pieChart) {
        this.pieChart.startup();
      }
      if (this.yearChart) {
        this.yearChart.startup();
      }
      if (this.stackedChart) {
        this.stackedChart.startup();
      }
      
      // If we have state already, set it
      if (this.state) {
        this._setStateAttr(this.state);
      }
    }
  });
});