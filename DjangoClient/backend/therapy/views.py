from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404, redirect
from .models import TherapistProfile, Child, Exercise, ExerciseAssignment, Clinic


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
