define([], function () {
  
  return {
    /**
     * Normalize isolation source strings to group similar ones together
     * @param {string} source - The raw isolation source string
     * @returns {string} - The normalized isolation source
     */
    normalize: function(source) {
      if (!source) return source;
      
      // Convert to lowercase and trim
      var normalized = source.toLowerCase().trim();
      
      // Handle common variations
      // Blood-related
      if (normalized.match(/whole[\s-]?blood|blood/)) {
        return 'Blood';
      }
      
      // Stool-related
      if (normalized.match(/stool|feces|fecal/)) {
        return 'Stool';
      }
      
      // Urine-related
      if (normalized.match(/urine/)) {
        return 'Urine';
      }
      
      // Water-related
      if (normalized.match(/water/)) {
        return 'Water';
      }
      
      // Poultry-related
      if (normalized.match(/poultry|chicken|bird|avian/)) {
        return 'Poultry';
      }
      
      // Food-related
      if (normalized.match(/food/)) {
        return 'Food';
      }
      
      // Environmental
      if (normalized.match(/environmental|environment/)) {
        return 'Environmental';
      }
      
      // For others, capitalize first letter of each word
      return source.replace(/\b\w/g, function(l) { return l.toUpperCase(); });
    },
    
    /**
     * Check if a source term should be excluded
     * @param {string} source - The isolation source string
     * @returns {boolean} - True if the source should be excluded
     */
    isGenericTerm: function(source) {
      if (!source) return true;
      return source.match(/^(other|misc|miscellaneous|unknown|n\/a|na|not applicable|not available)$/i) !== null;
    }
  };
});