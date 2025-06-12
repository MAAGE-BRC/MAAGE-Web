define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-class',
  'dojo/on',
  './SearchBase',
  'dojo/text!./templates/PathwaySearchNew.html',
  './TextInputEncoder',
  './FacetStoreBuilder',
  './PathogenGroups',
], function (
  declare,
  lang,
  domClass,
  on,
  SearchBase,
  template,
  TextInputEncoder,
  storeBuilder,
  pathogenGroupStore,
) {

  function sanitizeInput(str) {
    return str.replace(/\(|\)|\.|\*|\||\[|\]/g, '')
  }

  return declare([SearchBase], {
    templateString: template,
    searchAppName: 'Pathway Search',
    pageTitle: 'Pathway Search | MAAGE',
    dataKey: 'pathway',
    resultUrlBase: '/view/PathwayList/?',
    resultUrlHash: '#view_tab',
    baseClass: 'PathwaySearchModern',
    
    postCreate: function () {
      // Build the stores for dropdown widgets
      this.pathogenGroupNode.set('store', pathogenGroupStore)
      storeBuilder('pathway_ref', 'pathway_name').then(lang.hitch(this, (store) => {
        this.pathwayNameNode.set('store', store)
      }))
      storeBuilder('pathway_ref', 'pathway_class').then(lang.hitch(this, (store) => {
        this.pathwayClassNode.set('store', store)
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
      let genomeQuery = ''

      // genome metadata
      let genomeQueryArr = []

      const pathogenGroupValue = this.pathogenGroupNode.get('value')
      if (pathogenGroupValue !== '') {
        genomeQueryArr.push(`eq(taxon_lineage_ids,${sanitizeInput(pathogenGroupValue)})`)
      }

      const taxonNameValue = this.taxonNameNode.get('value')
      if (taxonNameValue !== '') {
        genomeQueryArr.push(`eq(taxon_lineage_ids,${sanitizeInput(taxonNameValue)})`)
      }

      if (genomeQueryArr.length > 0) {
        genomeQuery = `genome(${genomeQueryArr.join(',')})`
      }

      // pathway specific search
      const keywordValue = this.keywordNode.get('value')
      if (keywordValue !== '') {
        queryArr.push(`keyword(${TextInputEncoder(sanitizeInput(keywordValue))})`)
      }

      const genomeIDValue = this.genomeIDNode.get('value')
      if (genomeIDValue !== '') {
        queryArr.push(`eq(genome_id,${TextInputEncoder(genomeIDValue)})`)
      }

      const brcIDValue = this.brcIDNode.get('value')
      if (brcIDValue !== '') {
        queryArr.push(`eq(patric_id,${TextInputEncoder(brcIDValue)})`)
      }

      const pathwayIDValue = this.pathwayIDNode.get('value')
      if (pathwayIDValue !== '') {
        queryArr.push(`eq(pathway_id,"${sanitizeInput(pathwayIDValue)}")`)
      }

      const pathwayNameValue = this.pathwayNameNode.get('value')
      if (pathwayNameValue !== '') {
        queryArr.push(`eq(pathway_name,"${TextInputEncoder(sanitizeInput(pathwayNameValue))}")`)
      }

      const pathwayClassValue = this.pathwayClassNode.get('value')
      if (pathwayClassValue !== '') {
        queryArr.push(`eq(pathway_class,"${sanitizeInput(pathwayClassValue)}")`)
      }

      const ecNumberValue = this.ecNumberNode.get('value')
      if (ecNumberValue !== '') {
        queryArr.push(`eq(ec_number,"${sanitizeInput(ecNumberValue)}")`)
      }

      const ecDescriptionValue = this.ecDescriptionNode.get('value')
      if (ecDescriptionValue !== '') {
        queryArr.push(`eq(ec_description,"${TextInputEncoder(sanitizeInput(ecDescriptionValue))}")`)
      }

      const advancedQueryArr = this._buildAdvancedQuery()
      if (advancedQueryArr.length > 0) {
        queryArr = queryArr.concat(advancedQueryArr)
      }

      const query = queryArr.join('&')
      if (genomeQuery !== '') {
        return query + genomeQuery
      } else {
        return query
      }
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
