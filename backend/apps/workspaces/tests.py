import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User
from apps.workspaces.models import Workspace, WorkspaceMember


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def user_a(db):
    return User.objects.create_user(email="user_a@example.com", name="User A", password="Password123!")


@pytest.fixture
def user_b(db):
    return User.objects.create_user(email="user_b@example.com", name="User B", password="Password123!")


@pytest.mark.django_db
def test_create_workspace_auto_assigns_admin(client, user_a):
    client.force_authenticate(user=user_a)
    url = reverse('workspace-list-create')
    payload = {'name': 'Engineering Workspace'}
    response = client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_201_CREATED

    data = response.json()
    assert data['name'] == 'Engineering Workspace'
    assert data['owner_id'] == user_a.id
    assert data['current_user_role'] == 'admin'

    # Check member entry
    membership = WorkspaceMember.objects.get(workspace_id=data['id'], user=user_a)
    assert membership.role == WorkspaceMember.ROLE_ADMIN


@pytest.mark.django_db
def test_workspace_isolation_listing(client, user_a, user_b):
    # User A creates Workspace A
    ws_a = Workspace.objects.create(name="Workspace A", owner=user_a)
    WorkspaceMember.objects.create(workspace=ws_a, user=user_a, role=WorkspaceMember.ROLE_ADMIN)

    # User B creates Workspace B
    ws_b = Workspace.objects.create(name="Workspace B", owner=user_b)
    WorkspaceMember.objects.create(workspace=ws_b, user=user_b, role=WorkspaceMember.ROLE_ADMIN)

    # User A listing workspaces
    client.force_authenticate(user=user_a)
    url = reverse('workspace-list-create')
    response = client.get(url)
    assert response.status_code == status.HTTP_200_OK
    names = [w['name'] for w in response.json()]
    assert 'Workspace A' in names
    assert 'Workspace B' not in names


@pytest.mark.django_db
def test_invite_member_and_role_change(client, user_a, user_b):
    ws = Workspace.objects.create(name="Workspace A", owner=user_a)
    WorkspaceMember.objects.create(workspace=ws, user=user_a, role=WorkspaceMember.ROLE_ADMIN)

    client.force_authenticate(user=user_a)
    members_url = reverse('workspace-members-list-create', kwargs={'pk': ws.id})
    invite_res = client.post(members_url, {'email': user_b.email, 'role': 'developer'}, format='json')
    assert invite_res.status_code == status.HTTP_201_CREATED
    assert invite_res.json()['role'] == 'developer'

    # Change role to manager
    role_url = reverse('workspace-member-detail', kwargs={'pk': ws.id, 'user_id': user_b.id})
    patch_res = client.patch(role_url, {'role': 'manager'}, format='json')
    assert patch_res.status_code == status.HTTP_200_OK
    assert patch_res.json()['role'] == 'manager'
