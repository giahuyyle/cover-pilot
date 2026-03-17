from django.urls import path, include

urlpatterns = [
    path("", include("core.urls")),
    path("api/users/", include("apps.users.urls")),
    path("api/generate/", include("apps.generator.urls")),
]
