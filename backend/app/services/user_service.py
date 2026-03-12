from datetime import datetime, timezone

from firebase_admin import firestore
from app.models.user import User


def _users_ref():
    db = firestore.client()
    return db.collection("users")


def get_user_profile(uid: str) -> dict | None:
    """Fetch user profile from Firestore by UID."""
    doc = _users_ref().document(uid).get()
    if not doc.exists:
        return None
    return doc.to_dict()


def create_user_profile(uid: str, email: str, display_name: str = "") -> dict:
    """Create a new user profile doc in Firestore (called on first login)."""
    user = User(uid=uid, email=email, display_name=display_name)
    _users_ref().document(uid).set(user.to_dict())
    return user.to_dict()


def update_user_profile(uid: str, data: dict) -> dict:
    """Update allowed profile fields for a user."""
    allowed_fields = {"display_name", "photo_url", "bio"}
    updates = {k: v for k, v in data.items() if k in allowed_fields}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    _users_ref().document(uid).update(updates)
    return {**updates, "uid": uid}
