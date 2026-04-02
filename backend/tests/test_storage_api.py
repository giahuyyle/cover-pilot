from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.users.views import StorageListView


class StorageListApiTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = StorageListView.as_view()

    @patch("apps.users.views.list_user_documents", return_value={
        "documents": [{"id": "doc-1"}],
        "pagination": {
            "page": 1,
            "page_size": 10,
            "total_items": 1,
            "total_pages": 1,
            "has_next": False,
            "has_prev": False,
        },
    })
    def test_get_storage_returns_documents_for_authenticated_user(self, list_mock):
        request = self.factory.get("/api/users/storage/")
        force_authenticate(request, user={"uid": "uid-1"})

        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["documents"], [{"id": "doc-1"}])
        self.assertEqual(response.data["pagination"]["total_items"], 1)
        list_mock.assert_called_once_with("uid-1", page=None, page_size=None)

    @patch("apps.users.views.list_user_documents", return_value={
        "documents": [],
        "pagination": {
            "page": 2,
            "page_size": 5,
            "total_items": 7,
            "total_pages": 2,
            "has_next": False,
            "has_prev": True,
        },
    })
    def test_get_storage_forwards_pagination_query_params(self, list_mock):
        request = self.factory.get("/api/users/storage/?page=2&page_size=5")
        force_authenticate(request, user={"uid": "uid-1"})

        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["pagination"]["page"], 2)
        self.assertEqual(response.data["pagination"]["page_size"], 5)
        list_mock.assert_called_once_with("uid-1", page="2", page_size="5")

    def test_get_storage_requires_authentication(self):
        request = self.factory.get("/api/users/storage/")
        response = self.view(request)

        self.assertEqual(response.status_code, 403)
