from django.urls import path
from . import views

urlpatterns = [
    path('api/clinics/sofia/', views.sofia_clinics_api, name='sofia_clinics_api'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('children/', views.children_list, name='children_list'),
    path('children/<int:child_id>/', views.child_detail, name='child_detail'),
    path('children/<int:child_id>/assign/', views.assign_exercise, name='assign_exercise'),
]
