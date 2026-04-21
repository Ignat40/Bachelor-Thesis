from django.shortcuts import render

def landing_page(request):
    return render(request, 'website/landing.html')

def about_page(request):
    return render(request, 'website/about.html')