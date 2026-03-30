from django.test import SimpleTestCase

from apps.generator.enums import ResumeTemplate


class ResumeTemplateTests(SimpleTestCase):
    def test_template_choices_include_jakes(self):
        self.assertIn("jakes", ResumeTemplate.choices())
