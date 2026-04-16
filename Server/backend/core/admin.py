from django.contrib import admin
from .models import Patient, Exercise, Session, Attempt

admin.site.register(Patient)
admin.site.register(Exercise)
admin.site.register(Session)
admin.site.register(Attempt)