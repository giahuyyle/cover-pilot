from django.urls import path

from .views import ProfileView, ResumeParseView, StorageListView

urlpatterns = [
    path("me/", ProfileView.as_view()),
    path("me/parse-resume/", ResumeParseView.as_view()),
    path("storage/", StorageListView.as_view()),
]
