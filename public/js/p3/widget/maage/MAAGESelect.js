define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin', 'dojo/on', 'dojo/text!./MAAGESelect.html'
], function (
  declare, _WidgetBase, _TemplatedMixin,
  _WidgetsInTemplateMixin, on, template
) {
  return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
    templateString: template,
    value: '',
    options: [],
    onChange: function () {},

    postCreate: function () {
      this.inherited(arguments);
      
      this.selectNode.innerHTML = '';

      if (Array.isArray(this.options)) {
        this._populateOptions();
      } else {
        console.warn('MAAGESelect: `options` must be passed via data-dojo-props. No options were rendered.');
      }

      if (this.value) {
        this.selectNode.value = this.value;
      }
    },

    _populateOptions: function () {
      this.options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.text = opt.label || opt.value;
        if (opt.selected) o.selected = true;
        this.selectNode.appendChild(o);
      });
    },

    get: function (attr) {
      if (attr === 'value') return this.selectNode.value;
      return this.inherited(arguments);
    },

    set: function (attr, val) {
      if (attr === 'value') {
        this.selectNode.value = val;
      } else if (attr === 'options') {
        this.options = val;
        this.selectNode.innerHTML = '';
        this._populateOptions();
      } else {
        this.inherited(arguments);
      }
    }
  });
});