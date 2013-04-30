#!/usr/bin/env python
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "settings")
import settings
import os.path
import tornado.escape
import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
from tornado.options import define, options
from tornado.httpclient import AsyncHTTPClient
import handlers
import motor
import pymongo
import certifi
import tornadio2

# import and define tornado-y things
define("port", default=8888, help="run on the given port", type=int)


define("facebook_app_id", help="your Facebook application API key",
       default=os.environ.get("FACEBOOK_APP_ID"))
define("facebook_secret", help="your Facebook application secret",
       default=os.environ.get("FACEBOOK_SECRET"))

con = motor.MotorClient(os.getenv('MONGOHQ_URL')).open_sync()
db = con.testimonial_db
db['testimonials'].ensure_index([('by', pymongo.ASCENDING), ('for', pymongo.ASCENDING)])
db['users'].ensure_index([('fbid', pymongo.ASCENDING)])

defaults = dict(ca_certs=certifi.where())
http_proxy = os.environ.get('http_proxy')
if http_proxy:
    if http_proxy[:7] == "http://":
        http_proxy = http_proxy[7:]
    defaults['proxy_host'], defaults['proxy_port'] = http_proxy.split(":")
    defaults['proxy_port'] = int(defaults['proxy_port'])

AsyncHTTPClient.configure("tornado.curl_httpclient.CurlAsyncHTTPClient", defaults=defaults)


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
            db=db,
            socket_io_port=os.environ.get("PORT", 8888)
        )
        tornado.web.Application.__init__(self, mappings, **tornado_settings)


class PostModule(tornado.web.UIModule):
    def render(self, post):
        return self.render_string("modules/post.html", post=post)


# the default main page
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
    app = Application()
    handlers.MyConnection.set_application(app)
    tornadio2.SocketServer(app)


if __name__ == "__main__":
    main()
