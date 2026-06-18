/**
 * Core Genome MLST Job Result Viewer
 *
 * Extends the base JobResult viewer with helper methods to locate
 * MicrobeTrace-compatible output files (tree, distance report, metadata).
 */
define([
  'dojo/_base/declare', './JobResult'
], function (declare, JobResult) {
  return declare([JobResult], {
    containerType: 'CoreGenomeMLST',

    setupResultType: function () {
      if (this.data.autoMeta.app.id) {
        this._resultType = this.data.autoMeta.app.id;
      }
      this._appLabel = 'Core Genome MLST';
    },

    /**
     * getMicrobeTraceFiles - Locate output files for MicrobeTrace handoff
     *
     * Returns array of { path, name, kind } where kind is one of:
     *   'newick', 'link', 'node'
     */
    getMicrobeTraceFiles: function () {
      var files = [];
      if (!this._resultObjects) return files;

      this._resultObjects.forEach(function (obj) {
        var name = obj.name || '';
        var lowerName = name.toLowerCase();

        // Tree file: ends in .tre or .nwk
        if (lowerName.endsWith('.tre') || lowerName.endsWith('.nwk') || lowerName.endsWith('.newick')) {
          files.push({ path: obj.path, name: name, kind: 'newick' });
        }
        // Distance report: link data
        else if (lowerName === 'cgmlst_distance.report') {
          files.push({ path: obj.path, name: name, kind: 'link' });
        }
        // Metadata: node data
        else if (lowerName === 'metadata.tsv' || lowerName === 'bvbrc_metadata.tsv') {
          files.push({ path: obj.path, name: name, kind: 'node' });
        }
      });

      return files;
    }
  });
});
