/**
 * Whole Genome SNP Analysis Job Result Viewer
 *
 * Extends the base JobResult viewer with helper methods to locate
 * MicrobeTrace-compatible output files. Uses recursive folder listing
 * to find Newick tree files in nested subdirectories.
 */
define([
  'dojo/_base/declare',
  './JobResult',
  '../../WorkspaceManager'
], function (declare, JobResult, WorkspaceManager) {
  return declare([JobResult], {
    containerType: 'WholeGenomeSNPAnalysis',

    _allResultObjects: null,

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
        // Hidden folder not found — handled by base class pattern
      });

      // Use recursive listing to find files in nested subdirectories
      WorkspaceManager.getFolderContents(this._hiddenPath, true, true)
        .then(function (objs) {
          _self._allResultObjects = objs;
          // Set _resultObjects to the full recursive listing
          // so the file browser shows all files
          _self._resultObjects = objs;
          _self.setupResultType();
          _self.refresh();
        });
    },

    setupResultType: function () {
      if (this.data.autoMeta.app.id) {
        this._resultType = this.data.autoMeta.app.id;
      }
      this._appLabel = 'Whole Genome SNP Analysis';
    },

    /**
     * getMicrobeTraceFiles - Locate output files for MicrobeTrace handoff
     *
     * Returns array of { path, name, kind } where kind is one of:
     *   'newick', 'link', 'node'
     */
    getMicrobeTraceFiles: function () {
      var files = [];
      var objs = this._allResultObjects || this._resultObjects || [];

      objs.forEach(function (obj) {
        var name = obj.name || '';
        var lowerName = name.toLowerCase();

        // Maximum Likelihood tree only
        if (lowerName === 'tree.snps_all.ml.tre') {
          files.push({ path: obj.path, name: name, kind: 'newick' });
        }
        // Distance report: link data
        else if (lowerName === 'all_ksnpdist.report') {
          files.push({ path: obj.path, name: name, kind: 'link' });
        }
        // Metadata: node data
        else if (lowerName === 'all_metadata.tsv') {
          files.push({ path: obj.path, name: name, kind: 'node' });
        }
      });

      return files;
    }
  });
});
