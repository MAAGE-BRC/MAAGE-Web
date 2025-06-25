define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin', 'dojo/text!./MAAGECheckBox.html'
], function (
  declare, _WidgetBase, _TemplatedMixin,
  _WidgetsInTemplateMixin, template
) {
  return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
    templateString: template,
    checked: false,
    label: '',

    postCreate: function () {
      this.inherited(arguments);
    },

    onChange: function () {
      this.checked = this.checkboxNode.checked;
      this.emit('change', { checked: this.checked });
    },

    get: function (attr) {
      if (attr === 'value' || attr === 'checked') return this.checkboxNode.checked;
      return this.inherited(arguments);
    },

    set: function (attr, val) {
      if (attr === 'value' || attr === 'checked') {
        this.checkboxNode.checked = val;
        this.checked = val;
      } else {
        this.inherited(arguments);
      }
    }
  });
});