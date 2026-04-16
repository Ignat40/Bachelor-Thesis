from django.urls import path
from .views import login_view, start_session, next_exercise, submit_attempt, finish_session

urlpatterns = [
    path("login/", login_view),
    path("session/start/", start_session),
    path("exercise/next/<int:session_id>/", next_exercise),
    path("attempt/submit/", submit_attempt),
    path("session/finish/", finish_session),
]

