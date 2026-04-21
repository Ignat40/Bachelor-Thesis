from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.therapist_login, name='login'),
    path('logout/', views.therapist_logout, name='logout'),
]