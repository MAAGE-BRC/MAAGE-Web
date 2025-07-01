define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin', 'dojo/text!./MAAGEFilteringSelect.html'
], function (
  declare, _WidgetBase, _TemplatedMixin,
  _WidgetsInTemplateMixin, template
) {
  return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
    templateString: template,
    placeHolder: '',
    value: '',
    store: null,

    postCreate: function () {
      this.inherited(arguments);
      if (this.value) {
        this.selectNode.value = this.value;
      }
    },

    onChange: function () {
      this.value = this.selectNode.value;
      this.emit('change', { value: this.value });
    },

    get: function (attr) {
      if (attr === 'value') return this.selectNode.value;
      return this.inherited(arguments);
    },

    set: function (attr, val) {
      if (attr === 'value') {
        this.selectNode.value = val;
        this.value = val;
      } else if (attr === 'store') {
        this.store = val;
        this._populateOptions();
      } else {
        this.inherited(arguments);
      }
    },

    _populateOptions: function () {
      if (!this.store || !this.selectNode) return;
      
      // Clear existing options except placeholder
      while (this.selectNode.children.length > 1) {
        this.selectNode.removeChild(this.selectNode.lastChild);
      }
      
      // Add options from store
      if (this.store.data) {
        this.store.data.forEach((item) => {
          const option = document.createElement('option');
          option.value = item.id || item.value || item.name;
          option.textContent = item.name || item.label || item.value;
          this.selectNode.appendChild(option);
        });
      }
    }
  });
});