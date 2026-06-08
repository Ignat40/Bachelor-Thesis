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
from .forms import exerciseForm #forms and testing
import json


def patient_payload(child):
    return {
        'id': child.id,
        'first_name': child.first_name,
        'last_name': child.last_name,
        'name': str(child),
        'age': child.age,
        'diagnosis_notes': child.diagnosis_notes,
        'condition': child.diagnosis_notes or 'Not specified',
        'parent_contact': child.parent_contact,
    }


def assignment_payload(assignment):
    return {
        'id': assignment.id,
        'status': assignment.status,
        'repetitions': assignment.repetitions,
        'assigned_at': assignment.assigned_at.isoformat() if assignment.assigned_at else None,
        'due_date': assignment.due_date.isoformat() if assignment.due_date else None,
        'exercise': {
            'id': assignment.exercise.id,
            'title': assignment.exercise.title,
            'description': assignment.exercise.description,
            'category': assignment.exercise.category,
            'difficulty': assignment.exercise.difficulty,
            'template_json': assignment.exercise.template_json,
        },
    }


def exercise_is_milestone(template_json):
    if not isinstance(template_json, dict):
        return False

    exercise_steps = template_json.get('Exercises', [])
    if not isinstance(exercise_steps, list):
        return False

    milestone_types = {'MILESTONE', 'MILESTONE_EXERCISE'}
    return any(
        isinstance(step, dict)
        and str(step.get('Type', '')).upper() in milestone_types
        for step in exercise_steps
    )


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
            'first_name': child.first_name,
            'last_name': child.last_name,
            'name': str(child),
            'age': child.age,
            'diagnosis_notes': child.diagnosis_notes,
            'condition': child.diagnosis_notes or 'Not specified',
            'parent_contact': child.parent_contact,
            'sessions': len(sessions),
            'streak': streak,
            'progress': latest_score,
            'scores': scores[-6:],
            'exercises': [assignment.exercise.title for assignment in assignments],
            'assignments': [
                {
                    'id': assignment.id,
                    'exercise_id': assignment.exercise.id,
                    'exercise_title': assignment.exercise.title,
                    'status': assignment.status,
                    'repetitions': assignment.repetitions,
                }
                for assignment in assignments
            ],
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
            'difficulty_num': exercise.difficulty, #added for edit func
            'description': exercise.description,   #same
            'template_json': exercise.template_json, #same
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
def child_assignments_api(request, child_id):
    if request.method != 'GET':
        return JsonResponse({
            'success': False,
            'message': 'Only GET requests are allowed.'
        }, status=405)

    therapist = get_object_or_404(TherapistProfile, user=request.user)
    child = get_object_or_404(Child, id=child_id, therapist=therapist)
    assignments = ExerciseAssignment.objects.filter(
        child=child
    ).select_related('exercise').order_by('-assigned_at')

    return JsonResponse({
        'success': True,
        'child': patient_payload(child),
        'assignments': [
            assignment_payload(assignment)
            for assignment in assignments
        ],
    })


@login_required
def assigned_exercises_api(request):
    if request.method != 'GET':
        return JsonResponse({
            'success': False,
            'message': 'Only GET requests are allowed.'
        }, status=405)

    therapist = get_object_or_404(TherapistProfile, user=request.user)
    assignments = ExerciseAssignment.objects.filter(
        child__therapist=therapist
    ).select_related('child', 'exercise').order_by('child_id', '-assigned_at')

    return JsonResponse({
        'success': True,
        'assigned_exercises': [
            {
                'assignment_id': assignment.id,
                'patient_id': assignment.child_id,
                'exercise_title': assignment.exercise.title,
                'is_milestone': exercise_is_milestone(assignment.exercise.template_json),
            }
            for assignment in assignments
        ],
    })


@login_required
def unassign_exercise_api(request, assignment_id):
    if request.method != 'POST':
        return JsonResponse({
            'deleted': False,
            'message': 'Only POST requests are allowed.'
        }, status=405)

    therapist = get_object_or_404(TherapistProfile, user=request.user)
    assignment = get_object_or_404(
        ExerciseAssignment.objects.select_related('child', 'exercise'),
        id=assignment_id,
        child__therapist=therapist,
    )
    child_id = assignment.child.id
    exercise_title = assignment.exercise.title
    assignment.delete()

    return JsonResponse({
        'deleted': True,
        'assignment_id': assignment_id,
        'child_id': child_id,
        'message': f'{exercise_title} unassigned.',
    })


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


