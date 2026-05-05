import re

from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from .serializers import ResumeGenerationSerializer
from .services import (
    is_supported_provider_model,
    process_resume_request,
    summarize_document_identity,
    supported_provider_models,
)
from .storage import save_to_s3_temp, save_to_firestore, save_guest_to_firestore


def _sanitize_guest_id(value: str) -> str:
    """Restrict guest IDs to safe path/document characters."""
    normalized = re.sub(r"[^A-Za-z0-9_-]", "_", (value or "").strip())
    return normalized[:128]


class GenerateResumeView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser]

    def post(self, request, provider, model):
        provider = (provider or "").lower()
        if not is_supported_provider_model(provider, model):
            allowed = ", ".join(
                f"{name}: {', '.join(models)}"
                for name, models in supported_provider_models().items()
            )
            return Response(
                {"error": f"Unsupported provider/model combination. Allowed: {allowed}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ResumeGenerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            latex, template = process_resume_request(
                pdf_file=data["pdf"],
                template=data["template"],
                job_description=data["job_description"],
                provider=provider,
                model=model,
                prompt=data.get("prompt", ""),
            )
        except Exception as exc:
            return Response(
                {"error": f"Failed to process resume input: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        company_name, position_name, document_name = summarize_document_identity(data.get("job_description", ""))
        uid = request.user.get("uid") if isinstance(request.user, dict) else None

        try:
            if uid:
                doc_id, pdf_url = save_to_firestore(
                    uid,
                    latex,
                    template,
                    document_name=document_name,
                    company_name=company_name,
                    position_name=position_name,
                )
                return Response(
                    {"pdf_url": pdf_url, "template": template, "mode": "user", "doc_id": doc_id, "document_name": document_name},
                    status=status.HTTP_200_OK,
                )

            guest_id = _sanitize_guest_id(
                data.get("guest_id")
                or request.headers.get("X-Guest-Id", "")
                or request.query_params.get("guest_id", "")
            )
            if guest_id:
                doc_id, pdf_url = save_guest_to_firestore(
                    guest_id,
                    latex,
                    template,
                    document_name=document_name,
                    company_name=company_name,
                    position_name=position_name,
                )
                return Response(
                    {"pdf_url": pdf_url, "template": template, "mode": "guest", "doc_id": doc_id, "document_name": document_name},
                    status=status.HTTP_200_OK,
                )

            pdf_url = save_to_s3_temp(latex, template)
            return Response(
                {"pdf_url": pdf_url, "template": template, "mode": "guest", "document_name": document_name},
                status=status.HTTP_200_OK,
            )
        except FileNotFoundError as exc:
            return Response(
                {
                    "error": str(exc),
                    "hint": "Install pdflatex and ensure it is available on PATH.",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except RuntimeError as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
