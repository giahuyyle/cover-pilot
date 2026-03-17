from rest_framework import serializers

from .enums import ResumeTemplate


class ResumeGenerationSerializer(serializers.Serializer):
    template = serializers.ChoiceField(
        choices=ResumeTemplate.choices(),
        default=ResumeTemplate.default(),
    )
    pdf = serializers.FileField()
    prompt = serializers.CharField(required=False, default="", allow_blank=True)
    job_description = serializers.CharField()
