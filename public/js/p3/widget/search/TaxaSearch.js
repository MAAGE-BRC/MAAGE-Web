define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-class',
  'dojo/on',
  './SearchBase',
  'dojo/text!./templates/TaxaSearch.html',
  './TextInputEncoder',
  './FacetStoreBuilder',
], function (
  declare,
  lang,
  domClass,
  on,
  SearchBase,
  template,
  TextInputEncoder,
  storeBuilder,
) {

  function sanitizeInput(str) {
    return str.replace(/\(|\)|\.|\*|\||\[|\]/g, '')
  }

  return declare([SearchBase], {
    templateString: template,
    searchAppName: 'Taxa Search',
    dataKey: 'taxa',
    pageTitle: 'Taxa Search | MAAGE',
    resultUrlBase: '/view/TaxonList/?',
    resultUrlHash: '#view_tab',
    baseClass: 'TaxaSearchModern',
    
    postCreate: function () {
      // Build the store for taxon rank dropdown
      storeBuilder('taxonomy', 'taxon_rank').then(lang.hitch(this, (store) => {
        this.inherited(arguments)
        this.taxonRankNode.store = store
      }))
      
      // Set up additional criteria toggle
      this._setupAdditionalCriteria()
    },

    _setupAdditionalCriteria: function () {
      // Initially hide the "no criteria" message if there are already criteria
      if (this.AdvancedSearchPanel && this.AdvancedSearchPanel.children.length > 0) {
        domClass.add(this.noCriteriaMessage, 'hidden')
      }

      // Handle add criteria button click
      if (this.addCriteriaBtn) {
        on(this.addCriteriaBtn, 'click', lang.hitch(this, function(e) {
          e.preventDefault()
          // This will trigger the inherited advanced search functionality
          if (this.AdvancedSearchPanel && this.AdvancedSearchPanel.addCriterion) {
            this.AdvancedSearchPanel.addCriterion()
            domClass.add(this.noCriteriaMessage, 'hidden')
          }
        }))
      }
    },
    buildQuery: function () {
      let queryArr = []

      const keywordValue = this.keywordNode.get('value')
      if (keywordValue !== '') {
        queryArr.push(`keyword(${TextInputEncoder(sanitizeInput(keywordValue))})`)
      }

      const taxonIDValue = this.taxonIDNode.get('value')
      if (taxonIDValue !== '') {
        queryArr.push(`eq(taxon_id,${sanitizeInput(taxonIDValue)})`)
      }

      const taxonNameValue = this.taxonNameNode.get('value')
      if (taxonNameValue !== '') {
        queryArr.push(`eq(taxon_name,${TextInputEncoder(sanitizeInput(taxonNameValue))})`)
      }

      const taxonRankValue = this.taxonRankNode.get('value')
      if (taxonRankValue !== '') {
        queryArr.push(`eq(taxon_rank,${sanitizeInput(taxonRankValue)})`)
      }

      const advancedQueryArr = this._buildAdvancedQuery()
      if (advancedQueryArr.length > 0) {
        queryArr = queryArr.concat(advancedQueryArr)
      }

      return queryArr.join('&')
    },

    // Override reset to also reset the additional criteria UI
    onReset: function () {
      this.inherited(arguments)
      
      // Show the "no criteria" message again
      if (this.noCriteriaMessage) {
        domClass.remove(this.noCriteriaMessage, 'hidden')
      }
    }
  })
})
