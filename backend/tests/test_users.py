from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.users.services import get_user_profile, update_user_profile
from apps.users.views import ProfileView


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

        self.assertEqual(response.status_code, 403)


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
