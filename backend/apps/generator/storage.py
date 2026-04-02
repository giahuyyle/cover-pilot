import subprocess
import tempfile
import uuid
import shutil
import math
from datetime import datetime, timezone, timedelta
from pathlib import Path, PurePosixPath

import boto3
from django.conf import settings
from firebase_admin import firestore

USER_DOC_TTL_SECONDS = 24 * 60 * 60
GUEST_DOC_TTL_SECONDS = 30 * 60
ACTIVE_STORAGE_LINK_TTL_SECONDS = 15 * 60
DEFAULT_STORAGE_PAGE = 1
DEFAULT_STORAGE_PAGE_SIZE = 10
MAX_STORAGE_PAGE_SIZE = 50


def _resolve_pdflatex() -> str:
    """Find a usable pdflatex executable path."""
    pdflatex = shutil.which("pdflatex")
    if pdflatex:
        return pdflatex

    # Default MacTeX binary location on macOS.
    fallback = Path("/Library/TeX/texbin/pdflatex")
    if fallback.exists():
        return str(fallback)

    raise FileNotFoundError(
        "pdflatex is not installed or not on PATH. Install a TeX distribution (e.g. MacTeX) and retry."
    )


def _compile_latex_to_pdf(latex: str) -> bytes:
    """Compile a LaTeX string to PDF bytes using pdflatex."""
    pdflatex = _resolve_pdflatex()

    with tempfile.TemporaryDirectory() as tmpdir:
        tex_path = Path(tmpdir) / "resume.tex"
        pdf_path = Path(tmpdir) / "resume.pdf"

        tex_path.write_text(latex, encoding="utf-8")

        result = subprocess.run(
            [pdflatex, "-interaction=nonstopmode", "-output-directory", tmpdir, str(tex_path)],
            capture_output=True,
            text=True,
        )

        if not pdf_path.exists():
            raise RuntimeError(f"pdflatex failed:\n{result.stdout}\n{result.stderr}")

        return pdf_path.read_bytes()


def _s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION,
    )


