/**
 * Core Genome MLST Job Result Viewer
 *
 * Extends the base JobResult viewer with helper methods to locate
 * MicrobeTrace-compatible output files (tree, distance report, metadata).
 * Uses recursive folder listing to find files in subdirectories.
 */
define([
  'dojo/_base/declare', './JobResult',
  '../../WorkspaceManager'
], function (declare, JobResult, WorkspaceManager) {
  return declare([JobResult], {
    containerType: 'CoreGenomeMLST',

    _setDataAttr: function (data) {
      this.data = data;
      if (data.autoMeta.parameters.output_path != data.path) {
        for (var outfile of data.autoMeta.output_files) {
          outfile[0] = outfile[0].replace(new RegExp('^' + data.autoMeta.parameters.output_path), data.path);
        }
      }
      this._hiddenPath = data.path + '.' + data.name;
      var _self = this;

      WorkspaceManager.getObject(this._hiddenPath, true).otherwise(function () {
      });

      WorkspaceManager.getFolderContents(this._hiddenPath, true, true)
        .then(function (objs) {
          _self._resultObjects = objs;
          _self.setupResultType();
          _self.refresh();
        });
    },

    setupResultType: function () {
      if (this.data.autoMeta.app.id) {
        this._resultType = this.data.autoMeta.app.id;
      }
      this._appLabel = 'Core Genome MLST';
    },

    getMicrobeTraceFiles: function () {
      var files = [];
      if (!this._resultObjects) return files;

      this._resultObjects.forEach(function (obj) {
        var name = obj.name || '';
        var lowerName = name.toLowerCase();
        var path = obj.path || '';

        if (lowerName.endsWith('.tre') || lowerName.endsWith('.nwk') || lowerName.endsWith('.newick')) {
          files.push({ path: path, name: name, kind: 'newick' });
        }
        else if (lowerName === 'cgmlst_distance.report') {
          files.push({ path: path, name: name, kind: 'link', options: { field1: 'genome_id_1', field2: 'genome_id_2', field3: 'distance' } });
        }
        else if (lowerName === 'metadata.tsv' || lowerName === 'bvbrc_metadata.tsv') {
          files.push({ path: path, name: name, kind: 'node' });
        }
      });

      return files;
    }
  });
});
