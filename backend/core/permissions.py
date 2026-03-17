from rest_framework.permissions import BasePermission


class IsFirebaseAuthenticated(BasePermission):
    """Grants access if the request carries a valid Firebase ID token."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and isinstance(request.user, dict)
            and "uid" in request.user
        )
