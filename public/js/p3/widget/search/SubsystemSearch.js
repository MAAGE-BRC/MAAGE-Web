define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-class',
  'dojo/on',
  './SearchBase',
  'dojo/text!./templates/SubsystemSearchNew.html',
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
    searchAppName: 'Subsystem Search',
    pageTitle: 'Subsystem Search | MAAGE',
    dataKey: 'subsystem',
    resultUrlBase: '/view/SubsystemList/?',
    resultUrlHash: '#view_tab',
    baseClass: 'SubsystemSearchModern',
    
    postCreate: function () {
      // Build the stores for dropdown widgets
      this.pathogenGroupNode.set('store', pathogenGroupStore)
      storeBuilder('subsystem_ref', 'subsystem_id').then(lang.hitch(this, (store) => {
        this.subsystemIDNode.set('store', store)
      }))
      storeBuilder('subsystem_ref', 'subsystem_name').then(lang.hitch(this, (store) => {
        this.subsystemNameNode.set('store', store)
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

      // subsystem specific search
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

      const subsystemIDValue = this.subsystemIDNode.get('value')
      if (subsystemIDValue !== '') {
        queryArr.push(`eq(subsystem_id,"${sanitizeInput(subsystemIDValue)}")`)
      }

      const subsystemNameValue = this.subsystemNameNode.get('value')
      if (subsystemNameValue !== '') {
        queryArr.push(`eq(subsystem_name,"${sanitizeInput(subsystemNameValue)}")`)
      }

      const subsystemRoleValue = this.subsystemRoleNode.get('value')
      if (subsystemRoleValue !== '') {
        queryArr.push(`eq(subsystem_role,"${TextInputEncoder(sanitizeInput(subsystemRoleValue))}")`)
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
