from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.tailor.services import is_supported_provider_model, supported_provider_models
from apps.tailor.storage import save_to_firestore
from apps.users.services import get_user_profile
from core.permissions import IsFirebaseAuthenticated as IsAuthenticated

from .serializers import ProfileResumeGenerationSerializer
from .services import (
    build_document_name,
    build_resume_download_filename,
    generate_profile_resume_latex,
)


class GenerateProfileResumeView(APIView):
    permission_classes = [IsAuthenticated]

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

        serializer = ProfileResumeGenerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        role = data["role"].strip()
        company_name = data.get("company_name", "").strip()

        uid = request.user["uid"]
        profile = get_user_profile(uid)
        if profile is None:
            return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            latex, template, warnings = generate_profile_resume_latex(
                profile=profile,
                role=role,
                company_name=company_name,
                job_description=data.get("job_description", ""),
                provider=provider,
                model=model,
                prompt=data.get("prompt", ""),
            )
        except Exception as exc:
            return Response(
                {"error": f"Failed to generate resume from profile: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        document_name = build_document_name(role, company_name)
        download_filename = build_resume_download_filename(role, profile)

        try:
            doc_id, pdf_url = save_to_firestore(
                uid,
                latex,
                template,
                document_name=document_name,
                company_name=company_name,
                position_name=role,
                download_filename=download_filename,
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
            return Response({"error": str(exc)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        payload = {
            "pdf_url": pdf_url,
            "template": template,
            "mode": "user",
            "doc_id": doc_id,
            "document_name": document_name,
        }
        if warnings:
            payload["warnings"] = warnings

        return Response(payload, status=status.HTTP_200_OK)
