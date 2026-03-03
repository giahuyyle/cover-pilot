from flask import Flask
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials


def create_app(config_object="config.Config"):
    app = Flask(__name__)
    app.config.from_object(config_object)
    CORS(app)

    # Initialize Firebase Admin SDK
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

    from .routes import bp as main_bp
    app.register_blueprint(main_bp)

    return app
