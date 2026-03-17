from django.urls import path
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def index(request):
    return Response({"message": "Welcome to the Cover Pilot API!"})


@api_view(["GET"])
def health(request):
    return Response({"status": "ok"})


urlpatterns = [
    path("", index),
    path("health/", health),
]
