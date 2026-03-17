from django.urls import path

from .views import GenerateResumeView

urlpatterns = [
    path("", GenerateResumeView.as_view()),
]
