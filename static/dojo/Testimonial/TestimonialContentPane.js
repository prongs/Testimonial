define([
                'dojo/_base/declare',
                'dijit/layout/ContentPane',
                'dijit/_TemplatedMixin',
                'dijit/_WidgetsInTemplateMixin',
                'dojo/text!./templates/TestimonialContentPane.html',
                "dijit/layout/BorderContainer", "dijit/layout/ContentPane", "dijit/layout/TabContainer", "dijit/layout/AccordionContainer", "dijit/Editor", "dijit/_editor/plugins/FontChoice",
    "dijit/_editor/plugins/TextColor", "dijit/_editor/plugins/LinkDialog", "dijit/_editor/plugins/FullScreen"
        ],
        function( declare, ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin, template) {
                return declare('testimonial.TestimonialContentPane', [ ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin ], {
                        templateString: template,
                        constructor: function(args){
                        }
                });
        }
);
