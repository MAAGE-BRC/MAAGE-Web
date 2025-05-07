define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin', 'dojo/text!./MAAGETextBox.html'
], function (
  declare, _WidgetBase, _TemplatedMixin,
  _WidgetsInTemplateMixin, template
) {
  return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
    templateString: template,
    placeHolder: '',
    value: '',

    postCreate: function () {
      this.inherited(arguments);
      if (this.value) {
        this.inputNode.value = this.value;
      }
    },

    onInput: function () {
      this.value = this.inputNode.value;
      this.emit('change', { value: this.value });
    },

    onKeyDown: function (e) {
      this.emit('keypress', e);
    },

    get: function (attr) {
      if (attr === 'value') return this.inputNode.value;
      return this.inherited(arguments);
    },

    set: function (attr, val) {
      if (attr === 'value') {
        this.inputNode.value = val;
        this.value = val;
      } else {
        this.inherited(arguments);
      }
    }
  });
});