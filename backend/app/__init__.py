import os

from flask import Flask
import firebase_admin
from firebase_admin import credentials

from .extensions import cors, db
from .routes import register_blueprints
from .utils.errors import register_error_handlers


def create_app(config_object="config.DevelopmentConfig"):
    app = Flask(__name__)
    app.config.from_object(config_object)

    # Extensions
    cors.init_app(app)
    db.init_app(app)

    # Firebase Admin SDK (skip in testing)
    if not firebase_admin._apps:
        cred_path = app.config.get("FIREBASE_CREDENTIALS", "serviceAccountKey.json")
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)

    # Create SQL tables
    with app.app_context():
        from . import models  # noqa: F401 — ensure models are imported
        db.create_all()

    # Blueprints & error handlers
    register_blueprints(app)
    register_error_handlers(app)

    return app
