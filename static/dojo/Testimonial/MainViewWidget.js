define(["dojo/_base/declare", "dojo/_base/connect", "dojo/_base/lang", "dojo/_base/event", "dojo/dom", "dojo/dom-class", "dojo/dom-construct", "dojo/on", "dojo/dom-geometry", "dojo/_base/fx", "dojo/fx", "dojo/_base/array",
	"dijit/registry", "dijit/_Widget", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin", "dojox/socket",
	"dojox/data/JsonRestStore", "dojo/store/Observable", "dijit/tree/ForestStoreModel", "dojo/data/ItemFileReadStore", "dijit/Tree",
	"dojo/text!./templates/MainViewWidget.html", "dojo/text!./templates/new_tab.html", 'testimonial/SavePlugin', 'testimonial/HelpPlugin',
	"./TestimonialContentPane", "dijit/layout/ContentPane", "dijit/layout/TabContainer", "dijit/layout/TabController", "dijit/layout/BorderContainer", "dijit/form/TextBox", "dijit/form/Textarea","dijit/layout/AccordionContainer",
	"dijit/layout/BorderContainer", "dijit/layout/ContentPane", "dijit/layout/TabContainer", "dijit/layout/AccordionContainer", "dijit/Editor", "dijit/_editor/plugins/FontChoice",
    "dijit/_editor/plugins/TextColor", "dijit/_editor/plugins/LinkDialog", "dijit/_editor/plugins/FullScreen"
    ],
	function(declare, connect, lang, event, dom, domClass, domConstuct, on, domGeom, base_fx, fx, array,
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
				self.ctr= -1;
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
				var d = {};
				array.forEach(self.friends_data.data, function(friend, index){
					h += "<tr class='friend_row'><td><img src='https://graph.facebook.com/"+friend.id+"/picture' /></td><td><span>"+friend.name+"</span></td><td style='display:none'>"+friend.id+"</td></tr>";
					d[friend.id] = friend;
				});
				self.friends_data.data = d;
				self.friends_list_div.innerHTML = h;
				array.forEach(self.friends_list_div.rows, function(row){
					self.connect(row, "click", lang.hitch(self, "friendRowClicked"));
				});
				self.search_box_focus = false;
				self.search_box_value = "";
				self.search_box_last_searched_query = "";
				self.connect(self.friend_search_box, "onFocus", self.searchBoxOnFocus);
				self.connect(self.friend_search_box, "onBlur", self.searchBoxOnBlur);
				$(self.search_box_feedback_alert_div).alert();
			},
			set_search_box_alert: function(str, cls)
			{
				var self = this;
				domClass.remove(self.search_box_feedback_alert_div, "alert-info");
				domClass.remove(self.search_box_feedback_alert_div, "alert-success");
				domClass.remove(self.search_box_feedback_alert_div, "alert-warning");
				domClass.add(self.search_box_feedback_alert_div, cls);
				self.search_box_feedback_alert_span.innerHTML = str;
			},
			searchFriend: function(evt){
				var self = this;
				self.set_search_box_alert("Searching...", "alert-warning");
				query = self.friend_search_box.get('value').trim().toLowerCase();
				if(query.search(self.search_box_last_searched_query)>=0)
				{
					array.forEach(self.friends_list_div.rows, function(row){
						if(row.style.display!=="none"&&(row.cells[1].innerHTML.toLowerCase().search(query)<0))
							fx.wipeOut({
								node: row
							}).play();
					});
				}
				else if(self.search_box_last_searched_query.search(query)>=0)
				{
					array.forEach(self.friends_list_div.rows, function(row){
						if(row.style.display=="none"&&(row.cells[1].innerHTML.toLowerCase().search(query)>=0))
							fx.wipeIn({
								node: row
							}).play();
					});
				}
				else
				{
					array.forEach(self.friends_list_div.rows, function(row){
						((row.cells[1].innerHTML.toLowerCase().search(query)>=0)?fx.wipeIn:fx.wipeOut)({
							node: row
						}).play();
					});
				}
				self.set_search_box_alert("Search Completed", "alert-success");
				self.ctr = 1;
				self.search_box_last_searched_query = query;
			},
			searchBoxOnFocus: function(){
				var self = this;
				self.search_box_focus = true;
				self.ctr = -1;
				var f = function(){
					if(self.ctr>=0)
						self.ctr++;
					var query = self.friend_search_box.get('value').trim().toLowerCase();
					if(query == self.search_box_value &&
							self.search_box_value!=="" &&
							self.search_box_value!==self.search_box_last_searched_query
						)
						self.searchFriend();
					else
					{
						if(self.search_box_focus)
						{
							if(query == self.search_box_last_searched_query)
							{
								if(query != self.search_box_last_searched_query)
								{
									self.set_search_box_alert("keep typing...", "alert-warning");
								}
								else
									{
										if(self.ctr % 10 === 0)
										{
											self.set_search_box_alert("Start typing...", "alert-warning");
										}
									}
							}
							else
							{
								if(query!=="")
								{
									self.set_search_box_alert("Stop typing to let us search...", "alert-warning");
								}
							}
						}
					}
					self.search_box_value = query;
					if(self.search_box_focus)
						setTimeout(f, 500);
				};
				self.ctr = 9;
				f();
				self.ctr = -1;
			},
			searchBoxOnBlur: function(){
				var self = this;
				self.ctr = -1;
				domClass.remove(self.search_box_feedback_alert_div, "alert-warning");
				domClass.remove(self.search_box_feedback_alert_div, "alert-success");
				domClass.add(self.search_box_feedback_alert_div, "alert-info");
				self.search_box_feedback_alert_span.innerHTML = "Search by Name";
				self.search_box_focus = false;
			},
			friendRowClicked: function(a){
				var self = this;
				var row = a.currentTarget;
				var index = row.cells[row.cells.length-1].innerHTML;
				self.open_friend_tab(index);
			},
			open_friend_tab: function(index, to_read){
				var self = this;
				if(self.friends_tabs[index])
				{
					self.tab_container.selectChild(self.friends_tabs[index]);
					// if to_read, then update the content
					self.friends_tabs[index].load_read_pane();
					return;
				}
				var cp = new TestimonialContentPane({
					title: self.friends_data.data[index].name,
					friend_id: self.friends_data.data[index].id,
					closable: true,
					to_read: to_read||false,
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
				self.previous_num_notif = 0;
				self.notifications = [];
				self.unread_notifications = [];
				self.notif_anim_playing = false;
				self.websocket = io.connect("/");
				self.websocket.on('disconnect', function() {
					self.websocket.socket.reconnect();
				});
				self.websocket.on('notification', function(data){
					data = JSON.parse(data);
					if(data.from&&self.unread_notifications.indexOf(data._id)==-1){
						self.unread_notifications.push(data._id);
						self.notifications.push(data);
						self.num_notif++;
						console.log("self.num_notif: "+self.num_notif);
						if(!self.notif_anim_playing)
							{
								self.notif_anim_playing = true;
								self.play_notification_change_animation();
							}
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

			},
			play_notification_change_animation: function(){
				var self = this;
				if (self.anim && self.anim.active)
					setTimeout(function(){
						self.play_notification_change_animation();
					}, 500);
				if(self.previous_num_notif == self.num_notif)
				{
					self.notif_anim_playing = false;
					return;
				}
				var n = self.num_notif;
				if(n > 0)
				{
					domClass.remove("notif_background", 'badge-info');
					domClass.add("notif_background", 'badge-important');
				}
				else
				{
					domClass.remove("notif_background", 'badge-important');
					domClass.add("notif_background", 'badge-info');
				}
				var num_notif_node = dom.byId("num_notif");
				if(!num_notif_node.style.bottom)
					num_notif_node.style.bottom = "0px";
				self.anim = base_fx.animateProperty({
					node: "num_notif",
					properties:{
						bottom: {
							end: 20*n
						}
					}
				});
				num_notif_html = "";
				for (var i = 0; i <= n+5; i++) {
					num_notif_html += (i + "<br />");
				}
				num_notif_node.innerHTML = num_notif_html;
				self.anim.play();
				array.forEach(self.notifications, function(notification){
					var node = domConstuct.create("li", {innerHTML: "<table class='table-hover'><tr><td><img src='https://graph.facebook.com/" +
						notification.from + "/picture'></td><td>New Testimonial <span></span> <strong></strong></td></tr></table>"}, "notif_list_node", 2);
					FB.api("/"+notification.from, function(resp){
						node.children[0].rows[0].cells[1].children[0].innerHTML = " from ";
						node.children[0].rows[0].cells[1].children[1].innerHTML = resp.name;
					});
					self.connect(node, 'onclick', function(e){
						event.stop(e);
						self.notification_clicked(node, notification.from, notification._id);
					});
				});
				self.notifications = [];
				self.previous_num_notif = n;
				setTimeout(function(){
					self.play_notification_change_animation();
				}, 500);
			},
			notification_clicked: function(node, id, _id){ // id is fbid and _id is the _id of the mongodb
				var self = this;
				self.open_friend_tab(id, true);
				var to_wipe = [];
				var other_notification_from_names = $("li table tr td strong", $(node).parent());
				var this_notification_from_name = $("table tr td strong", $(node)).html();
				for (var j = 0; j < other_notification_from_names.length; j++) {
					if($(other_notification_from_names[j]).html() == this_notification_from_name)
					{
						to_wipe.push(other_notification_from_names[j].parentNode.parentNode.parentNode.parentNode.parentNode);
					}
				}
				array.forEach(to_wipe, function(nd, i) {
					nd.style.opacity = 0;
					base_fx.animateProperty({
						node: nd,
						properties:{
							height:{
								end:0
							}
						},
						onEnd:function(){
							nd.parentNode.removeChild(nd);
						}
					}).play();
					self.num_notif--;
				});
				i = self.unread_notifications.splice(self.unread_notifications.indexOf(_id), 1); //remove from array
				self.websocket.emit("notification_read", _id);
				if(!self.notif_anim_playing)
					self.play_notification_change_animation();
			}
		});
	});
