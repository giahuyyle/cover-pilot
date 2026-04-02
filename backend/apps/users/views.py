from core.permissions import IsFirebaseAuthenticated as IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from apps.generator.storage import list_user_documents
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
