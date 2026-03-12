from .main import bp as main_bp
from .users import bp as users_bp
from .templates import bp as templates_bp


def register_blueprints(app):
    app.register_blueprint(main_bp)
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(templates_bp, url_prefix="/api/templates")
