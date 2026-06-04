define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/request', 'dojo/topic',
  'dojo/dom-class', 'dojo/query', 'dojo/dom-style', 'dojo/text!./templates/GenomeOverview.html', 'dojo/dom-construct',
  'dijit/_WidgetBase', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin', 'dijit/Dialog',
  '../util/PathJoin', './SelectionToGroup', './GenomeFeatureSummary', './DataItemFormatter',
  './ExternalItemFormatter', './DownloadTooltipDialog', 'dijit/form/TextBox', 'dijit/form/Form', './Confirmation',
  './InputList', 'dijit/form/SimpleTextarea', 'dijit/form/DateTextBox', './MetaEditor',
  '../DataAPI', './PermissionEditor', './ServicesTooltipDialog', 'dijit/popup', '../WorkspaceManager', 'dojo/_base/Deferred', './RerunUtility'
], function (
  declare, lang, on, xhr, Topic,
  domClass, domQuery, domStyle, Template, domConstruct,
  WidgetBase, Templated, _WidgetsInTemplateMixin, Dialog,
  PathJoin, SelectionToGroup, GenomeFeatureSummary, DataItemFormatter,
  ExternalItemFormatter, DownloadTooltipDialog, TextBox, Form, Confirmation,
  InputList, TextArea, DateTextBox, MetaEditor,
  DataAPI, PermissionEditor, ServicesTooltipDialog, popup, WorkspaceManager, Deferred, RerunUtility
) {

  return declare([WidgetBase, Templated, _WidgetsInTemplateMixin], {
    baseClass: 'GenomeOverview',
    disabled: false,
    templateString: Template,
    apiServiceUrl: window.App.dataAPI,
    genome: null,
    state: null,
    context: 'bacteria',
    bacteriSummaryWidgets: ['apSummaryWidget', 'gfSummaryWidget', 'spgSummaryWidget'],
    virusSummaryWidgets: ['gfSummaryWidget'],
    docsServiceURL: window.App.docsServiceURL,
    tutorialLink: 'quick_references/organisms_genome/overview.html',

    _setContextAttr: function (context) {
      if (this.context !== context) {
        if (context === 'virus') {
          this.changeToVirusContext()
        } else {
          this.changeToBacteriaContext()
        }
      }

      this.context = context
    },

    _setStateAttr: function (state) {
      this._set('state', state);
      if (state.genome) {
        this.set('genome', state.genome);
      } else {
        domConstruct.empty(this.genomeSummaryNode);
        domConstruct.empty(this.pubmedSummaryNode);
        this.resetOutbreakAssessment();
        domConstruct.place(domConstruct.toDom('<br><h4>Genome not found</h4>'), this.genomeSummaryNode, 'first');
        domConstruct.place(domConstruct.toDom('Not available'), this.pubmedSummaryNode, 'first');
      }
    },
    changeToVirusContext: function () {
      domClass.add(this.spgSummaryWidget.domNode.parentNode, 'hidden');
    },
    changeToBacteriaContext: function () {
      domClass.remove(this.spgSummaryWidget.domNode.parentNode, 'hidden');
    },
    _setGenomeAttr: function (genome) {
      if (this.genome && (this.genome.genome_id == genome.genome_id)) {
        // console.log("Genome ID Already Set")
        return;
      }
      this.genome = genome;
      this._clusterGenomeIds = null;

      this.createOutbreakAssessment(genome);
      this.createSummary(genome);
      this.createPubMed(genome);
      this.createExternalLinks(genome);

      // context sensitive widget update
      const sumWidgets = (this.context === 'bacteria') ? this.bacteriSummaryWidgets : this.virusSummaryWidgets
      sumWidgets.forEach(function (w) {
        if (this[w]) {
          this[w].set('query', 'eq(genome_id,' + this.genome.genome_id + ')');
        }
      }, this);

      // display/hide download button per public status
      if (genome['public']) {
        domStyle.set(domQuery('div.ActionButtonWrapper.btnDownloadGenome')[0], 'display', 'inline-block');
      } else {
        // private, hide button
        domStyle.set(domQuery('div.ActionButtonWrapper.btnDownloadGenome')[0], 'display', 'none');
      }

      // hide share button if genome not owned by user
      if (genome.owner === window.App.user.id) {
        domStyle.set(domQuery('div.ActionButtonWrapper.btnShareGenome')[0], 'display', 'inline-block');
      } else {
        domStyle.set(domQuery('div.ActionButtonWrapper.btnShareGenome')[0], 'display', 'none');
      }
    },

    toRqlValue: function (val) {
      if (val === undefined || val === null || val === '') {
        return '';
      }
      var str = String(val);
      if (/^-?\d+(\.\d+)?$/.test(str)) {
        return str;
      }
      return encodeURIComponent('"' + str.replace(/"/g, '\\"') + '"');
    },

    buildOutbreakFilter: function (genome) {
      var hc10 = this.toRqlValue(genome.cgmlst_hc10);
      var species = this.toRqlValue(genome.species);

      if (!hc10 || !species) {
        return null;
      }

      return 'and(eq(cgmlst_hc10,' + hc10 + '),eq(species,' + species + '))';
    },

    normalizeDateLabel: function (val) {
      if (!val) {
        return null;
      }
      var text = String(val);
      if (text.length >= 10 && text.indexOf('-') > -1) {
        return text.substring(0, 10);
      }
      return text;
    },

    formatDateRange: function (startDate, endDate) {
      var start = this.normalizeDateLabel(startDate);
      var end = this.normalizeDateLabel(endDate);

      if (!start && !end) {
        return 'Not available';
      }
      if (!start) {
        return end;
      }
      if (!end) {
        return start;
      }
      if (start === end) {
        return start;
      }
      return start + ' to ' + end;
    },

    setAssessmentText: function (node, label, value) {
      if (!node) {
        return;
      }

      domConstruct.empty(node);
      domConstruct.create('span', {
        className: 'assessmentAttributeName',
        textContent: label + ': '
      }, node);

      domConstruct.create('span', {
        className: 'assessmentAttributeValue',
        textContent: value || 'Not available'
      }, node);
    },

    resetOutbreakAssessment: function () {
      this.setAssessmentText(this.outbreakCgmlstNode, 'cgMLST Cluster (HC10)', 'Not available');
      this.setAssessmentText(this.outbreakClusterSizeNode, 'Cluster Size', 'Not available');
      this.setAssessmentText(this.outbreakCountriesNode, 'Countries', 'Not available');
      this.setAssessmentText(this.outbreakStatesNode, 'US States', 'Not available');
      this.setAssessmentText(this.outbreakDateRangeNode, 'Date Range', 'Not available');

      if (this.outbreakViewClusterLink) {
        this.outbreakViewClusterLink.removeAttribute('href');
        this.outbreakViewClusterLink.className = 'assessmentAction disabled';
      }
    },

    createOutbreakAssessment: function (genome) {
      this.resetOutbreakAssessment();
      this._clusterGenomeIds = genome && genome.genome_id ? [genome.genome_id] : [];

      if (!genome) {
        return;
      }

      this.setAssessmentText(this.outbreakCgmlstNode, 'cgMLST Cluster (HC10)', genome.cgmlst_hc10 || 'Not available');

      var fallbackCountry = genome.isolation_country || 'Not available';
      this.setAssessmentText(this.outbreakCountriesNode, 'Countries', fallbackCountry);

      var fallbackState = genome.state_province || genome.isolation_country || 'Not available';
      this.setAssessmentText(this.outbreakStatesNode, 'US States', fallbackState);

      var fallbackDate = this.normalizeDateLabel(genome.collection_date) || genome.collection_year || 'Not available';
      this.setAssessmentText(this.outbreakDateRangeNode, 'Date Range', this.formatDateRange(fallbackDate, fallbackDate));

      var outbreakFilter = this.buildOutbreakFilter(genome);

      if (outbreakFilter && this.outbreakViewClusterLink) {
        this.outbreakViewClusterLink.href = '/view/GenomeList/?' + outbreakFilter + '#view_tab=genomes';
        this.outbreakViewClusterLink.className = 'assessmentAction';
      }

      if (!outbreakFilter) {
        return;
      }

      var query = '/?' + outbreakFilter + '&select(genome_id,state_province,isolation_country,collection_date,collection_year)&limit(25000)';

      xhr.get(PathJoin(this.apiServiceUrl, 'genome') + query, {
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(lang.hitch(this, function (genomes) {
        if (!genomes || !genomes.length) {
          return;
        }

        this._clusterGenomeIds = genomes.map(function (g) {
          return g.genome_id;
        }).filter(function (id) {
          return !!id;
        });

        this.setAssessmentText(this.outbreakClusterSizeNode, 'Cluster Size', genomes.length + ' isolates');

        var stateSet = {};
        var countrySet = {};
        var dates = [];

        genomes.forEach(function (g) {
          var state = g.state_province || g.isolation_country;
          if (state) {
            stateSet[state] = true;
          }

          var country = g.isolation_country;
          if (country) {
            countrySet[country] = true;
          }

          var sampleDate = g.collection_date || g.collection_year;
          if (sampleDate) {
            dates.push(String(sampleDate));
          }
        });

        var countries = Object.keys(countrySet).sort();
        if (countries.length) {
          this.setAssessmentText(this.outbreakCountriesNode, 'Countries', countries.slice(0, 5).join(', ') + (countries.length > 5 ? ', ...' : ''));
        }

        var states = Object.keys(stateSet).sort();
        if (states.length) {
          this.setAssessmentText(this.outbreakStatesNode, 'US States', states.slice(0, 5).join(', ') + (states.length > 5 ? ', ...' : ''));
        }

        if (dates.length) {
          dates.sort();
          this.setAssessmentText(this.outbreakDateRangeNode, 'Date Range', this.formatDateRange(dates[0], dates[dates.length - 1]));
        }
      }), function (err) {
        console.error('Error retrieving outbreak assessment data:', err);
      });
    },

    getClusterGenomeIds: function () {
      var def = new Deferred();

      if (this._clusterGenomeIds && this._clusterGenomeIds.length) {
        def.resolve(this._clusterGenomeIds.slice());
        return def;
      }

      if (!this.genome || !this.genome.genome_id) {
        def.resolve([]);
        return def;
      }

      var outbreakFilter = this.buildOutbreakFilter(this.genome);
      if (!outbreakFilter) {
        def.resolve([this.genome.genome_id]);
        return def;
      }

      var query = '/?' + outbreakFilter + '&select(genome_id)&limit(25000)';
      xhr.get(PathJoin(this.apiServiceUrl, 'genome') + query, {
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(lang.hitch(this, function (genomes) {
        var ids = [];
        if (genomes && genomes.length) {
          ids = genomes.map(function (g) {
            return g.genome_id;
          }).filter(function (id) {
            return !!id;
          });
        }

        if (!ids.length && this.genome && this.genome.genome_id) {
          ids = [this.genome.genome_id];
        }

        this._clusterGenomeIds = ids.slice();
        def.resolve(ids);
      }), lang.hitch(this, function () {
        def.resolve(this.genome && this.genome.genome_id ? [this.genome.genome_id] : []);
      }));

      return def;
    },

    saveTempGenomeGroup: function (genomeIds) {
      var def = new Deferred();

      if (!genomeIds || !genomeIds.length) {
        def.resolve(null);
        return def;
      }

      var hiddenGroupPath = WorkspaceManager.getDefaultFolder() + '/home/._tmp_groups';
      var groupName = 'tmp_cluster_group_' + Date.now();
      var groupPath = hiddenGroupPath + '/' + groupName;

      WorkspaceManager.createFolder(hiddenGroupPath).then(function () {
        WorkspaceManager.createGroup(groupName, 'genome_group', hiddenGroupPath, 'genome_id', genomeIds).then(function () {
          def.resolve(groupPath);
        }, function () {
          def.resolve(null);
        });
      }, function () {
        WorkspaceManager.createGroup(groupName, 'genome_group', hiddenGroupPath, 'genome_id', genomeIds).then(function () {
          def.resolve(groupPath);
        }, function () {
          def.resolve(null);
        });
      });

      return def;
    },

    onCopyOutbreakSummary: function () {
      if (!this.genome || !navigator.clipboard) {
        return;
      }

      var lines = [
        this.outbreakCgmlstNode ? this.outbreakCgmlstNode.textContent : '',
        this.outbreakClusterSizeNode ? this.outbreakClusterSizeNode.textContent : '',
        this.outbreakCountriesNode ? this.outbreakCountriesNode.textContent : '',
        this.outbreakStatesNode ? this.outbreakStatesNode.textContent : '',
        this.outbreakDateRangeNode ? this.outbreakDateRangeNode.textContent : ''
      ].filter(Boolean);

      navigator.clipboard.writeText(lines.join('\n')).then(function () {
        Topic.publish('/Notification', {
          message: 'Outbreak assessment copied.',
          type: 'message'
        });
      });
    },

    onRunCodonTree: function (evt) {
      if (evt) {
        evt.preventDefault();
      }
      if (!window.App.user || !window.App.user.id) {
        Topic.publish('/login');
        return;
      }

      if (!this.genome) {
        return;
      }

      this.getClusterGenomeIds().then(lang.hitch(this, function (ids) {
        this.saveTempGenomeGroup(ids).then(lang.hitch(this, function (groupPath) {
          if (groupPath) {
            RerunUtility.rerun(JSON.stringify({ genome_groups: [groupPath] }), 'CodonTree', window, Topic);
            return;
          }

          Topic.publish('/Notification', {
            message: 'Unable to create temporary cluster genome group. Opening service without prefill.',
            type: 'warning'
          });
          RerunUtility.rerun(JSON.stringify({ genome_ids: ids || [] }), 'CodonTree', window, Topic);
        }));
      }));
    },

    onRunCoreGenomeMlST: function (evt) {
      if (evt) {
        evt.preventDefault();
      }
      if (!window.App.user || !window.App.user.id) {
        Topic.publish('/login');
        return;
      }

      this.getClusterGenomeIds().then(lang.hitch(this, function (ids) {
        this.saveTempGenomeGroup(ids).then(lang.hitch(this, function (groupPath) {
          if (groupPath) {
            RerunUtility.rerun(JSON.stringify({
              input_genome_group: groupPath,
              select_genomegroup: [groupPath]
            }), 'CoreGenomeMLST', window, Topic);
            return;
          }

          Topic.publish('/Notification', {
            message: 'Unable to create temporary cluster genome group. Opening cgMLST service without prefill.',
            type: 'warning'
          });
          Topic.publish('/navigate', { href: '/app/CoreGenomeMLST', target: 'blank' });
        }));
      }));
    },

    onRunWholeGenomeSNP: function (evt) {
      if (evt) {
        evt.preventDefault();
      }
      if (!window.App.user || !window.App.user.id) {
        Topic.publish('/login');
        return;
      }

      this.getClusterGenomeIds().then(lang.hitch(this, function (ids) {
        this.saveTempGenomeGroup(ids).then(lang.hitch(this, function (groupPath) {
          if (groupPath) {
            RerunUtility.rerun(JSON.stringify({
              input_genome_group: groupPath,
              select_genomegroup: [groupPath]
            }), 'WholeGenomeSNPAnalysis', window, Topic);
            return;
          }

          Topic.publish('/Notification', {
            message: 'Unable to create temporary cluster genome group. Opening wgSNP service without prefill.',
            type: 'warning'
          });
          Topic.publish('/navigate', { href: '/app/WholeGenomeSNPAnalysis', target: 'blank' });
        }));
      }));
    },

    createSummary: function (genome) {
      var self = this;
      domConstruct.empty(self.genomeSummaryNode);

      domConstruct.place(DataItemFormatter(genome, 'genome_data', {}), self.genomeSummaryNode, 'first');

      // if user owns genome, add edit button
      if (window.App.user && genome.owner == window.App.user.id) {
        var editBtn = domConstruct.toDom('<a style="float: right; margin-top: 15px;">' +
          '<i class="icon-pencil"></i> Edit' +
        '</a>');

        on(editBtn, 'click', function () {
          var tableNames = DataItemFormatter(genome, 'genome_meta_table_names', {}),
            spec = DataItemFormatter(genome, 'genome_meta_spec', {});

          var editor = new MetaEditor({
            tableNames: tableNames,
            spec: spec,
            data: genome,
            dataId: genome.genome_id,
            onSuccess: function () {
              // get new genome meta
              xhr.get(PathJoin(self.apiServiceUrl, 'genome', genome.genome_id), {
                headers: {
                  accept: 'application/json',
                  'X-Requested-With': null,
                  Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
              }).then(lang.hitch(this, function (genome) {
                self.createSummary(genome);

                // notify user
                Topic.publish('/Notification', {
                  message: 'genome metadata updated',
                  type: 'message'
                });
              }));

            }
          });
          editor.startup();
          editor.show();
        });
        domConstruct.place(editBtn, this.genomeSummaryNode, 'first');
      }
    },

    createExternalLinks: function (genome) {
      domConstruct.empty(this.externalLinkNode);

      // BEI Resources
      var linkBEI = 'https://www.beiresources.org/Catalog.aspx?f_instockflag=In+Stock%23~%23Temporarily+Out+of+Stock&q=' + genome.genome_name;
      var string = domConstruct.create('a', {
        href: linkBEI,
        innerHTML: 'BEI Resources',
        target: '_blank'
      }, this.externalLinkNode);
      domConstruct.place('<br>', string, 'after');
    },

    createPubMed: function (genome) {
      domConstruct.empty(this.pubmedSummaryNode);
      domConstruct.place(ExternalItemFormatter(genome, 'pubmed_data', {}), this.pubmedSummaryNode, 'first');
    },

    onAddGenome: function () {
      if (!window.App.user || !window.App.user.id) {
        Topic.publish('/login');
        return;
      }

      var dlg = new Dialog({ title: 'Add This Genome To Group' });
      var stg = new SelectionToGroup({
        selection: [this.genome],
        type: 'genome_group'
      });
      on(dlg.domNode, 'dialogAction', function () {
        dlg.hide();
        setTimeout(function () {
          dlg.destroy();
        }, 2000);
      });
      domConstruct.place(stg.domNode, dlg.containerNode, 'first');
      stg.startup();
      dlg.startup();
      dlg.show();
    },

    onShareGenome: function () {
      if (!window.App.user || !window.App.user.id) {
        Topic.publish('/login');
        return;
      }

      var self = this;

      var initialPerms = DataAPI.solrPermsToObjs([this.genome]);

      var onConfirm = function (newPerms) {
        var ids = [self.genome.genome_id];

        Topic.publish('/Notification', {
          message: "<span class='default'>Updating permissions (this could take several minutes)...</span>",
          type: 'default',
          duration: 50000
        });

        DataAPI.setGenomePermissions(ids, newPerms).then(function (res) {
          self.refreshSummary();

          Topic.publish('/Notification', {
            message: 'Permissions updated.',
            type: 'message'
          });

        }, function (err) {
          console.log('error', err);
          Topic.publish('/Notification', {
            message: 'Failed. ' + err.response.status,
            type: 'error'
          });
        });
      };

      var permEditor = new PermissionEditor({
        selection: [this.genome],
        onConfirm: onConfirm,
        user: window.App.user.id || '',
        useSolrAPI: true,
        permissions: initialPerms
      });

      permEditor.show();

    },

    refreshSummary: function () {
      xhr.get(PathJoin(this.apiServiceUrl, 'genome', this.genome.genome_id), {
        headers: {
          accept: 'application/json',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(lang.hitch(this, function (genome) {
        this.createSummary(genome);
      }), lang.hitch(this, function (error) {
        console.log('error fetching genome', error);
      }));
    },

    onDownload: function () {
      popup.open({
        popup: new DownloadTooltipDialog({
          selection: [this.genome],
          containerType: 'genome_data',
          isGenomeOverview: true
        }),
        parent: this,
        around: this.genomeDownloadButton,
        orient: ['below']
      });
    },

    onClickUserGuide: function () {
      window.open(PathJoin(this.docsServiceURL, this.tutorialLink));
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);

      if (this.genome) {
        this.set('genome', this.genome);
      }
    },

    // TODO: ask about default database type
    // TODO: ask about services that require reads
    onGenomeServiceSelection: function () {
      console.log(this.genome);
      if (!this.genome.genome_id) {
        console.log('genome_id not found');
        return;
      }
      if (this.genome.genome_id === '') {
        console.log('genome_id is empty');
        return;
      }
      var data = {};
      data.genome = this.genome;
      data.data_type = 'genome';
      data.multiple = false;
      popup.open({
        popup: new ServicesTooltipDialog({
          context: 'genome_overview',
          data: data,
          multiple: false
        }),
        parent: this,
        around: this.genomeServiceSelectionButton,
        orient: ['below']
      });
    }
  });
});
