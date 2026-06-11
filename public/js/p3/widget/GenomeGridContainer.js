define([
  'dojo/_base/declare', 'dojo/on', 'dojo/dom-construct',
  'dijit/popup', 'dijit/TooltipDialog',
  './GenomeGrid', './AdvancedSearchFields', './GridContainer',
  '../util/PathJoin',
  './SaveDashboardDialog'

], function (
  declare, on, domConstruct,
  popup, TooltipDialog,
  GenomeGrid, AdvancedSearchFields, GridContainer,
  PathJoin,
  SaveDashboardDialog
) {

  const dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
  const downloadTT = new TooltipDialog({
    content: dfc,
    onMouseLeave: function () {
      popup.close(downloadTT);
    }
  });

  return declare([GridContainer], {
    gridCtor: GenomeGrid,
    containerType: 'genome_data',
    tutorialLink: 'quick_references/organisms_taxon/genome_table.html',
    tooltip: 'The "Genomes" tab lists all genomes or segments associated with the current view and associated metadata',
    facetFields: AdvancedSearchFields['genome'].filter((ff) => ff.facet),
    advancedSearchFields: AdvancedSearchFields['genome'].filter((ff) => ff.search),
    getFilterPanel: function (opts) {

    },
    enableAnchorButton: true,
    dataModel: 'genome',
    primaryKey: 'genome_id',
    tooltip: 'The "Genomes" tab contains a list of all genomes associated with the current view and their metadata',
    containerActions: GridContainer.prototype.containerActions.concat([
      [
        'DownloadTable',
        'fa icon-download fa-2x',
        {
          label: 'DOWNLOAD',
          multiple: false,
          validTypes: ['*'],
          tooltip: 'Download Table',
          tooltipDialog: downloadTT
        },
        function () {
          const _self = this;

          const totalRows = _self.grid.totalRows;
          const dataType = _self.dataModel
          const primaryKey = _self.primaryKey
          const currentQuery = _self.grid.get('query')
          const query = `${currentQuery}&sort(${primaryKey})&limit(${totalRows})`

          on(downloadTT.domNode, 'div:click', function (evt) {
            const typeAccept = evt.target.attributes.rel.value

            const baseUrl = `${PathJoin(window.App.dataServiceURL, dataType)}/?http_accept=${typeAccept}&http_download=true`

            const form = domConstruct.create('form', {
              style: 'display: none;',
              id: 'downloadForm',
              enctype: 'application/x-www-form-urlencoded',
              name: 'downloadForm',
              method: 'post',
              action: baseUrl
            }, _self.domNode);
            domConstruct.create('input', {
              type: 'hidden',
              value: encodeURIComponent(query),
              name: 'rql'
            }, form);
            // Add authorization as form field for POST requests
            if (window.App.authorizationToken) {
              domConstruct.create('input', {
                type: 'hidden',
                value: window.App.authorizationToken,
                name: 'http_authorization'
              }, form);
            }
            form.submit();

            popup.close(downloadTT);
          });

          popup.open({
            popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
            around: this.containerActionBar._actions.DownloadTable.button,
            orient: ['below']
          });
        },
        true,
        'left'
      ],
      [
        'SaveAsDashboard',
        'fa icon-dashboard fa-2x',
        {
          label: 'DASHBOARD',
          multiple: false,
          validTypes: ['*'],
          tooltip: 'Save current filters as a dashboard view',
          persistent: true
        },
        function () {
          // Build the combined filter query from the current grid state
          const _self = this;
          let filter = '';

          if (_self.state) {
            const baseSearch = _self.state.search || '';
            const hashFilter = (_self.state.hashParams && _self.state.hashParams.filter) || '';

            if (baseSearch && hashFilter) {
              // Combine base search query params with hash filter
              // The base search is typically a URL query string like ?eq(genus,Salmonella)
              const baseQuery = baseSearch.replace(/^\?/, '');
              if (baseQuery) {
                filter = 'and(' + baseQuery + ',' + hashFilter + ')';
              } else {
                filter = hashFilter;
              }
            } else if (hashFilter) {
              filter = hashFilter;
            } else if (baseSearch) {
              filter = baseSearch.replace(/^\?/, '');
            }
          }

          // Fallback to grid query if state is not available
          if (!filter && _self.grid) {
            filter = _self.grid.get('query') || '';
          }

          if (!filter) {
            // Nothing to save
            return;
          }

          const dlg = new SaveDashboardDialog({
            filter: filter
          });
          dlg.show();
        },
        true,
        'left'
      ]
    ])
  });
});
