/**
 * MicrobeTrace Viewer Widget
 *
 * This viewer provides a landing page for opening workspace files in the CDC's
 * MicrobeTrace molecular epidemiology visualization tool. Files are opened in
 * a new browser tab using MicrobeTrace's partner handoff system.
 *
 * Supports single or multiple files (e.g., tree + metadata CSV).
 * Supported file types: FASTA, CSV, TSV, Newick trees, and MicrobeTrace sessions.
 *
 * @see https://github.com/CDCgov/MicrobeTrace
 */
define([
  'dojo/_base/declare',
  'dijit/layout/BorderContainer',
  'dijit/layout/ContentPane',
  'dojo/on',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dojo/_base/lang',
  'dojo/topic',
  '../../WorkspaceManager',
  '../../util/encodePath',
  '../formatter'
], function (
  declare,
  BorderContainer,
  ContentPane,
  on,
  domConstruct,
  domClass,
  lang,
  Topic,
  WorkspaceManager,
  encodePath,
  formatter
) {
  return declare([BorderContainer], {
    baseClass: 'MicrobeTraceViewer',
    disabled: false,
    containerType: 'microbetrace_session',
    gutters: false,

    // Supported input file types for MicrobeTrace
    supportedTypes: [
      'fasta', 'fa', 'fna', 'faa',
      'csv', 'tsv',
      'nwk', 'newick',
      'json', 'microbetrace', 'microbetrace_session'
    ],

    // Internal state
    _workspacePaths: null,
    _workspaceDir: null,
    _files: null,
    // Backward-compat single-file properties
    _workspacePath: null,
    _fileContent: null,
    _filename: null,
    _fileType: null,

    /**
     * _setStateAttr - Called when the viewer receives state from router
     */
    _setStateAttr: function (state) {
      this._set('state', state);
      if (!state) return;

      console.log('[MicrobeTrace] _setStateAttr received state:', JSON.stringify(state));

      // Extract primary workspace path from state.pathname
      var path = state.pathname;
      if (path) {
        path = path.replace(/^\/view\/MicrobeTrace/, '').replace(/^\/MicrobeTrace/, '');
        if (path && !path.startsWith('/')) {
          path = '/' + path;
        }
      }

      if (!path) {
        path = state.path || state.value;
      }

      if (!path) {
        console.warn('[MicrobeTrace] No path found in state:', state);
        return;
      }

      try {
        path = decodeURIComponent(path);
      } catch (e) {
        console.warn('[MicrobeTrace] Could not decode path:', e);
      }

      var allPaths = [path];

      // Parse additional files from query string (extraFile= params)
      var search = state.search;
      if (search) {
        if (search.charAt(0) === '?') {
          search = search.substring(1);
        }
        var params = search.split('&');
        for (var i = 0; i < params.length; i++) {
          var eqIdx = params[i].indexOf('=');
          if (eqIdx > -1) {
            var key = params[i].substring(0, eqIdx);
            var val = params[i].substring(eqIdx + 1);
            if (key === 'extraFile' && val) {
              try {
                allPaths.push(decodeURIComponent(val));
              } catch (e) {
                console.warn('[MicrobeTrace] Could not decode extraFile:', e);
              }
            }
          }
        }
      }

      console.log('[MicrobeTrace] Loading files from paths:', allPaths);
      this._workspacePaths = allPaths;
      this._workspacePath = allPaths[0];

      // Compute workspace directory for post-handoff navigation
      var parts = allPaths[0].split('/');
      parts.pop();
      this._workspaceDir = parts.join('/');

      if (this._started) {
        this._loadFilesInfo(allPaths);
      }
    },

    /**
     * _setDataAttr - Called when viewing a workspace object directly
     */
    _setDataAttr: function (data) {
      this._set('data', data);
      if (!data) return;

      var meta = data.metadata || data;
      var path = meta.path;
      if (meta.name && path) {
        path = path + (path.endsWith('/') ? '' : '/') + meta.name;
      }

      if (path) {
        this._workspacePaths = [path];
        this._workspacePath = path;
        var parts = path.split('/');
        parts.pop();
        this._workspaceDir = parts.join('/');
        if (this._started) {
          this._loadFilesInfo([path]);
        }
      }
    },

    startup: function () {
      if (this._started) return;
      this.inherited(arguments);
      this._setupUI();

      if (this._workspacePaths) {
        this._loadFilesInfo(this._workspacePaths);
      }
    },

    /**
     * _setupUI - Create the main content pane
     */
    _setupUI: function () {
      this.contentPane = new ContentPane({
        region: 'center',
        style: 'padding: 0; overflow: auto; background: #f8f9fa;'
      });
      this.addChild(this.contentPane);
    },

    /**
     * _loadFilesInfo - Load one or more files and show landing page
     */
    _loadFilesInfo: function (paths) {
      var _self = this;
      this._showLoading();

      console.log('[MicrobeTrace] Loading files via WorkspaceManager.getObjects:', paths);

      WorkspaceManager.getObjects(paths, false).then(function (results) {
        _self._files = results.map(function (result) {
          var fileContent = result.data;
          if (typeof fileContent === 'object' && fileContent !== null) {
            fileContent = JSON.stringify(fileContent);
          }
          if (!fileContent || typeof fileContent !== 'string') {
            throw new Error('No file content returned for ' + (result.metadata ? result.metadata.name : 'unknown'));
          }
          var filename = result.metadata.name;
          var ext = _self._getFileExtension(filename);
          var kind = _self._inferFileKind(ext, fileContent, filename);
          return {
            filename: filename,
            fileType: ext,
            kind: kind,
            content: fileContent
          };
        });

        // Backward compat: set single-file properties from first file
        if (_self._files.length > 0) {
          _self._filename = _self._files[0].filename;
          _self._fileType = _self._files[0].fileType;
          _self._fileContent = _self._files[0].content;
        }

        _self._showLandingPage();
      }).catch(function (err) {
        console.error('[MicrobeTrace] Failed to load files:', err);
        _self._showError('Failed to load files: ' + (err.message || err));
      });
    },

    /**
     * _showLandingPage - Display landing page with file info and Open button
     */
    _showLandingPage: function () {
      var _self = this;
      domConstruct.empty(this.contentPane.domNode);

      var container = domConstruct.create('div', {
        style: 'display: flex; flex-direction: column; align-items: center; justify-content: center; ' +
               'min-height: 100%; padding: 40px; box-sizing: border-box;'
      }, this.contentPane.domNode);

      var card = domConstruct.create('div', {
        style: 'background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); ' +
               'padding: 40px 60px; text-align: center; max-width: 500px; width: 100%;'
      }, container);

      // MicrobeTrace icon
      domConstruct.create('div', {
        innerHTML: '<i class="fa icon-network" style="font-size: 64px; color: #17a2b8;"></i>',
        style: 'margin-bottom: 20px;'
      }, card);

      domConstruct.create('h2', {
        textContent: 'MicrobeTrace',
        style: 'margin: 0 0 8px 0; font-size: 28px; color: #212529; font-weight: 600;'
      }, card);

      domConstruct.create('p', {
        textContent: 'Molecular Epidemiology Visualization Tool',
        style: 'margin: 0 0 30px 0; color: #6c757d; font-size: 14px;'
      }, card);

      // File info section for each file
      var files = this._files || [];
      for (var i = 0; i < files.length; i++) {
        var f = files[i];
        var fileInfo = domConstruct.create('div', {
          style: 'background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 15px; text-align: left;'
        }, card);

        var iconClass = this._getIconForFileType(f.fileType);
        var nameDiv = domConstruct.create('div', {
          style: 'font-size: 16px; margin-bottom: 12px; color: #212529;'
        }, fileInfo);
        domConstruct.create('i', {
          className: iconClass,
          style: 'margin-right: 10px; color: #495057;'
        }, nameDiv);
        var nameStrong = domConstruct.create('strong', {}, nameDiv);
        nameStrong.textContent = f.filename;

        var detailsDiv = domConstruct.create('div', {
          style: 'font-size: 13px; color: #6c757d; line-height: 1.6;'
        }, fileInfo);
        var typeSpan = domConstruct.create('div', {}, detailsDiv);
        domConstruct.create('strong', { textContent: 'Type: ' }, typeSpan);
        typeSpan.appendChild(document.createTextNode(this._getFileTypeLabel(f.kind)));
        var sizeSpan = domConstruct.create('div', {}, detailsDiv);
        domConstruct.create('strong', { textContent: 'Size: ' }, sizeSpan);
        sizeSpan.appendChild(document.createTextNode(this._formatFileSize(f.content.length)));
      }

      // Spacing before button if multiple files
      if (files.length > 1) {
        domConstruct.create('div', { style: 'margin-bottom: 15px;' }, card);
      }

      // Open in MicrobeTrace button
      var openBtn = domConstruct.create('button', {
        innerHTML: '<i class="fa icon-external-link" style="margin-right: 8px;"></i>Open in MicrobeTrace',
        style: 'background: #17a2b8; color: white; border: none; padding: 14px 32px; ' +
               'border-radius: 6px; font-size: 16px; cursor: pointer; font-weight: 500; ' +
               'transition: background 0.2s; width: 100%;'
      }, card);

      on(openBtn, 'click', lang.hitch(this, '_openInMicrobeTrace'));
      on(openBtn, 'mouseenter', function () { this.style.background = '#138496'; });
      on(openBtn, 'mouseleave', function () { this.style.background = '#17a2b8'; });

      // Help text
      var fileCount = files.length > 1 ? files.length + ' files' : 'your file';
      domConstruct.create('p', {
        textContent: 'MicrobeTrace will open in a new browser tab with ' + fileCount + ' loaded.',
        style: 'margin: 20px 0 0 0; color: #6c757d; font-size: 12px;'
      }, card);

      // About section
      var infoSection = domConstruct.create('div', {
        style: 'margin-top: 30px; text-align: left; max-width: 500px; width: 100%;'
      }, container);

      domConstruct.create('h4', {
        textContent: 'About MicrobeTrace',
        style: 'margin: 0 0 10px 0; font-size: 14px; color: #495057; font-weight: 600;'
      }, infoSection);

      domConstruct.create('p', {
        textContent: 'MicrobeTrace is an open-source tool developed by the CDC for visualizing and analyzing ' +
                   'molecular epidemiology data. It supports network visualization, phylogenetic trees, ' +
                   'geographic mapping, and more.',
        style: 'margin: 0; color: #6c757d; font-size: 13px; line-height: 1.6;'
      }, infoSection);
    },

    /**
     * _openInMicrobeTrace - Open MicrobeTrace in a new tab with file data
     */
    _openInMicrobeTrace: function () {
      var _self = this;
      var files = this._files || [];

      if (!files.length) {
        Topic.publish('/Notification', {
          message: 'File content not loaded. Please try again.',
          type: 'error'
        });
        return;
      }

      // Build files array for the payload
      var filesPayload = files.map(function (f) {
        return {
          name: f.filename,
          kind: f.kind,
          contents: f.content.trim()
        };
      });

      var datasetName = files.map(function (f) { return f.filename; }).join(' + ');

      var partnerId = 'maage';
      var nonce = 'maage-' + Date.now() + '-' + Math.random().toString(16).slice(2);

      var payload = {
        type: 'MT_HANDOFF_TRANSFER',
        version: 1,
        partnerId: partnerId,
        nonce: nonce,
        metadata: {
          datasetName: datasetName,
          sourceApp: 'MAAGE'
        },
        files: filesPayload
      };

      console.log('[MicrobeTrace] Opening receiver with partnerId:', partnerId, 'nonce:', nonce, 'files:', filesPayload.length);

      var receiverUrl = '/microbetrace/assets/embed/receiver.html?partnerId=' +
                        encodeURIComponent(partnerId) + '&nonce=' + encodeURIComponent(nonce);

      var receiverWindow = window.open(receiverUrl, '_blank');

      if (!receiverWindow) {
        Topic.publish('/Notification', {
          message: 'Could not open popup. Please allow popups for this site.',
          type: 'error'
        });
        return;
      }

      // Listen for the READY message from the receiver
      var messageHandler = function (event) {
        if (!event.data || event.data.type !== 'MT_HANDOFF_READY') {
          return;
        }
        if (event.data.partnerId !== partnerId || event.data.nonce !== nonce) {
          return;
        }

        console.log('[MicrobeTrace] Receiver is ready, sending payload');
        try {
          receiverWindow.postMessage(payload, '*');
          console.log('[MicrobeTrace] Payload sent');
        } catch (e) {
          console.error('[MicrobeTrace] Failed to send payload:', e);
        }
      };

      window.addEventListener('message', messageHandler);
      setTimeout(function () {
        window.removeEventListener('message', messageHandler);
      }, 60000);

      // Listen for stored confirmation and navigate back to workspace
      var storedHandler = function (event) {
        if (!event.data || event.data.type !== 'MT_HANDOFF_TRANSFER' || event.data.status !== 'stored') {
          return;
        }
        if (event.data.partnerId !== partnerId || event.data.nonce !== nonce) {
          return;
        }

        console.log('[MicrobeTrace] Handoff stored successfully with ID:', event.data.handoffId);
        window.removeEventListener('message', storedHandler);
        window.removeEventListener('message', messageHandler);

        Topic.publish('/Notification', {
          message: 'MicrobeTrace loaded with ' + datasetName,
          type: 'success'
        });

        // Navigate back to the workspace directory
        if (_self._workspaceDir) {
          Topic.publish('/navigate', { href: '/workspace' + encodePath(_self._workspaceDir) });
        }
      };

      window.addEventListener('message', storedHandler);
      setTimeout(function () {
        window.removeEventListener('message', storedHandler);
      }, 60000);

      Topic.publish('/Notification', {
        message: 'Opening MicrobeTrace with ' + datasetName,
        type: 'info'
      });
    },

    /**
     * _inferFileKind - Determine the MicrobeTrace file kind from extension and content
     */
    _inferFileKind: function (ext, content, filename) {
      if (['fasta', 'fa', 'fna', 'faa', 'fas'].indexOf(ext) >= 0) {
        return 'fasta';
      }
      if (['nwk', 'newick', 'tree', 'tre'].indexOf(ext) >= 0) {
        return 'newick';
      }

      var trimmed = content.trim();

      if (trimmed.charAt(0) === '>') {
        return 'fasta';
      }
      if (trimmed.charAt(0) === '(' && trimmed.charAt(trimmed.length - 1) === ';') {
        return 'newick';
      }
      if (trimmed.charAt(0) === '{') {
        try {
          var parsed = JSON.parse(trimmed);
          if (parsed.meta && parsed.tree) {
            return 'auspice';
          }
        } catch (e) {
          // Not valid JSON
        }
      }

      var lowerName = filename.toLowerCase();
      if (/matrix|distance|dist/.test(lowerName)) {
        return 'matrix';
      }
      if (/link|edge|network|pair/.test(lowerName)) {
        return 'link';
      }
      if (/node|metadata|attribute|sample|case/.test(lowerName)) {
        return 'node';
      }

      if (ext === 'csv' || ext === 'tsv') {
        return 'node';
      }

      return 'auto';
    },

    /**
     * _getFileTypeLabel - Get human-readable label for file type
     */
    _getFileTypeLabel: function (kind) {
      var labels = {
        'fasta': 'FASTA Sequences',
        'newick': 'Newick Tree',
        'csv': 'CSV Data',
        'tsv': 'TSV Data',
        'node': 'Node Metadata',
        'link': 'Link/Edge Data',
        'matrix': 'Distance Matrix',
        'auspice': 'Auspice JSON',
        'auto': 'Data File'
      };
      return labels[kind] || 'Data File';
    },

    /**
     * _formatFileSize - Format file size in human-readable format
     */
    _formatFileSize: function (bytes) {
      if (bytes < 1024) return bytes + ' bytes';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    /**
     * _showLoading - Display loading indicator
     */
    _showLoading: function () {
      domConstruct.empty(this.contentPane.domNode);
      var loadingDiv = domConstruct.create('div', {
        style: 'display: flex; justify-content: center; align-items: center; height: 100%; flex-direction: column;'
      });
      domConstruct.create('i', {
        className: 'fa icon-spinner fa-spin fa-3x',
        style: 'color: #17a2b8; margin-bottom: 15px;'
      }, loadingDiv);
      domConstruct.create('span', {
        textContent: 'Loading file information...',
        style: 'color: #6c757d; font-size: 14px;'
      }, loadingDiv);
      domConstruct.place(loadingDiv, this.contentPane.domNode);
    },

    /**
     * _showError - Display error message
     */
    _showError: function (message) {
      domConstruct.empty(this.contentPane.domNode);
      var errorDiv = domConstruct.create('div', {
        style: 'display: flex; justify-content: center; align-items: center; height: 100%; flex-direction: column;'
      });
      domConstruct.create('i', {
        className: 'fa icon-warning fa-3x',
        style: 'color: #dc3545; margin-bottom: 15px;'
      }, errorDiv);
      var errorSpan = domConstruct.create('span', {
        style: 'color: #dc3545; font-size: 14px;'
      }, errorDiv);
      errorSpan.textContent = message;
      domConstruct.place(errorDiv, this.contentPane.domNode);
    },

    /**
     * _getFileExtension - Extract file extension from filename
     */
    _getFileExtension: function (filename) {
      var parts = filename.split('.');
      if (parts.length < 2) return '';
      return parts.pop().toLowerCase();
    },

    /**
     * _getIconForFileType - Return appropriate icon class for file type
     */
    _getIconForFileType: function (fileType) {
      switch (fileType) {
        case 'fasta':
        case 'fa':
        case 'fna':
        case 'faa':
          return 'fa icon-fasta';
        case 'csv':
        case 'tsv':
          return 'fa icon-table';
        case 'nwk':
        case 'newick':
        case 'tre':
        case 'tree':
          return 'fa icon-tree';
        case 'json':
        case 'microbetrace':
          return 'fa icon-network';
        default:
          return 'fa icon-file-text-o';
      }
    },

    /**
     * _escapeHtml - Escape HTML to prevent XSS
     */
    _escapeHtml: function (str) {
      if (typeof str !== 'string') return str;
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    /**
     * destroy - Clean up resources
     */
    destroy: function () {
      this._files = null;
      this._fileContent = null;
      this.inherited(arguments);
    }
  });
});
