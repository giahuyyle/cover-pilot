from functools import wraps
from flask import request, jsonify
from firebase_admin import auth


def verify_firebase_token(f):
    """Decorator to verify Firebase ID token on protected routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        token = auth_header.replace("Bearer ", "")

        try:
            decoded_token = auth.verify_id_token(token)
            request.user = decoded_token  # uid, email, etc.
        except auth.ExpiredIdTokenError:
            return jsonify({"error": "Token expired"}), 401
        except auth.InvalidIdTokenError:
            return jsonify({"error": "Invalid token"}), 401
        except Exception:
            return jsonify({"error": "Unauthorized"}), 401

        return f(*args, **kwargs)
    return decorated_function
