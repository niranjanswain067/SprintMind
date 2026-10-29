import pytest
from decimal import Decimal
import threading
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User
from apps.workspaces.models import Workspace, WorkspaceMember
from apps.projects.models import Project
from apps.issues.models import Issue, Comment, ActivityLog


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def setup_workspace_and_project(db):
    admin = User.objects.create_user(email="admin@example.com", name="Admin User", password="Password123!")
    pm = User.objects.create_user(email="pm@example.com", name="PM User", password="Password123!")
    dev = User.objects.create_user(email="dev@example.com", name="Dev User", password="Password123!")
    viewer = User.objects.create_user(email="viewer@example.com", name="Viewer User", password="Password123!")

    ws = Workspace.objects.create(name="Engineering WS", owner=admin)
    WorkspaceMember.objects.create(workspace=ws, user=admin, role=WorkspaceMember.ROLE_ADMIN)
    WorkspaceMember.objects.create(workspace=ws, user=pm, role=WorkspaceMember.ROLE_MANAGER)
    WorkspaceMember.objects.create(workspace=ws, user=dev, role=WorkspaceMember.ROLE_DEVELOPER)
    WorkspaceMember.objects.create(workspace=ws, user=viewer, role=WorkspaceMember.ROLE_VIEWER)

    project = Project.objects.create(workspace=ws, name="SprintMind Core", key="SMC")

    return {
        'workspace': ws,
        'project': project,
        'admin': admin,
        'pm': pm,
        'dev': dev,
        'viewer': viewer,
    }


@pytest.mark.django_db
def test_create_issue_atomic_numbering_and_key(client, setup_workspace_and_project):
    project = setup_workspace_and_project['project']
    dev = setup_workspace_and_project['dev']

    client.force_authenticate(user=dev)
    url = reverse('project-issue-list-create', kwargs={'id': project.id})

    # Create issue 1
    res1 = client.post(url, {
        'type': 'story',
        'title': 'User Authentication',
        'description': 'Implement JWT auth',
        'priority': 'high',
        'story_points': 5
    }, format='json')
    assert res1.status_code == status.HTTP_201_CREATED
    data1 = res1.json()
    assert data1['number'] == 1
    assert data1['key'] == 'SMC-1'
    assert data1['rank'] == '1000.000000'
    assert data1['reporter']['id'] == dev.id

    # Create issue 2
    res2 = client.post(url, {
        'type': 'task',
        'title': 'Database Schema Design',
        'priority': 'medium',
        'story_points': 3
    }, format='json')
    assert res2.status_code == status.HTTP_201_CREATED
    data2 = res2.json()
    assert data2['number'] == 2
    assert data2['key'] == 'SMC-2'
    assert data2['rank'] == '2000.000000'

    # Check project counter updated
    project.refresh_from_db()
    assert project.issue_counter == 2


@pytest.mark.django_db(transaction=True)
def test_concurrent_issue_numbering(setup_workspace_and_project):
    project = setup_workspace_and_project['project']
    dev = setup_workspace_and_project['dev']

    num_requests = 10
    created_numbers = []

    # Verify atomic counter progression and uniqueness
    for i in range(num_requests):
        client = APIClient()
        client.force_authenticate(user=dev)
        url = reverse('project-issue-list-create', kwargs={'id': project.id})
        res = client.post(url, {
            'type': 'task',
            'title': f'Sequential Task {i + 1}'
        }, format='json')
        assert res.status_code == status.HTTP_201_CREATED
        created_numbers.append(res.json()['number'])

    assert len(created_numbers) == num_requests
    # All numbers must be sequential and distinct
    assert len(set(created_numbers)) == num_requests
    assert created_numbers == list(range(1, num_requests + 1))


@pytest.mark.django_db
def test_viewer_cannot_create_or_edit_issue(client, setup_workspace_and_project):
    project = setup_workspace_and_project['project']
    viewer = setup_workspace_and_project['viewer']
    dev = setup_workspace_and_project['dev']

    # Dev creates an issue
    client.force_authenticate(user=dev)
    url = reverse('project-issue-list-create', kwargs={'id': project.id})
    res_create = client.post(url, {'type': 'story', 'title': 'Base Story'}, format='json')
    assert res_create.status_code == status.HTTP_201_CREATED
    issue_id = res_create.json()['id']

    # Viewer attempts to create an issue -> 403
    client.force_authenticate(user=viewer)
    res_viewer_post = client.post(url, {'type': 'bug', 'title': 'Viewer Bug'}, format='json')
    assert res_viewer_post.status_code == status.HTTP_403_FORBIDDEN

    # Viewer attempts to edit the existing issue -> 403
    detail_url = reverse('issue-detail', kwargs={'pk': issue_id})
    res_viewer_patch = client.patch(detail_url, {'title': 'Hacked Title'}, format='json')
    assert res_viewer_patch.status_code == status.HTTP_403_FORBIDDEN

    # Viewer CAN view the issue -> 200
    res_viewer_get = client.get(detail_url)
    assert res_viewer_get.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_issue_filters(client, setup_workspace_and_project):
    project = setup_workspace_and_project['project']
    admin = setup_workspace_and_project['admin']
    dev = setup_workspace_and_project['dev']

    client.force_authenticate(user=admin)
    url = reverse('project-issue-list-create', kwargs={'id': project.id})

    # Create various issues
    client.post(url, {'type': 'bug', 'title': 'Crash on login page', 'status': 'todo', 'priority': 'critical'}, format='json')
    client.post(url, {'type': 'story', 'title': 'User profile page', 'status': 'in_progress', 'priority': 'medium', 'assignee_id': dev.id}, format='json')
    client.post(url, {'type': 'task', 'title': 'Export reports to CSV', 'status': 'done', 'priority': 'low'}, format='json')

    # Filter by type=bug
    res = client.get(url, {'type': 'bug'})
    assert res.status_code == status.HTTP_200_OK
    assert len(res.json()) == 1
    assert res.json()[0]['type'] == 'bug'

    # Filter by status=in_progress
    res_status = client.get(url, {'status': 'in_progress'})
    assert len(res_status.json()) == 1
    assert res_status.json()[0]['title'] == 'User profile page'

    # Filter by search query 'q'
    res_q = client.get(url, {'q': 'Crash'})
    assert len(res_q.json()) == 1
    assert res_q.json()[0]['key'] == 'SMC-1'


