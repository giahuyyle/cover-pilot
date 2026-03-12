from flask import Blueprint, request, jsonify
from app.auth import verify_firebase_token
from app.services.user_service import get_user_profile, update_user_profile

bp = Blueprint("users", __name__)


@bp.get("/me")
@verify_firebase_token
def get_profile():
    """Get the current user's profile from Firestore."""
    uid = request.user["uid"]
    profile = get_user_profile(uid)
    if profile is None:
        return jsonify({"error": "Profile not found"}), 404
    return jsonify(profile)


@bp.put("/me")
@verify_firebase_token
def update_profile():
    """Update the current user's profile in Firestore."""
    uid = request.user["uid"]
    data = request.get_json()
    updated = update_user_profile(uid, data)
    return jsonify(updated)
