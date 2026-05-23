from core.permissions import IsFirebaseAuthenticated as IsAuthenticated
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from apps.tailor.storage import list_user_documents
from apps.tailor.services import is_supported_provider_model, supported_provider_models
from .resume_parser import (
    DEFAULT_PARSE_MODEL,
    DEFAULT_PARSE_PROVIDER,
    MAX_RESUME_BYTES,
    ResumeParseError,
    parse_resume_into_profile,
)
from .services import get_user_profile, update_user_profile


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        uid = request.user["uid"]
        profile = get_user_profile(uid)
        if profile is None:
            return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(profile)

    def put(self, request):
        uid = request.user["uid"]
        email = request.user.get("email", "")
        updated = update_user_profile(uid, request.data, email=email)
        return Response(updated)


class StorageListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        uid = request.user["uid"]
        page = request.query_params.get("page")
        page_size = request.query_params.get("page_size")
        payload = list_user_documents(uid, page=page, page_size=page_size)
        return Response(payload, status=status.HTTP_200_OK)


class ResumeParseView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        provider = (request.data.get("provider") or DEFAULT_PARSE_PROVIDER).lower()
        model = request.data.get("model") or DEFAULT_PARSE_MODEL
        if not is_supported_provider_model(provider, model):
            allowed = ", ".join(
                f"{name}: {', '.join(models)}"
                for name, models in supported_provider_models().items()
            )
            return Response(
                {"error": f"Unsupported provider/model combination. Allowed: {allowed}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        uploaded_file = request.FILES.get("resume")
        if uploaded_file is None:
            return Response({"error": "Resume file is required."}, status=status.HTTP_400_BAD_REQUEST)

        if getattr(uploaded_file, "size", 0) > MAX_RESUME_BYTES:
            return Response({"error": "Resume file must be 10MB or smaller."}, status=status.HTTP_400_BAD_REQUEST)

        uid = request.user["uid"]
        profile = get_user_profile(uid)
        if profile is None:
            return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            payload = parse_resume_into_profile(uploaded_file, profile, provider, model)
        except ResumeParseError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response(
                {"error": f"Failed to parse resume: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(payload, status=status.HTTP_200_OK)
