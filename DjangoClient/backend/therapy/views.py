import json
from datetime import timedelta

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.utils import timezone
from .models import TherapistProfile, Child, Exercise, ExerciseAssignment, ExerciseSession, Clinic
from django.utils.dateparse import parse_datetime
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.csrf import ensure_csrf_cookie
from django.shortcuts import render, redirect #need it for testing
from .forms import exerciseForm #forms 


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
    
def assignment_template_api(request, assignment_id):
    try:
        assignment = ExerciseAssignment.objects.select_related('exercise').get(id=assignment_id)
    except ExerciseAssignment.DoesNotExist:
        return JsonResponse({
            'found': False, 
            'message': f'No assignment found with id {assignment_id}'
        }, status=404)

    if not assignment.exercise.template_json:
        return JsonResponse({
            'found': False,
            'message': f'Assignment {assignment_id} has no exercise template JSON'
        }, status=404)

    return JsonResponse(assignment.exercise.template_json)
    
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
        sessions = sorted([
            session
            for assignment in assignments
            for session in assignment.sessions.all()
        ], key=lambda session: session.finished_at)

        scores = [round(session.score) for session in sessions]
        latest_score = scores[-1] if scores else 0
        session_dates = sorted({timezone.localdate(session.finished_at) for session in sessions}, reverse=True)
        streak = 0
        cursor_day = timezone.localdate()
        for session_day in session_dates:
            if session_day == cursor_day:
                streak += 1
                cursor_day -= timedelta(days=1)
            elif session_day < cursor_day:
                break

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
            'streak': streak,
            'progress': latest_score,
            'scores': scores[-6:],
            'exercises': [assignment.exercise.title for assignment in assignments],
            'status': status,
            'emoji': '',
            'color': '#E8F2FF',
        })

    therapist_assignments = ExerciseAssignment.objects.filter(
        child__therapist=therapist
    ).select_related('exercise')

    exercise_usage = {}
    for assignment in therapist_assignments:
        exercise_usage[assignment.exercise_id] = exercise_usage.get(assignment.exercise_id, 0) + 1

    exercises = [
        {
            'id': exercise.id,
            'icon': '',
            'name': exercise.title,
            'cat': exercise.category or 'General',
            'diff': 'Beginner' if exercise.difficulty == 1 else 'Intermediate' if exercise.difficulty == 2 else 'Advanced',
            'col': 'blue',
            'uses': exercise_usage.get(exercise.id, 0),
            'reps': 1,
        }
        for exercise in Exercise.objects.all().order_by('title')
    ]
    
    recent_sessions = ExerciseSession.objects.filter(
        assignment__child__therapist=therapist
    ).select_related(
        'assignment__child',
        'assignment__exercise',
    ).order_by('-finished_at')[:5]

    activities = [
        {
            'type': 'completed',
            'patient_name': str(session.assignment.child),
            'exercise_title': session.assignment.exercise.title,
            'score': round(session.score),
            'correct_answers': session.correct_answers,
            'total_questions': session.total_questions,
            'time': session.finished_at.strftime('%d %b %Y %H:%M'),
        }
        for session in recent_sessions
    ]
        
    today = timezone.localdate()
    week_start = today - timedelta(days=today.weekday())

    active_child_ids_this_week = set(
        ExerciseSession.objects.filter(
            assignment__child__therapist=therapist,
            finished_at__date__gte=week_start,
        ).values_list('assignment__child_id', flat=True)
    )

    total_patients = len(patients)
    active_this_week = len(active_child_ids_this_week)
    need_attention = sum(1 for patient in patients if patient['status'] == 'attention')
    
    progress_values = [
        patient['progress']
        for patient in patients
        if patient['sessions'] > 0
    ]

    avg_progress = round(sum(progress_values) / len(progress_values) if progress_values else 0)

    total_sessions = ExerciseSession.objects.filter(
        assignment__child__therapist=therapist
    ).count()

    completed_assignments = ExerciseAssignment.objects.filter(
        child__therapist=therapist,
        status='completed',
    ).count()

    weekly_sessions = []
    for day_offset in range(7):
        day = week_start + timedelta(days=day_offset)
        count = ExerciseSession.objects.filter(
            assignment__child__therapist=therapist,
            finished_at__date=day,
        ).count()
        
        weekly_sessions.append({
            'day': day.strftime('%a'),
            'count': count,
        })

    alerts = []
    for patient in patients:
        if patient['status'] == 'attention':
            alerts.append({
                'type': 'attention',
                'title': f"{patient['name']} needs attention",
                'detail': f"Latest score is {patient['progress']}%. Consider reviewing the assignment difficulty.",
                'time': 'Latest session',
            })
        elif patient['status'] == 'pending':
            alerts.append({
                'type': 'pending',
                'title': f"{patient['name']} has no logged sessions",
                'detail': 'An exercise is assigned, but Unity has not uploaded practice results yet.',
                'time': 'Waiting for first session',
            })

    for activity in activities:
        if activity['score'] >= 90:
            alerts.append({
                'type': 'active',
                'title': f"{activity['patient_name']} reached {activity['score']}%",
                'detail': f"Strong result on {activity['exercise_title']}.",
                'time': activity['time'],
            })

    alerts = alerts[:8]

    return JsonResponse({
        'patients': patients,
        'exercises': exercises,
        'stats': {
            'total_patients': total_patients,
            'active_this_week': active_this_week,
            'avg_progress': avg_progress,
            'need_attention': need_attention,
            'total_sessions': total_sessions,
            'completed_assignments': completed_assignments,
        },
        'activities': activities,
        'weekly_sessions': weekly_sessions,
        'alerts': alerts,
    })

