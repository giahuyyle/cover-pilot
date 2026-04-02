from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from apps.generator.storage import USER_DOC_TTL_SECONDS, list_user_documents


class _FakeDoc:
    def __init__(self, doc_id: str, payload: dict):
        self.id = doc_id
        self._payload = payload

    def to_dict(self):
        return self._payload


class StorageServicesTests(SimpleTestCase):
    @patch("apps.generator.storage._s3_client")
    @patch("apps.generator.storage.firestore.client")
    def test_list_user_documents_handles_active_expired_and_sorts_newest_first(self, firestore_client_mock, s3_client_mock):
        now = datetime.now(timezone.utc)
        created_legacy = now - timedelta(hours=1)
        created_expired = now - timedelta(hours=30)
        created_new = now - timedelta(minutes=2)

        docs = [
            _FakeDoc("legacy", {
                "template": "classic",
                "s3_key": "users/uid-1/legacy.pdf",
                "created_at": created_legacy.isoformat(),
            }),
            _FakeDoc("expired", {
                "template": "minimal",
                "s3_key": "users/uid-1/expired.pdf",
                "created_at": created_expired.isoformat(),
            }),
            _FakeDoc("new", {
                "name": "Acme Corp - Software Engineer",
                "company_name": "Acme Corp",
                "position_name": "Software Engineer",
                "template": "modern",
                "s3_key": "users/uid-1/new.pdf",
                "created_at": created_new.isoformat(),
                "expires_at": (now + timedelta(minutes=10)).isoformat(),
            }),
        ]

        db = MagicMock()
        firestore_client_mock.return_value = db
        db.collection.return_value.document.return_value.collection.return_value.stream.return_value = docs

        s3 = MagicMock()
        s3.generate_presigned_url.side_effect = [
            "https://example.com/legacy/view",
            "https://example.com/legacy/download",
            "https://example.com/new/view",
            "https://example.com/new/download",
        ]
        s3_client_mock.return_value = s3

        result = list_user_documents("uid-1")
        documents = result["documents"]
        pagination = result["pagination"]

        self.assertEqual([row["id"] for row in documents], ["new", "legacy", "expired"])
        self.assertEqual(pagination["page"], 1)
        self.assertEqual(pagination["page_size"], 10)
        self.assertEqual(pagination["total_items"], 3)
        self.assertEqual(pagination["total_pages"], 1)
        self.assertFalse(pagination["has_next"])
        self.assertFalse(pagination["has_prev"])

        self.assertFalse(documents[0]["expired"])
        self.assertEqual(documents[0]["view_url"], "https://example.com/new/view")
        self.assertEqual(documents[0]["download_url"], "https://example.com/new/download")
        self.assertEqual(documents[0]["name"], "Acme Corp - Software Engineer")
        self.assertEqual(documents[0]["company_name"], "Acme Corp")
        self.assertEqual(documents[0]["position_name"], "Software Engineer")

        self.assertFalse(documents[1]["expired"])
        expected_legacy_expiry = created_legacy + timedelta(seconds=USER_DOC_TTL_SECONDS)
        self.assertEqual(
            datetime.fromisoformat(documents[1]["expires_at"]),
            expected_legacy_expiry,
        )
        self.assertEqual(documents[1]["view_url"], "https://example.com/legacy/view")
        self.assertEqual(documents[1]["download_url"], "https://example.com/legacy/download")
        self.assertEqual(documents[1]["name"], "legacy.pdf")
        self.assertEqual(documents[1]["company_name"], "legacy.pdf")
        self.assertEqual(documents[1]["position_name"], "")

        self.assertTrue(documents[2]["expired"])
        self.assertNotIn("view_url", documents[2])
        self.assertNotIn("download_url", documents[2])
        self.assertEqual(documents[2]["name"], "expired.pdf")
        self.assertEqual(documents[2]["company_name"], "expired.pdf")
        self.assertEqual(documents[2]["position_name"], "")

        self.assertEqual(s3.generate_presigned_url.call_count, 4)

    @patch("apps.generator.storage._s3_client")
    @patch("apps.generator.storage.firestore.client")
    def test_list_user_documents_returns_requested_page_slice(self, firestore_client_mock, s3_client_mock):
        now = datetime.now(timezone.utc)
        docs = [
            _FakeDoc(f"doc-{i}", {
                "template": "classic",
                "s3_key": f"users/uid-1/doc-{i}.pdf",
                "created_at": (now - timedelta(minutes=i)).isoformat(),
                "expires_at": (now + timedelta(hours=1)).isoformat(),
            })
            for i in range(5)
        ]

        db = MagicMock()
        firestore_client_mock.return_value = db
        db.collection.return_value.document.return_value.collection.return_value.stream.return_value = docs

        s3 = MagicMock()
        s3.generate_presigned_url.side_effect = [f"https://example.com/url-{i}" for i in range(20)]
        s3_client_mock.return_value = s3

        result = list_user_documents("uid-1", page=2, page_size=2)
        documents = result["documents"]
        pagination = result["pagination"]

        self.assertEqual([row["id"] for row in documents], ["doc-2", "doc-3"])
        self.assertEqual(pagination["page"], 2)
        self.assertEqual(pagination["page_size"], 2)
        self.assertEqual(pagination["total_items"], 5)
        self.assertEqual(pagination["total_pages"], 3)
        self.assertTrue(pagination["has_next"])
        self.assertTrue(pagination["has_prev"])

    @patch("apps.generator.storage._s3_client")
    @patch("apps.generator.storage.firestore.client")
    def test_list_user_documents_normalizes_invalid_and_out_of_range_pagination(self, firestore_client_mock, s3_client_mock):
        now = datetime.now(timezone.utc)
        docs = [
            _FakeDoc(f"doc-{i}", {
                "template": "classic",
                "s3_key": f"users/uid-1/doc-{i}.pdf",
                "created_at": (now - timedelta(minutes=i)).isoformat(),
                "expires_at": (now + timedelta(hours=1)).isoformat(),
            })
            for i in range(2)
        ]

        db = MagicMock()
        firestore_client_mock.return_value = db
        db.collection.return_value.document.return_value.collection.return_value.stream.return_value = docs

        s3 = MagicMock()
        s3.generate_presigned_url.side_effect = [f"https://example.com/url-{i}" for i in range(8)]
        s3_client_mock.return_value = s3

        # Invalid params fall back to defaults.
        fallback_result = list_user_documents("uid-1", page="abc", page_size="xyz")
        fallback_pagination = fallback_result["pagination"]
        self.assertEqual(fallback_pagination["page"], 1)
        self.assertEqual(fallback_pagination["page_size"], 10)

        # Out-of-range page clamps to last page.
        clamped_result = list_user_documents("uid-1", page=999, page_size=1)
        clamped_pagination = clamped_result["pagination"]
        self.assertEqual(clamped_pagination["page"], 2)
        self.assertEqual(clamped_pagination["total_pages"], 2)
        self.assertFalse(clamped_pagination["has_next"])

    @patch("apps.generator.storage._s3_client")
    @patch("apps.generator.storage.firestore.client")
    def test_list_user_documents_safely_splits_legacy_hyphen_name(self, firestore_client_mock, s3_client_mock):
        now = datetime.now(timezone.utc)
        docs = [
            _FakeDoc("doc-1", {
                "name": "Orbit Labs - AI Platform Intern",
                "template": "classic",
                "s3_key": "users/uid-1/doc-1.pdf",
                "created_at": now.isoformat(),
                "expires_at": (now + timedelta(hours=1)).isoformat(),
            }),
        ]

        db = MagicMock()
        firestore_client_mock.return_value = db
        db.collection.return_value.document.return_value.collection.return_value.stream.return_value = docs

        s3 = MagicMock()
        s3.generate_presigned_url.side_effect = ["https://example.com/view", "https://example.com/download"]
        s3_client_mock.return_value = s3

        result = list_user_documents("uid-1")
        row = result["documents"][0]
        self.assertEqual(row["name"], "Orbit Labs - AI Platform Intern")
        self.assertEqual(row["company_name"], "Orbit Labs")
        self.assertEqual(row["position_name"], "AI Platform Intern")
