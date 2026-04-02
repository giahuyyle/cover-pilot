from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.users.views import StorageListView


class StorageListApiTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = StorageListView.as_view()

    @patch("apps.users.views.list_user_documents", return_value=[{"id": "doc-1"}])
    def test_get_storage_returns_documents_for_authenticated_user(self, list_mock):
        request = self.factory.get("/api/users/storage/")
        force_authenticate(request, user={"uid": "uid-1"})

        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["documents"], [{"id": "doc-1"}])
        list_mock.assert_called_once_with("uid-1")

    def test_get_storage_requires_authentication(self):
        request = self.factory.get("/api/users/storage/")
        response = self.view(request)

        self.assertEqual(response.status_code, 403)
