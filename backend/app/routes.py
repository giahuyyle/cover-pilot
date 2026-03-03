from flask import Blueprint, request, jsonify
from .auth import verify_firebase_token

bp = Blueprint("main", __name__)

@bp.get("/")
def index():
    return {"message": "Welcome to the Cover Pilot API!"}

@bp.get("/health")
def health():
    return {"status": "ok"}


@bp.get("/protected")
@verify_firebase_token
def protected():
    """Example protected route — only accessible with a valid Firebase token."""
    user = request.user
    return jsonify({
        "message": "Authenticated",
        "uid": user["uid"],
        "email": user.get("email"),
    })
