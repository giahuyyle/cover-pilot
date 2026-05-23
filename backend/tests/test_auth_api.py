from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIClient


class AuthRoutingTests(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()

    def test_protected_routes_return_401_without_credentials(self):
        routes = (
            ("get", "/api/users/me/"),
            ("put", "/api/users/me/"),
            ("post", "/api/users/me/parse-resume/"),
            ("get", "/api/users/storage/"),
            ("post", "/api/generate/openai/gpt-5.4-mini/"),
        )

        for method, path in routes:
            with self.subTest(method=method, path=path):
                response = getattr(self.client, method)(path, {}, format="json")
                self.assertEqual(response.status_code, 401)
                self.assertEqual(response["WWW-Authenticate"], "Bearer")

    @patch("core.auth.auth.verify_id_token", side_effect=Exception("bad token"))
    def test_protected_routes_return_401_for_invalid_bearer_token(self, verify_mock):
        routes = (
            ("get", "/api/users/me/"),
            ("put", "/api/users/me/"),
            ("post", "/api/users/me/parse-resume/"),
            ("get", "/api/users/storage/"),
            ("post", "/api/generate/openai/gpt-5.4-mini/"),
        )
        self.client.credentials(HTTP_AUTHORIZATION="Bearer bad-token")

        for method, path in routes:
            with self.subTest(method=method, path=path):
                response = getattr(self.client, method)(path, {}, format="json")
                self.assertEqual(response.status_code, 401)
                self.assertEqual(response["WWW-Authenticate"], "Bearer")

        self.assertEqual(verify_mock.call_count, len(routes))

    def test_public_routes_allow_missing_credentials(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)

        response = self.client.get("/health/")
        self.assertEqual(response.status_code, 200)

    @patch("core.auth.auth.verify_id_token", side_effect=Exception("bad token"))
    def test_public_routes_reject_invalid_bearer_token(self, verify_mock):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer bad-token")

        response = self.client.get("/")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response["WWW-Authenticate"], "Bearer")

        response = self.client.get("/health/")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response["WWW-Authenticate"], "Bearer")

        self.assertEqual(verify_mock.call_count, 2)
