from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from apps.generator import services

VALID_JAKES_SNIPPETS = r"""
[[[HEADER]]]
\textbf{\Huge \scshape Jane Candidate} \\ \vspace{1pt}
\small 111-222-3333 $|$ \href{mailto:jane@example.com}{\underline{jane@example.com}} $|$
\href{https://linkedin.com/in/jane}{\underline{linkedin.com/in/jane}} $|$
\href{https://github.com/jane}{\underline{github.com/jane}}
[[[/HEADER]]]
[[[EDUCATION]]]
\resumeSubheading
  {University of Alberta}{Edmonton, AB}
  {BSc Computer Science}{Sep. 2020 -- Apr. 2024}
[[[/EDUCATION]]]
[[[EXPERIENCE]]]
\resumeSubheading
  {Software Engineer Intern}{May 2023 -- Aug. 2023}
  {Example Corp}{Remote}
  \resumeItemListStart
    \resumeItem{Improved API latency by 32\% by optimizing query paths and caching policy}
  \resumeItemListEnd
[[[/EXPERIENCE]]]
[[[PROJECTS]]]
\resumeProjectHeading
  {\textbf{Portfolio Builder} $|$ \emph{React, Django, PostgreSQL}}{2024}
  \resumeItemListStart
    \resumeItem{Built ATS-friendly resume tooling that increased successful imports by 24\%}
  \resumeItemListEnd
[[[/PROJECTS]]]
[[[SKILLS]]]
\small{\item{
 \textbf{Languages}{: Python, JavaScript, SQL} \\
 \textbf{Frameworks}{: Django, React} \\
 \textbf{Developer Tools}{: Git, Docker}
}}
[[[/SKILLS]]]
""".strip()

LOOSE_HEADER_JAKES_SNIPPETS = VALID_JAKES_SNIPPETS.replace(
    r"""\textbf{\Huge \scshape Jane Candidate} \\ \vspace{1pt}
\small 111-222-3333 $|$ \href{mailto:jane@example.com}{\underline{jane@example.com}} $|$
\href{https://linkedin.com/in/jane}{\underline{linkedin.com/in/jane}} $|$
\href{https://github.com/jane}{\underline{github.com/jane}}""",
    """Jane Candidate
111-222-3333 | jane@example.com | linkedin.com/in/jane | github.com/jane""",
)

MISSING_CONTACT_JAKES_SNIPPETS = VALID_JAKES_SNIPPETS.replace(
    r"""\textbf{\Huge \scshape Jane Candidate} \\ \vspace{1pt}
\small 111-222-3333 $|$ \href{mailto:jane@example.com}{\underline{jane@example.com}} $|$
\href{https://linkedin.com/in/jane}{\underline{linkedin.com/in/jane}} $|$
\href{https://github.com/jane}{\underline{github.com/jane}}""",
    "Jane Candidate",
)


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

    @patch("apps.generator.services._generate_with_openai", return_value=VALID_JAKES_SNIPPETS)
    def test_generate_latex_resume_jakes_renders_locked_shell(self, openai_mock):
        latex = services.generate_latex_resume(
            resume_text="Resume text",
            job_description="Job description",
            template="jakes",
            provider="openai",
            model="gpt-5.2",
            prompt="Focus on backend roles",
        )

        self.assertIn(r"\documentclass[letterpaper,11pt]{article}", latex)
        self.assertIn("Jane Candidate", latex)
        self.assertIn(r"\section{Education}", latex)
        self.assertNotIn("%%__JAKES_HEADER__%%", latex)
        openai_mock.assert_called_once()

    @patch("apps.generator.services._generate_with_openai")
    def test_generate_latex_resume_jakes_rejects_forbidden_commands(self, openai_mock):
        malicious = VALID_JAKES_SNIPPETS.replace(
            r"\textbf{\Huge \scshape Jane Candidate}",
            r"\documentclass{article}",
        )
        openai_mock.return_value = malicious

        with self.assertRaisesRegex(RuntimeError, "forbidden command"):
            services.generate_latex_resume(
                resume_text="Resume text",
                job_description="Job description",
                template="jakes",
                provider="openai",
                model="gpt-5.2",
                prompt="",
            )

    @patch("apps.generator.services._generate_with_openai", return_value=LOOSE_HEADER_JAKES_SNIPPETS)
    def test_generate_latex_resume_jakes_normalizes_loose_header(self, openai_mock):
        latex = services.generate_latex_resume(
            resume_text="Resume text",
            job_description="Job description",
            template="jakes",
            provider="openai",
            model="gpt-5.2",
            prompt="",
        )
        self.assertIn(r"\textbf{\Huge \scshape Jane Candidate} \\ \vspace{1pt}", latex)
        self.assertIn(
            r"\small 111-222-3333 $|$ \href{mailto:jane@example.com}{\underline{jane@example.com}}",
            latex,
        )
        self.assertIn(r"\href{https://linkedin.com/in/jane}{\underline{linkedin.com/in/jane}}", latex)
        openai_mock.assert_called_once()

    @patch("apps.generator.services._generate_with_openai", return_value=MISSING_CONTACT_JAKES_SNIPPETS)
    def test_generate_latex_resume_jakes_rejects_unparsable_header(self, openai_mock):
        with self.assertRaisesRegex(RuntimeError, "Could not parse Jake header"):
            services.generate_latex_resume(
                resume_text="Resume text",
                job_description="Job description",
                template="jakes",
                provider="openai",
                model="gpt-5.2",
                prompt="",
            )
        openai_mock.assert_called_once()

    @patch("apps.generator.services._generate_with_openai", return_value="[[[HEADER]]]x[[[/HEADER]]]")
    def test_generate_latex_resume_jakes_rejects_invalid_snippet_format(self, openai_mock):
        with self.assertRaisesRegex(RuntimeError, "must include exactly one 'EDUCATION' block"):
            services.generate_latex_resume(
                resume_text="Resume text",
                job_description="Job description",
                template="jakes",
                provider="openai",
                model="gpt-5.2",
                prompt="",
            )
        openai_mock.assert_called_once()

    @patch("apps.generator.services._generate_with_openai", return_value=VALID_JAKES_SNIPPETS)
    def test_generate_latex_resume_non_jakes_keeps_existing_flow(self, openai_mock):
        latex = services.generate_latex_resume(
            resume_text="Resume text",
            job_description="Job description",
            template="classic",
            provider="openai",
            model="gpt-5.2",
            prompt="",
        )
        self.assertEqual(latex, VALID_JAKES_SNIPPETS)
        openai_mock.assert_called_once()