@pytest.mark.django_db
def test_backlog_reorder_midpoint_calculation(client, setup_workspace_and_project):
    project = setup_workspace_and_project['project']
    pm = setup_workspace_and_project['pm']

    # Create 3 backlog issues with ranks 1000, 2000, 3000
    i1 = Issue.objects.create(project=project, number=1, reporter=pm, title="Task 1", rank=Decimal('1000.0'))
    i2 = Issue.objects.create(project=project, number=2, reporter=pm, title="Task 2", rank=Decimal('2000.0'))
    i3 = Issue.objects.create(project=project, number=3, reporter=pm, title="Task 3", rank=Decimal('3000.0'))

    client.force_authenticate(user=pm)
    reorder_url = reverse('project-backlog-reorder', kwargs={'id': project.id})

    # Move Task 3 between Task 1 (1000) and Task 2 (2000)
    payload = {
        'issue_id': i3.id,
        'prev_issue_id': i1.id,
        'next_issue_id': i2.id
    }
    res = client.patch(reorder_url, payload, format='json')
    assert res.status_code == status.HTTP_200_OK

    i3.refresh_from_db()
    assert i3.rank == Decimal('1500.000000')

    # Verify backlog ordering
    backlog_url = reverse('project-backlog-list', kwargs={'id': project.id})
    res_backlog = client.get(backlog_url)
    assert res_backlog.status_code == status.HTTP_200_OK
    ids = [item['id'] for item in res_backlog.json()]
    assert ids == [i1.id, i3.id, i2.id]


@pytest.mark.django_db
def test_issue_move_board_kanban(client, setup_workspace_and_project):
    project = setup_workspace_and_project['project']
    dev = setup_workspace_and_project['dev']

    issue = Issue.objects.create(project=project, number=1, reporter=dev, title="Move Me", status='todo', rank=Decimal('1000.0'))

    client.force_authenticate(user=dev)
    move_url = reverse('issue-move', kwargs={'pk': issue.id})
    res = client.patch(move_url, {'status': 'in_progress', 'rank': '1050.5'}, format='json')
    assert res.status_code == status.HTTP_200_OK

    issue.refresh_from_db()
    assert issue.status == 'in_progress'
    assert issue.rank == Decimal('1050.500000')

    # Activity log recorded
    logs = ActivityLog.objects.filter(issue=issue, action='status_changed')
    assert logs.count() == 1
    assert logs.first().detail['new'] == 'in_progress'


@pytest.mark.django_db
def test_comments_and_activity_history(client, setup_workspace_and_project):
    project = setup_workspace_and_project['project']
    dev = setup_workspace_and_project['dev']
    admin = setup_workspace_and_project['admin']

    issue = Issue.objects.create(project=project, number=1, reporter=dev, title="Commentable Issue")

    client.force_authenticate(user=dev)
    comments_url = reverse('issue-comments', kwargs={'pk': issue.id})

    # Post comment
    res = client.post(comments_url, {'body': 'Working on this now!'}, format='json')
    assert res.status_code == status.HTTP_201_CREATED
    assert res.json()['body'] == 'Working on this now!'
    assert res.json()['author']['email'] == dev.email

    # Post another comment by admin
    client.force_authenticate(user=admin)
    client.post(comments_url, {'body': 'Looks good, ping me when ready.'}, format='json')

    # Get comments
    res_list = client.get(comments_url)
    assert res_list.status_code == status.HTTP_200_OK
    assert len(res_list.json()) == 2

    # Get activity history
    activity_url = reverse('issue-activity', kwargs={'pk': issue.id})
    res_act = client.get(activity_url)
    assert res_act.status_code == status.HTTP_200_OK
    actions = [a['action'] for a in res_act.json()]
    assert 'comment_added' in actions


@pytest.mark.django_db
def test_bulk_create_issues(client, setup_workspace_and_project):
    project = setup_workspace_and_project['project']
    pm = setup_workspace_and_project['pm']

    client.force_authenticate(user=pm)
    bulk_url = reverse('project-issue-bulk-create', kwargs={'id': project.id})

    payload = {
        'issues': [
            {'type': 'story', 'title': 'AI Story 1', 'story_points': 3, 'priority': 'high'},
            {'type': 'story', 'title': 'AI Story 2', 'story_points': 5, 'priority': 'medium'},
            {'type': 'task', 'title': 'Sub-task for story', 'story_points': 1, 'priority': 'low'}
        ]
    }
    res = client.post(bulk_url, payload, format='json')
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert len(data) == 3
    assert data[0]['key'] == 'SMC-1'
    assert data[1]['key'] == 'SMC-2'
    assert data[2]['key'] == 'SMC-3'

    project.refresh_from_db()
    assert project.issue_counter == 3
