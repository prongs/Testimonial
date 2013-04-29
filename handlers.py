import os
import json
import motor
import datetime
from bson import objectid
import tornado.auth
import tornado.escape
import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
from tornado import ioloop
from tornado.web import authenticated, asynchronous, RequestHandler, UIModule, HTTPError
from tornado import gen
from tornadio2 import SocketConnection, TornadioRouter, event
from django.core.serializers.json import DjangoJSONEncoder
mappings = []


def url(url):
    def decorator(cl):
        mappings.append((url, cl))
        return cl
    return decorator


class BaseRequestHandler(RequestHandler):
    def get_current_user(self):
        user_json = self.get_secure_cookie("fb_user")
        if not user_json:
            return None
        return tornado.escape.json_decode(user_json)


@url("/main")
class MainHandler(BaseRequestHandler, tornado.auth.FacebookGraphMixin):
    @authenticated
    @asynchronous
    def get(self):
        self.facebook_request("/me/home", self._on_stream,
                              access_token=self.current_user["access_token"])

    def _on_stream(self, stream):
        if stream is None:
            # Session may have expired
            self.redirect("/auth/login")
            return
        self.render("stream.html", stream=stream)


@url(r'/auth/login')
class AuthLoginHandler(BaseRequestHandler, tornado.auth.FacebookGraphMixin):
    @asynchronous
    def get(self):
        my_url = (self.request.protocol + "://" + self.request.host +
                  "/auth/login?next=" +
                  tornado.escape.url_escape(self.get_argument("next", "/")))
        if self.get_argument("code", False):
            print "code false"
            self.get_authenticated_user(
                redirect_uri=my_url,
                client_id=self.settings["facebook_app_id"],
                client_secret=self.settings["facebook_secret"],
                code=self.get_argument("code"),
                callback=self._on_auth)
            print "after get_authenticated_user"
            return
        print "authorize_redirect"
        self.authorize_redirect(redirect_uri=my_url,
                                client_id=self.settings["facebook_app_id"],
                                extra_params={"scope": "read_stream"})

    @gen.coroutine
    def _on_auth(self, user):
        print "on_auth"
        if not user:
            raise HTTPError(500, "Facebook auth failed")
        db = self.settings.get('db')
        self.set_secure_cookie("fb_user", tornado.escape.json_encode(user))
        try:
            yield motor.Op(db.create_collection, "notif_" + user['id'], capped=True, size=10000)
        except Exception as e:
            pass
        finally:
            self.redirect(self.get_argument("next", "/"))


@url(r'/auth/logout')
class AuthLogoutHandler(BaseRequestHandler):
    def get(self):
        self.clear_cookie("fb_user")
        self.redirect(self.get_argument("next", "/"))


@url(r'/auth/user')
class AuthUserHandler(BaseRequestHandler):
    @authenticated
    def get(self):
        self.write(self.get_current_user())


@url(r'/')
class HomeHandler(BaseRequestHandler):
    @authenticated
    def get(self):
        token = self.xsrf_token
        user = self.get_current_user()
        self.render('index.html', notifications=True, user=user, facebook_app_id=self.settings['facebook_app_id'])


@url(r'/write/(.*)')
class WriteTestimonialHandler(BaseRequestHandler):
    @authenticated
    @gen.coroutine
    def post(self, for_user):
        by_user = self.get_current_user()['id']
        yield motor.Op(self.settings.get('db').testimonials.update, {'by': str(by_user), 'for': str(for_user)}, {"$set": {'content': self.get_argument("content", "")}}, upsert=True)

    @authenticated
    @asynchronous
    @gen.coroutine
    def get(self, for_user):
        by_user = self.get_current_user()['id']
        result = yield motor.Op(self.settings.get('db').testimonials.find_one, {'by': str(by_user), 'for': str(for_user)})
        self.write({'content': result['content'] if result else ""})
        self.finish()


@url(r'/read/(.*)')
class ReadTestimonialHandler(BaseRequestHandler):
    @authenticated
    @asynchronous
    @gen.coroutine
    def get(self, by_user):
        for_user = self.get_current_user()['id']
        result = yield motor.Op(self.settings.get('db').testimonials.find_one, {'by': str(by_user), 'for': str(for_user)})
        self.write({'content': result['content'] if result else ""})
        self.finish()


class NotificationChecker():
    def __init__(self, connection):
        self.connection = connection
        self.stopped = False

    @gen.coroutine
    def run(self, callback):
        "run check notifications"
        loop = ioloop.IOLoop.instance()
        db = self.connection.application.settings.get('db')
        collection = db["notif_" + self.connection.get_current_user()['id']]
        cursor = collection.find({"read": False}, tailable=True, await_data=True)
        self.stopped = False
        self.results = {}
        while True:
            if self.stopped:
                cursor.close()
            if not cursor.alive:
                print "not alive"
                # While collection is empty, tailable cursor dies immediately
                yield gen.Task(loop.add_timeout, datetime.timedelta(seconds=1))
                cursor = collection.find(tailable=True, await_data=True)
            if (yield cursor.fetch_next):
                res = cursor.next_object()
                if res.get('_id') not in self.results:
                    self.results[res.get('_id')] = res
                    callback(res)

    def stop(self):
        self.stopped = True


class PostModule(UIModule):
    def render(self, post):
        return self.render_string("modules/post.html", post=post)


class MongoAwareEncoder(DjangoJSONEncoder):
    """JSON encoder class that adds support for Mongo objectids."""
    def default(self, o):
        if isinstance(o, objectid.ObjectId):
            return str(o)
        else:
            return super(MongoAwareEncoder, self).default(o)


class MyConnection(SocketConnection, tornado.auth.FacebookGraphMixin, BaseRequestHandler):

    @classmethod
    def set_application(cls, application):
        cls.application = application

    def on_open(self, request):
        self.request = request

    @event
    def message(self, message):
        pass

    @event
    def notifications(self):
        self.notif_checker = NotificationChecker(self)
        self.notif_checker.run(self.send_notification)

    def send_notification(self, x):
        if(type(x) == dict):
            self.emit('notification', json.dumps(x, cls=MongoAwareEncoder))

    @gen.coroutine
    @event
    def notification_read(self, x):
        db = self.settings.get('db')
        notif_coll = db["notif_" + self.get_current_user()['id']]
        yield motor.Op(notif_coll.update, {'from': x}, {"$set": {'read': True}})

    @event
    def disconnect(self, *args, **kwargs):
        print "on_disconnect"

    @event
    def disconnected(self, *args, **kwargs):
        print "on_disconnected"

    def on_close(self, *args, **kwargs):
        try:
            self.notif_checker.stop()
        except:
            pass


MyRouter = TornadioRouter(MyConnection)
mappings = MyRouter.apply_routes(mappings)
