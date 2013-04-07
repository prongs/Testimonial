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
                            var self = this;
                            self.friend_name = args.title;
                            self.inherited(arguments);
                        },
                        postCreate: function(){
                            var self = this;
                            self.saved = true;
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
                            self.savedValue = response.content;
                            self.saved = true;
                            self.editor.set('value', self.savedValue);
                            self.editor.setDisabled(false);
                            setTimeout(function(){self.checkSavedStatus();}, 1);
                        },
                        error_load_write_testimonial: function(error, ioArgs){
                            var self = this;
                            self.editor.set('value', 'Error Loading Testimonial' + error);
                        },

                        load_read_testimonial: function(response, ioArgs){
                            var self = this;
                            self.read_pane.containerNode.innerHTML = (response.content.length)?response.content:(self.title + " has not written a testimonial for you!");

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
                            var self = this;
                            self.savedValue = self.editor.get('value');
                            content = {content: self.savedValue, _xsrf: self.getCookie('_xsrf')};
                            xhr.post({
                                url: "/write/" + self.friend_id,
                                content:content,
                                load: lang.hitch(self, "save_xhr_success"),
                                error: lang.hitch(self, "save_xhr_error")
                            });
                        },
                        save_xhr_success: function(data, ioArgs){
                            var self = this;
                            self.saved = true;
                            self.set('title', self.friend_name);
                            setTimeout(function(){self.checkSavedStatus();}, 1);
                        },
                        save_xhr_error: function(err, ioArgs){
                            var self = this;
                            console.log("Error!");
                            console.log(err);
                        },
                        checkSavedStatus: function(){
                            var self = this;
                            if(self.editor.get('value') == self.savedValue)
                            {
                                setTimeout(function(){self.checkSavedStatus();}, 1);
                                return;
                            }
                            self.set('title', self.friend_name + "&nbsp;&nbsp;<sup>*</sup>");
                            self.saved = false;
                        },
                        onClose: function(){
                            alert('onclose!');
                        },
                        confirm_close: function(){
                            var self = this;
                            if(self.saved)
                                return confirm("Do you really want to Close this?");
                            return confirm('Your testimonial is not saved! Pressing OK will discard your changes') && confirm("Do you really want to discard?");
                            return false;
                        }
                });
        }
);
