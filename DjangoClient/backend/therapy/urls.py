from django.urls import path
from . import views

urlpatterns = [
    path('api/clinics/sofia/', views.sofia_clinics_api, name='sofia_clinics_api'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('children/', views.children_list, name='children_list'),
    path('children/<int:child_id>/', views.child_detail, name='child_detail'),
    path('children/<int:child_id>/assign/', views.assign_exercise, name='assign_exercise'),
    path(
        'api/assignment/<int:assignment_id>/exercise/',
        views.assignment_exercise_api,
        name='assignment_exercise_api'
    ),
    path(
        'api/sessions/',
        views.create_exercise_session_api,
        name='create_exercise_session_api'
    ),
    path(
        'api/dashboard-data/',
        views.dashboard_data_api,
        name='dashboard_data_api'
    ),
    path(
        'api/assignments/',
        views.create_assignment_api,
        name='create_assignment_api'
    ),
    path(
        'api/assignment/<int:assignment_id>/unassign/',
        views.unassign_exercise_api,
        name='unassign_exercise_api'
    ),
    path(
        'api/assignment/<int:assignment_id>/template/',
        views.assignment_template_api,
        name='assignment_template_api'
    ),
    path('exercise/api/create/', views.create_exercise, name='api_create_exercise'),
    path('therapy/exercise/api/update/<int:exercise_id>/', views.update_exercise, name='update_exercise'),
    path('therapy/exercise/api/delete/<int:exercise_id>/', views.delete_exercise, name='delete_exercise'),
]
