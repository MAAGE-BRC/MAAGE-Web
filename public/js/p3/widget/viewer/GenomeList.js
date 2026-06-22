define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/topic', 'dojo/on', 'dojo/dom-construct',
  './TabViewerBase', '../../util/QueryToEnglish', '../../DataAPI',
  '../GenomeListOverview', '../GenomeGridContainer',
  '../AMRPanelGridContainer', '../SequenceGridContainer',
  '../FeatureGridContainer', '../ProteinGridContainer', '../SpecialtyGeneGridContainer', '../ProteinFamiliesContainer',
  '../PathwayGridContainer', '../ExperimentsContainer',  '../SubsystemGridContainer',
  '../SaveDashboardDialog'
], function (
  declare, lang, Topic, on, domConstruct,
  TabViewerBase, QueryToEnglish, DataAPI,
  GenomeListOverview, GenomeGridContainer,
  AMRPanelGridContainer, SequenceGridContainer,
  FeatureGridContainer, ProteinGridContainer, SpecialtyGeneGridContainer, ProteinFamiliesContainer,
  PathwaysContainer, ExperimentsContainer, SubSystemsContainer,
  SaveDashboardDialog
) {

  return declare([TabViewerBase], {
    perspectiveLabel: 'Genome List View',
    perspectiveIconClass: 'icon-selection-GenomeList',
    defaultTab: 'genomes',
    createOverviewPanel: function () {
      return new GenomeListOverview({
        content: 'Genome List Overview',
        title: 'Overview',
        id: this.viewer.id + '_overview'
      });
    },
    onSetState: function (attr, oldVal, state) {
      this.inherited(arguments);
      if (!this.query) {
        this.set('query', state.search);
      } else {
        if (this.query !== state.search && state.search !== '') {
          this.set('query', state.search);
        }
      }
      if (this.state.search === '' && this.query !== '') {
        this.state.search = this.query
      }

      // update genome count on header
      DataAPI.query('genome', state.search, { select: ['genome_id'], limit: 1 })
        .then(lang.hitch(this, (res) => {
          this._set('total_genomes', res.total_items);
        }))

      this.setActivePanelState();
    },
    onSetQuery: function (attr, oldVal, newVal) {
      const q = newVal.split('&').filter(op => op.includes('genome(')).map(op => {
        const part = op.replace('genome(', '')
        return part.substring(0, part.length - 1)
      }).join('')

      const content = QueryToEnglish(q);
      this.queryNode.innerHTML = '<span class="queryModel">Genomes: </span>  ' + content;
    },
    onSetTotalGenomes: function (attr, oldVal, newVal) {
      this.totalCountNode.innerHTML = ' ( ' + newVal + ' Genomes ) ';
    },
    setActivePanelState: function () {
      var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : this.defaultTab;
      var activeTab = this[active];

      if (!activeTab) {
        console.log('ACTIVE TAB NOT FOUND: ', active)
        return;
      }
      const activeQueryState = lang.mixin({}, this.state, { hashParams: lang.mixin({}, this.state.hashParams) })

      activeTab.set('state', activeQueryState)

      if (activeTab) {
        var pageTitle = 'Genome List ' + activeTab.title + ' | BV-BRC';
        if (window.document.title !== pageTitle) {
          window.document.title = pageTitle;
        }
      }
    },
    onSetAnchor: function (evt) {
      console.log('genome list onSetAnchor: ', evt)
      evt.stopPropagation();
      evt.preventDefault();

      var parts = [];
      var q;
      if (this.query) {
        q = (this.query.charAt(0) == '?') ? this.query.substr(1) : this.query;
        if (q != 'keyword(*)') {
          parts.push(q);
        }
      }
      if (evt.filter && evt.filter != 'false') {
        parts.push(evt.filter);
      }

      if (parts.length > 1) {
        q = '?and(' + parts.join(',') + ')';
      } else if (parts.length == 1) {
        q = '?' + parts[0];
      } else {
        q = '';
      }

      var hp;
      if (this.state.hashParams && this.state.hashParams.view_tab) {
        hp = { view_tab: this.state.hashParams.view_tab };
      } else {
        hp = {};
      }

      hp.filter = 'false';

      var l = window.location.pathname + q + '#' + Object.keys(hp).map(function (key) {
        return key + '=' + hp[key];
      }, this).join('&');
      console.log(`navigate to ${l}`)
      Topic.publish('/navigate', { href: l });
    },
    postCreate: function () {
      this.inherited(arguments)

      this.watch('query', lang.hitch(this, 'onSetQuery'))
      this.watch('total_genomes', lang.hitch(this, 'onSetTotalGenomes'))

      // Add "Save as Dashboard" button to the header query row
      this._createSaveDashboardButton();

      this.overview = this.createOverviewPanel()
      this.genomes = new GenomeGridContainer({
        title: 'Genomes',
        id: this.viewer.id + '_genomes',
        state: this.state,
        disable: false
      })

      this.sequences = new SequenceGridContainer({
        title: 'Sequences',
        id: this.viewer.id + '_sequences',
        state: this.state,
        disable: false
      });

      this.amr = new AMRPanelGridContainer({
        title: 'AMR Phenotypes',
        id: this.viewer.id + '_amr',
        disabled: false,
        state: this.state
      });

      this.features = new FeatureGridContainer({
        title: 'Features',
        id: this.viewer.id + '_features',
        disabled: false
      });

      // this.proteins = new ProteinGridContainer({
      //   title: 'Proteins',
      //   id: this.viewer.id + '_proteins',
      //   disabled: false
      // });
      this.specialtyGenes = new SpecialtyGeneGridContainer({
        title: 'Specialty Genes',
        id: this.viewer.id + '_specialtyGenes',
        disabled: false,
        state: this.state
      });
      this.pathways = new PathwaysContainer({
        title: 'Pathways',
        id: this.viewer.id + '_pathways',
        disabled: false
      });

      this.subsystems = new SubSystemsContainer({
        title: 'Subsystems',
        id: this.viewer.id + '_subsystems',
        disabled: false
      });

      // this.proteinFamilies = new ProteinFamiliesContainer({
      //   title: 'Protein Families',
      //   id: this.viewer.id + '_proteinFamilies',
      //   disabled: false
      // });
      // this.experiments = new ExperimentsContainer({
      //   title: 'Experiments',
      //   id: this.viewer.id + '_experiments',
      //   disabled: false,
      //   state: this.state
      // })

      this.viewer.addChild(this.overview)
      this.viewer.addChild(this.genomes)
      this.viewer.addChild(this.amr);
      this.viewer.addChild(this.sequences);
      this.viewer.addChild(this.features);
      // this.viewer.addChild(this.proteins);
      this.viewer.addChild(this.specialtyGenes);
      // this.viewer.addChild(this.proteinFamilies);
      // this.viewer.addChild(this.pathways);
      // this.viewer.addChild(this.subsystems);
      // this.viewer.addChild(this.experiments);
    },

    _createSaveDashboardButton: function () {
      // Only show the save button when logged in (workspace storage requires auth)
      if (!window.App || !window.App.user) return;

      // Find the query row in the header (created by TabViewerBase.postCreate)
      if (!this.totalCountNode || !this.totalCountNode.parentNode) return;

      var queryRow = this.totalCountNode.parentNode;

      this._saveDashboardBtn = domConstruct.create('button', {
        className: 'save-dashboard-header-btn',
        title: 'Save current view as a dashboard',
        style: 'margin-left: 12px; padding: 3px 10px; font-size: 0.75rem; font-weight: 500;'
          + 'color: #2d6a4f; background: #ffffff; border: 1px solid #2d6a4f; border-radius: 4px;'
          + 'cursor: pointer; transition: all 0.15s; vertical-align: middle;',
        innerHTML: '<span class="fa icon-dashboard" style="margin-right: 4px;"></span>Save as Dashboard'
      }, queryRow);

      on(this._saveDashboardBtn, 'mouseover', function () {
        this.style.background = '#2d6a4f';
        this.style.color = '#ffffff';
      });

      on(this._saveDashboardBtn, 'mouseout', function () {
        this.style.background = '#ffffff';
        this.style.color = '#2d6a4f';
      });

      on(this._saveDashboardBtn, 'click', lang.hitch(this, function () {
        var filter = this._buildDashboardFilter();
        if (!filter) return;

        var dlg = new SaveDashboardDialog({
          filter: filter
        });
        dlg.show();
      }));
    },

    _buildDashboardFilter: function () {
      var parts = [];

      if (this.state) {
        var baseSearch = this.state.search || '';
        var baseQuery = baseSearch.replace(/^\?/, '');
        if (baseQuery && baseQuery !== 'keyword(*)') {
          parts.push(baseQuery);
        }

        var hashFilter = (this.state.hashParams && this.state.hashParams.filter) || '';
        if (hashFilter && hashFilter !== 'false') {
          parts.push(hashFilter);
        }
      }

      if (parts.length > 1) {
        return 'and(' + parts.join(',') + ')';
      } else if (parts.length === 1) {
        return parts[0];
      }

      // Fallback
      return (this.query || '').replace(/^\?/, '') || '';
    }
  });
});