def _format_timestamp(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def _parse_timestamp(value: str | datetime | None) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        parsed = value
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    normalized = value.strip()
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"

    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _generate_presigned_get_url(
    s3,
    key: str,
    *,
    expires_in: int,
    content_disposition: str | None = None,
) -> str:
    params = {"Bucket": settings.AWS_S3_BUCKET_NAME, "Key": key}
    if content_disposition:
        params["ResponseContentDisposition"] = content_disposition

    return s3.generate_presigned_url(
        "get_object",
        Params=params,
        ExpiresIn=expires_in,
    )


def _s3_filename(key: str, fallback_doc_id: str) -> str:
    filename = PurePosixPath(key).name if key else ""
    return filename or f"Document {fallback_doc_id}"


def _normalize_positive_int(value, default: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default

    return parsed if parsed > 0 else default


def save_to_s3_temp(latex: str, template: str) -> str:
    """Compile LaTeX to PDF, upload to S3 temp/, return a short-lived presigned download URL."""
    pdf_bytes = _compile_latex_to_pdf(latex)

    s3 = _s3_client()
    key = f"temp/{uuid.uuid4()}.pdf"
    s3.put_object(
        Bucket=settings.AWS_S3_BUCKET_NAME,
        Key=key,
        Body=pdf_bytes,
        ContentType="application/pdf",
    )

    url = _generate_presigned_get_url(
        s3,
        key,
        expires_in=GUEST_DOC_TTL_SECONDS,
    )
    return url


def save_to_firestore(uid: str, latex: str, template: str) -> tuple[str, str]:
    """Compile LaTeX to PDF, upload to S3 users/, and save user document metadata to Firestore."""
    pdf_bytes = _compile_latex_to_pdf(latex)

    created_at = datetime.now(timezone.utc)
    expires_at = created_at + timedelta(seconds=USER_DOC_TTL_SECONDS)

    s3 = _s3_client()
    key = f"users/{uid}/{uuid.uuid4()}.pdf"
    s3.put_object(
        Bucket=settings.AWS_S3_BUCKET_NAME,
        Key=key,
        Body=pdf_bytes,
        ContentType="application/pdf",
    )
    pdf_url = _generate_presigned_get_url(
        s3,
        key,
        expires_in=USER_DOC_TTL_SECONDS,
    )

    db = firestore.client()
    _, doc_ref = db.collection("users").document(uid).collection("resumes").add({
        "template": template,
        "s3_key": key,
        "created_at": _format_timestamp(created_at),
        "expires_at": _format_timestamp(expires_at),
        "kind": "resume",
        "mode": "user",
    })
    return doc_ref.id, pdf_url


def save_guest_to_firestore(guest_id: str, latex: str, template: str) -> tuple[str, str]:
    """Compile LaTeX to PDF, upload to S3 guests/, and save guest metadata in Firestore."""
    pdf_bytes = _compile_latex_to_pdf(latex)

    created_at = datetime.now(timezone.utc)
    expires_at = created_at + timedelta(seconds=GUEST_DOC_TTL_SECONDS)

    s3 = _s3_client()
    key = f"guests/{guest_id}/{uuid.uuid4()}.pdf"
    s3.put_object(
        Bucket=settings.AWS_S3_BUCKET_NAME,
        Key=key,
        Body=pdf_bytes,
        ContentType="application/pdf",
    )
    pdf_url = _generate_presigned_get_url(
        s3,
        key,
        expires_in=GUEST_DOC_TTL_SECONDS,
    )

    db = firestore.client()
    _, doc_ref = db.collection("guests").document(guest_id).collection("documents").add({
        "template": template,
        "s3_key": key,
        "created_at": _format_timestamp(created_at),
        "expires_at": _format_timestamp(expires_at),
        "kind": "resume",
        "mode": "guest",
    })
    return doc_ref.id, pdf_url


def list_user_documents(uid: str, page=DEFAULT_STORAGE_PAGE, page_size=DEFAULT_STORAGE_PAGE_SIZE) -> dict:
    """Return paginated user-generated documents with expiry status and active links."""
    now = datetime.now(timezone.utc)
    db = firestore.client()
    s3 = _s3_client()
    normalized_page = _normalize_positive_int(page, DEFAULT_STORAGE_PAGE)
    normalized_page_size = min(
        _normalize_positive_int(page_size, DEFAULT_STORAGE_PAGE_SIZE),
        MAX_STORAGE_PAGE_SIZE,
    )

    rows: list[tuple[datetime, dict]] = []
    docs = db.collection("users").document(uid).collection("resumes").stream()

    for doc in docs:
        payload = doc.to_dict() or {}
        created_at = _parse_timestamp(payload.get("created_at"))
        expires_at = _parse_timestamp(payload.get("expires_at"))

        if expires_at is None and created_at is not None:
            expires_at = created_at + timedelta(seconds=USER_DOC_TTL_SECONDS)

        expired = True
        if expires_at is not None:
            expired = now >= expires_at

        s3_key = payload.get("s3_key", "")
        expired = expired or not bool(s3_key)
        name = _s3_filename(s3_key, doc.id)
        view_url = None
        download_url = None

        if not expired and s3_key:
            view_url = _generate_presigned_get_url(
                s3,
                s3_key,
                expires_in=ACTIVE_STORAGE_LINK_TTL_SECONDS,
                content_disposition=f'inline; filename="{name}"',
            )
            download_url = _generate_presigned_get_url(
                s3,
                s3_key,
                expires_in=ACTIVE_STORAGE_LINK_TTL_SECONDS,
                content_disposition=f'attachment; filename="{name}"',
            )

        record = {
            "id": doc.id,
            "name": name,
            "kind": payload.get("kind", "resume"),
            "template": payload.get("template", ""),
            "mode": payload.get("mode", "user"),
            "created_at": _format_timestamp(created_at) if created_at else payload.get("created_at", ""),
            "expires_at": _format_timestamp(expires_at) if expires_at else "",
            "expired": expired,
        }
        if view_url and download_url:
            record["view_url"] = view_url
            record["download_url"] = download_url
        sort_key = created_at or datetime.fromtimestamp(0, tz=timezone.utc)
        rows.append((sort_key, record))

    rows.sort(key=lambda item: item[0], reverse=True)
    documents = [row[1] for row in rows]
    total_items = len(documents)
    total_pages = max(1, math.ceil(total_items / normalized_page_size))
    normalized_page = min(normalized_page, total_pages)

    start = (normalized_page - 1) * normalized_page_size
    end = start + normalized_page_size

    return {
        "documents": documents[start:end],
        "pagination": {
            "page": normalized_page,
            "page_size": normalized_page_size,
            "total_items": total_items,
            "total_pages": total_pages,
            "has_next": normalized_page < total_pages,
            "has_prev": normalized_page > 1,
        },
    }
