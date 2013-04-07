define([
                'dojo/_base/declare', 'dojo/_base/connect',
                'dijit/layout/ContentPane',
                'dijit/_TemplatedMixin',
                'dijit/_WidgetsInTemplateMixin',
                'dojo/text!./templates/TestimonialContentPane.html', 'testimonial/SavePlugin',
                "dijit/layout/BorderContainer", "dijit/layout/ContentPane", "dijit/layout/TabContainer", "dijit/layout/AccordionContainer", "dijit/Editor", "dijit/_editor/plugins/FontChoice",
    "dijit/_editor/plugins/TextColor", "dijit/_editor/plugins/LinkDialog", "dijit/_editor/plugins/FullScreen", "dijit/form/Form", "dijit/form/Button", "bootstrap/Button"
        ],
        function( declare, connect, ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin, template, TestimonialSavePlugin) {
                return declare('testimonial.TestimonialContentPane', [ ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin ], {
                        templateString: template,
                        constructor: function(args){
                        },
                });
        }
);
