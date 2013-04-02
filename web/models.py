from django.db import models
# Create your models here.

Model = models.Model

class Tester(Model):
    deviceId = models.CharField(max_length=100)


class FbUser(Model):
    user_id = models.CharField(max_length=100)
    name = models.CharField(max_length=100)


