from django.db import models
from django.contrib.auth.models import User


class TherapistProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    organization = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.user.get_full_name() or self.user.username


class Child(models.Model):
    therapist = models.ForeignKey(TherapistProfile, on_delete=models.CASCADE, related_name='children')
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    age = models.PositiveIntegerField()
    diagnosis_notes = models.TextField(blank=True)
    parent_contact = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.first_name} {self.last_name}'


class Exercise(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=100, blank=True)
    difficulty = models.PositiveIntegerField(default=1)

    def __str__(self):
        return self.title


class ExerciseAssignment(models.Model):
    STATUS_CHOICES = [
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]

    child = models.ForeignKey(Child, on_delete=models.CASCADE, related_name='assignments')
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE)
    repetitions = models.PositiveIntegerField(default=1)
    assigned_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='assigned')

    def __str__(self):
        return f'{self.child} - {self.exercise}'


class ProgressRecord(models.Model):
    assignment = models.ForeignKey(ExerciseAssignment, on_delete=models.CASCADE, related_name='progress_records')
    score = models.FloatField(default=0)
    notes = models.TextField(blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.assignment} - {self.score}'