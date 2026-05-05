from django.urls import path

from .views import GenerateResumeView

urlpatterns = [
    path("<str:provider>/<str:model>/", GenerateResumeView.as_view()),
]
