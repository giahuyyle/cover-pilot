from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from .serializers import ResumeGenerationSerializer
from .services import process_resume_request
from .storage import save_to_s3_temp, save_to_firestore


class GenerateResumeView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser]

    def post(self, request):
        serializer = ResumeGenerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            latex, template = process_resume_request(
                pdf_file=data["pdf"],
                template=data["template"],
                job_description=data["job_description"],
                prompt=data.get("prompt", ""),
            )
        except Exception as exc:
            return Response(
                {"error": f"Failed to process resume input: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        uid = request.user.get("uid") if isinstance(request.user, dict) else None

        try:
            if uid:
                doc_id, pdf_url = save_to_firestore(uid, latex, template)
                return Response(
                    {"pdf_url": pdf_url, "template": template, "mode": "user", "doc_id": doc_id},
                    status=status.HTTP_200_OK,
                )

            pdf_url = save_to_s3_temp(latex, template)
            return Response(
                {"pdf_url": pdf_url, "template": template, "mode": "guest"},
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
