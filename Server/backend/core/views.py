from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Patient, Exercise, Session, Attempt
from .serializers import ExerciseSerializer, AttemptSubmitSerializer


@api_view(["POST"])
def login_view(request):
    username = request.data.get("username")
    if not username:
        return Response({"error": "username required"}, status=status.HTTP_400_BAD_REQUEST)

    patient, _ = Patient.objects.get_or_create(username=username)
    return Response({
        "patient_id": patient.id,
        "username": patient.username
    })


@api_view(["POST"])
def start_session(request):
    patient_id = request.data.get("patient_id")
    if not patient_id:
        return Response({"error": "patient_id required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        patient = Patient.objects.get(id=patient_id)
    except Patient.DoesNotExist:
        return Response({"error": "patient not found"}, status=status.HTTP_404_NOT_FOUND)

    session = Session.objects.create(patient=patient)
    return Response({
        "session_id": session.id,
        "started_at": session.started_at
    })


@api_view(["GET"])
def next_exercise(request, session_id):
    exercise = Exercise.objects.first()
    if not exercise:
        return Response({"error": "no exercise configured"}, status=status.HTTP_404_NOT_FOUND)

    return Response(ExerciseSerializer(exercise).data)


@api_view(["POST"])
def submit_attempt(request):
    serializer = AttemptSubmitSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    try:
        session = Session.objects.get(id=data["session_id"])
        exercise = Exercise.objects.get(id=data["exercise_id"])
    except Session.DoesNotExist:
        return Response({"error": "session not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exercise.DoesNotExist:
        return Response({"error": "exercise not found"}, status=status.HTTP_404_NOT_FOUND)

    attempt = Attempt.objects.create(
        session=session,
        exercise=exercise,
        repetition_index=data["repetition_index"],
        was_correct=data["was_correct"],
        mouth_score=data["mouth_score"],
        audio_score=data["audio_score"],
    )

    return Response({
        "attempt_id": attempt.id,
        "saved": True
    })


@api_view(["POST"])
def finish_session(request):
    session_id = request.data.get("session_id")
    if not session_id:
        return Response({"error": "session_id required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        session = Session.objects.get(id=session_id)
    except Session.DoesNotExist:
        return Response({"error": "session not found"}, status=status.HTTP_404_NOT_FOUND)

    session.completed_at = timezone.now()
    session.save()

    total_attempts = session.attempts.count()
    correct_attempts = session.attempts.filter(was_correct=True).count()

    return Response({
        "session_id": session.id,
        "total_attempts": total_attempts,
        "correct_attempts": correct_attempts
    })