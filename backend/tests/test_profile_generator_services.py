from unittest.mock import patch

from django.test import SimpleTestCase

from apps.generator import services


class ProfileGeneratorServicesTests(SimpleTestCase):
    def setUp(self):
        self.profile = {
            "full_name": "Jane Candidate",
            "email": "jane@example.com",
            "basic": {
                "contact_email": "jane@portfolio.dev",
                "linkedin_url": "https://linkedin.com/in/jane",
                "github_url": "https://github.com/jane",
            },
            "experience": [
                {"company": "Acme", "role": "Developer", "description": ["Built APIs"]},
            ],
            "projects": [
                {
                    "name": "Cover Pilot",
                    "label": "AI resumes",
                    "stack": ["React", "Django"],
                    "description": ["Generated resume drafts"],
                },
            ],
            "education": [],
            "skills": [{"name": "Python", "category": "Languages"}],
        }

    def test_build_profile_resume_context_includes_project_labels_and_stack(self):
        context = services.build_profile_resume_context(self.profile)

        self.assertIn("PROFILE SOURCE OF TRUTH", context)
        self.assertIn("Label: AI resumes", context)
        self.assertIn("Stack: React, Django", context)
        self.assertIn("Languages: Python", context)

    def test_build_profile_warnings_uses_best_effort_thresholds(self):
        warnings = services.build_profile_warnings(self.profile)

        self.assertIn("Profile has 2 total work/project entries", warnings[0])
        self.assertIn("target is 2-3", warnings[1])
        self.assertIn("target is 2-3", warnings[2])

    @patch("apps.generator.services.generate_latex_resume", return_value="latex")
    def test_generate_profile_resume_latex_forwards_jakes_template_and_profile_context(self, generate_mock):
        latex, template, warnings = services.generate_profile_resume_latex(
            profile=self.profile,
            role="Backend Engineer",
            company_name="Orbit Labs",
            job_description="Own Django services.",
            provider="openai",
            model="gpt-5.4-mini",
            prompt="Emphasize APIs.",
        )

        self.assertEqual(latex, "latex")
        self.assertEqual(template, "jakes")
        self.assertTrue(warnings)
        generate_mock.assert_called_once()
        called = generate_mock.call_args.kwargs
        self.assertEqual(called["template"], "jakes")
        self.assertEqual(called["provider"], "openai")
        self.assertIn("Label: AI resumes", called["resume_text"])
        self.assertIn("Target role: Backend Engineer", called["job_description"])
        self.assertIn("Aim for exactly 5 total entries", called["prompt"])

    def test_build_resume_download_filename_sanitizes_role_and_name(self):
        filename = services.build_resume_download_filename("AI Platform Intern", self.profile)

        self.assertEqual(filename, "AI_Platform_Intern_Jane_Candidate_Resume.pdf")
