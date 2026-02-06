from flask import Blueprint

bp = Blueprint("main", __name__)


@bp.get("/")
def index():
    return {"status": "ok"}
