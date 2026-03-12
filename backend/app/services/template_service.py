from app.extensions import db
from app.models.template import Template


def list_templates() -> list[dict]:
    """List all public templates."""
    templates = Template.query.filter_by(is_public=True).all()
    return [t.to_dict() for t in templates]


def get_template(template_id: int) -> dict | None:
    """Get a single template by ID."""
    template = db.session.get(Template, template_id)
    if template is None:
        return None
    return template.to_dict()


def create_template(author_uid: str, data: dict) -> dict:
    """Create a new template."""
    template = Template(
        title=data.get("title", ""),
        content=data.get("content", ""),
        category=data.get("category", ""),
        author_uid=author_uid,
        is_public=data.get("is_public", True),
    )
    db.session.add(template)
    db.session.commit()
    return template.to_dict()
