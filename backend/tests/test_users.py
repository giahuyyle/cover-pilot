from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.users.resume_parser import (
    ResumeParseError,
    extract_resume_text,
    merge_parsed_profile,
    parse_resume_into_profile,
)
from apps.users.services import get_user_profile, update_user_profile
from apps.users.views import ProfileView, ResumeParseView


class ProfileApiTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = ProfileView.as_view()

    @patch("apps.users.views.get_user_profile")
    def test_get_profile_returns_authenticated_user_profile(self, get_profile_mock):
        get_profile_mock.return_value = {
            "uid": "uid-1",
            "email": "user@example.com",
            "full_name": "Taylor Avery",
            "display_name": "Taylor",
        }
        request = self.factory.get("/api/users/me/")
        force_authenticate(request, user={"uid": "uid-1", "email": "user@example.com"})

        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["full_name"], "Taylor Avery")
        self.assertEqual(response.data["display_name"], "Taylor")
        get_profile_mock.assert_called_once_with("uid-1")

    @patch("apps.users.views.get_user_profile", return_value=None)
    def test_get_profile_returns_404_when_profile_missing(self, get_profile_mock):
        request = self.factory.get("/api/users/me/")
        force_authenticate(request, user={"uid": "uid-1"})

        response = self.view(request)
        self.assertEqual(response.status_code, 404)
        get_profile_mock.assert_called_once_with("uid-1")

    @patch("apps.users.views.update_user_profile")
    def test_put_profile_updates_full_name_and_display_name(self, update_profile_mock):
        update_profile_mock.return_value = {
            "uid": "uid-1",
            "email": "user@example.com",
            "full_name": "Taylor Avery",
            "display_name": "Taylor",
        }
        request = self.factory.put(
            "/api/users/me/",
            {"full_name": "Taylor Avery", "display_name": "Taylor"},
            format="json",
        )
        force_authenticate(request, user={"uid": "uid-1", "email": "user@example.com"})

        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["full_name"], "Taylor Avery")
        self.assertEqual(response.data["display_name"], "Taylor")
        update_profile_mock.assert_called_once_with(
            "uid-1",
            {"full_name": "Taylor Avery", "display_name": "Taylor"},
            email="user@example.com",
        )

    def test_profile_endpoint_requires_authentication(self):
        request = self.factory.get("/api/users/me/")
        response = self.view(request)

        self.assertEqual(response.status_code, 401)


class ResumeParseApiTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = ResumeParseView.as_view()

    def _build_request(self, payload=None):
        pdf = SimpleUploadedFile("resume.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        return self.factory.post(
            "/api/users/me/parse-resume/",
            payload or {"resume": pdf},
            format="multipart",
        )

    @patch("apps.users.views.parse_resume_into_profile")
    @patch("apps.users.views.get_user_profile")
    def test_parse_resume_returns_review_payload_without_saving(self, get_profile_mock, parse_mock):
        get_profile_mock.return_value = {"uid": "uid-1", "email": "user@example.com", "basic": {}}
        parse_mock.return_value = {
            "parsed_profile": {"full_name": "Taylor Avery"},
            "merged_profile": {"full_name": "Taylor Avery"},
            "suggestions": [],
            "matches": [],
            "warnings": [],
        }
        request = self._build_request()
        force_authenticate(request, user={"uid": "uid-1", "email": "user@example.com"})

        response = self.view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["merged_profile"]["full_name"], "Taylor Avery")
        get_profile_mock.assert_called_once_with("uid-1")
        parse_mock.assert_called_once()

    def test_parse_resume_requires_authentication(self):
        request = self._build_request()
        response = self.view(request)

        self.assertEqual(response.status_code, 401)

    @patch("apps.users.views.parse_resume_into_profile")
    def test_parse_resume_requires_file(self, parse_mock):
        request = self.factory.post("/api/users/me/parse-resume/", {}, format="multipart")
        force_authenticate(request, user={"uid": "uid-1"})

        response = self.view(request)

        self.assertEqual(response.status_code, 400)
        parse_mock.assert_not_called()

    @patch("apps.users.views.parse_resume_into_profile")
    def test_parse_resume_rejects_invalid_provider_model(self, parse_mock):
        request = self._build_request({"resume": SimpleUploadedFile("resume.pdf", b"x"), "provider": "openai", "model": "bad"})
        force_authenticate(request, user={"uid": "uid-1"})

        response = self.view(request)

        self.assertEqual(response.status_code, 400)
        parse_mock.assert_not_called()

    @patch("apps.users.views.get_user_profile", return_value={"uid": "uid-1"})
    @patch("apps.users.views.parse_resume_into_profile", side_effect=ResumeParseError("Resume must be a PDF or DOCX file."))
    def test_parse_resume_returns_validation_error(self, parse_mock, get_profile_mock):
        request = self._build_request({"resume": SimpleUploadedFile("resume.txt", b"text", content_type="text/plain")})
        force_authenticate(request, user={"uid": "uid-1"})

        response = self.view(request)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Resume must be a PDF or DOCX file.")
        get_profile_mock.assert_called_once_with("uid-1")
        parse_mock.assert_called_once()