@login_required
def create_patient_api(request):
    if request.method != 'POST':
        return JsonResponse({
            'success': False,
            'message': 'Only POST requests are allowed.'
        }, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': 'Invalid JSON payload.'
        }, status=400)

    therapist = get_object_or_404(TherapistProfile, user=request.user)
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()

    try:
        age = int(data.get('age') or 0)
    except (TypeError, ValueError):
        age = 0

    if not first_name or not last_name:
        return JsonResponse({
            'success': False,
            'message': 'First name and last name are required.'
        }, status=400)

    if age <= 0:
        return JsonResponse({
            'success': False,
            'message': 'Age must be a positive number.'
        }, status=400)

    child = Child.objects.create(
        therapist=therapist,
        first_name=first_name,
        last_name=last_name,
        age=age,
        diagnosis_notes=data.get('diagnosis_notes', '').strip(),
        parent_contact=data.get('parent_contact', '').strip(),
    )

    return JsonResponse({
        'success': True,
        'message': f'{child} added successfully.',
        'patient': patient_payload(child),
    }, status=201)


@login_required
def update_patient_api(request, child_id):
    if request.method != 'POST':
        return JsonResponse({
            'success': False,
            'message': 'Only POST requests are allowed.'
        }, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': 'Invalid JSON payload.'
        }, status=400)

    therapist = get_object_or_404(TherapistProfile, user=request.user)
    child = get_object_or_404(Child, id=child_id, therapist=therapist)
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()

    try:
        age = int(data.get('age') or 0)
    except (TypeError, ValueError):
        age = 0

    if not first_name or not last_name:
        return JsonResponse({
            'success': False,
            'message': 'First name and last name are required.'
        }, status=400)

    if age <= 0:
        return JsonResponse({
            'success': False,
            'message': 'Age must be a positive number.'
        }, status=400)

    child.first_name = first_name
    child.last_name = last_name
    child.age = age
    child.diagnosis_notes = data.get('diagnosis_notes', '').strip()
    child.parent_contact = data.get('parent_contact', '').strip()
    child.save(update_fields=[
        'first_name',
        'last_name',
        'age',
        'diagnosis_notes',
        'parent_contact',
    ])

    return JsonResponse({
        'success': True,
        'message': f'{child} updated successfully.',
        'patient': patient_payload(child),
    })


@login_required
def delete_patient_api(request, child_id):
    if request.method != 'POST':
        return JsonResponse({
            'success': False,
            'message': 'Only POST requests are allowed.'
        }, status=405)

    therapist = get_object_or_404(TherapistProfile, user=request.user)
    child = get_object_or_404(Child, id=child_id, therapist=therapist)
    patient_name = str(child)
    child.delete()

    return JsonResponse({
        'success': True,
        'message': f'{patient_name} deleted successfully.',
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
    #from the fetch() in the script function for the exercises 
    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            template_json = data.get('template_json', {})
            
            #get the db fields
            title = data.get('title', 'Untitled Dashboard Exercise')
            description = data.get('description', 'Created via the SPA Dashboard')
            category = data.get('category', 'Uncategorized')
            difficulty = data.get('difficulty', 1)
            
            #create ans save to db
            exercise_instance = Exercise.objects.create(
                title=title,
                description=description,
                category=category,
                difficulty=difficulty,
                template_json=template_json
            )
            
            #return a success signal
            return JsonResponse({
                'success': True, 
                'message': 'Exercise saved successfully!',
                'exercise_id': exercise_instance.id
            })
            
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON format sent from frontend.'}, status=400)
        except Exception as e:
            #$catvch db erroprs
            return JsonResponse({'success': False, 'message': str(e)}, status=500)
            
    return JsonResponse({'success': False, 'message': 'Invalid request method.'}, status=405)

def update_exercise(request, exercise_id):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            template_json = data.get('template_json', {})
            
            exercise_instance = get_object_or_404(Exercise, id=exercise_id)
            exercise_instance.title = data.get('title', exercise_instance.title)
            exercise_instance.description = data.get('description', exercise_instance.description)
            exercise_instance.category = data.get('category', exercise_instance.category)
            exercise_instance.difficulty = data.get('difficulty', exercise_instance.difficulty)
            exercise_instance.template_json = template_json
            
            exercise_instance.save()
            
            return JsonResponse({
                'success': True, 
                'message': 'Exercise updated successfully!'
            })
            
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON format sent from frontend.'}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)
            
    return JsonResponse({'success': False, 'message': 'Invalid request method.'}, status=405)

def delete_exercise(request, exercise_id):
    if request.method == 'POST':
        try:
            exercise_instance = get_object_or_404(Exercise, id=exercise_id)
            exercise_title = exercise_instance.title
            
            # This will also cascade and delete any assignments linked to this exercise
            exercise_instance.delete()
            
            return JsonResponse({
                'success': True, 
                'message': f'"{exercise_title}" deleted successfully.'
            })
            
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)
            
    return JsonResponse({'success': False, 'message': 'Invalid request method.'}, status=405)
