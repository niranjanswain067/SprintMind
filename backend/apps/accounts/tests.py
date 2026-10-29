import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def registered_user(db):
    return User.objects.create_user(
        email="testuser@example.com",
        name="Test User",
        password="SecurePassword123!"
    )


@pytest.mark.django_db
def test_user_registration_success(client):
    url = reverse('auth-register')
    payload = {
        'name': 'Asha K.',
        'email': 'asha@example.com',
        'password': 'SecurePassword123!'
    }
    response = client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert 'user' in data
    assert data['user']['email'] == 'asha@example.com'
    assert data['user']['name'] == 'Asha K.'
    assert 'tokens' in data
    assert 'access' in data['tokens']
    assert 'refresh' in data['tokens']


@pytest.mark.django_db
def test_user_registration_duplicate_email(client, registered_user):
    url = reverse('auth-register')
    payload = {
        'name': 'Duplicate User',
        'email': 'testuser@example.com',
        'password': 'Password123!'
    }
    response = client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    data = response.json()
    assert 'error' in data
    assert data['error']['code'] == 'validation_error'


@pytest.mark.django_db
def test_user_login_success(client, registered_user):
    url = reverse('auth-login')
    payload = {
        'email': 'testuser@example.com',
        'password': 'SecurePassword123!'
    }
    response = client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data['user']['email'] == 'testuser@example.com'
    assert 'tokens' in data
    assert 'access' in data['tokens']


@pytest.mark.django_db
def test_user_login_invalid_password(client, registered_user):
    url = reverse('auth-login')
    payload = {
        'email': 'testuser@example.com',
        'password': 'WrongPassword!'
    }
    response = client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    data = response.json()
    assert data['error']['code'] == 'validation_error'


@pytest.mark.django_db
def test_token_refresh(client, registered_user):
    login_url = reverse('auth-login')
    payload = {'email': registered_user.email, 'password': 'SecurePassword123!'}
    login_res = client.post(login_url, payload, format='json')
    refresh_token = login_res.json()['tokens']['refresh']

    refresh_url = reverse('token-refresh')
    response = client.post(refresh_url, {'refresh': refresh_token}, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert 'access' in response.json()


@pytest.mark.django_db
def test_user_logout_blacklists_token(client, registered_user):
    login_url = reverse('auth-login')
    payload = {'email': registered_user.email, 'password': 'SecurePassword123!'}
    login_res = client.post(login_url, payload, format='json')
    access_token = login_res.json()['tokens']['access']
    refresh_token = login_res.json()['tokens']['refresh']

    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    logout_url = reverse('auth-logout')
    response = client.post(logout_url, {'refresh': refresh_token}, format='json')
    assert response.status_code == status.HTTP_200_OK

    # Attempt to refresh using the blacklisted token
    refresh_url = reverse('token-refresh')
    refresh_res = client.post(refresh_url, {'refresh': refresh_token}, format='json')
    assert refresh_res.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_400_BAD_REQUEST]


@pytest.mark.django_db
def test_user_profile_me(client, registered_user):
    client.force_authenticate(user=registered_user)
    me_url = reverse('auth-me')
    response = client.get(me_url)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()['email'] == registered_user.email

    # Patch name
    patch_res = client.patch(me_url, {'name': 'Updated Name'}, format='json')
    assert patch_res.status_code == status.HTTP_200_OK
    assert patch_res.json()['name'] == 'Updated Name'
