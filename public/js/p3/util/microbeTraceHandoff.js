/**
 * MicrobeTrace Partner Handoff Utility
 *
 * Opens MicrobeTrace in a new tab and transfers files via the partner
 * handoff postMessage protocol.
 *
 * Usage:
 *   require(['p3/util/microbeTraceHandoff'], function (microbeTraceHandoff) {
 *     microbeTraceHandoff({
 *       files: [{ name: 'tree.nwk', kind: 'newick', contents: '(A:1,B:2);' }],
 *       datasetName: 'My Dataset',
 *       onSuccess: function () { ... },
 *       onError: function (msg) { ... }
 *     });
 *   });
 */
define([
  'dojo/topic'
], function (
  Topic
) {
  /**
   * @param {Object} opts
   * @param {Array} opts.files - Array of { name, kind, contents } objects
   * @param {string} [opts.datasetName] - Display name for the dataset
   * @param {Function} [opts.onSuccess] - Called after successful handoff
   * @param {Function} [opts.onError] - Called on error with message string
   */
  return function microbeTraceHandoff(opts) {
    var files = opts.files || [];
    if (!files.length) {
      var msg = 'No files to send to MicrobeTrace.';
      if (opts.onError) { opts.onError(msg); }
      Topic.publish('/Notification', { message: msg, type: 'error' });
      return;
    }

    var datasetName = opts.datasetName || files.map(function (f) { return f.name; }).join(' + ');
    var partnerId = 'maage';
    var nonce = 'maage-' + Date.now() + '-' + Math.random().toString(16).slice(2);

    var metadata = {
      datasetName: datasetName,
      sourceApp: 'MAAGE'
    };
    if (opts.defaultView) { metadata.defaultView = opts.defaultView; }
    if (opts.nodeLabel) { metadata.nodeLabel = opts.nodeLabel; }

    var payload = {
      type: 'MT_HANDOFF_TRANSFER',
      version: 1,
      partnerId: partnerId,
      nonce: nonce,
      metadata: metadata,
      files: files
    };

    console.log('[MicrobeTrace] Opening receiver with partnerId:', partnerId, 'nonce:', nonce, 'files:', files.length);

    var receiverUrl = '/microbetrace/assets/embed/receiver.html?partnerId=' +
                      encodeURIComponent(partnerId) + '&nonce=' + encodeURIComponent(nonce);

    var receiverWindow = window.open(receiverUrl, '_blank');

    if (!receiverWindow) {
      var popupMsg = 'Could not open popup. Please allow popups for this site.';
      if (opts.onError) { opts.onError(popupMsg); }
      Topic.publish('/Notification', { message: popupMsg, type: 'error' });
      return;
    }

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

      if (opts.onSuccess) { opts.onSuccess(); }
    };

    window.addEventListener('message', storedHandler);
    setTimeout(function () {
      window.removeEventListener('message', storedHandler);
    }, 60000);

    Topic.publish('/Notification', {
      message: 'Opening MicrobeTrace with ' + datasetName,
      type: 'info'
    });
  };
});