class UserServiceTests(SimpleTestCase):
    @patch("apps.users.services._users_ref")
    def test_update_user_profile_allows_full_name(self, users_ref_mock):
        doc_ref = MagicMock()
        users_ref_mock.return_value.document.return_value = doc_ref

        result = update_user_profile(
            "uid-1",
            {
                "full_name": "Taylor Avery",
                "display_name": "Taylor",
                "bio": "Builder",
                "ignored_field": "nope",
            },
            email="user@example.com",
        )

        users_ref_mock.return_value.document.assert_called_once_with("uid-1")
        payload = doc_ref.set.call_args.args[0]
        self.assertEqual(doc_ref.set.call_args.kwargs["merge"], True)
        self.assertEqual(payload["uid"], "uid-1")
        self.assertEqual(payload["full_name"], "Taylor Avery")
        self.assertEqual(payload["display_name"], "Taylor")
        self.assertEqual(payload["bio"], "Builder")
        self.assertEqual(payload["email"], "user@example.com")
        self.assertNotIn("ignored_field", payload)
        self.assertIn("updated_at", payload)
        self.assertEqual(result["full_name"], "Taylor Avery")

    @patch("apps.users.services._users_ref")
    def test_update_user_profile_normalizes_nested_resume_profile(self, users_ref_mock):
        doc_ref = MagicMock()
        users_ref_mock.return_value.document.return_value = doc_ref

        result = update_user_profile(
            "uid-1",
            {
                "basic": {
                    "phone_country_code": " +1 ",
                    "phone": " 555-0100 ",
                    "contact_email": " taylor@example.com ",
                    "location": " Edmonton, AB ",
                    "headline": " Software Developer ",
                    "github_url": " https://github.com/taylor ",
                    "linkedin_url": " https://linkedin.com/in/taylor ",
                    "portfolio_url": " https://taylor.dev ",
                    "summary": " Builds useful software. ",
                    "ignored": "nope",
                },
                "experience": [
                    {
                        "company": " Acme ",
                        "role": " Developer ",
                        "location": " Remote ",
                        "start_date": " Jan 2024 ",
                        "end_date": " Present ",
                        "is_current": True,
                        "description": [" Built APIs ", "", " Improved latency "],
                        "ignored": "nope",
                    }
                ],
                "projects": [
                    {
                        "name": " Cover Pilot ",
                        "label": " Full-stack web application ",
                        "stack": [" React ", " Django ", " Firebase ", " Tailwind ", " Vite ", " Extra "],
                        "description": [" Generated resumes ", " Stored packets "],
                        "live_url": " https://coverpilot.app ",
                        "github_url": " https://github.com/taylor/cover-pilot ",
                        "start_date": " Feb 2024 ",
                        "end_date": " Apr 2024 ",
                    }
                ],
                "education": [
                    {
                        "school": " University of Alberta ",
                        "degree": " BSc ",
                        "major": " Computing Science ",
                        "location": " Edmonton ",
                        "start_date": " 2020 ",
                        "end_date": " 2024 ",
                        "gpa": " 3.8/4.0 ",
                        "awards": [" Dean's List ", ""],
                        "relevant_coursework": [" Algorithms ", " Databases "],
                    }
                ],
                "certificates": [
                    {
                        "name": " Cloud Practitioner ",
                        "issuer": " AWS ",
                        "issue_date": " 2024 ",
                        "expiration_date": " 2027 ",
                        "credential_id": " ABC123 ",
                        "credential_url": " https://example.com/cert ",
                    }
                ],
                "skills": [
                    {"name": " React ", "category": " Frontend ", "ignored": "nope"},
                ],
            },
            email="user@example.com",
        )

        payload = doc_ref.set.call_args.args[0]
        self.assertEqual(payload["basic"]["phone_country_code"], "+1")
        self.assertEqual(payload["basic"]["phone"], "555-0100")
        self.assertNotIn("ignored", payload["basic"])
        self.assertEqual(payload["experience"][0]["description"], ["Built APIs", "Improved latency"])
        self.assertEqual(payload["projects"][0]["stack"], ["React", "Django", "Firebase", "Tailwind", "Vite"])
        self.assertEqual(payload["projects"][0]["description"], ["Generated resumes", "Stored packets"])
        self.assertEqual(payload["education"][0]["gpa"], "3.8/4.0")
        self.assertEqual(payload["education"][0]["awards"], ["Dean's List"])
        self.assertEqual(payload["education"][0]["relevant_coursework"], ["Algorithms", "Databases"])
        self.assertEqual(payload["certificates"][0]["issuer"], "AWS")
        self.assertEqual(payload["skills"][0], {"name": "React", "category": "Frontend"})
        self.assertEqual(result["projects"][0]["stack"], ["React", "Django", "Firebase", "Tailwind", "Vite"])

    @patch("apps.users.services._users_ref")
    def test_update_user_profile_defaults_malformed_nested_fields(self, users_ref_mock):
        doc_ref = MagicMock()
        users_ref_mock.return_value.document.return_value = doc_ref

        update_user_profile(
            "uid-1",
            {
                "experience": [{"company": "Acme", "description": "not a list"}],
                "projects": "not a list",
                "education": [{"school": "U of A", "awards": None, "relevant_coursework": "Algorithms"}],
                "skills": [{"name": "Python"}],
            },
        )

        payload = doc_ref.set.call_args.args[0]
        self.assertEqual(payload["experience"][0]["description"], [])
        self.assertEqual(payload["projects"], [])
        self.assertEqual(payload["education"][0]["awards"], [])
        self.assertEqual(payload["education"][0]["relevant_coursework"], [])
        self.assertEqual(payload["skills"][0]["category"], "")

    @patch("apps.users.services._users_ref")
    def test_get_user_profile_normalizes_missing_name_fields(self, users_ref_mock):
        doc = MagicMock()
        doc.exists = True
        doc.to_dict.return_value = {
            "uid": "uid-1",
            "email": "user@example.com",
            "display_name": "Taylor",
        }
        users_ref_mock.return_value.document.return_value.get.return_value = doc

        result = get_user_profile("uid-1")

        self.assertIsNotNone(result)
        self.assertEqual(result["uid"], "uid-1")
        self.assertEqual(result["display_name"], "Taylor")
        self.assertEqual(result["full_name"], "")
        self.assertEqual(result["basic"]["phone_country_code"], "+1")
        self.assertEqual(result["basic"]["phone"], "")
        self.assertEqual(result["experience"], [])
        self.assertEqual(result["projects"], [])
        self.assertEqual(result["education"], [])
        self.assertEqual(result["certificates"], [])
        self.assertEqual(result["skills"], [])


