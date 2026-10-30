import pytest
import json
from unittest.mock import MagicMock, patch
from datetime import timedelta
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
import groq

from apps.accounts.models import User
from apps.workspaces.models import Workspace, WorkspaceMember
from apps.projects.models import Project
from apps.issues.models import Issue
from apps.sprints.models import Sprint
from apps.ai_assistant.models import AIRequestLog


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def project_setup(db):
    user = User.objects.create_user(email="alice@example.com", name="Alice Dev", password="Password123!")
    ws = Workspace.objects.create(name="AI Workspace", owner=user)
    WorkspaceMember.objects.create(workspace=ws, user=user, role=WorkspaceMember.ROLE_ADMIN)
    project = Project.objects.create(workspace=ws, name="AI Project", key="AIP")
    return {
        'user': user,
        'workspace': ws,
        'project': project,
    }


def make_mock_choice(content_str):
    mock_choice = MagicMock()
    mock_choice.message.content = content_str
    mock_completion = MagicMock()
    mock_completion.choices = [mock_choice]
    return mock_completion


@pytest.mark.django_db
@patch('apps.ai_assistant.services.GroqAIService._get_client')
def test_ai_stories_generation(mock_get_client, client, project_setup):
    user = project_setup['user']
    project = project_setup['project']

    mock_client = MagicMock()
    mock_get_client.return_value = mock_client

    sample_output = json.dumps({
        "drafts": [
            {
                "title": "Email verification on registration",
                "description": "As a new user, I want to verify my email so my account is secure.",
                "acceptance_criteria": [
                    "Verification link sent upon registration",
                    "Token expires in 24 hours"
                ],
                "story_points": 3
            }
        ]
    })
    mock_client.chat.completions.create.return_value = make_mock_choice(sample_output)

    client.force_authenticate(user=user)
    url = reverse('ai-stories')
    res = client.post(url, {
        'project_id': project.id,
        'requirements': 'Implement email verification for new registrations'
    }, format='json')

    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert 'drafts' in data
    assert len(data['drafts']) == 1
    assert data['drafts'][0]['title'] == "Email verification on registration"
    assert data['drafts'][0]['story_points'] == 3

    # Verify zero issues were written to the database (Human in the loop)
    assert Issue.objects.filter(project=project).count() == 0

    # Verify audit log was created
    log = AIRequestLog.objects.filter(user=user, feature=AIRequestLog.FEATURE_STORIES).first()
    assert log is not None
    assert log.status == AIRequestLog.STATUS_SUCCESS


@pytest.mark.django_db
@patch('apps.ai_assistant.services.GroqAIService._get_client')
def test_ai_tasks_breakdown(mock_get_client, client, project_setup):
    user = project_setup['user']
    project = project_setup['project']

    issue = Issue.objects.create(
        project=project,
        number=1,
        reporter=user,
        title="User Password Reset",
        description="Allow users to reset password via email OTP"
    )

    mock_client = MagicMock()
    mock_get_client.return_value = mock_client

    sample_output = json.dumps({
        "tasks": [
            {"title": "Generate secure OTP tokens", "estimated_points": 1},
            {"title": "Build password reset API endpoint", "estimated_points": 2},
            {"title": "Design frontend reset password modal", "estimated_points": 2}
        ]
    })
    mock_client.chat.completions.create.return_value = make_mock_choice(sample_output)

    client.force_authenticate(user=user)
    url = reverse('ai-tasks')
    res = client.post(url, {'story_id': issue.id}, format='json')

    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert 'tasks' in data
    assert len(data['tasks']) == 3
    assert data['tasks'][0]['title'] == "Generate secure OTP tokens"


@pytest.mark.django_db
@patch('apps.ai_assistant.services.GroqAIService._get_client')
def test_ai_criteria_generator(mock_get_client, client, project_setup):
    user = project_setup['user']

    mock_client = MagicMock()
    mock_get_client.return_value = mock_client

    sample_output = json.dumps({
        "criteria": [
            "Password must contain at least 8 characters",
            "Must include at least one number and special character",
            "Returns 400 error on mismatch"
        ]
    })
    mock_client.chat.completions.create.return_value = make_mock_choice(sample_output)

    client.force_authenticate(user=user)
    url = reverse('ai-criteria')
    res = client.post(url, {
        'title': 'Password validation rules',
        'description': 'Enforce password complexity during user registration'
    }, format='json')

    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert 'criteria' in data
    assert len(data['criteria']) == 3


