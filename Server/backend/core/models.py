from django.db import models


class Patient(models.Model):
    username = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.username


class Exercise(models.Model):
    sound = models.CharField(max_length=20)
    prompt_text = models.CharField(max_length=255)
    target_repetitions = models.PositiveIntegerField(default=10)

    def __str__(self):
        return f"{self.sound} - {self.prompt_text}"


class Session(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="sessions")
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Session {self.id} - {self.patient.username}"


class Attempt(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="attempts")
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE)
    repetition_index = models.PositiveIntegerField()
    was_correct = models.BooleanField(default=False)
    mouth_score = models.FloatField(default=0.0)
    audio_score = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Attempt {self.id} - session {self.session.id}"