class ResumeParserServiceTests(SimpleTestCase):
    def test_merge_replaces_bullets_for_matching_experience_and_projects(self):
        existing = {
            "uid": "uid-1",
            "email": "user@example.com",
            "full_name": "Taylor Avery",
            "basic": {"phone_country_code": "+1", "phone": "", "location": "Edmonton"},
            "experience": [
                {
                    "company": "Acme",
                    "role": "Developer",
                    "location": "",
                    "start_date": "",
                    "end_date": "",
                    "is_current": False,
                    "description": ["Old bullet"],
                }
            ],
            "projects": [
                {
                    "name": "Cover Pilot",
                    "label": "",
                    "stack": ["React"],
                    "description": ["Old project bullet"],
                    "live_url": "",
                    "github_url": "",
                    "start_date": "",
                    "end_date": "",
                }
            ],
        }
        parsed = {
            "full_name": "Taylor A.",
            "basic": {"phone": "555-0100", "location": "Calgary"},
            "experience": [
                {
                    "company": "Acme",
                    "role": "Developer",
                    "location": "Remote",
                    "description": ["Built APIs", "Improved latency"],
                },
                {
                    "company": "Orbit",
                    "role": "Engineer",
                    "description": ["Built dashboards"],
                },
            ],
            "projects": [
                {
                    "name": "Cover Pilot",
                    "stack": ["React", "Django"],
                    "description": ["Generated resumes"],
                },
                {
                    "name": "New Project",
                    "description": ["Launched feature"],
                },
            ],
        }

        merged, suggestions, matches = merge_parsed_profile(existing, parsed)

        self.assertEqual(merged["basic"]["phone"], "555-0100")
        self.assertEqual(merged["basic"]["location"], "Edmonton")
        self.assertEqual(suggestions[0]["field"], "full_name")
        self.assertEqual(suggestions[1]["field"], "location")
        self.assertEqual(merged["experience"][0]["description"], ["Built APIs", "Improved latency"])
        self.assertEqual(merged["experience"][0]["location"], "Remote")
        self.assertEqual(merged["experience"][1]["company"], "Orbit")
        self.assertEqual(merged["projects"][0]["description"], ["Generated resumes"])
        self.assertEqual(merged["projects"][0]["stack"], ["React", "Django"])
        self.assertEqual(merged["projects"][1]["name"], "New Project")
        self.assertIn({"section": "experience", "action": "updated", "key": "developer|acme"}, matches)
        self.assertIn({"section": "projects", "action": "added", "key": "new project"}, matches)

    @patch("apps.users.resume_parser.extract_resume_text", return_value="Resume text")
    @patch(
        "apps.users.resume_parser._generate_with_openai",
        side_effect=[
            """
            {
              "experience": [
                {
                  "company": "Acme Inc.",
                  "role": "Software Engineering Intern",
                  "description": ["Shipped new parser review flow"]
                }
              ],
              "projects": [
                {
                  "name": "CoverPilot",
                  "description": ["Added duplicate review controls"]
                }
              ]
            }
            """,
            """
            {
              "review_items": [
                {
                  "section": "experience",
                  "status": "duplicate",
                  "existing_index": 0,
                  "parsed_index": 0,
                  "confidence": 0.94,
                  "reason": "Same internship despite company punctuation and title wording.",
                  "recommended_action": "merge"
                },
                {
                  "section": "projects",
                  "status": "duplicate",
                  "existing_index": 0,
                  "parsed_index": 0,
                  "confidence": 0.91,
                  "reason": "Same project name with spacing removed and different bullets.",
                  "recommended_action": "merge"
                }
              ]
            }
            """,
        ],
    )
    def test_parse_resume_review_classifies_variant_project_and_experience_as_duplicates(self, generate_mock, extract_mock):
        uploaded = SimpleUploadedFile("resume.pdf", b"%PDF-1.4", content_type="application/pdf")
        existing = {
            "uid": "uid-1",
            "email": "user@example.com",
            "experience": [
                {
                    "company": "Acme",
                    "role": "Software Developer Intern",
                    "description": ["Old internship bullet"],
                }
            ],
            "projects": [
                {
                    "name": "Cover Pilot",
                    "description": ["Old project bullet"],
                }
            ],
        }

        payload = parse_resume_into_profile(uploaded, existing, "openai", "gpt-5.4-mini")

        self.assertEqual(
            [
                (item["section"], item["status"], item["existing_index"], item["recommended_action"])
                for item in payload["review_items"]
            ],
            [
                ("experience", "duplicate", 0, "merge"),
                ("projects", "duplicate", 0, "merge"),
            ],
        )
        extract_mock.assert_called_once_with(uploaded)
        self.assertEqual(generate_mock.call_count, 2)

    @patch("apps.users.resume_parser.extract_resume_text", return_value="Resume text")
    @patch(
        "apps.users.resume_parser._generate_with_openai",
        side_effect=[
            """
            {
              "experience": [{"company": "Orbit", "role": "Engineer"}],
              "projects": [{"name": "New Project"}],
              "education": [{"school": "University of Alberta"}],
              "certificates": [{"name": "AWS Cloud Practitioner", "issuer": "AWS"}],
              "skills": [{"name": "Django", "category": "Backend"}]
            }
            """,
            """
            {
              "review_items": [
                {"section": "experience", "status": "new", "existing_index": null, "parsed_index": 0, "confidence": 0.99, "reason": "No matching role.", "recommended_action": "add"},
                {"section": "projects", "status": "new", "existing_index": null, "parsed_index": 0, "confidence": 0.99, "reason": "No matching project.", "recommended_action": "add"},
                {"section": "education", "status": "new", "existing_index": null, "parsed_index": 0, "confidence": 0.99, "reason": "No matching school.", "recommended_action": "add"},
                {"section": "certificates", "status": "new", "existing_index": null, "parsed_index": 0, "confidence": 0.99, "reason": "No matching certificate.", "recommended_action": "add"},
                {"section": "skills", "status": "new", "existing_index": null, "parsed_index": 0, "confidence": 0.99, "reason": "No matching skill.", "recommended_action": "add"}
              ]
            }
            """,
        ],
    )
    def test_parse_resume_review_returns_new_items_for_all_sections(self, generate_mock, extract_mock):
        uploaded = SimpleUploadedFile("resume.pdf", b"%PDF-1.4", content_type="application/pdf")

        payload = parse_resume_into_profile(uploaded, {"uid": "uid-1", "email": "user@example.com"}, "openai", "gpt-5.4-mini")

        self.assertEqual([item["section"] for item in payload["review_items"]], ["experience", "projects", "education", "certificates", "skills"])
        self.assertTrue(all(item["status"] == "new" for item in payload["review_items"]))
        self.assertTrue(all(item["recommended_action"] == "add" for item in payload["review_items"]))
        extract_mock.assert_called_once_with(uploaded)
        self.assertEqual(generate_mock.call_count, 2)

    @patch("apps.users.resume_parser.extract_resume_text", return_value="Resume text")
    @patch(
        "apps.users.resume_parser._generate_with_openai",
        side_effect=[
            """
            {
              "projects": [
                {
                  "name": "Cover Pilot",
                  "description": ["Generated resumes"]
                }
              ],
              "skills": [{"name": "Python", "category": "Language"}]
            }
            """,
            "{\"review_items\": []}",
        ],
    )
    def test_parse_resume_review_falls_back_when_ai_review_is_invalid(self, generate_mock, extract_mock):
        uploaded = SimpleUploadedFile("resume.pdf", b"%PDF-1.4", content_type="application/pdf")
        existing = {
            "uid": "uid-1",
            "email": "user@example.com",
            "projects": [{"name": "Cover Pilot", "description": ["Old project bullet"]}],
            "skills": [{"name": "JavaScript", "category": "Language"}],
        }

        payload = parse_resume_into_profile(uploaded, existing, "openai", "gpt-5.4-mini")

        self.assertIn("AI duplicate review was unavailable, so deterministic review matches were used.", payload["warnings"])
        self.assertEqual(
            [(item["section"], item["status"], item["existing_index"], item["recommended_action"]) for item in payload["review_items"]],
            [
                ("projects", "duplicate", 0, "merge"),
                ("skills", "new", None, "add"),
            ],
        )
        self.assertIn("parsed_profile", payload)
        self.assertIn("merged_profile", payload)
        self.assertIn("suggestions", payload)
        self.assertIn("matches", payload)
        extract_mock.assert_called_once_with(uploaded)
        self.assertEqual(generate_mock.call_count, 2)

    @patch("apps.users.resume_parser.extract_pdf_text", return_value="Resume text")
    def test_extract_resume_text_supports_pdf(self, extract_pdf_mock):
        uploaded = SimpleUploadedFile("resume.pdf", b"%PDF-1.4", content_type="application/pdf")

        self.assertEqual(extract_resume_text(uploaded), "Resume text")
        extract_pdf_mock.assert_called_once()

    @patch.dict("sys.modules", {
        "docx": SimpleNamespace(
            Document=lambda _: SimpleNamespace(
                paragraphs=[SimpleNamespace(text="Taylor Avery"), SimpleNamespace(text="")],
                tables=[
                    SimpleNamespace(
                        rows=[
                            SimpleNamespace(
                                cells=[SimpleNamespace(text="Skill"), SimpleNamespace(text="Python")]
                            )
                        ]
                    )
                ],
            )
        )
    })
    def test_extract_resume_text_supports_docx(self):
        uploaded = SimpleUploadedFile(
            "resume.docx",
            b"docx bytes",
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

        self.assertEqual(extract_resume_text(uploaded), "Taylor Avery\nSkill | Python")

    def test_extract_resume_text_rejects_unsupported_file(self):
        uploaded = SimpleUploadedFile("resume.txt", b"text", content_type="text/plain")

        with self.assertRaises(ResumeParseError):
            extract_resume_text(uploaded)

    @patch("apps.users.resume_parser.extract_resume_text", return_value="Resume text")
    @patch(
        "apps.users.resume_parser._generate_with_openai",
        side_effect=[
            '{"full_name":" Taylor Avery ","ignored":"nope","skills":[{"name":" Python ","category":" Backend "}]}',
            '{"review_items":[{"section":"skills","status":"new","existing_index":null,"parsed_index":0,"confidence":0.9,"reason":"No matching skill.","recommended_action":"add"}]}',
        ],
    )
    def test_parse_resume_into_profile_normalizes_llm_json(self, generate_mock, extract_mock):
        uploaded = SimpleUploadedFile("resume.pdf", b"%PDF-1.4", content_type="application/pdf")

        payload = parse_resume_into_profile(uploaded, {"uid": "uid-1", "email": "user@example.com"}, "openai", "gpt-5.4-mini")

        self.assertEqual(payload["parsed_profile"]["full_name"], "Taylor Avery")
        self.assertEqual(payload["parsed_profile"]["skills"], [{"name": "Python", "category": "Backend"}])
        self.assertNotIn("ignored", payload["parsed_profile"])
        self.assertEqual(payload["merged_profile"]["skills"], [{"name": "Python", "category": "Backend"}])
        self.assertEqual(payload["review_items"][0]["section"], "skills")
        extract_mock.assert_called_once_with(uploaded)
        self.assertEqual(generate_mock.call_count, 2)
