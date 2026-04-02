from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.generator.views import GenerateResumeView


class GenerateResumeApiTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = GenerateResumeView.as_view()
        self.document_name_patcher = patch(
            "apps.generator.views.summarize_document_identity",
            return_value=("Acme Corp", "Software Engineer", "Acme Corp - Software Engineer"),
        )
        self.mock_document_name = self.document_name_patcher.start()
        self.addCleanup(self.document_name_patcher.stop)

    def _build_request(self):
        pdf = SimpleUploadedFile("resume.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        return self.factory.post(
            "/api/generate/openai/gpt-5.4-mini/",
            {
                "template": "classic",
                "pdf": pdf,
                "job_description": "Job description text",
                "prompt": "Focus on leadership impact",
            },
            format="multipart",
        )

    @patch("apps.generator.views.save_to_s3_temp", return_value="https://example.com/generated.pdf")
    @patch("apps.generator.views.process_resume_request", return_value=("latex", "classic"))
    def test_post_openai_provider_model_success(self, process_mock, save_mock):
        request = self._build_request()
        response = self.view(request, provider="openai", model="gpt-5.4-mini")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["pdf_url"], "https://example.com/generated.pdf")
        self.assertEqual(response.data["mode"], "guest")
        self.assertEqual(response.data["document_name"], "Acme Corp - Software Engineer")

        process_mock.assert_called_once()
        called = process_mock.call_args.kwargs
        self.assertEqual(called["provider"], "openai")
        self.assertEqual(called["model"], "gpt-5.4-mini")
        save_mock.assert_called_once_with("latex", "classic")

    @patch("apps.generator.views.save_to_s3_temp", return_value="https://example.com/generated.pdf")
    @patch("apps.generator.views.process_resume_request", return_value=("latex", "classic"))
    def test_post_anthropic_provider_model_success(self, process_mock, save_mock):
        request = self._build_request()
        response = self.view(request, provider="anthropic", model="claude-sonnet-4-6")

        self.assertEqual(response.status_code, 200)
        called = process_mock.call_args.kwargs
        self.assertEqual(called["provider"], "anthropic")
        self.assertEqual(called["model"], "claude-sonnet-4-6")
        save_mock.assert_called_once()

    @patch("apps.generator.views.process_resume_request")
    def test_post_invalid_provider_returns_400(self, process_mock):
        request = self._build_request()
        response = self.view(request, provider="invalid", model="gpt-5.4-mini")

        self.assertEqual(response.status_code, 400)
        process_mock.assert_not_called()

    @patch("apps.generator.views.process_resume_request")
    def test_post_invalid_model_for_provider_returns_400(self, process_mock):
        request = self._build_request()
        response = self.view(request, provider="openai", model="claude-sonnet-4-6")

        self.assertEqual(response.status_code, 400)
        process_mock.assert_not_called()

    @patch("apps.generator.views.save_to_s3_temp", return_value="https://example.com/generated.pdf")
    @patch("apps.generator.views.process_resume_request", return_value=("latex", "jakes"))
    def test_post_accepts_jakes_template(self, process_mock, save_mock):
        pdf = SimpleUploadedFile("resume.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        request = self.factory.post(
            "/api/generate/openai/gpt-5.4-mini/",
            {
                "template": "jakes",
                "pdf": pdf,
                "job_description": "Job description text",
            },
            format="multipart",
        )

        response = self.view(request, provider="openai", model="gpt-5.4-mini")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["template"], "jakes")
        process_mock.assert_called_once()
        save_mock.assert_called_once_with("latex", "jakes")

    @patch("apps.generator.views.save_to_firestore", return_value=("doc-123", "https://example.com/user.pdf"))
    @patch("apps.generator.views.process_resume_request", return_value=("latex", "classic"))
    def test_post_authenticated_user_stores_user_document(self, process_mock, save_user_mock):
        request = self._build_request()
        force_authenticate(request, user={"uid": "user-1", "email": "user@example.com"})

        response = self.view(request, provider="openai", model="gpt-5.4-mini")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["mode"], "user")
        self.assertEqual(response.data["doc_id"], "doc-123")
        self.assertEqual(response.data["document_name"], "Acme Corp - Software Engineer")
        save_user_mock.assert_called_once_with(
            "user-1",
            "latex",
            "classic",
            document_name="Acme Corp - Software Engineer",
            company_name="Acme Corp",
            position_name="Software Engineer",
        )
        process_mock.assert_called_once()

    @patch("apps.generator.views.save_to_s3_temp")
    @patch("apps.generator.views.save_guest_to_firestore", return_value=("guest-doc-1", "https://example.com/guest.pdf"))
    @patch("apps.generator.views.process_resume_request", return_value=("latex", "classic"))
    def test_post_guest_with_guest_id_stores_guest_document(self, process_mock, save_guest_mock, save_temp_mock):
        pdf = SimpleUploadedFile("resume.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        request = self.factory.post(
            "/api/generate/openai/gpt-5.4-mini/",
            {
                "template": "classic",
                "pdf": pdf,
                "job_description": "Job description text",
                "guest_id": "guest-xyz",
            },
            format="multipart",
        )

        response = self.view(request, provider="openai", model="gpt-5.4-mini")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["mode"], "guest")
        self.assertEqual(response.data["doc_id"], "guest-doc-1")
        self.assertEqual(response.data["document_name"], "Acme Corp - Software Engineer")
        save_guest_mock.assert_called_once_with(
            "guest-xyz",
            "latex",
            "classic",
            document_name="Acme Corp - Software Engineer",
            company_name="Acme Corp",
            position_name="Software Engineer",
        )
        save_temp_mock.assert_not_called()
        process_mock.assert_called_once()

    @patch("apps.generator.views.save_to_s3_temp", return_value="https://example.com/guest-temp.pdf")
    @patch("apps.generator.views.save_guest_to_firestore")
    @patch("apps.generator.views.process_resume_request", return_value=("latex", "classic"))
    def test_post_guest_without_guest_id_returns_temp_url(self, process_mock, save_guest_mock, save_temp_mock):
        request = self._build_request()

        response = self.view(request, provider="openai", model="gpt-5.4-mini")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["mode"], "guest")
        self.assertEqual(response.data["document_name"], "Acme Corp - Software Engineer")
        self.assertNotIn("doc_id", response.data)
        save_guest_mock.assert_not_called()
        save_temp_mock.assert_called_once_with("latex", "classic")
        process_mock.assert_called_once()