@pytest.mark.django_db
@patch('apps.ai_assistant.services.GroqAIService._get_client')
def test_ai_bug_analysis(mock_get_client, client, project_setup):
    user = project_setup['user']

    mock_client = MagicMock()
    mock_get_client.return_value = mock_client

    sample_output = json.dumps({
        "enhanced_summary": "Session token persistence leak in browser LocalStorage on logout",
        "suggested_severity": "high",
        "missing_information": [
            "Browser version and operating system",
            "Network tab response for /api/v1/auth/logout/"
        ]
    })
    mock_client.chat.completions.create.return_value = make_mock_choice(sample_output)

    client.force_authenticate(user=user)
    url = reverse('ai-bug-analysis')
    res = client.post(url, {
        'title': 'User still logged in after clicking logout',
        'description': 'If you refresh the page after logout you can still see projects'
    }, format='json')

    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data['suggested_severity'] == "high"
    assert "Session token persistence" in data['enhanced_summary']
    assert len(data['missing_information']) == 2


@pytest.mark.django_db
@patch('apps.ai_assistant.services.GroqAIService._get_client')
def test_ai_sprint_summary_with_real_metrics(mock_get_client, client, project_setup):
    user = project_setup['user']
    project = project_setup['project']

    sprint = Sprint.objects.create(project=project, name="Sprint 1", status="completed")
    Issue.objects.create(project=project, number=1, reporter=user, sprint=sprint, title="Done 1", status="done", story_points=5)
    Issue.objects.create(project=project, number=2, reporter=user, sprint=sprint, title="Done 2", status="done", story_points=3)
    Issue.objects.create(project=project, number=3, reporter=user, sprint=sprint, title="Incomplete", status="in_progress", story_points=2)

    mock_client = MagicMock()
    mock_get_client.return_value = mock_client

    sample_output = json.dumps({
        "summary_draft": "Sprint 1 closed with 8 of 10 planned story points delivered (80% completion). Delivered core auth and 1 incomplete task moved to backlog."
    })
    mock_client.chat.completions.create.return_value = make_mock_choice(sample_output)

    client.force_authenticate(user=user)
    url = reverse('ai-sprint-summary')
    res = client.post(url, {'sprint_id': sprint.id}, format='json')

    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert 'summary_draft' in data
    assert data['metrics']['completed_issues'] == 2
    assert data['metrics']['incomplete_issues'] == 1
    assert data['metrics']['completed_points'] == 8
    assert data['metrics']['total_points'] == 10


@pytest.mark.django_db
@patch('apps.ai_assistant.services.GroqAIService._get_client')
def test_ai_timeout_error_handling(mock_get_client, client, project_setup):
    user = project_setup['user']
    mock_client = MagicMock()
    mock_get_client.return_value = mock_client

    mock_client.chat.completions.create.side_effect = groq.APITimeoutError(request=MagicMock())

    client.force_authenticate(user=user)
    url = reverse('ai-criteria')
    res = client.post(url, {'title': 'Slow API call'}, format='json')

    assert res.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    assert res.json()['error']['code'] == 'ai_timeout'

    # Check audit log recorded timeout
    log = AIRequestLog.objects.filter(user=user, status=AIRequestLog.STATUS_TIMEOUT).first()
    assert log is not None


@pytest.mark.django_db
def test_ai_rate_limit_exceeded(client, project_setup):
    user = project_setup['user']

    # Pre-populate 20 recent requests in the past hour
    now = timezone.now()
    for _ in range(20):
        AIRequestLog.objects.create(
            user=user,
            feature=AIRequestLog.FEATURE_STORIES,
            status=AIRequestLog.STATUS_SUCCESS,
            created_at=now - timedelta(minutes=5)
        )

    client.force_authenticate(user=user)
    url = reverse('ai-stories')
    res = client.post(url, {'requirements': 'More stories please'}, format='json')

    assert res.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert res.json()['error']['code'] == 'rate_limit_exceeded'

