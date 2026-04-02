import os
import json

import firebase_admin
from firebase_admin import credentials
from django.conf import settings


def initialize_firebase():
    if not firebase_admin._apps:
        cred_path = getattr(settings, "FIREBASE_CREDENTIALS", "serviceAccountKey.json")
        cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON", "")

        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            return

        if cred_json:
            cred_data = json.loads(cred_json)
            cred = credentials.Certificate(cred_data)
            firebase_admin.initialize_app(cred)
