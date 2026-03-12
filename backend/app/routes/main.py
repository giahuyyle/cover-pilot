from flask import Blueprint

bp = Blueprint("main", __name__)


@bp.get("/")
def index():
    return {"message": "Welcome to the Cover Pilot API!"}


@bp.get("/health")
def health():
    return {"status": "ok"}
