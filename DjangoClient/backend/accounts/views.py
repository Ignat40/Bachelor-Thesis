from django.contrib.auth import authenticate, login, logout
from django.shortcuts import render, redirect

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