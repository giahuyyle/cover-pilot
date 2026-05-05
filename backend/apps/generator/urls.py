from django.urls import path

from .views import GenerateProfileResumeView

urlpatterns = [
    path("<str:provider>/<str:model>/", GenerateProfileResumeView.as_view()),
]
