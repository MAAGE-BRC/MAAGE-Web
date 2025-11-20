define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dijit/_TemplatedMixin',
  'dojo/on', 'dojo/text!./MAAGEButton.html'
], function (
  declare, _WidgetBase, _TemplatedMixin,
  on, template
) {
  return declare([_WidgetBase, _TemplatedMixin], {
    templateString: template,
    label: 'Button',
    variant: 'primary', // primary, secondary, outline
    size: 'md', // sm, md, lg
    disabled: false,
    onClick: function () {},

    postCreate: function () {
      this.inherited(arguments);
      this._updateClasses();
      
      on(this.buttonNode, 'click', this.onClick.bind(this));
    },

    _updateClasses: function () {
      const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
      
      // Size classes
      const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-md',
        lg: 'px-6 py-3 text-lg'
      };

      // Variant classes
      const variantClasses = {
        primary: 'bg-maage-secondary-500 hover:bg-maage-secondary-600 text-white focus:ring-maage-secondary-500',
        secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500',
        outline: 'border border-maage-secondary-500 text-maage-secondary-500 hover:bg-maage-secondary-50 focus:ring-maage-secondary-500'
      };

      const disabledClasses = 'opacity-50 cursor-not-allowed';

      let classes = [
        baseClasses,
        sizeClasses[this.size] || sizeClasses.md,
        variantClasses[this.variant] || variantClasses.primary
      ].join(' ');

      if (this.disabled) {
        classes += ' ' + disabledClasses;
      }

      this.buttonNode.className = classes;
      this.buttonNode.disabled = this.disabled;
    },

    set: function (attr, val) {
      if (attr === 'label') {
        this.buttonNode.innerHTML = val;
        this.label = val;
      } else if (attr === 'disabled') {
        this.disabled = val;
        this._updateClasses();
      } else if (attr === 'variant' || attr === 'size') {
        this[attr] = val;
        this._updateClasses();
      } else {
        this.inherited(arguments);
      }
    }
  });
});