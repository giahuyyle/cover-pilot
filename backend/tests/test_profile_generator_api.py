from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.generator.views import GenerateProfileResumeView


class GenerateProfileResumeApiTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = GenerateProfileResumeView.as_view()
        self.profile = {
            "uid": "user-1",
            "email": "jane@example.com",
            "full_name": "Jane Candidate",
            "experience": [{"company": "Acme", "role": "Developer"}],
            "projects": [{"name": "Resume Builder", "label": "AI"}],
            "education": [],
            "skills": [],
        }

    def _request(self, payload=None, user=None):
        request = self.factory.post(
            "/api/generate/openai/gpt-5.4-mini/",
            payload
            or {
                "role": "Software Engineer",
                "company_name": "Orbit Labs",
                "job_description": "Build APIs and React dashboards.",
                "prompt": "Emphasize backend impact.",
            },
            format="json",
        )
        if user is not None:
            force_authenticate(request, user=user)
        return request

    @patch("apps.generator.views.save_to_firestore", return_value=("doc-123", "https://example.com/generated.pdf"))
    @patch("apps.generator.views.generate_profile_resume_latex", return_value=("latex", "jakes", ["Profile warning"]))
    @patch("apps.generator.views.get_user_profile")
    def test_post_authenticated_user_generates_resume_from_profile(self, get_profile_mock, generate_mock, save_mock):
        get_profile_mock.return_value = self.profile
        request = self._request(user={"uid": "user-1", "email": "jane@example.com"})

        response = self.view(request, provider="openai", model="gpt-5.4-mini")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["pdf_url"], "https://example.com/generated.pdf")
        self.assertEqual(response.data["template"], "jakes")
        self.assertEqual(response.data["mode"], "user")
        self.assertEqual(response.data["doc_id"], "doc-123")
        self.assertEqual(response.data["document_name"], "Orbit Labs - Software Engineer")
        self.assertEqual(response.data["warnings"], ["Profile warning"])
        get_profile_mock.assert_called_once_with("user-1")
        generate_mock.assert_called_once_with(
            profile=self.profile,
            role="Software Engineer",
            company_name="Orbit Labs",
            job_description="Build APIs and React dashboards.",
            provider="openai",
            model="gpt-5.4-mini",
            prompt="Emphasize backend impact.",
        )
        save_mock.assert_called_once_with(
            "user-1",
            "latex",
            "jakes",
            document_name="Orbit Labs - Software Engineer",
            company_name="Orbit Labs",
            position_name="Software Engineer",
            download_filename="Software_Engineer_Jane_Candidate_Resume.pdf",
        )

    @patch("apps.generator.views.generate_profile_resume_latex")
    def test_post_invalid_provider_returns_400(self, generate_mock):
        request = self._request(user={"uid": "user-1", "email": "jane@example.com"})

        response = self.view(request, provider="invalid", model="gpt-5.4-mini")

        self.assertEqual(response.status_code, 400)
        generate_mock.assert_not_called()

    def test_post_missing_role_returns_400(self):
        request = self._request(payload={"job_description": "Build APIs."}, user={"uid": "user-1", "email": "jane@example.com"})

        response = self.view(request, provider="openai", model="gpt-5.4-mini")

        self.assertEqual(response.status_code, 400)

    @patch("apps.generator.views.get_user_profile", return_value=None)
    def test_post_missing_profile_returns_404(self, get_profile_mock):
        request = self._request(user={"uid": "user-1", "email": "jane@example.com"})

        response = self.view(request, provider="openai", model="gpt-5.4-mini")

        self.assertEqual(response.status_code, 404)
        get_profile_mock.assert_called_once_with("user-1")

    def test_post_requires_authentication(self):
        request = self._request()

        response = self.view(request, provider="openai", model="gpt-5.4-mini")

        self.assertEqual(response.status_code, 403)
