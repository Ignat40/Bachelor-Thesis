from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.therapist_register, name='register'),
    path('login/', views.therapist_login, name='login'),
    path('logout/', views.therapist_logout, name='logout'),
]
