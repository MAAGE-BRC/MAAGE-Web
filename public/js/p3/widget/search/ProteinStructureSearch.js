define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-class',
  'dojo/on',
  './SearchBase',
  'dojo/text!./templates/ProteinStructureSearch.html',
  './TextInputEncoder',
  './FacetStoreBuilder'
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
    searchAppName: 'Protein Structure Search',
    pageTitle: 'Protein Structure Search | MAAGE',
    dataKey: 'protein_structure',
    resultUrlBase: '/view/ProteinStructureList/?',
    resultUrlHash: '#view_tab=structures',
    baseClass: 'ProteinStructureSearchModern',
    
    postCreate: function () {
      // Build the stores for dropdown widgets
      storeBuilder('protein_structure', 'method').then(lang.hitch(this, (store) => {
        this.methodNode.set('store', store)
      }))

      this.inherited(arguments)
      
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

      const taxonNameValue = this.taxonNameNode.get('value')
      if (taxonNameValue !== '') {
        queryArr.push(`eq(taxon_lineage_ids,${sanitizeInput(taxonNameValue)})`)
      }

      const pdbIDValue = this.pdbIDNode.get('value')
      if (pdbIDValue !== '') {
        queryArr.push(`eq(pdb_id,${sanitizeInput(pdbIDValue)})`)
      }

      const genomeIDValue = this.genomeIDNode.get('value')
      if (genomeIDValue !== '') {
        queryArr.push(`eq(genome_id,${TextInputEncoder(genomeIDValue)})`)
      }

      const brcIDValue = this.brcIDNode.get('value')
      if (brcIDValue !== '') {
        queryArr.push(`eq(patric_id,${TextInputEncoder(brcIDValue)})`)
      }

      const descriptionValue = this.descriptionNode.get('value')
      if (descriptionValue !== '') {
        queryArr.push(`eq(description,${TextInputEncoder(sanitizeInput(descriptionValue))})`)
      }

      const geneValue = this.geneNode.get('value')
      if (geneValue !== '') {
        queryArr.push(`eq(gene,${TextInputEncoder(sanitizeInput(geneValue))})`)
      }

      const productValue = this.productNode.get('value')
      if (productValue !== '') {
        queryArr.push(`eq(product,${TextInputEncoder(sanitizeInput(productValue))})`)
      }

      const methodValue = this.methodNode.get('value')
      if (methodValue !== '') {
        queryArr.push(`eq(method,${sanitizeInput(methodValue)})`)
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
