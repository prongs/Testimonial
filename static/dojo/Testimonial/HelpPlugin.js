define(['dojo/_base/declare', "dojo/_base/lang", "dojo/on",
 "dojox/editor/plugins/Save", "dijit/_editor/_Plugin", "dijit/form/Button",
	"bootstrap/Modal", "dojo/text!./templates/HelpPluginModal.html"
	],
	function(declare, lang, on, dojox_save_plugin, _Plugin, Button, Modal, modal_template){
		return declare('testimonial.HelpPlugin', [_Plugin], {
			_initButton: function(){
				this.button = new Button({
				label: "Help",
				showLabel: false,
				iconClass: "HelpPluginIcon",
				tabIndex: "-1",
				onClick: dojo.hitch(this, "open_help")
				});
			},
			updateState: function(){
				this.button.domNode.style.display="";
			},
			open_help: function(){
				if(!this.modal)
				{
					this.modal = new Modal({
					templateString: modal_template
					});
					on(this.modal.ok_btn, 'click', lang.hitch(this.modal, 'hide'));
				}
				this.modal.show();
			}
		});
});