@login_required
@ensure_csrf_cookie
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
def create_assignment_api(request):
    if request.method != 'POST':
        return JsonResponse({
            'created': False,
            'message': 'Only POST requests are allowed.'
        }, status=405)

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({
            'created': False,
            'message': 'Invalid JSON payload.'
        }, status=400)

    therapist = get_object_or_404(TherapistProfile, user=request.user)
    child = get_object_or_404(Child, id=payload.get('child_id'), therapist=therapist)
    exercise = get_object_or_404(Exercise, id=payload.get('exercise_id'))
    repetitions = int(payload.get('repetitions') or 1)

    assignment = ExerciseAssignment.objects.create(
        child=child,
        exercise=exercise,
        repetitions=max(repetitions, 1),
    )

    return JsonResponse({
        'created': True,
        'assignment_id': assignment.id,
        'child_id': child.id,
        'exercise_id': exercise.id,
        'message': f'{exercise.title} assigned to {child}.',
    }, status=201)


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


'''def create_exercise(request):
    if request.method == 'POST':
        form = exerciseForm(request.POST)
        if form.is_valid():
            form.save()
            #return redirect('somewhere') # redirects to somewhere, success page? no idea for now
    else:
        form = exerciseForm()
        return render(request, 'therapy/exercise_form.html', {'form': form})
    #return render(request, 'somewhere.html') # working on redirects.'''

def create_exercise(request):
    if request.method == 'POST':
        form = exerciseForm(request.POST)
        
        if form.is_valid():
            #Create the instance but pause before saving to the database (testing)
            exercise_instance = form.save(commit=False)
            
            #Manually extract the hidden json string submitted by the JS
            raw_json_string = request.POST.get('template_json_raw')
            
            #Parse the string into a Python dictionary and assign it
            if raw_json_string:
                try:
                    exercise_instance.template_json = json.loads(raw_json_string)
                except json.JSONDecodeError:
                    #fallback
                    exercise_instance.template_json = {}
            else:
                exercise_instance.template_json = {}
                
            #Save the assembled object to the database
            exercise_instance.save()
            
            #Redirect to clear the form to smwhere. testing still
            return redirect(request.path) 
    else:
        #Handle the initial GET request
        form = exerciseForm()
        
    return render(request, 'therapy/exercise_form.html', {'form': form})
