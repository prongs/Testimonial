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
from tornado.auth import FacebookGraphMixin
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

    @property
    def db(self):
        return self.settings.get('db')

    @gen.coroutine
    def ensure_user_in_db(self, user_id):
        "returns True if already in db else false"
        print "ensure_user_in_db 1"
        res = yield motor.Op(self.db.users.find_one, {"fbid": user_id})
        print "ensure_user_in_db 2"
        if not res:
            print "ensure_user_in_db 3"
            yield motor.Op(self.db.users.insert, {"fbid": user_id, "created": datetime.datetime.now()})
            print "ensure_user_in_db 4"
            yield motor.Op(self.db.create_collection, "notif_" + user_id, capped=True, size=10000)
            print "ensure_user_in_db 5"


@url("/main")
class MainHandler(BaseRequestHandler, FacebookGraphMixin):
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
class AuthLoginHandler(BaseRequestHandler, FacebookGraphMixin):
    @asynchronous
    def get(self):
        my_url = (self.request.protocol + "://" + self.request.host +
                  "/auth/login?next=" +
                  tornado.escape.url_escape(self.get_argument("next", "/")))
        if self.get_argument("code", False):
            self.get_authenticated_user(
                redirect_uri=my_url,
                client_id=self.settings["facebook_app_id"],
                client_secret=self.settings["facebook_secret"],
                code=self.get_argument("code"),
                callback=self._on_auth)
            return
        self.authorize_redirect(redirect_uri=my_url,
                                client_id=self.settings["facebook_app_id"],
                                extra_params={"scope": ""})

    @gen.coroutine
    def _on_auth(self, user):
        if not user:
            raise HTTPError(500, "Facebook auth failed")
        self.set_secure_cookie("fb_user", tornado.escape.json_encode(user))
        yield motor.Op(self.ensure_user_in_db, user['id'])
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
    @asynchronous
    @gen.coroutine
    def get(self):
        token = self.xsrf_token
        user = self.get_current_user()
        yield motor.Op(self.db.users.update, {"fbid": user['id']}, {"$set": {"last_login": datetime.datetime.now()}})
        self.render('index.html', user=user, facebook_app_id=self.settings.get('facebook_app_id'), avoid_websockets=self.settings.get('avoid_websockets'))


@url(r'/write/(.*)')
class WriteTestimonialHandler(BaseRequestHandler, FacebookGraphMixin):
    @authenticated
    @asynchronous
    @gen.coroutine
    def post(self, for_user):
        by_user = self.get_current_user()['id']
        yield motor.Op(self.ensure_user_in_db, for_user)
        if self.get_argument('notify', False):
            yield motor.Op(self.db.testimonials.update, {'by': str(by_user), 'for': str(for_user)}, {"$set": {'content': self.get_argument("content", ""), 'saved_content': self.get_argument("content", "")}}, upsert=True)
            yield motor.Op(self.db['notif_' + str(for_user)].insert, {"from": str(by_user), "read": False})
        else:
            yield motor.Op(self.db.testimonials.update, {'by': str(by_user), 'for': str(for_user)}, {"$set": {'content': self.get_argument("content", "")}}, upsert=True)

        whether_to_fb_notify = True

        f_u = yield motor.Op(self.db.users.find_one, {"fbid": for_user})
        last_login = f_u.get('last_login', None)
        if last_login:
            delta = datetime.datetime.now() - last_login
            if delta.days < 1:
                whether_to_fb_notify = False
        last_fb_notified = f_u.get('last_fb_notified', None)
        if last_fb_notified:
            delta = datetime.datetime.now() - last_fb_notified
            if delta.days < 1:
                whether_to_fb_notify = False

        if whether_to_fb_notify:
            app_access_token_url = self._oauth_request_token_url(client_id=self.settings["facebook_app_id"],
                                                                 client_secret=self.settings["facebook_secret"],
                                                                 extra_params={"grant_type": "client_credentials"})
            res = yield motor.Op(self.get_auth_http_client().fetch, app_access_token_url)
            x = res.buffer.read()
            app_access_token = x[x.find('access_token=') + len("access_token="):]
            print "whether_to_fb_notify"
            num_notifs = yield motor.Op(self.db["notif_" + for_user].find({"read": False}).count)
            print "num_notifs: ", num_notifs
            template = ("You have an unread testimonial from @[%s]" % (by_user))
            if num_notifs > 1:
                template = ("You have unread testimonials from @[%s] and %d other friends" % (by_user, num_notifs - 1))
            print template
            res = yield self.facebook_request("/" + for_user + "/notifications",
                                              access_token=app_access_token,
                                              post_args={"template": template, "href": "/"})
            print res
        self.finish()

    @authenticated
    @asynchronous
    @gen.coroutine
    def get(self, for_user):
        by_user = self.get_current_user()['id']
        result = yield motor.Op(self.db.testimonials.find_one, {'by': str(by_user), 'for': str(for_user)})
        self.write({'content': result['content'] if result else ""})
        self.finish()


@url(r'/read/(.*)')
class ReadTestimonialHandler(BaseRequestHandler):
    @authenticated
    @asynchronous
    @gen.coroutine
    def get(self, by_user):
        for_user = self.get_current_user()['id']
        result = yield motor.Op(self.db.testimonials.find_one, {'by': str(by_user), 'for': str(for_user)})
        self.write({'content': result['saved_content'] if result and 'saved_content' in result else ""})
        self.finish()


class NotificationChecker():
    def __init__(self, connection):
        self.connection = connection
        self.stopped = False

    @gen.coroutine
    def run(self, callback):
        "run check notifications"
        loop = ioloop.IOLoop.instance()
        db = self.connection.db
        collection = db["notif_" + self.connection.get_current_user()['id']]
        cursor = collection.find({"read": False}, tailable=True, await_data=True)
        self.stopped = False
        self.results = {}
        while True:
            if self.stopped:
                cursor.close()
            if not cursor.alive:
                # print "not alive"
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


class MyConnection(SocketConnection, FacebookGraphMixin, BaseRequestHandler):

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
    def notification_read(self, _id):
        db = self.db
        notif_coll = db["notif_" + self.get_current_user()['id']]
        res = yield motor.Op(notif_coll.find_one, {'_id': objectid.ObjectId(_id)})
        yield motor.Op(notif_coll.update, {'from': res['from']}, {"$set": {'read': True}}, multi=True)

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
