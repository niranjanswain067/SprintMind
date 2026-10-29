import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User
from apps.workspaces.models import Workspace, WorkspaceMember
from apps.projects.models import Project


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def workspace_with_roles(db):
    admin = User.objects.create_user(email="admin@example.com", name="Admin User", password="Password123!")
    manager = User.objects.create_user(email="manager@example.com", name="Manager User", password="Password123!")
    dev = User.objects.create_user(email="dev@example.com", name="Dev User", password="Password123!")
    viewer = User.objects.create_user(email="viewer@example.com", name="Viewer User", password="Password123!")

    ws = Workspace.objects.create(name="Team Workspace", owner=admin)
    WorkspaceMember.objects.create(workspace=ws, user=admin, role=WorkspaceMember.ROLE_ADMIN)
    WorkspaceMember.objects.create(workspace=ws, user=manager, role=WorkspaceMember.ROLE_MANAGER)
    WorkspaceMember.objects.create(workspace=ws, user=dev, role=WorkspaceMember.ROLE_DEVELOPER)
    WorkspaceMember.objects.create(workspace=ws, user=viewer, role=WorkspaceMember.ROLE_VIEWER)

    return {
        'workspace': ws,
        'admin': admin,
        'manager': manager,
        'dev': dev,
        'viewer': viewer,
    }


@pytest.fixture
def foreign_user_workspace(db):
    user_other = User.objects.create_user(email="other@example.com", name="Other User", password="Password123!")
    ws_other = Workspace.objects.create(name="Other Workspace", owner=user_other)
    WorkspaceMember.objects.create(workspace=ws_other, user=user_other, role=WorkspaceMember.ROLE_ADMIN)
    project_other = Project.objects.create(workspace=ws_other, name="Other Project", key="OTH")
    return {
        'user': user_other,
        'workspace': ws_other,
        'project': project_other,
    }


@pytest.mark.django_db
def test_admin_and_manager_can_create_project(client, workspace_with_roles):
    ws = workspace_with_roles['workspace']
    admin = workspace_with_roles['admin']
    manager = workspace_with_roles['manager']

    # Admin creates project
    client.force_authenticate(user=admin)
    url = reverse('project-list-create')
    payload = {
        'workspace_id': ws.id,
        'name': 'SprintMind Core',
        'key': 'SM',
        'methodology': 'scrum'
    }
    res = client.post(url, payload, format='json')
    assert res.status_code == status.HTTP_201_CREATED
    assert res.json()['key'] == 'SM'

    # Manager creates project
    client.force_authenticate(user=manager)
    payload_mgr = {
        'workspace_id': ws.id,
        'name': 'Analytics Engine',
        'key': 'ANL',
        'methodology': 'kanban'
    }
    res_mgr = client.post(url, payload_mgr, format='json')
    assert res_mgr.status_code == status.HTTP_201_CREATED
    assert res_mgr.json()['key'] == 'ANL'


@pytest.mark.django_db
def test_developer_and_viewer_cannot_create_project(client, workspace_with_roles):
    ws = workspace_with_roles['workspace']
    dev = workspace_with_roles['dev']
    viewer = workspace_with_roles['viewer']
    url = reverse('project-list-create')

    # Developer blocked
    client.force_authenticate(user=dev)
    res_dev = client.post(url, {'workspace_id': ws.id, 'name': 'Dev Project', 'key': 'DEV'}, format='json')
    assert res_dev.status_code == status.HTTP_403_FORBIDDEN

    # Viewer blocked
    client.force_authenticate(user=viewer)
    res_viewer = client.post(url, {'workspace_id': ws.id, 'name': 'Viewer Project', 'key': 'VIEW'}, format='json')
    assert res_viewer.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_duplicate_project_key_in_same_workspace(client, workspace_with_roles):
    ws = workspace_with_roles['workspace']
    admin = workspace_with_roles['admin']

    Project.objects.create(workspace=ws, name="Original", key="DUPL")

    client.force_authenticate(user=admin)
    url = reverse('project-list-create')
    res = client.post(url, {'workspace_id': ws.id, 'name': 'Duplicate', 'key': 'dupl'}, format='json')
    assert res.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_tenant_isolation_project_access(client, workspace_with_roles, foreign_user_workspace):
    admin = workspace_with_roles['admin']
    foreign_project = foreign_user_workspace['project']

    # User from Workspace A attempts to access Workspace B project
    client.force_authenticate(user=admin)
    url = reverse('project-detail', kwargs={'pk': foreign_project.id})
    res = client.get(url)
    assert res.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_project_archive(client, workspace_with_roles):
    ws = workspace_with_roles['workspace']
    admin = workspace_with_roles['admin']
    project = Project.objects.create(workspace=ws, name="To Archive", key="ARC")

    client.force_authenticate(user=admin)
    url = reverse('project-archive', kwargs={'pk': project.id})
    res = client.post(url)
    assert res.status_code == status.HTTP_200_OK
    assert res.json()['is_archived'] is True
