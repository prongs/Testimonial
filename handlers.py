import os
import json
import motor
import tornado.auth
import tornado.escape
import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
from tornado.web import authenticated, asynchronous, RequestHandler, UIModule, HTTPError
from tornado import gen
mappings = []


def url(url):
    def decorator(cl):
        mappings.append((url, cl))
        return cl
    return decorator


class BaseHandler(RequestHandler, tornado.auth.FacebookGraphMixin):
    def get_current_user(self):
        user_json = self.get_secure_cookie("fb_user")
        if not user_json:
            return None
        return tornado.escape.json_decode(user_json)


@url("/main")
class MainHandler(BaseHandler):
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
class AuthLoginHandler(BaseHandler):
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

    def _on_auth(self, user):
        print "on_auth"
        if not user:
            raise HTTPError(500, "Facebook auth failed")
        self.set_secure_cookie("fb_user", tornado.escape.json_encode(user))
        self.redirect(self.get_argument("next", "/"))


@url(r'/auth/logout')
class AuthLogoutHandler(BaseHandler):
    def get(self):
        self.clear_cookie("fb_user")
        self.redirect(self.get_argument("next", "/"))


@url(r'/auth/user')
class AuthUserHandler(BaseHandler):
    @authenticated
    def get(self):
        self.write(self.get_current_user())


@url(r'/')
class HomeHandler(BaseHandler):
    @authenticated
    def get(self):
        token = self.xsrf_token
        user = self.get_current_user()
        self.render('index.html', notifications=True, user=user, facebook_app_id=self.settings['facebook_app_id'])


@url(r'/write/(.*)')
class WriteTestimonialHandler(BaseHandler):
    @authenticated
    @gen.engine
    def post(self, for_user):
        by_user = self.get_current_user()['id']
        yield motor.Op(self.settings.get('db').testimonials.update, {'by': str(by_user), 'for': str(for_user)}, {"$set": {'content': self.get_argument("content", "")}}, upsert=True)

    @authenticated
    @gen.engine
    @asynchronous
    def get(self, for_user):
        by_user = self.get_current_user()['id']
        result = yield motor.Op(self.settings.get('db').testimonials.find_one, {'by': str(by_user), 'for': str(for_user)})
        print result
        self.write({'content': result['content'] if result else ""})
        self.finish()


@url(r'/read/(.*)')
class ReadTestimonialHandler(BaseHandler):
    @authenticated
    @gen.engine
    @asynchronous
    def get(self, by_user):
        for_user = self.get_current_user()['id']
        result = yield motor.Op(self.settings.get('db').testimonials.find_one, {'by': str(by_user), 'for': str(for_user)})
        self.write({'content': result['content'] if result else ""})
        self.finish()


class PostModule(UIModule):
    def render(self, post):
        return self.render_string("modules/post.html", post=post)
