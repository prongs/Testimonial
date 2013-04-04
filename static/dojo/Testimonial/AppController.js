define(["dojo/_base/declare","./MainViewWidget","dojo/dom"],
function(declare,MainViewWidget,dom){
    return declare("Hisaab.AppController",[], {
        init: function(){
            var self=this;
            var args={};
            self.viewController = new MainViewWidget(args);
            self.viewController.startup();
            self.viewController.placeAt(dom.byId("mainViewWidgetDiv"));
            }
        });
    });
