from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from apps.generator import services


class GeneratorServicesTests(SimpleTestCase):
    @override_settings(OPENAI_API_KEY="")
    def test_generate_with_openai_requires_key(self):
        with self.assertRaisesRegex(RuntimeError, "OPENAI_API_KEY"):
            services._generate_with_openai("gpt-5.2", "test prompt")

    @override_settings(ANTHROPIC_API_KEY="")
    def test_generate_with_anthropic_requires_key(self):
        with self.assertRaisesRegex(RuntimeError, "ANTHROPIC_API_KEY"):
            services._generate_with_anthropic("claude-sonnet-4-6", "test prompt")

    @patch("apps.generator.services.generate_latex_resume", return_value="latex")
    @patch("apps.generator.services.extract_pdf_text", return_value="resume text")
    def test_process_resume_request_forwards_provider_and_model(self, extract_mock, generate_mock):
        latex, template = services.process_resume_request(
            pdf_file=object(),
            template="classic",
            job_description="job desc",
            provider="openai",
            model="gpt-5.4-mini",
            prompt="custom prompt",
        )

        self.assertEqual(latex, "latex")
        self.assertEqual(template, "classic")
        extract_mock.assert_called_once()
        generate_mock.assert_called_once_with(
            resume_text="resume text",
            job_description="job desc",
            template="classic",
            provider="openai",
            model="gpt-5.4-mini",
            prompt="custom prompt",
        )
