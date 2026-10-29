import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from core.exceptions import custom_exception_handler


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
def test_health_check_endpoint(api_client):
    url = reverse('health-check')
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data['status'] == 'healthy'
    assert data['database'] == 'connected'
    assert data['version'] == '1.0.0'
    assert 'timestamp' in data


@pytest.mark.django_db
def test_openapi_schema_endpoint(api_client):
    url = reverse('schema')
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_swagger_ui_endpoint(api_client):
    url = reverse('swagger-ui')
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert b'swagger' in response.content.lower()


def test_custom_exception_handler_permission_denied():
    exc = PermissionDenied("You do not have access to perform this action.")
    context = {}
    response = custom_exception_handler(exc, context)
    assert response is not None
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert 'error' in response.data
    assert response.data['error']['code'] == 'permission_denied'
    assert response.data['error']['message'] == 'You do not have access to perform this action.'


def test_custom_exception_handler_validation_error():
    exc = ValidationError({'title': ['This field is required.']})
    context = {}
    response = custom_exception_handler(exc, context)
    assert response is not None
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'error' in response.data
    assert response.data['error']['code'] == 'validation_error'
    assert 'title' in response.data['error']['details']
