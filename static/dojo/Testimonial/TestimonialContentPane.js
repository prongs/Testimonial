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
                        },
                        postCreate: function(){
                            var self = this;
                            self.editor.save = lang.hitch(self, "save");
                            xhr.get({
                                url: "/write/" + self.friend_id,
                                handleAs: 'json',
                                load: lang.hitch(self, "load_write_testimonial"),
                                error: lang.hitch(self, "error_load_write_testimonial")
                            });
                            xhr.get({
                                url: "/read/" + self.friend_id,
                                handleAs: 'json',
                                load: lang.hitch(self, "load_read_testimonial"),
                                error: lang.hitch(self, "error_load_read_testimonial")
                            });
                        },
                        load_write_testimonial: function(response, ioArgs){
                            var self = this;
                            self.editor.set('value', response.content);
                            self.editor.setDisabled(false);
                        },
                        error_load_write_testimonial: function(error, ioArgs){
                            var self = this;
                            self.editor.set('value', 'Error Loading Testimonial' + error);
                        },

                        load_read_testimonial: function(response, ioArgs){
                            var self = this;
                            self.read_pane.containerNode.innerHTML = response.content;
                        },
                        error_load_read_testimonial: function(error, ioArgs){
                            var self = this;
                          self.read_pane.containerNode.innerHTML = error;
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
                            var self = this;
                            console.log("saved!");
                            console.log(data);
                        },
                        save_xhr_error: function(err, ioArgs){
                            var self = this;
                            console.log("Error!");
                            console.log(err);
                        }
                });
        }
);
