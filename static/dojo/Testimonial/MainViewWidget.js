define(["dojo/_base/declare", "dojo/_base/connect", "dojo/dom", "dojo/dom-class", "dojo/on", "dojo/dom-geometry", "dojo/_base/fx", "dojo/fx", "dojo/_base/array",
	"dijit/registry", "dijit/_Widget", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin", "dojox/socket",
	"dojox/data/JsonRestStore", "dojo/store/Observable", "dijit/tree/ForestStoreModel", "dojo/data/ItemFileReadStore", "dijit/Tree",
	"dojo/text!./templates/MainViewWidget.html", "dojo/text!./templates/new_tab.html", 'testimonial/SavePlugin', 'testimonial/HelpPlugin',
	"./TestimonialContentPane", "dijit/layout/ContentPane", "dijit/layout/TabContainer", "dijit/layout/TabController", "dijit/layout/BorderContainer", "dijit/form/TextBox", "dijit/form/Textarea","dijit/layout/AccordionContainer",
	"dijit/layout/BorderContainer", "dijit/layout/ContentPane", "dijit/layout/TabContainer", "dijit/layout/AccordionContainer", "dijit/Editor", "dijit/_editor/plugins/FontChoice",
    "dijit/_editor/plugins/TextColor", "dijit/_editor/plugins/LinkDialog", "dijit/_editor/plugins/FullScreen"
    ],
	function(declare, connect, dom, domClass, on, domGeom, base_fx, fx, array,
		registry, _Widget, _TemplatedMixin, _WidgetsInTemplateMixin, Socket,
		JsonRestStore, Observable, ForestStoreModel, ItemFileReadStore, Tree,
		template, newTabTemplate, TestimonialSavePlugin, TestimonialHelpPlugin, TestimonialContentPane){
		return declare("testimonial.MainViewWidget", [_Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
			templateString: template,
			wipe_out: true,
			friends_data : {},
			friends_tabs:{},
			constructor: function(args){
				var self=this;
			},
			postCreate: function(){
				var self=this;
				// self.connect(registry.byNode(self.editor.toolbar.containerNode.children[self.editor.toolbar.containerNode.children.length-1]), "onChange", self.toggle_fullscreen);
				connect.subscribe('dijit.Editor.getPlugin', null, function(obj){
                    if(obj.plugin)
                        return;
                    var name = obj.args.name;
                    if(name == "testimonial.SavePlugin")
                    {
                        obj.plugin = new TestimonialSavePlugin();
                    }
					else if(name == "testimonial.HelpPlugin")
                    {
                        obj.plugin = new TestimonialHelpPlugin();
                    }
                });
			},
			toggle_fullscreen: function(){
				var self=this;
				(self.wipe_out?fx.wipeOut:fx.wipeIn)({
					node: "top_navbar"
				}).play();
				self.wipe_out = !self.wipe_out;
			},
			set_friends_data: function(friends_data){
				var self=this;
				self.friends_data = friends_data;
				self.friends_data.data.sort(function(a,b){
					if (a.name < b.name)
						return -1;
					else if (a.name>b.name)
						return 1;
					else
						return 0;
				});
				h = "";
				array.forEach(self.friends_data.data, function(friend, index){
					h += "<tr class='friend_row'><td><img src='https://graph.facebook.com/"+friend.id+"/picture' /></td><td><span>"+friend.name+"</span></td><td style='display:none'>"+index+"</td></tr>";
				});
				self.friends_list_div.innerHTML = h;
				array.forEach(self.friends_list_div.rows, function(row){
					self.connect(row, "click", self.friendRowClicked);
				});
				self.connect(self.friend_search_box, "onKeyUp", self.searchFriend);
			},
			searchFriend: function(evt){
				var self = this;
				query = self.friend_search_box.get('value');
				array.forEach(self.friends_list_div.rows, function(row){
					((row.cells[1].innerHTML.toLowerCase().search(query.toLowerCase())>=0)?fx.wipeIn:fx.wipeOut)({
						node: row
					}).play();

				});
			},
			friendRowClicked: function(a){
				var self=this;
				var row = a.currentTarget;
				var index = parseInt(row.cells[row.cells.length-1].innerHTML, 10);
				if(self.friends_tabs[index])
				{
					self.tab_container.selectChild(self.friends_tabs[index]);
					return;
				}
				var cp = new TestimonialContentPane({
					title: self.friends_data.data[index].name,
					friend_id: self.friends_data.data[index].id,
					closable: true,
					onClose:function(){
						conf = this.confirm_close();
						if (conf){
							self.friends_tabs[index] = null;
							return true;
						}
						return false;
					}
					// content: newTabTemplate
				});
				self.tab_container.addChild(cp);
				self.friends_tabs[index]=cp;
				self.tab_container.selectChild(cp);
				self.connect(registry.byNode(cp.editor.toolbar.containerNode.children[cp.editor.toolbar.containerNode.children.length-1]), "onChange", self.toggle_fullscreen);
			},
			setupWebsocket: function(){
				var self = this;
				self.num_notif = 0;
				self.websocket = io.connect("/");
				self.websocket.on('disconnect', function() {
					self.websocket.socket.reconnect();
				});
				self.websocket.on('notification', function(data){
					data = JSON.parse(data);
					if(data.from){
						self.add_notification(data);
					}
				});
				self.websocket.on('connect', function(){
					self.websocket.emit("notifications", {});
				});
			},
			add_notification: function(data){
				var self = this;
				var notif_bg_node = dom.byId("notif_background");
				domClass.remove(notif_bg_node, 'badge-info');
				domClass.add(notif_bg_node, 'badge-important');
				self.num_notif++;
				var num_notif_node = dom.byId("num_notif");
				if(!num_notif_node.style.bottom)
					num_notif_node.style.bottom = "0px";
				var anim = base_fx.animateProperty({
					node: num_notif_node,
					properties:{
						bottom: {
							end: 20*self.num_notif
						}
					}
				});
				num_notif_html = "";
				for (var i = 0; i <= self.num_notif; i++) {
					num_notif_html += (i + "<br />");
				}
				num_notif_node.innerHTML = num_notif_html;
				play_notification_change_animation;
			},
			play_notification_change_animation: function(anim){
				var self = this;
				if(self.anim.active)
					setTimeout(function(){
						self.play_notification_change_animation(anim);
					}, 100);
			}
		});
	});
