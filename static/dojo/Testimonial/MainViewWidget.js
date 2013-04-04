define(["dojo/_base/declare","dojo/dom", "dojo/on",
	"dijit/_Widget", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojox/data/JsonRestStore", "dojo/store/Observable", "dijit/tree/ForestStoreModel", "dojo/data/ItemFileReadStore", "dijit/Tree",
	"dojo/text!./templates/MainViewWidget.html",
	"dijit/layout/TabContainer", "dijit/layout/ContentPane","dijit/layout/BorderContainer", "dijit/form/TextBox", "dijit/form/Textarea","dijit/layout/AccordionContainer"],
	function(declare, dom, on, _Widget, _TemplatedMixin, _WidgetsInTemplateMixin,
		JsonRestStore, Observable, ForestStoreModel, ItemFileReadStore, Tree,
		template){
		return declare("Hisaab.MainViewWidget", [_Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
			// widgetsInTemplate: true,  /*keep this false, otherwise data-dojo-attach-event attribute is a pain in the ass!*/
			templateString: template,
			constructor: function(){
				var self = this;
			},
			startup: function(){
				var self = this;
			},
			search: function(){
				alert('hi');
			},
			addTrip: function(){
				alert("add");
			}
		});
	});