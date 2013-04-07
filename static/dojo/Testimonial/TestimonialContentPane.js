define([
                'dojo/_base/declare', 'dojo/_base/connect', "dojo/_base/lang", "dojo/_base/xhr",
                'dijit/layout/ContentPane',
                'dijit/_TemplatedMixin',
                'dijit/_WidgetsInTemplateMixin',
                'dojo/text!./templates/TestimonialContentPane.html', 'testimonial/SavePlugin',
                "dijit/layout/BorderContainer", "dijit/layout/ContentPane", "dijit/layout/TabContainer", "dijit/layout/AccordionContainer", "dijit/Editor", "dijit/_editor/plugins/FontChoice",
    "dijit/_editor/plugins/TextColor", "dijit/_editor/plugins/LinkDialog", "dijit/_editor/plugins/FullScreen", "dijit/form/Form", "dijit/form/Button", "bootstrap/Button"
        ],
        function( declare, connect, lang, xhr, ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin, template, TestimonialSavePlugin) {
                return declare('testimonial.TestimonialContentPane', [ ContentPane, _TemplatedMixin, _WidgetsInTemplateMixin ], {
                        templateString: template,
                        constructor: function(args){
                            console.log(args);
                        },
                        postCreate: function(){
                            var self = this;
                            self.editor.save = lang.hitch(self, "save");
                        },
                        getCookie: function(name) {
                            var r = document.cookie.match("\\b" + name + "=([^;]*)\\b");
                            return r ? r[1] : undefined;
                        },
                        save: function(args){
                            var self =this;
                            content = {content: self.editor.getValue(), _xsrf: self.getCookie('_xsrf')};
                            xhr.post({
                                url: "/write/" + self.friend_id,
                                content:content,
                                load: lang.hitch(self, "save_xhr_success"),
                                error: lang.hitch(self, "save_xhr_error")
                            });
                        },
                        save_xhr_success: function(data, ioArgs){
                            console.log("saved!");
                            console.log(data);
                        },
                        save_xhr_error: function(err, ioArgs){
                            console.log("Error!");
                            console.log(err);
                        }
                });
        }
);
