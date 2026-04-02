from django.urls import path

from .views import ProfileView, StorageListView

urlpatterns = [
    path("me/", ProfileView.as_view()),
    path("storage/", StorageListView.as_view()),
]
