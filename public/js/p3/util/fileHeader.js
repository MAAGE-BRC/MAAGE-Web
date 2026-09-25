define([
  'dojo/dom-construct', '../WorkspaceManager', '../widget/formatter'
], function (
  domConstruct, WS, formatter
) {
  //
  // Shared header for the workspace file viewers.
  //
  // Replaces a formatFileMetaData() that was duplicated verbatim into File.js
  // and TSV_CSV.js and had four problems:
  //
  //   1. It appended '</tbody></table>' unconditionally, even when no table had
  //      been opened -- which is the common path, since File.js passes
  //      showMetaDataRows=false when it renders content. (And when a table IS
  //      built, formatter.keyValueTable already closes its own tags, so the
  //      extra pair was redundant there too.)
  //   2. It floated both the heading and the download icon with `pull-left`
  //      and never cleared them, so the container collapsed to zero height and
  //      the floats escaped their pane -- overlapping whatever was rendered
  //      below.
  //   3. It concatenated fileMeta.name and fileMeta.type -- both
  //      user-controlled -- straight into an HTML string that is then parsed by
  //      ContentPane.set('content', ...). That is the exact pattern CLAUDE.md
  //      section 2 forbids.
  //   4. The two copies had already diverged: TSV_CSV.js never received the
  //      fixes File.js got, so it still rendered href=null when the signed URL
  //      had not resolved, left that href unquoted, and silently ignored its
  //      own showMetaDataRows argument.
  //
  // Everything here is built with domConstruct and textContent, so no user
  // value is ever parsed as markup.
  //

  return {
    //
    // One header row: "<type> file: <name>" plus a download icon.
    //
    // Returns a DOM node. Pass it to ContentPane.set('content', node) -- the
    // pane accepts a node and will not parse it as HTML.
    //
    // opts:
    //   meta  - the file metadata object (name, type)
    //   url   - signed download URL, or falsy while it is still resolving
    //
    buildHeaderNode: function (opts) {
      var meta = opts && opts.meta;
      var node = domConstruct.create('div', {
        'class': 'fileViewerHeader',
        style: 'display:flex;align-items:center;gap:8px;min-width:0'
      });
      if (!meta) { return node; }

      var title = domConstruct.create('h3', {
        'class': 'section-title-plain close2x',
        style: 'margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'
      }, node);
      var label = domConstruct.create('b', {}, title);
      label.textContent = (meta.type || '') + ' file';
      // Appended as a text node, so a filename containing markup stays text.
      title.appendChild(document.createTextNode(': ' + (meta.name || '')));

      // Only render the link once the signed URL has resolved. Rendering it
      // early produced href="null"; TSV_CSV.js still has that bug today.
      if (opts.url && !WS.forbiddenDownloadTypes.includes(meta.type)) {
        var a = domConstruct.create('a', {
          href: opts.url,
          title: 'Download',
          style: 'flex:0 0 auto;line-height:1'
        }, node);
        domConstruct.create('i', { 'class': 'fa icon-download fa-2x' }, a);
      }
      return node;
    },

    //
    // The header row plus the full key/value metadata table.
    //
    // This is a FALLBACK view: File.js shows it only when a file cannot be
    // displayed. Do not render it alongside actual file content -- a tall table
    // above a full-height viewer is what made the Markdown viewer unreadable.
    //
    buildHeaderWithMetaNode: function (opts) {
      var meta = opts && opts.meta;
      var outer = domConstruct.create('div');
      domConstruct.place(this.buildHeaderNode(opts), outer);
      if (!meta) { return outer; }

      // keyValueTable emits its own complete <table>...</table> -- which is
      // why the old code's extra '</tbody></table>' was redundant here and
      // orphaned everywhere else. Its content comes from formatter.autoLabel,
      // trusted app output, so a string insert is acceptable; it is scoped to
      // its own container rather than concatenated onto the header markup.
      domConstruct.create('div', {
        innerHTML: formatter.keyValueTable(formatter.autoLabel('fileView', meta))
      }, outer);

      return outer;
    }
  };
});
