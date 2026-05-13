from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.shortcuts import render, redirect
from therapy.models import Clinic, TherapistProfile


def therapist_register(request):
    completing_profile = request.user.is_authenticated

    if completing_profile and TherapistProfile.objects.filter(user=request.user).exists():
        return redirect('dashboard')

    clinics = Clinic.objects.all().order_by('city', 'name')
    errors = {}
    form_data = {
        'first_name': request.user.first_name if completing_profile else '',
        'last_name': request.user.last_name if completing_profile else '',
        'email': request.user.email if completing_profile else '',
    }

    if request.method == 'POST':
        form_data = {
            'first_name': request.POST.get('first_name', '').strip(),
            'last_name': request.POST.get('last_name', '').strip(),
            'email': request.POST.get('email', '').strip().lower(),
            'clinic': request.POST.get('clinic', ''),
            'organization': request.POST.get('organization', '').strip(),
            'specialization': request.POST.get('specialization', '').strip(),
            'license_number': request.POST.get('license_number', '').strip(),
            'phone': request.POST.get('phone', '').strip(),
        }
        password = request.POST.get('password', '')
        password_confirm = request.POST.get('password_confirm', '')

        if not form_data['first_name']:
            errors['first_name'] = 'First name is required.'
        if not form_data['last_name']:
            errors['last_name'] = 'Surname is required.'
        existing_email = User.objects.filter(email=form_data['email'])
        existing_username = User.objects.filter(username=form_data['email'])

        if completing_profile:
            existing_email = existing_email.exclude(pk=request.user.pk)
            existing_username = existing_username.exclude(pk=request.user.pk)

        if not form_data['email']:
            errors['email'] = 'Email is required.'
        elif len(form_data['email']) > 150:
            errors['email'] = 'Email must be 150 characters or fewer.'
        elif existing_username.exists() or existing_email.exists():
            errors['email'] = 'A therapist account with this email already exists.'

        if not completing_profile:
            if password != password_confirm:
                errors['password_confirm'] = 'Passwords do not match.'

            candidate_user = User(
                username=form_data['email'],
                email=form_data['email'],
                first_name=form_data['first_name'],
                last_name=form_data['last_name'],
            )
            try:
                validate_password(password, user=candidate_user)
            except ValidationError as exc:
                errors['password'] = exc.messages

        if not errors:
            with transaction.atomic():
                if completing_profile:
                    user = request.user
                    user.username = form_data['email']
                    user.email = form_data['email']
                    user.first_name = form_data['first_name']
                    user.last_name = form_data['last_name']
                    user.save(update_fields=['username', 'email', 'first_name', 'last_name'])
                else:
                    user = User.objects.create_user(
                        username=form_data['email'],
                        email=form_data['email'],
                        password=password,
                        first_name=form_data['first_name'],
                        last_name=form_data['last_name'],
                    )
                TherapistProfile.objects.create(
                    user=user,
                    clinic_id=form_data['clinic'] or None,
                    organization=form_data['organization'],
                    specialization=form_data['specialization'],
                    license_number=form_data['license_number'],
                    phone=form_data['phone'],
                )
            if not completing_profile:
                login(request, user)
            return redirect('dashboard')

    return render(request, 'accounts/register.html', {
        'clinics': clinics,
        'errors': errors,
        'form_data': form_data,
        'completing_profile': completing_profile,
    })

def therapist_login(request):
    error = None

    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            return redirect('dashboard')
        else:
            error = 'Invalid username or password.'

    return render(request, 'accounts/login.html', {'error': error})


def therapist_logout(request):
    logout(request)
    return redirect('landing')
