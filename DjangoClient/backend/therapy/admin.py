from django.contrib import admin
from .models import Clinic, TherapistProfile, Child, Exercise, ExerciseAssignment, ProgressRecord

admin.site.register(Clinic)
admin.site.register(TherapistProfile)
admin.site.register(Child)
admin.site.register(Exercise)
admin.site.register(ExerciseAssignment)
admin.site.register(ProgressRecord)
