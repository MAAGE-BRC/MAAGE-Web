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
      
      // Query for multiple facets - use very simple syntax
      var statsQuery = cleanQuery + 
        '&facet(genome_quality)' +
        '&facet(genome_status)' +
        '&facet(isolation_country)' +
        '&facet(collection_year)' +
        '&limit(1)';
      
      console.log('EChartsGenomeStats loadStats - cleaned query:', cleanQuery);
      console.log('EChartsGenomeStats loadStats - stats query (v2):', statsQuery);
      
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
      
      // Process facet arrays to objects
      var qualityData = this.arrayToObject(facets.genome_quality || []);
      var statusData = this.arrayToObject(facets.genome_status || []);
      var countryData = this.arrayToObject(facets.isolation_country || []);
      var yearData = this.arrayToObject(facets.collection_year || []);
      
      // Calculate metrics
      var highQuality = (qualityData.High || 0) + (qualityData.Good || 0);
      var completeGenomes = statusData.Complete || 0;
      
      // Find top country
      var topCountry = 'Unknown';
      var countryCount = 0;
      for (var country in countryData) {
        if (countryData[country] > countryCount) {
          topCountry = country;
          countryCount = countryData[country];
        }
      }
      
      // Calculate year range
      var years = Object.keys(yearData).filter(function(y) { return y && y !== 'null'; }).sort();
      var yearRange = years.length > 0 ? years[0] + ' - ' + years[years.length - 1] : 'N/A';
      
      // Render the four KPI cards
      var html = '<div class="kpi-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">';
      
      // Card 1: Total Genomes
      html += this.createKPICard(
        'Total Genomes',
        number.format(total),
        'Total number of genomes in this collection',
        '#3498DB',
        'database'
      );
      
      // Card 2: High Quality %
      var qualityPercent = total > 0 ? Math.round((highQuality / total) * 100) : 0;
      html += this.createKPICard(
        'High Quality',
        qualityPercent + '%',
        number.format(highQuality) + ' of ' + number.format(total) + ' genomes',
        '#2ECC71',
        'award'
      );
      
      // Card 3: Complete Genomes
      var completePercent = total > 0 ? Math.round((completeGenomes / total) * 100) : 0;
      html += this.createKPICard(
        'Complete Genomes',
        completePercent + '%',
        number.format(completeGenomes) + ' of ' + number.format(total) + ' genomes',
        '#E74C3C',
        'dna'
      );
      
      // Card 4: Geographic Diversity
      var countryCountTotal = Object.keys(countryData).length;
      html += this.createKPICard(
        'Countries',
        number.format(countryCountTotal),
        'Top: ' + topCountry + ' (' + countryCount + ' genomes)',
        '#F39C12',
        'globe'
      );
      
      html += '</div>';
      
      this.containerNode.innerHTML = html;
    },
    
    arrayToObject: function(arr) {
      var obj = {};
      for (var i = 0; i < arr.length; i += 2) {
        obj[arr[i]] = arr[i + 1];
      }
      return obj;
    },
    
    createKPICard: function(title, value, subtitle, color, icon) {
      var iconSvg = this.getIconSVG(icon);
      
      return '<div class="kpi-card" style="background: white; border-radius: 8px; padding: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); position: relative; overflow: hidden;">' +
        '<div style="position: absolute; top: 20px; right: 20px; opacity: 0.1;">' +
        iconSvg.replace('width="24"', 'width="60"').replace('height="24"', 'height="60"').replace('currentColor', color) +
        '</div>' +
        '<div style="position: relative; z-index: 1;">' +
        '<div style="color: #666; font-size: 14px; margin-bottom: 8px;">' + title + '</div>' +
        '<div style="color: ' + color + '; font-size: 36px; font-weight: bold; margin-bottom: 8px;">' + value + '</div>' +
        '<div style="color: #999; font-size: 12px;">' + subtitle + '</div>' +
        '</div>' +
        '</div>';
    },
    
    getIconSVG: function(type) {
      var icons = {
        database: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>',
        award: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>',
        globe: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
        calendar: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
        dna: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 15c6.667-6 13.333 0 20-6"></path><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"></path><path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"></path><path d="M17 6l-2.5-2.5"></path><path d="M14 8l-1-1"></path><path d="M7 18l2.5 2.5"></path><path d="M3.5 14.5l.5.5"></path><path d="M20 9c-6.667 6-13.333 0-20 6"></path><path d="M2.5 12.5l.5.5"></path><path d="M10 16l1 1"></path></svg>'
      };
      return icons[type] || icons.database;
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