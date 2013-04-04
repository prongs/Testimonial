#!/usr/bin/env python
import os.path
import os
import tornado.escape
import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
import unicodedata
from django.core.management import execute_from_command_line
from tornado.options import define, options
import handlers
# import and define tornado-y things
define("port", default=8888, help="run on the given port", type=int)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "settings")
import settings

define("facebook_app_id", help="your Facebook application API key",
       default=os.environ.get("FACEBOOK_APP_ID"))
define("facebook_secret", help="your Facebook application secret",
       default=os.environ.get("FACEBOOK_SECRET"))


# application settings and handle mapping info
class Application(tornado.web.Application):
    def __init__(self):
        mappings = handlers.mappings + [
            (r"/([^/]+)?", MainHandler)
        ]
        tornado_settings = dict(
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            debug=True,
            cookie_secret="121a1a1ffbcd3434fdfadbeff3458908f890088bfc878c",
            login_url="/auth/login",
            xsrf_cookies=True,
            facebook_app_id=options.facebook_app_id,
            facebook_secret=options.facebook_secret,
            ui_modules={"Post": PostModule},
            autoescape=None,
        )
        tornado.web.Application.__init__(self, mappings, **tornado_settings)


class PostModule(tornado.web.UIModule):
    def render(self, post):
        return self.render_string("modules/post.html", post=post)


# the main page
class MainHandler(tornado.web.RequestHandler):
    def get(self, q):
        if 'GOOGLEANALYTICSID' in os.environ:
            google_analytics_id = os.environ['GOOGLEANALYTICSID']
        else:
            google_analytics_id = False

        self.render(
            "main.html",
            page_heading='Hi!',
            google_analytics_id=google_analytics_id,
        )


# RAMMING SPEEEEEEED!
def main():
    # print settings.DATABASES
    # execute_from_command_line(["syncdb", "syncdb"])
    tornado.options.parse_command_line()
    print options.facebook_app_id, options.facebook_secret
    http_server = tornado.httpserver.HTTPServer(Application())
    http_server.listen(os.environ.get("PORT", 8888))

    # start it up
    tornado.ioloop.IOLoop.instance().start()


if __name__ == "__main__":
    main()
