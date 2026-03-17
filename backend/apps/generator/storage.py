import subprocess
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path

import boto3
from django.conf import settings
from firebase_admin import firestore


def _compile_latex_to_pdf(latex: str) -> bytes:
    """Compile a LaTeX string to PDF bytes using pdflatex."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tex_path = Path(tmpdir) / "resume.tex"
        pdf_path = Path(tmpdir) / "resume.pdf"

        tex_path.write_text(latex, encoding="utf-8")

        result = subprocess.run(
            ["pdflatex", "-interaction=nonstopmode", "-output-directory", tmpdir, str(tex_path)],
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


def save_to_s3_temp(latex: str, template: str) -> str:
    """Compile LaTeX to PDF, upload to S3 temp/, return a presigned download URL."""
    pdf_bytes = _compile_latex_to_pdf(latex)

    s3 = _s3_client()
    key = f"temp/{uuid.uuid4()}.pdf"
    s3.put_object(
        Bucket=settings.AWS_S3_BUCKET_NAME,
        Key=key,
        Body=pdf_bytes,
        ContentType="application/pdf",
    )

    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.AWS_S3_BUCKET_NAME, "Key": key},
        ExpiresIn=3600,  # 1 hour
    )
    return url


def save_to_firestore(uid: str, latex: str, template: str) -> str:
    """Compile LaTeX to PDF, upload to S3 users/, save metadata to Firestore. Returns doc ID."""
    pdf_bytes = _compile_latex_to_pdf(latex)

    s3 = _s3_client()
    key = f"users/{uid}/{uuid.uuid4()}.pdf"
    s3.put_object(
        Bucket=settings.AWS_S3_BUCKET_NAME,
        Key=key,
        Body=pdf_bytes,
        ContentType="application/pdf",
    )
    pdf_url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.AWS_S3_BUCKET_NAME, "Key": key},
        ExpiresIn=86400,  # 24 hours
    )

    db = firestore.client()
    _, doc_ref = db.collection("users").document(uid).collection("resumes").add({
        "template": template,
        "s3_key": key,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return doc_ref.id, pdf_url
