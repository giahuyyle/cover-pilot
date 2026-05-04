from datetime import datetime, timezone

from firebase_admin import firestore

from .models import User

PROFILE_SECTION_FIELDS = {"basic", "experience", "projects", "education", "certificates", "skills"}
BASIC_FIELDS = (
    "phone_country_code",
    "phone",
    "contact_email",
    "location",
    "headline",
    "github_url",
    "linkedin_url",
    "portfolio_url",
    "summary",
)
CERTIFICATE_FIELDS = ("name", "issuer", "issue_date", "expiration_date", "credential_id", "credential_url")
SKILL_FIELDS = ("name", "category")
MAX_PROJECT_STACK_ITEMS = 5


def _users_ref():
    db = firestore.client()
    return db.collection("users")


def _clean_string(value) -> str:
    return str(value).strip() if value is not None else ""


def _clean_string_list(value, limit: int | None = None) -> list[str]:
    if not isinstance(value, list):
        return []

    cleaned = [_clean_string(item) for item in value]
    cleaned = [item for item in cleaned if item]
    if limit is not None:
        return cleaned[:limit]
    return cleaned


def _normalize_basic(value) -> dict:
    source = value if isinstance(value, dict) else {}
    basic = {field: _clean_string(source.get(field, "")) for field in BASIC_FIELDS}
    basic["phone_country_code"] = basic["phone_country_code"] or "+1"
    return basic


def _normalize_experience_item(value) -> dict:
    source = value if isinstance(value, dict) else {}
    return {
        "company": _clean_string(source.get("company", "")),
        "role": _clean_string(source.get("role", "")),
        "location": _clean_string(source.get("location", "")),
        "start_date": _clean_string(source.get("start_date", "")),
        "end_date": _clean_string(source.get("end_date", "")),
        "is_current": bool(source.get("is_current", False)),
        "description": _clean_string_list(source.get("description", [])),
    }


def _normalize_project_item(value) -> dict:
    source = value if isinstance(value, dict) else {}
    return {
        "name": _clean_string(source.get("name", "")),
        "label": _clean_string(source.get("label", "")),
        "stack": _clean_string_list(source.get("stack", []), limit=MAX_PROJECT_STACK_ITEMS),
        "description": _clean_string_list(source.get("description", [])),
        "live_url": _clean_string(source.get("live_url", "")),
        "github_url": _clean_string(source.get("github_url", "")),
        "start_date": _clean_string(source.get("start_date", "")),
        "end_date": _clean_string(source.get("end_date", "")),
    }


def _normalize_education_item(value) -> dict:
    source = value if isinstance(value, dict) else {}
    return {
        "school": _clean_string(source.get("school", "")),
        "degree": _clean_string(source.get("degree", "")),
        "major": _clean_string(source.get("major", "")),
        "location": _clean_string(source.get("location", "")),
        "start_date": _clean_string(source.get("start_date", "")),
        "end_date": _clean_string(source.get("end_date", "")),
        "gpa": _clean_string(source.get("gpa", "")),
        "awards": _clean_string_list(source.get("awards", [])),
        "relevant_coursework": _clean_string_list(source.get("relevant_coursework", [])),
    }


def _normalize_certificate_item(value) -> dict:
    source = value if isinstance(value, dict) else {}
    return {field: _clean_string(source.get(field, "")) for field in CERTIFICATE_FIELDS}


def _normalize_skill_item(value) -> dict:
    source = value if isinstance(value, dict) else {}
    return {field: _clean_string(source.get(field, "")) for field in SKILL_FIELDS}


def _normalize_items(value, normalizer) -> list[dict]:
    if not isinstance(value, list):
        return []
    return [normalizer(item) for item in value if isinstance(item, dict)]


def normalize_profile_sections(data: dict) -> dict:
    source = data if isinstance(data, dict) else {}
    return {
        "basic": _normalize_basic(source.get("basic", {})),
        "experience": _normalize_items(source.get("experience", []), _normalize_experience_item),
        "projects": _normalize_items(source.get("projects", []), _normalize_project_item),
        "education": _normalize_items(source.get("education", []), _normalize_education_item),
        "certificates": _normalize_items(source.get("certificates", []), _normalize_certificate_item),
        "skills": _normalize_items(source.get("skills", []), _normalize_skill_item),
    }


def get_user_profile(uid: str) -> dict | None:
    doc = _users_ref().document(uid).get()
    if not doc.exists:
        return None
    profile = User.from_dict(doc.to_dict() or {}).to_dict()
    profile.update(normalize_profile_sections(profile))
    return profile


def create_user_profile(uid: str, email: str, display_name: str = "", full_name: str = "") -> dict:
    user = User(
        uid=uid,
        email=email,
        full_name=full_name,
        display_name=display_name,
        **normalize_profile_sections({}),
    )
    _users_ref().document(uid).set(user.to_dict())
    return user.to_dict()


def update_user_profile(uid: str, data: dict, email: str | None = None) -> dict:
    allowed_fields = {"full_name", "display_name", "photo_url", "bio", "email"}
    updates = {k: _clean_string(v) for k, v in data.items() if k in allowed_fields}
    updates.update({k: v for k, v in normalize_profile_sections(data).items() if k in PROFILE_SECTION_FIELDS and k in data})
    if email:
        updates["email"] = email
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    _users_ref().document(uid).set({"uid": uid, **updates}, merge=True)
    return {**updates, "uid": uid}
