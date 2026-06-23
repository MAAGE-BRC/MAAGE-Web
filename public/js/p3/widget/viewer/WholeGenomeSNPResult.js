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

    // SNP set definitions: folder name, distance report name
    _snpSets: {
      'All': { folder: 'All_SNPs', report: 'all_ksnpdist.report' },
      'Majority': { folder: 'Majority_SNPs', report: 'majority_ksnpdist.report' },
      'Core': { folder: 'Core_SNPs', report: 'core_ksnpdist.report' }
    },

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
        // Hidden folder not found
      });

      // Use recursive listing to find files in nested subdirectories
      WorkspaceManager.getFolderContents(this._hiddenPath, true, true)
        .then(function (objs) {
          _self._allResultObjects = objs;
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
     * getAvailableSNPSets - Return which SNP sets are available in this job
     *
     * Returns array of { id, label } for sets that have tree files
     */
    getAvailableSNPSets: function () {
      var objs = this._allResultObjects || this._resultObjects || [];
      var available = [];
      var sets = this._snpSets;

      Object.keys(sets).forEach(function (setId) {
        var folder = sets[setId].folder;
        var hasTree = objs.some(function (obj) {
          return obj.name && obj.name.toLowerCase().endsWith('.ml.tre') &&
                 obj.path && obj.path.indexOf(folder) > -1;
        });
        if (hasTree) {
          available.push({ id: setId, label: setId + ' SNPs' });
        }
      });

      return available;
    },

    /**
     * getMicrobeTraceFiles - Locate output files for MicrobeTrace handoff
     *
     * @param {string} [snpSet='Core'] - Which SNP set to use: 'All', 'Majority', or 'Core'
     * Returns array of { path, name, kind } objects
     */
    getMicrobeTraceFiles: function (snpSet) {
      snpSet = snpSet || 'Core';
      var setDef = this._snpSets[snpSet];
      if (!setDef) {
        console.error('[WholeGenomeSNP] Unknown SNP set:', snpSet);
        return [];
      }

      var files = [];
      var objs = this._allResultObjects || this._resultObjects || [];
      var folder = setDef.folder;
      var reportName = setDef.report;

      objs.forEach(function (obj) {
        var name = obj.name || '';
        var lowerName = name.toLowerCase();

        // Maximum Likelihood tree from the selected SNP set
        if (lowerName.endsWith('.ml.tre') && obj.path.indexOf(folder) > -1) {
          files.push({ path: obj.path, name: name, kind: 'newick' });
        }
        // Distance report from the selected SNP set
        else if (lowerName === reportName) {
          files.push({ path: obj.path, name: name, kind: 'link', options: { field1: 'genome_id_1', field2: 'genome_id_2', field3: 'distance' } });
        }
        // Metadata (always from job root)
        else if (lowerName === 'metadata.tsv') {
          files.push({ path: obj.path, name: name, kind: 'node' });
        }
      });

      return files;
    }
  });
});
