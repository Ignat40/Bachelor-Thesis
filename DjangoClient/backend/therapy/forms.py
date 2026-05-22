from django import forms
from .models import Exercise

class exerciseForm(forms.ModelForm):
    class Meta:
        model = Exercise
        fields = ['title', 'description', 'category', 'difficulty'] #Need to add template_json. Now im just testing

        #Widgets could be added. Could look better. It is for styling