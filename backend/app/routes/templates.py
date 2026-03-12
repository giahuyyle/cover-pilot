from flask import Blueprint, request, jsonify
from app.auth import verify_firebase_token
from app.services.template_service import (
    list_templates,
    get_template,
    create_template,
)

bp = Blueprint("templates", __name__)


@bp.get("/")
def get_all_templates():
    """List all public templates."""
    templates = list_templates()
    return jsonify(templates)


@bp.get("/<template_id>")
def get_one_template(template_id):
    """Get a single template by ID."""
    template = get_template(template_id)
    if template is None:
        return jsonify({"error": "Template not found"}), 404
    return jsonify(template)


@bp.post("/")
@verify_firebase_token
def create_new_template():
    """Create a new template (authenticated)."""
    uid = request.user["uid"]
    data = request.get_json()
    template = create_template(uid, data)
    return jsonify(template), 201
