from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from apps.generator.views import GenerateResumeView


class GenerateResumeApiTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = GenerateResumeView.as_view()

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
