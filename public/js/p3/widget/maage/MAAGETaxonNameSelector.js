define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin', 'dojo/text!./MAAGETaxonNameSelector.html',
  'p3/widget/TaxonNameSelector'
], function (
  declare, _WidgetBase, _TemplatedMixin,
  _WidgetsInTemplateMixin, template, TaxonNameSelector
) {
  return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
    templateString: template,
    placeHolder: '',
    value: '',

    postCreate: function () {
      this.inherited(arguments);
      
      // Create the underlying TaxonNameSelector widget
      this.taxonSelector = new TaxonNameSelector({
        placeHolder: this.placeHolder,
        style: 'display: none;' // Hide the original widget
      }, this.hiddenNode);
      
      this.taxonSelector.startup();
      
      // Set up event forwarding
      this.taxonSelector.on('change', (value) => {
        this.inputNode.value = this.taxonSelector.get('displayedValue') || '';
        this.value = value;
        this.emit('change', { value: value });
      });
    },

    onInput: function () {
      // Update the hidden selector when user types
      this.taxonSelector.set('value', this.inputNode.value);
    },

    get: function (attr) {
      if (attr === 'value') return this.taxonSelector ? this.taxonSelector.get('value') : '';
      return this.inherited(arguments);
    },

    set: function (attr, val) {
      if (attr === 'value') {
        if (this.taxonSelector) {
          this.taxonSelector.set('value', val);
          this.inputNode.value = this.taxonSelector.get('displayedValue') || '';
        }
        this.value = val;
      } else {
        this.inherited(arguments);
      }
    }
  });
});