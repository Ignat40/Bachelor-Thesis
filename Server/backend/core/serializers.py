from rest_framework import serializers
from .models import Patient, Exercise, Session, Attempt


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()


class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = ["id", "sound", "prompt_text", "target_repetitions"]


class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = ["id", "patient", "started_at", "completed_at"]


class AttemptSubmitSerializer(serializers.Serializer):
    session_id = serializers.IntegerField()
    exercise_id = serializers.IntegerField()
    repetition_index = serializers.IntegerField()
    was_correct = serializers.BooleanField()
    mouth_score = serializers.FloatField()
    audio_score = serializers.FloatField()