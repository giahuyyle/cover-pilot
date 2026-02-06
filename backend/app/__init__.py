from flask import Flask


def create_app(config_object="config.Config"):
    app = Flask(__name__)
    app.config.from_object(config_object)

    from .routes import bp as main_bp
    app.register_blueprint(main_bp)

    return app
