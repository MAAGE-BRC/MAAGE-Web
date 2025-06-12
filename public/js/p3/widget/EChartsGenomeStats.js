define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dojo/dom-construct',
  'dojo/number',
  '../DataAPI'
], function (
  declare, lang,
  _WidgetBase, _TemplatedMixin,
  domConstruct, number,
  DataAPI
) {

  return declare([_WidgetBase, _TemplatedMixin], {
    templateString: '<div class="EChartsGenomeStats"></div>',
    
    query: null,
    
    postCreate: function () {
      this.inherited(arguments);
      this.containerNode = this.domNode;
    },
    
    startup: function () {
      if (this._started) { return; }
      this.inherited(arguments);
      
      if (this.query) {
        this.loadStats();
      }
    },
    
    setQuery: function (query) {
      this.query = query;
      if (this._started) {
        this.loadStats();
      }
    },
    
    loadStats: function () {
      if (!this.query) { return; }
      
      // Show loading state
      this.containerNode.innerHTML = '<div class="loading">Loading statistics...</div>';
      
      // Clean up the query
      var cleanQuery = this.query;
      
      // Remove leading question marks if present
      if (cleanQuery && cleanQuery.charAt(0) === '?') {
        cleanQuery = cleanQuery.substring(1);
      }
      
      // Try simpler facet query first to test
      var statsQuery = cleanQuery + '&facet((field,genome_quality))&limit(1)';
      
      console.log('EChartsGenomeStats loadStats - cleaned query:', cleanQuery);
      console.log('EChartsGenomeStats loadStats - stats query:', statsQuery);
      
      DataAPI.query('genome', statsQuery, {
        accept: 'application/solr+json'
      }).then(
        lang.hitch(this, 'renderStats'),
        lang.hitch(this, 'handleError')
      );
    },
    
    renderStats: function (response) {
      console.log('EChartsGenomeStats renderStats - response:', response);
      
      if (!response) {
        this.handleError({ message: 'No response received' });
        return;
      }
      
      var total = response.response ? response.response.numFound : 0;
      var facets = response.facet_counts ? response.facet_counts.facet_fields : {};
      var stats = response.stats ? response.stats.stats_fields : {};
      
      // Calculate quality distribution from facet array format
      var qualityArray = facets.genome_quality || [];
      var qualityData = {};
      for (var i = 0; i < qualityArray.length; i += 2) {
        qualityData[qualityArray[i]] = qualityArray[i + 1];
      }
      
      var highQuality = (qualityData.High || 0) + (qualityData.Good || 0);
      
      // For now, use simplified stats display
      var html = '<div class="stats-grid">';
      
      // Total genomes card
      html += this.createStatCard('Total Genomes', number.format(total), 'primary', 'genome-icon');
      
      // High quality genomes card (if we have quality data)
      if (Object.keys(qualityData).length > 0) {
        html += this.createStatCard('High Quality', number.format(highQuality), 'success', 'quality-icon');
      }
      
      html += '</div>';
      
      // Add a note about limited stats for now
      html += '<div class="stats-note" style="text-align: center; margin-top: 20px; color: #666;">';
      html += 'Additional statistics will be displayed once data loads successfully.';
      html += '</div>';
      
      this.containerNode.innerHTML = html;
    },
    
    createStatCard: function (label, value, type, icon) {
      return '<div class="stat-card ' + type + '">' +
             '<div class="stat-label">' + label + '</div>' +
             '<div class="stat-value">' + value + '</div>' +
             '</div>';
    },
    
    formatGenomeSize: function (bytes) {
      if (!bytes || bytes === 0) return '0 bp';
      
      var sizes = ['bp', 'Kb', 'Mb', 'Gb'];
      var i = 0;
      var size = bytes;
      
      while (size >= 1000 && i < sizes.length - 1) {
        size /= 1000;
        i++;
      }
      
      return size.toFixed(1) + ' ' + sizes[i];
    },
    
    handleError: function (error) {
      console.error('Error loading statistics:', error);
      this.containerNode.innerHTML = '<div class="error">Error loading statistics</div>';
    }
  });
});