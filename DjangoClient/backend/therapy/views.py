import json

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404, redirect
from .models import TherapistProfile, Child, Exercise, ExerciseAssignment, ExerciseSession, Clinic
from django.utils.dateparse import parse_datetime
from django.views.decorators.csrf import csrf_exempt


def sofia_clinics_api(request):
    clinics = Clinic.objects.all().order_by('city', 'name')
    data = [
        {
            'id': clinic.id,
            'name': clinic.name,
            'city': clinic.city,
            'address': clinic.address,
            'website': clinic.website,
            'phone': clinic.phone,
        }
        for clinic in clinics
    ]
    return JsonResponse({'clinics': data})


def assignment_exercise_api(request, assignment_id):
    try:
        assignment = ExerciseAssignment.objects.select_related(
            'exercise',
            'child'
        ).get(id=assignment_id)
    except ExerciseAssignment.DoesNotExist:
        return JsonResponse({
            'found': False,
            'assignment': None,
            'message': f'No assignment found {assignment_id}'
        }, status=404)

    return JsonResponse({
        'assignment_id': assignment.id,
        'child_id': assignment.child.id,
        'child_name': str(assignment.child),
        'exercise_id': assignment.exercise.id,
        'exercise_title': assignment.exercise.title,
        'template_json': assignment.exercise.template_json,
    })


# Unity does not have Django's browser CSRF token in this prototype.
@csrf_exempt
def create_exercise_session_api(request):
    if request.method != 'POST':
        return JsonResponse({
            'created': False,
            'message': 'Only POST requests are allowed'
        }, status=405)

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({
            'created': False,
            'message': 'Invalid JSON payload'
        }, status=400)

    assignment_id = payload.get('assignment_id')

    try:
        assignment = ExerciseAssignment.objects.get(id=assignment_id)
    except ExerciseAssignment.DoesNotExist:
        return JsonResponse({
            'created': False,
            'message': f'No assignment found with id {assignment_id}.'
        }, status=404)

    session = ExerciseSession.objects.create(
        assignment=assignment,
        started_at=parse_datetime(payload.get('started_at')) if payload.get('started_at') else None,
        score=float(payload.get('score', 0)),
        total_questions=int(payload.get('total_questions', 0)),
        correct_answers=int(payload.get('correct_answers', 0)),
        duration_seconds=int(payload.get('duration_seconds', 0)),
        raw_events=payload.get('events', []),
    )

    if assignment.status != 'completed':
        assignment.status = 'completed'
        assignment.save(update_fields=['status'])

    return JsonResponse({
        'created': True,
        'session_id': session.id,
        'assignment_id': assignment.id,
        'score': session.score,
    }, status=201)


@login_required
def dashboard_data_api(request):
    try:
        therapist = TherapistProfile.objects.get(user=request.user)
    except TherapistProfile.DoesNotExist:
        return JsonResponse({
            'patients': [],
            'exercises': [],
            'message': 'Therapist profile is missing.'
        }, status=404)

    children = Child.objects.filter(therapist=therapist).prefetch_related(
        'assignments__exercise',
        'assignments__sessions',
    )

    patients = []
    for child in children:
        assignments = list(child.assignments.all())
        sessions = [
            session
            for assignment in assignments
            for session in assignment.sessions.all()
        ]

        scores = [round(session.score) for session in sessions]
        latest_score = scores[-1] if scores else 0

        if not sessions:
            status = 'pending'
        elif latest_score < 50:
            status = 'attention'
        else:
            status = 'active'

        patients.append({
            'id': child.id,
            'name': str(child),
            'age': child.age,
            'condition': child.diagnosis_notes or 'Not specified',
            'sessions': len(sessions),
            'streak': 0,
            'progress': latest_score,
            'scores': scores[-6:],
            'exercises': [assignment.exercise.title for assignment in assignments],
            'status': status,
            'emoji': '',
            'color': '#E8F2FF',
        })

    exercises = []
    therapist_assignments = ExerciseAssignment.objects.filter(
        child__therapist=therapist
    ).select_related('exercise')

    seen_exercises = {}
    for assignment in therapist_assignments:
        exercise = assignment.exercise
        if exercise.id not in seen_exercises:
            seen_exercises[exercise.id] = {
                'id': exercise.id,
                'icon': '',
                'name': exercise.title,
                'cat': exercise.category or 'General',
                'diff': 'Beginner' if exercise.difficulty == 1 else 'Intermediate' if exercise.difficulty == 2 else 'Advanced',
                'col': 'blue',
                'uses': 0,
                'reps': assignment.repetitions,
            }
        seen_exercises[exercise.id]['uses'] += 1

    exercises = list(seen_exercises.values())

    return JsonResponse({
        'patients': patients,
        'exercises': exercises,
    })

@login_required
def dashboard(request):
    try:
        therapist = TherapistProfile.objects.get(user=request.user)
    except TherapistProfile.DoesNotExist:
        return redirect('register')

    children = Child.objects.filter(therapist=therapist)
    assignments = ExerciseAssignment.objects.filter(child__therapist=therapist)

    context = {
        'children_count': children.count(),
        'assignments_count': assignments.count(),
        'completed_count': assignments.filter(status='completed').count(),
        'children': children[:5],
    }
    return render(request, 'therapy/dashboard.html', context)


@login_required
def children_list(request):
    therapist = get_object_or_404(TherapistProfile, user=request.user)
    children = Child.objects.filter(therapist=therapist)
    return render(request, 'therapy/children_list.html', {'children': children})


@login_required
def child_detail(request, child_id):
    therapist = get_object_or_404(TherapistProfile, user=request.user)
    child = get_object_or_404(Child, id=child_id, therapist=therapist)
    assignments = child.assignments.select_related('exercise').all()

    return render(request, 'therapy/child_detail.html', {
        'child': child,
        'assignments': assignments,
    })


@login_required
def assign_exercise(request, child_id):
    therapist = get_object_or_404(TherapistProfile, user=request.user)
    child = get_object_or_404(Child, id=child_id, therapist=therapist)
    exercises = Exercise.objects.all()

    if request.method == 'POST':
        exercise_id = request.POST.get('exercise')
        repetitions = request.POST.get('repetitions')

        exercise = get_object_or_404(Exercise, id=exercise_id)

        ExerciseAssignment.objects.create(
            child=child,
            exercise=exercise,
            repetitions=int(repetitions or 1),
        )
        return redirect('child_detail', child_id=child.id)

    return render(request, 'therapy/assign_exercise.html', {
        'child': child,
        'exercises': exercises,
    })
