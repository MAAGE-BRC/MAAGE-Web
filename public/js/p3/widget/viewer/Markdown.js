define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/_base/lang',
  'dijit/layout/ContentPane', 'dojo/dom-construct', 'dojo/dom-style',
  '../formatter', '../../WorkspaceManager', 'dojo/_base/Deferred',
  'markdown-it', 'lazyload'
], function (
  declare, BorderContainer, lang,
  ContentPane, domConstruct, domStyle,
  formatter, WS, Deferred,
  MarkdownIt
) {
  //
  // Markdown viewer for workspace .md files.
  //
  // SECURITY -- read before changing anything here.
  //
  // Markdown is user-supplied content that intentionally produces HTML, so it
  // is rendered inside a sandboxed iframe rather than into the app DOM. The
  // sandbox is the trust boundary; the renderer's configuration is defence in
  // depth, not the guarantee.
  //
  // Three invariants, also stated in CLAUDE.md. Do not relax any of them:
  //
  //   1. The sandbox MUST NOT contain allow-scripts.
  //   2. The sandbox MUST NOT contain allow-same-origin.
  //   3. markdown-it MUST be constructed with html: false.
  //
  // (1) and (2) together mean the browser refuses to execute script in the
  // frame at all, and the document sits in an opaque origin where
  // window.App.authorizationToken -- a live OAuth credential -- is unreachable.
  // That is enforcement by the browser rather than by pattern matching, which
  // is why no HTML sanitiser is used or needed here.
  //
  // Note viewer/File.js uses a DIFFERENT sandbox (allow-scripts, still no
  // allow-same-origin) because HTML job reports genuinely need JavaScript.
  // Markdown does not, so it takes the stricter setting.
  //

  // No allow-scripts, no allow-same-origin. The rest permit a user-initiated
  // link click to leave the frame, which is what makes links usable.
  var SANDBOX = 'allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation';

  // Blocks all network egress from the frame -- no tracking pixels, no beacons,
  // no external fonts or CSS -- even for markup we deliberately allow. This is a
  // per-document CSP and is unaffected by app.js disabling Helmet's CSP.
  var FRAME_CSP = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:";

  // getObject pulls the whole file through a JSON-RPC response, and markdown
  // parse cost grows faster than linearly on pathological input.
  var MAX_RENDER_BYTES = 2 * 1024 * 1024;

  var HLJS_JS = '/maage/js/highlight.js/v11.9.0/highlight.min.js';
  var HLJS_CSS = '/maage/js/highlight.js/v11.9.0/github.min.css';

  // Loaded lazily, once per page. highlight.js ships no AMD wrapper -- it only
  // sets a `var hljs` global -- so it cannot be a Dojo package. Lazy-loading
  // also keeps 121 KB off every page load for a viewer most users never open.
  var hljsLoad = null;
  function loadHljs() {
    if (!hljsLoad) {
      hljsLoad = new Deferred();
      if (window.hljs) {
        hljsLoad.resolve(window.hljs);
      } else if (window.LazyLoad && window.LazyLoad.js) {
        window.LazyLoad.js(HLJS_JS, function () { hljsLoad.resolve(window.hljs || null); });
      } else {
        hljsLoad.resolve(null);   // render without highlighting
      }
    }
    return hljsLoad.promise || hljsLoad;
  }

  var hljsCss = null;
  function loadHljsCss() {
    if (!hljsCss) {
      hljsCss = new Deferred();
      // Fetched as text so it can be inlined into the frame. The frame's CSP
      // forbids external stylesheets, and it could not reach app CSS anyway.
      fetch(HLJS_CSS).then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (t) { hljsCss.resolve(t); })
        .catch(function () { hljsCss.resolve(''); });
    }
    return hljsCss.promise || hljsCss;
  }

  // Typography for the rendered document. Inlined because the frame is in an
  // opaque origin and cannot load the app's stylesheets.
  var DOC_CSS = [
    'html,body{margin:0;padding:0}',
    'body{font:14px/1.6 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;',
    'color:#24292f;padding:24px 32px;max-width:980px;word-wrap:break-word}',
    'h1,h2,h3,h4,h5,h6{margin:24px 0 16px;font-weight:600;line-height:1.25}',
    'h1{font-size:2em;padding-bottom:.3em;border-bottom:1px solid #d8dee4}',
    'h2{font-size:1.5em;padding-bottom:.3em;border-bottom:1px solid #d8dee4}',
    'h3{font-size:1.25em}h4{font-size:1em}h5{font-size:.875em}h6{font-size:.85em;color:#57606a}',
    'p,blockquote,ul,ol,dl,table,pre{margin:0 0 16px}',
    'a{color:#0969da;text-decoration:none}a:hover{text-decoration:underline}',
    'code{font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;',
    'background:rgba(175,184,193,.2);padding:.2em .4em;border-radius:6px}',
    'pre{background:#f6f8fa;padding:16px;overflow:auto;border-radius:6px}',
    'pre code{background:transparent;padding:0;font-size:12px}',
    'blockquote{padding:0 1em;color:#57606a;border-left:.25em solid #d0d7de}',
    'table{border-collapse:collapse;display:block;overflow:auto;width:max-content;max-width:100%}',
    'table th,table td{padding:6px 13px;border:1px solid #d0d7de}',
    'table th{font-weight:600;background:#f6f8fa}',
    'table tr:nth-child(2n){background:#f6f8fa}',
    'img{max-width:100%;box-sizing:border-box}',
    'hr{height:.25em;padding:0;margin:24px 0;background:#d0d7de;border:0}',
    'ul,ol{padding-left:2em}li+li{margin-top:.25em}',
    '.ws-missing-image{display:inline-block;padding:4px 10px;border:1px dashed #d0d7de;',
    'border-radius:6px;color:#57606a;font-size:12px;background:#f6f8fa}'
  ].join('');

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // Percent-encode each path segment, matching util/encodePath.js and the
  // CLAUDE.md rule on URL construction.
  function encodePath(path) {
    return String(path).split('/').map(encodeURIComponent).join('/');
  }

  // Resolve a relative markdown reference against the directory holding the
  // document. Returns null for anything that escapes the workspace root or is
  // not a workspace-relative path.
  function resolveWorkspacePath(baseDir, ref) {
    if (!ref || /^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.charAt(0) === '#') {
      return null;   // absolute URL or in-page anchor, not ours to resolve
    }
    var parts = (ref.charAt(0) === '/' ? ref : baseDir + '/' + ref).split('/');
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p === '' || p === '.') { continue; }
      if (p === '..') {
        if (!out.length) { return null; }   // escapes the root
        out.pop();
      } else {
        out.push(p);
      }
    }
    return out.length ? '/' + out.join('/') : null;
  }

  return declare([BorderContainer], {
    baseClass: 'MarkdownViewer',
    disabled: false,
    containerType: 'file',
    file: null,
    url: null,
    markdownSource: null,
    showRaw: false,

    // Copied from File.js:19-48 -- the repo's convention for sibling viewers
    // (TSV_CSV.js does the same) rather than subclassing a viewer whose whole
    // refresh() is a different data path.
    _setFileAttr: function (val) {
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
      this.filepath = val;
      var _self = this;
      return Deferred.when(WS.getObject(val, true), function (meta) {
        _self.file = { metadata: meta };
        _self.refresh();
      });
    },

    startup: function () {
      if (this._started) { return; }
      this.inherited(arguments);

      this.viewHeader = new ContentPane({ content: '', region: 'top' });
      this.viewSubHeader = new ContentPane({ content: '', region: 'top' });
      this.viewer = new ContentPane({ region: 'center' });
      this.addChild(this.viewHeader);
      this.addChild(this.viewSubHeader);
      this.addChild(this.viewer);

      var _self = this;
      if (this.filepath) {
        Deferred.when(WS.getDownloadUrls(this.filepath), function (url) {
          _self.url = url;
        }, function (err) {
          console.log('[Markdown] unable to get download url', err);
        }).always(function () {
          _self.refresh();
        });
      } else {
        this.refresh();
      }
    },

    // Same header as File.js so the viewer looks native alongside the others.
    formatFileMetaData: function (showMetaDataRows) {
      var fileMeta = this.file.metadata;
      var content = '';
      if (this.file && fileMeta) {
        content = '<div><h3 class="section-title-plain close2x pull-left"><b>' +
          escapeHtml(fileMeta.type) + ' file</b>: ' + escapeHtml(fileMeta.name) + '</h3>';
        if (this.url && !WS.forbiddenDownloadTypes.includes(fileMeta.type)) {
          content += '<a href="' + this.url + '" title="Download"><i class="fa icon-download pull-left fa-2x"></i></a>';
        }
        if (showMetaDataRows) {
          content += formatter.keyValueTable(formatter.autoLabel('fileView', fileMeta));
        }
        content += '</tbody></table></div>';
      }
      return content;
    },

    refresh: function () {
      if (!this._started) { return; }
      if (!this.file || !this.file.metadata) {
        this.viewer.set('content', "<div class='error'>Unable to load file</div>");
        return;
      }

      this.viewSubHeader.set('content', this.formatFileMetaData(true));
      this._renderToggle();

      var meta = this.file.metadata;
      if (meta.size > MAX_RENDER_BYTES) {
        this.viewer.set('content',
          '<div style="padding:16px">This file is too large to render (' +
          (meta.size / 1048576).toFixed(1) + ' MB). Download it, or open it in another viewer.</div>');
        return;
      }

      if (this.markdownSource !== null) {
        this._display();
        return;
      }

      this.viewer.set('content', '<div style="padding:16px">Loading&hellip;</div>');
      var _self = this;
      Deferred.when(WS.getObject(this.filepath, false), function (obj) {
        _self.markdownSource = (obj && typeof obj.data === 'string') ? obj.data : String(obj && obj.data || '');
        _self._display();
      }, function (err) {
        console.log('[Markdown] unable to read file', err);
        _self.viewer.set('content', "<div class='error'>Unable to read file</div>");
      });
    },

    _renderToggle: function () {
      var _self = this;
      var node = domConstruct.create('div', { style: 'padding:4px 8px' });
      var btn = domConstruct.create('button', {
        type: 'button',
        textContent: this.showRaw ? 'Show rendered' : 'Show raw',
        style: 'cursor:pointer'
      }, node);
      btn.addEventListener('click', function () {
        _self.showRaw = !_self.showRaw;
        _self._renderToggle();
        _self._display();
      });
      this.viewHeader.set('content', node);
    },

    _display: function () {
      if (this.markdownSource === null) { return; }
      if (this.showRaw) {
        // Raw mode has no security surface at all: textContent, never parsed.
        domConstruct.empty(this.viewer.containerNode);
        var pre = domConstruct.create('pre', {
          style: 'margin:0;padding:16px;overflow:auto;height:100%;box-sizing:border-box;' +
                 'font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace'
        }, this.viewer.containerNode);
        pre.textContent = this.markdownSource;
        return;
      }
      this._renderToIframe(this.markdownSource);
    },

    _renderToIframe: function (src) {
      var _self = this;
      Deferred.when(loadHljs(), function (hljs) {
        Deferred.when(loadHljsCss(), function (themeCss) {
          _self._writeFrame(_self._toHtml(src, hljs), themeCss);
        });
      });
    },

    _toHtml: function (src, hljs) {
      var md = new MarkdownIt({
        html: false,        // INVARIANT 3 -- raw HTML is escaped, never parsed
        linkify: true,
        typographer: false,
        breaks: false,
        highlight: function (str, lang) {
          // Runs in the app origin, so it is wrapped: a highlighter bug must
          // degrade to plain text rather than break the render. Returning ''
          // tells markdown-it to escape the code itself.
          if (hljs && lang && hljs.getLanguage(lang)) {
            try {
              return hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
            } catch (e) { /* fall through */ }
          }
          return '';
        }
      });

      var baseDir = (this.file.metadata.path || '/').replace(/\/+$/, '');
      this._installRules(md, baseDir);
      return md.render(src);
    },

    _installRules: function (md, baseDir) {
      // Rewriting happens on parsed TOKENS, never by regexing rendered HTML.

      // Images: the frame has no base URL and cannot authenticate to the
      // workspace, so a relative <img> could never load. Show a labelled
      // placeholder linking to the workspace item instead of a broken icon.
      md.renderer.rules.image = function (tokens, idx) {
        var token = tokens[idx];
        var src = token.attrGet('src') || '';
        var alt = token.content || '';
        var resolved = resolveWorkspacePath(baseDir, src);
        if (resolved) {
          return '<a class="ws-missing-image" target="_top" href="/workspace' +
            encodePath(resolved) + '">image: ' + escapeHtml(alt || resolved.split('/').pop()) + '</a>';
        }
        if (/^data:image\//i.test(src)) {
          return '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt) + '">';
        }
        // Remote images would be blocked by the frame CSP anyway; make that visible.
        return '<span class="ws-missing-image">image: ' + escapeHtml(alt || src) + '</span>';
      };

      // Links: workspace-relative ones navigate the parent app; external ones
      // open in a new tab. markdown-it's validateLink has already dropped
      // javascript:/vbscript:/file: before we get here.
      var defaultLinkOpen = md.renderer.rules.link_open || function (tokens, idx, opts, env, self) {
        return self.renderToken(tokens, idx, opts);
      };
      md.renderer.rules.link_open = function (tokens, idx, opts, env, self) {
        var token = tokens[idx];
        var href = token.attrGet('href') || '';
        if (href.charAt(0) === '#') {
          return defaultLinkOpen(tokens, idx, opts, env, self);   // in-page anchor
        }
        var resolved = resolveWorkspacePath(baseDir, href);
        if (resolved) {
          token.attrSet('href', '/workspace' + encodePath(resolved));
          token.attrSet('target', '_top');
        } else {
          token.attrSet('target', '_blank');
          token.attrSet('rel', 'noopener noreferrer');
        }
        return defaultLinkOpen(tokens, idx, opts, env, self);
      };

      // Heading ids, so [jump](#section) and tables of contents work.
      var slugs = {};
      var defaultHeadingOpen = md.renderer.rules.heading_open || function (tokens, idx, opts, env, self) {
        return self.renderToken(tokens, idx, opts);
      };
      md.renderer.rules.heading_open = function (tokens, idx, opts, env, self) {
        var inline = tokens[idx + 1];
        if (inline && inline.type === 'inline') {
          var slug = inline.content.toLowerCase().trim()
            .replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
          if (slug) {
            if (slugs[slug]) { slug = slug + '-' + (++slugs[slug]); } else { slugs[slug] = 1; }
            tokens[idx].attrSet('id', slug);
          }
        }
        return defaultHeadingOpen(tokens, idx, opts, env, self);
      };
    },

    _writeFrame: function (body, themeCss) {
      var doc = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
        '<meta http-equiv="Content-Security-Policy" content="' + FRAME_CSP + '">' +
        '<style>' + DOC_CSS + (themeCss || '') + '</style></head>' +
        '<body>' + body + '</body></html>';

      domConstruct.empty(this.viewer.containerNode);
      domStyle.set(this.viewer.containerNode, 'overflow', 'hidden');

      // Set sandbox at creation, before the node enters the document, so the
      // attribute is in place when the document is parsed.
      //
      // The frame cannot be auto-sized to its content: that needs
      // contentDocument.scrollHeight, which requires allow-same-origin, which
      // would defeat the sandbox. Content scrolls inside the frame instead.
      // This is a deliberate trade, not an oversight.
      var iframe = domConstruct.create('iframe', {
        sandbox: SANDBOX,
        style: 'width:100%;height:100%;border:0;display:block'
      });
      domConstruct.place(iframe, this.viewer.containerNode);
      iframe.srcdoc = doc;
    }
  });
});
