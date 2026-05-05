from rest_framework import serializers


class ProfileResumeGenerationSerializer(serializers.Serializer):
    role = serializers.CharField()
    company_name = serializers.CharField(required=False, default="", allow_blank=True)
    job_description = serializers.CharField(required=False, default="", allow_blank=True)
    prompt = serializers.CharField(required=False, default="", allow_blank=True)
