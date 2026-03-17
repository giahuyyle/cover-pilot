from firebase_admin import auth
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from core.firebase import initialize_firebase

initialize_firebase()


class FirebaseAuthentication(BaseAuthentication):
    """DRF authentication class that verifies Firebase ID tokens."""

    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None  # Let other authenticators or AllowAny handle it

        token = auth_header[7:]

        try:
            decoded_token = auth.verify_id_token(token)
            return (decoded_token, token)
        except auth.ExpiredIdTokenError:
            raise AuthenticationFailed("Token expired")
        except auth.InvalidIdTokenError:
            raise AuthenticationFailed("Invalid token")
        except Exception:
            raise AuthenticationFailed("Unauthorized")
