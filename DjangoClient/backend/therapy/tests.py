import json

from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.urls import reverse

from .models import (
    Child,
    Clinic,
    Exercise,
    ExerciseAssignment,
    ExerciseSession,
    ProgressRecord,
    TherapistProfile,
)


class TherapyApiTests(TestCase):
    def setUp(self):
        self.client = Client()

        self.user = User.objects.create_user(
            username='therapist',
            email='therapist@example.com',
            password='testpass123',
            first_name='Test',
            last_name='Therapist',
        )

        self.therapist = TherapistProfile.objects.create(
            user=self.user,
            specialization='Speech therapy',
        )

        self.child = Child.objects.create(
            therapist=self.therapist,
            first_name='Test',
            last_name='Child',
            age=5,
            diagnosis_notes='M and N practice',
        )

        self.template_json = {
            'Explination_Text': 'Practise M and N sounds.',
            'Explination_Audio_Link': 'audio/Explination_Audio_M_N.mp3',
            'Explination_Image_Link': 'images/Explination_M_N.png',
            'Exercises': [
                {
                    'Type': 'MULTIPLE_CHOICE',
                    'Question': 'Choose whether the word contains M or N',
                    'Words': [
                        {
                            'Text': 'Mail',
                            'Image_Link': 'images/Mail.png',
                            'Audio_Link': 'Audio/Mail.mp3',
                        }
                    ],
                    'Options': [
                        {'Text': 'M', 'Is_Correct': True},
                        {'Text': 'N', 'Is_Correct': False},
                    ],
                }
            ],
        }

        self.exercise = Exercise.objects.create(
            title='M and N Practice',
            description='Practise distinguishing M and N sounds.',
            category='Articulation',
            difficulty=1,
            template_json=self.template_json,
        )

        self.assignment = ExerciseAssignment.objects.create(
            child=self.child,
            exercise=self.exercise,
            repetitions=1,
        )

    def test_assignment_template_api_returns_exercise_template_json(self):
        url = reverse(
            'assignment_template_api',
            kwargs={'assignment_id': self.assignment.id},
        )

        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), self.template_json)
        self.assertEqual(response.json()['Exercises'][0]['Type'], 'MULTIPLE_CHOICE')

    def test_assignment_template_api_returns_404_for_missing_assignment(self):
        url = reverse(
            'assignment_template_api',
            kwargs={'assignment_id': 9999},
        )

        response = self.client.get(url)

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.json()['found'])

    def test_assignment_template_api_returns_404_when_template_is_missing(self):
        empty_template_exercise = Exercise.objects.create(
            title='Empty Template Exercise',
            description='Exercise without JSON.',
            template_json={},
        )
        assignment = ExerciseAssignment.objects.create(
            child=self.child,
            exercise=empty_template_exercise,
        )

        url = reverse(
            'assignment_template_api',
            kwargs={'assignment_id': assignment.id},
        )

        response = self.client.get(url)

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.json()['found'])

    def test_assignment_exercise_api_returns_assignment_details(self):
        url = reverse(
            'assignment_exercise_api',
            kwargs={'assignment_id': self.assignment.id},
        )

        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['child_name'], 'Test Child')
        self.assertEqual(response.json()['exercise_title'], 'M and N Practice')
        self.assertEqual(response.json()['template_json'], self.template_json)

    def test_assignment_exercise_api_returns_json_404_for_missing_assignment(self):
        url = reverse(
            'assignment_exercise_api',
            kwargs={'assignment_id': 9999},
        )

        response = self.client.get(url)

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.json()['found'])

    def test_create_exercise_session_api_creates_session_and_completes_assignment(self):
        url = reverse('create_exercise_session_api')

        payload = {
            'assignment_id': self.assignment.id,
            'started_at': '2026-05-13T10:05:00Z',
            'score': 80,
            'total_questions': 5,
            'correct_answers': 4,
            'duration_seconds': 180,
            'events': [
                {
                    'exercise_index': 0,
                    'type': 'MULTIPLE_CHOICE',
                    'word': 'Mail',
                    'answer': 'M',
                    'correct': True,
                    'time_seconds': 12,
                }
            ],
        }

        response = self.client.post(
            url,
            data=json.dumps(payload),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()['created'])
        self.assertEqual(response.json()['score'], 80.0)

        session = ExerciseSession.objects.get(id=response.json()['session_id'])
        self.assertEqual(session.assignment, self.assignment)
        self.assertEqual(session.score, 80)
        self.assertEqual(session.total_questions, 5)
        self.assertEqual(session.correct_answers, 4)
        self.assertEqual(session.duration_seconds, 180)
        self.assertEqual(session.raw_events, payload['events'])

        self.assignment.refresh_from_db()
        self.assertEqual(self.assignment.status, 'completed')

    def test_create_exercise_session_api_rejects_invalid_json(self):
        url = reverse('create_exercise_session_api')

        response = self.client.post(
            url,
            data='not valid json',
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()['created'])
        self.assertEqual(response.json()['message'], 'Invalid JSON payload')

    def test_create_exercise_session_api_rejects_get_requests(self):
        url = reverse('create_exercise_session_api')

        response = self.client.get(url)

        self.assertEqual(response.status_code, 405)
        self.assertFalse(response.json()['created'])

    def test_create_exercise_session_api_returns_404_for_missing_assignment(self):
        url = reverse('create_exercise_session_api')
        payload = {
            'assignment_id': 9999,
            'score': 25,
        }

        response = self.client.post(
            url,
            data=json.dumps(payload),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.json()['created'])

    def test_dashboard_data_api_returns_real_patient_progress(self):
        ExerciseSession.objects.create(
            assignment=self.assignment,
            score=80,
            total_questions=5,
            correct_answers=4,
            duration_seconds=180,
            raw_events=[
                {
                    'exercise_index': 0,
                    'type': 'MULTIPLE_CHOICE',
                    'word': 'Mail',
                    'answer': 'M',
                    'correct': True,
                }
            ],
        )

        self.client.login(username='therapist', password='testpass123')

        url = reverse('dashboard_data_api')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

        data = response.json()

        self.assertEqual(len(data['patients']), 1)
        self.assertEqual(data['patients'][0]['name'], 'Test Child')
        self.assertEqual(data['patients'][0]['sessions'], 1)
        self.assertEqual(data['patients'][0]['progress'], 80)
        self.assertEqual(data['patients'][0]['scores'], [80])
        self.assertIn('M and N Practice', data['patients'][0]['exercises'])
        self.assertEqual(data['patients'][0]['assignments'][0]['id'], self.assignment.id)
        self.assertEqual(data['patients'][0]['assignments'][0]['exercise_title'], 'M and N Practice')

        self.assertEqual(data['stats']['total_patients'], 1)
        self.assertEqual(data['stats']['total_sessions'], 1)

    def test_dashboard_data_api_returns_404_when_therapist_profile_is_missing(self):
        user_without_profile = User.objects.create_user(
            username='missing-profile',
            password='testpass123',
        )
        self.client.force_login(user_without_profile)

        url = reverse('dashboard_data_api')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()['patients'], [])
        self.assertEqual(response.json()['exercises'], [])
        
        
    def test_create_assignment_api_creates_assignment_for_logged_in_therapist(self):
        self.client.login(username='therapist', password='testpass123')

        second_exercise = Exercise.objects.create(
            title='L Practice',
            description='Practise L sounds.',
            category='Articulation',
            difficulty=1,
            template_json={
                'Exercises': [
                    {
                        'Type': 'OPEN_QUESTION',
                        'Question': 'How many times is L used?',
                        'Words': [{'Text': 'Llama', 'Image_Link': 'images/Llama.png'}],
                        'Options': [{'Correct_Answer_Number': 2}],
                    }
                ]
            },
        )

        url = reverse('create_assignment_api')

        payload = {
            'child_id': self.child.id,
            'exercise_id': second_exercise.id,
            'repetitions': 3,
        }

        response = self.client.post(
            url,
            data=json.dumps(payload),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()['created'])

        created_assignment = ExerciseAssignment.objects.get(
            child=self.child,
            exercise=second_exercise,
        )

        self.assertEqual(created_assignment.repetitions, 3)
        self.assertEqual(created_assignment.status, 'assigned')

    def test_create_assignment_api_rejects_get_requests(self):
        self.client.login(username='therapist', password='testpass123')

        url = reverse('create_assignment_api')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 405)
        self.assertFalse(response.json()['created'])

    def test_create_assignment_api_rejects_invalid_json(self):
        self.client.login(username='therapist', password='testpass123')

        url = reverse('create_assignment_api')
        response = self.client.post(
            url,
            data='not valid json',
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()['created'])

    def test_unassign_exercise_api_deletes_assignment_for_logged_in_therapist(self):
        self.client.login(username='therapist', password='testpass123')

        url = reverse(
            'unassign_exercise_api',
            kwargs={'assignment_id': self.assignment.id},
        )

        response = self.client.post(url)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['deleted'])
        self.assertFalse(
            ExerciseAssignment.objects.filter(id=self.assignment.id).exists()
        )

    def test_unassign_exercise_api_rejects_get_requests(self):
        self.client.login(username='therapist', password='testpass123')

        url = reverse(
            'unassign_exercise_api',
            kwargs={'assignment_id': self.assignment.id},
        )

        response = self.client.get(url)

        self.assertEqual(response.status_code, 405)
        self.assertFalse(response.json()['deleted'])

    def test_unassign_exercise_api_rejects_other_therapists_assignment(self):
        other_user = User.objects.create_user(
            username='other-therapist',
            password='testpass123',
        )
        TherapistProfile.objects.create(user=other_user)
        self.client.login(username='other-therapist', password='testpass123')

        url = reverse(
            'unassign_exercise_api',
            kwargs={'assignment_id': self.assignment.id},
        )

        response = self.client.post(url)

        self.assertEqual(response.status_code, 404)
        self.assertTrue(
            ExerciseAssignment.objects.filter(id=self.assignment.id).exists()
        )

    def test_sofia_clinics_api_returns_clinic_data(self):
        Clinic.objects.create(
            name='Speech Clinic',
            city='Sofia',
            address='Test Street 1',
            website='https://example.com',
            phone='12345',
        )

        url = reverse('sofia_clinics_api')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['clinics'][0]['name'], 'Speech Clinic')
        self.assertEqual(response.json()['clinics'][0]['city'], 'Sofia')

    def test_create_exercise_api_creates_exercise_from_dashboard_payload(self):
        url = reverse('api_create_exercise')
        payload = {
            'title': 'Dashboard Exercise',
            'description': 'Created from dashboard.',
            'category': 'Articulation',
            'difficulty': 2,
            'template_json': {'Exercises': []},
        }

        response = self.client.post(
            url,
            data=json.dumps(payload),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['success'])
        self.assertTrue(
            Exercise.objects.filter(title='Dashboard Exercise').exists()
        )

    def test_create_exercise_api_rejects_invalid_json_and_get_requests(self):
        url = reverse('api_create_exercise')

        invalid_response = self.client.post(
            url,
            data='not valid json',
            content_type='application/json',
        )
        get_response = self.client.get(url)

        self.assertEqual(invalid_response.status_code, 400)
        self.assertFalse(invalid_response.json()['success'])
        self.assertEqual(get_response.status_code, 405)
        self.assertFalse(get_response.json()['success'])

    def test_update_exercise_api_updates_exercise_from_dashboard_payload(self):
        url = reverse('update_exercise', kwargs={'exercise_id': self.exercise.id})
        payload = {
            'title': 'Updated Exercise',
            'description': 'Updated from dashboard.',
            'category': 'Updated Category',
            'difficulty': 3,
            'template_json': {'Exercises': [{'Type': 'MILESTONE_EXERCISE'}]},
        }

        response = self.client.post(
            url,
            data=json.dumps(payload),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['success'])

        self.exercise.refresh_from_db()
        self.assertEqual(self.exercise.title, 'Updated Exercise')
        self.assertEqual(self.exercise.difficulty, 3)
        self.assertEqual(self.exercise.template_json, payload['template_json'])

    def test_delete_exercise_api_deletes_exercise_from_dashboard(self):
        url = reverse('delete_exercise', kwargs={'exercise_id': self.exercise.id})

        response = self.client.post(url)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['success'])
        self.assertFalse(Exercise.objects.filter(id=self.exercise.id).exists())

    def test_model_string_representations_are_readable(self):
        clinic = Clinic.objects.create(name='Readable Clinic')
        session = ExerciseSession.objects.create(
            assignment=self.assignment,
            score=75,
        )
        progress = ProgressRecord.objects.create(
            assignment=self.assignment,
            score=75,
            notes='Improving',
        )

        self.assertEqual(str(clinic), 'Readable Clinic')
        self.assertEqual(str(self.therapist), 'Test Therapist')
        self.assertEqual(str(self.child), 'Test Child')
        self.assertEqual(str(self.exercise), 'M and N Practice')
        self.assertEqual(str(self.assignment), 'Test Child - M and N Practice')
        self.assertEqual(str(session), 'Test Child - M and N Practice - 75')
        self.assertEqual(str(progress), 'Test Child - M and N Practice - 75')
