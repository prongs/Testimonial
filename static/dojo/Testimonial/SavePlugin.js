define(['dojo/_base/declare', "dojo/_base/lang", "dojox/editor/plugins/Save"],
	function(declare, lang, dojox_save_plugin){
		return declare('testimonial.SavePlugin', [dojox_save_plugin], {
			_initButton: function(){
				var strings = dojo.i18n.getLocalization("dojox.editor.plugins", "Save");
				if(!this.editor.save)
					this.editor.save = function(args){};
				this.button = new dijit.form.Button({
					label: strings["save"],
					showLabel: false,
					iconClass: this.iconClassPrefix + " " + this.iconClassPrefix + "Save",
					tabIndex: "-1",
					onClick: lang.hitch(this.editor, "save")
				});
			}
		});
});
