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

        self.assertEqual([row["id"] for row in result], ["new", "legacy", "expired"])

        self.assertFalse(result[0]["expired"])
        self.assertEqual(result[0]["view_url"], "https://example.com/new/view")
        self.assertEqual(result[0]["download_url"], "https://example.com/new/download")
        self.assertEqual(result[0]["name"], "new.pdf")

        self.assertFalse(result[1]["expired"])
        expected_legacy_expiry = created_legacy + timedelta(seconds=USER_DOC_TTL_SECONDS)
        self.assertEqual(
            datetime.fromisoformat(result[1]["expires_at"]),
            expected_legacy_expiry,
        )
        self.assertEqual(result[1]["view_url"], "https://example.com/legacy/view")
        self.assertEqual(result[1]["download_url"], "https://example.com/legacy/download")
        self.assertEqual(result[1]["name"], "legacy.pdf")

        self.assertTrue(result[2]["expired"])
        self.assertNotIn("view_url", result[2])
        self.assertNotIn("download_url", result[2])
        self.assertEqual(result[2]["name"], "expired.pdf")

        self.assertEqual(s3.generate_presigned_url.call_count, 4)
