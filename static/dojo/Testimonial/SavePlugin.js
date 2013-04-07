define(['dojo/_base/declare', "dojox/editor/plugins/Save"],
	function(declare, dojox_save_plugin){
		return declare('testimonial.SavePlugin', [dojox_save_plugin], {
			save: function(content){
				alert(content);
				this.inherited(arguments);
			}
		});
});
