define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on', "dojo/_base/lang",
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct', 'dojo/dom-style',
  '../formatter', '../../WorkspaceManager', 'dojo/_base/Deferred', 'dojo/dom-attr', 'dojo/_base/array'
], function (
  declare, BorderContainer, on, lang,
  domClass, ContentPane, domConstruct, domStyle,
  formatter, WS, Deferred, domAttr, array
) {
  return declare([BorderContainer], {
    baseClass: 'FileViewer',
    disabled: false,
    containerType: 'file',
    file: null,
    viewable: false,
    url: null,
    preload: true,

    _setFileAttr: function (val) {
      // this is invoked by the widget creation mechanism
      // with the value of the "file" key in params.
      // console.log('[File] _setFileAttr:', val);
      if (!val) {
        this.file = {}; this.filepath = ''; this.url = '';
        return;
      }
      if (typeof val == 'string') {
        this.set('filepath', val);
      } else {
        this.filepath =
          'path' in val.metadata ?
            val.metadata.path +
            ((val.metadata.path.charAt(val.metadata.path.length - 1) == '/') ? '' : '/')
            + val.metadata.name : '/';

        this.file = val;
        this.refresh();
      }
    },
    _setFilepathAttr: function (val) {
      // If we were set up with just a path, retrieve metadata from workspace
      // console.log('[File] _setFilepathAttr:', val);
      this.filepath = val;
      var _self = this;
      return Deferred.when(WS.getObject(val, true), function (meta) {
        _self.file = { metadata: meta };
        _self.refresh();
      });
    },
    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this.viewHeader = new ContentPane({ content: '', region: 'top' });
      this.viewSubHeader = new ContentPane({ content: '', region: 'top' });
      this.viewer = new ContentPane({ region: 'center' });
      this.addChild(this.viewHeader);
      this.addChild(this.viewSubHeader);
      this.addChild(this.viewer);

      var _self = this;
      // for direct load, make everything viewable
      this.viewable = true;
      /*
      if (WS.viewableTypes.indexOf(this.file.metadata.type) >= 0 && this.file.metadata.size <= 10000000) {
        this.viewable = true;
      }
      */
      // console.log('[File] viewable?:', this.viewable);

      // Fetch the signed download URL before rendering the header. Nothing
      // populated this.url, so the download link rendered as href="null".
      // Refresh either way, so a failure here still shows the file.
      if (this.filepath) {
        Deferred.when(WS.getDownloadUrls(this.filepath), function (url) {
          _self.url = url;
        }, function (err) {
          console.log('[File] unable to get download url', err);
        }).always(function () {
          _self.refresh();
        });
      } else {
        this.refresh();
      }
    },

    formatFileMetaData: function (showMetaDataRows) {
      var fileMeta = this.file.metadata;
      if (this.file && fileMeta) {
        var content = '<div><h3 class="section-title-plain close2x pull-left"><b>' + fileMeta.type + ' file</b>: ' + fileMeta.name + '</h3>';

        // Only render the link once the signed URL has resolved -- otherwise
        // the href was the literal string "null". Quote it, too: the value is
        // a URL that can contain characters an unquoted attribute breaks on.
        if (this.url && !WS.forbiddenDownloadTypes.includes(fileMeta.type)) {
          content += '<a href="' + this.url + '" title="Download"><i class="fa icon-download pull-left fa-2x"></i></a>';
        }

        if (showMetaDataRows) {
          var formatLabels = formatter.autoLabel('fileView', fileMeta);
          content += formatter.keyValueTable(formatLabels);
        }
        content += '</tbody></table></div>';
      }

      return content;
    },

    authorize: function () {
      const d = new Deferred();

      (async () => {
        try {
          const res = await fetch(window.App.workspaceDownloadAPI + "/set-cookie-auth", {
            method: "POST",
            headers: {
              "Authorization": window.App.authorizationToken,
              "Content-Type": "application/json"
            },
            credentials: "include"
          });

          if (!res.ok) {
            throw new Error("Authorization failed with status " + res.status);
          }

          const data = await res.text();
          d.resolve(data);
        } catch (err) {
          d.reject(err);
        }
      })();

      return d.promise;
    },
    refresh: function () {
      if (!this._started) {
        return;
      }
      if (!this.file || !this.file.metadata) {
        this.viewer.set('content', "<div class='error'>Unable to load file</div>");
        return;
      }

      if (this.file && this.file.metadata) {
        if (this.viewable) {
          this.viewSubHeader.set('content', this.formatFileMetaData(false));

          // Show the spinner BEFORE authorizing, not after. authorize() is a
          // network round-trip -- a few hundred ms on a good connection, much
          // worse on congested wifi -- and creating the spinner inside its
          // .then() left the pane blank for that whole time.
          const spinner = domConstruct.create("div", {
            className: "spinner",
            innerHTML: "Loading..."
          });

          // Style the spinner (you can customize this or use a CSS class)
          domStyle.set(spinner, {
            position: "absolute",
            fontSize: "2.5em",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10,
            backgroundColor: "white",
            padding: "10px",
            borderRadius: "4px"
          });
          domConstruct.empty(this.viewer.containerNode);
          domStyle.set(this.viewer.containerNode, 'overflow', 'hidden');
          domConstruct.place(spinner, this.viewer.containerNode);

          // Set cookie for workspace load
          this.authorize().then(lang.hitch(this, function () {
            const docURL = window.App.workspaceDownloadAPI + "/view" + this.filepath;

            //
            // The frame renders workspace files, whose content we do not
            // control, from a SAME-ORIGIN URL (workspaceDownloadAPI is a
            // relative path). Without a sandbox, script in a workspace HTML
            // file runs in the app origin, where window.App.authorizationToken
            // is a live OAuth credential readable from JS and there is no CSP
            // backstop (app.js disables Helmet's CSP for Dojo).
            //
            // allow-scripts is required: job reports genuinely need it --
            // cgMLST_Report.html is ~136KB with Plotly, jQuery and DataTables.
            // Withholding allow-same-origin puts the document in an opaque
            // origin, so scripts run but cannot reach parent.App, cookies or
            // localStorage.
            //
            // NEVER add allow-same-origin here. Combined with allow-scripts it
            // is equivalent to no sandbox at all, because the frame can then
            // remove its own sandbox attribute.
            //
            // Set at creation, before the node is placed, so the attribute is
            // present when the document loads.
            //
            var iframe = domConstruct.create('iframe', {
              sandbox: 'allow-scripts',
              style: 'width:100%;height:100%'
            });
            domConstruct.place(iframe, this.viewer.containerNode);

            // Small files load in a couple of hundred milliseconds, which made
            // the spinner flash by unseen. Hold it for a minimum interval so it
            // reads as a deliberate loading state rather than a flicker.
            var shownAt = Date.now();
            var MIN_SPINNER_MS = 400;
            var spinnerCleared = false;
            var clearSpinner = function () {
              if (spinnerCleared) { return; }
              spinnerCleared = true;
              var elapsed = Date.now() - shownAt;
              var wait = Math.max(0, MIN_SPINNER_MS - elapsed);
              setTimeout(function () {
                if (spinner.parentNode) {
                  domConstruct.destroy(spinner);
                }
              }, wait);
            };

            // Reading iframe.contentWindow.document from here is permanently
            // impossible: the sandbox above withholds allow-same-origin, so the
            // frame is in an opaque origin and any DOM access throws. A
            // commented-out attempt to retarget the document's links lived here
            // and has been removed. If link retargeting is needed again, the
            // sandboxed answer is allow-top-navigation-by-user-activation --
            // NOT allow-same-origin, which would defeat the sandbox entirely.
            iframe.onload = clearSpinner;
            // Without this a failed load would leave the spinner up forever.
            iframe.onerror = clearSpinner;
            iframe.src = docURL;

          }), lang.hitch(this, function (err) {
            console.log("Cookie auth failure", err);
            // The spinner is now shown before authorize(), so a failure here
            // has to take it down or the pane spins forever.
            if (spinner.parentNode) {
              domConstruct.destroy(spinner);
            }
            this.viewer.set('content', "<div class='error'>Unable to load file</div>");
          }));
        } else {
          this.viewSubHeader.set('content', this.formatFileMetaData(true));
        }
      }
    }
  });
});