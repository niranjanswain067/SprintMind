import pytest
from datetime import timedelta
from decimal import Decimal
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User
from apps.workspaces.models import Workspace, WorkspaceMember
from apps.projects.models import Project
from apps.issues.models import Issue
from apps.sprints.models import Sprint


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def project_setup(db):
    admin = User.objects.create_user(email="admin@example.com", name="Admin User", password="Password123!")
    pm = User.objects.create_user(email="pm@example.com", name="PM User", password="Password123!")
    dev = User.objects.create_user(email="dev@example.com", name="Dev User", password="Password123!")
    viewer = User.objects.create_user(email="viewer@example.com", name="Viewer User", password="Password123!")

    ws = Workspace.objects.create(name="Engineering WS", owner=admin)
    WorkspaceMember.objects.create(workspace=ws, user=admin, role=WorkspaceMember.ROLE_ADMIN)
    WorkspaceMember.objects.create(workspace=ws, user=pm, role=WorkspaceMember.ROLE_MANAGER)
    WorkspaceMember.objects.create(workspace=ws, user=dev, role=WorkspaceMember.ROLE_DEVELOPER)
    WorkspaceMember.objects.create(workspace=ws, user=viewer, role=WorkspaceMember.ROLE_VIEWER)

    scrum_proj = Project.objects.create(workspace=ws, name="Scrum App", key="SCRUM", methodology="scrum")
    kanban_proj = Project.objects.create(workspace=ws, name="Kanban Flow", key="KAN", methodology="kanban")

    return {
        'workspace': ws,
        'scrum_proj': scrum_proj,
        'kanban_proj': kanban_proj,
        'admin': admin,
        'pm': pm,
        'dev': dev,
        'viewer': viewer,
    }


@pytest.mark.django_db
def test_create_sprint_permissions(client, project_setup):
    proj = project_setup['scrum_proj']
    pm = project_setup['pm']
    dev = project_setup['dev']
    viewer = project_setup['viewer']

    url = reverse('project-sprint-list-create', kwargs={'id': proj.id})

    # PM creates sprint -> Success
    client.force_authenticate(user=pm)
    res_pm = client.post(url, {
        'name': 'Sprint 1',
        'goal': 'Deliver MVP',
        'start_date': str(timezone.now().date()),
        'end_date': str(timezone.now().date() + timedelta(days=14)),
    }, format='json')
    assert res_pm.status_code == status.HTTP_201_CREATED
    assert res_pm.json()['name'] == 'Sprint 1'
    assert res_pm.json()['status'] == 'planned'

    # Dev cannot create sprint -> 403
    client.force_authenticate(user=dev)
    res_dev = client.post(url, {'name': 'Dev Sprint'}, format='json')
    assert res_dev.status_code == status.HTTP_403_FORBIDDEN

    # Viewer cannot create sprint -> 403
    client.force_authenticate(user=viewer)
    res_view = client.post(url, {'name': 'Viewer Sprint'}, format='json')
    assert res_view.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_start_sprint_and_single_active_constraint(client, project_setup):
    proj = project_setup['scrum_proj']
    admin = project_setup['admin']

    sprint1 = Sprint.objects.create(project=proj, name="Sprint 1", status="planned")
    sprint2 = Sprint.objects.create(project=proj, name="Sprint 2", status="planned")

    client.force_authenticate(user=admin)

    # Start Sprint 1
    start_url1 = reverse('sprint-start', kwargs={'id': sprint1.id})
    res1 = client.post(start_url1, format='json')
    assert res1.status_code == status.HTTP_200_OK
    assert res1.json()['status'] == 'active'

    # Attempt to start Sprint 2 while Sprint 1 is active -> 400 Bad Request
    start_url2 = reverse('sprint-start', kwargs={'id': sprint2.id})
    res2 = client.post(start_url2, format='json')
    assert res2.status_code == status.HTTP_400_BAD_REQUEST
    assert res2.json()['error']['code'] == 'active_sprint_exists'


@pytest.mark.django_db
def test_assign_and_remove_issues_from_sprint(client, project_setup):
    proj = project_setup['scrum_proj']
    dev = project_setup['dev']

    sprint = Sprint.objects.create(project=proj, name="Sprint Alpha", status="active")
    i1 = Issue.objects.create(project=proj, number=1, reporter=dev, title="Issue 1", story_points=3)
    i2 = Issue.objects.create(project=proj, number=2, reporter=dev, title="Issue 2", story_points=5)

    client.force_authenticate(user=dev)

    # Assign issues to sprint
    assign_url = reverse('sprint-issues-add', kwargs={'id': sprint.id})
    res_assign = client.post(assign_url, {'issue_ids': [i1.id, i2.id]}, format='json')
    assert res_assign.status_code == status.HTTP_200_OK

    i1.refresh_from_db()
    i2.refresh_from_db()
    assert i1.sprint_id == sprint.id
    assert i2.sprint_id == sprint.id

    # Remove issue 1 from sprint
    remove_url = reverse('sprint-issue-remove', kwargs={'id': sprint.id, 'issue_id': i1.id})
    res_remove = client.delete(remove_url)
    assert res_remove.status_code == status.HTTP_204_NO_CONTENT

    i1.refresh_from_db()
    assert i1.sprint is None


@pytest.mark.django_db
def test_complete_sprint_destination_handling(client, project_setup):
    proj = project_setup['scrum_proj']
    pm = project_setup['pm']

    sprint = Sprint.objects.create(project=proj, name="Sprint 1", status="active")
    next_sprint = Sprint.objects.create(project=proj, name="Sprint 2", status="planned")

    i_done = Issue.objects.create(project=proj, number=1, reporter=pm, sprint=sprint, title="Done Story", status="done", story_points=5)
    i_unfin1 = Issue.objects.create(project=proj, number=2, reporter=pm, sprint=sprint, title="Unfinished 1", status="in_progress", story_points=3)
    i_unfin2 = Issue.objects.create(project=proj, number=3, reporter=pm, sprint=sprint, title="Unfinished 2", status="todo", story_points=2)

    client.force_authenticate(user=pm)
    complete_url = reverse('sprint-complete', kwargs={'id': sprint.id})

    # Option A: Move unfinished to next sprint
    res = client.post(complete_url, {
        'unfinished_issues_destination': 'sprint',
        'target_sprint_id': next_sprint.id,
    }, format='json')
    assert res.status_code == status.HTTP_200_OK
    assert res.json()['status'] == 'completed'

    i_done.refresh_from_db()
    i_unfin1.refresh_from_db()
    i_unfin2.refresh_from_db()

    # Done stays in sprint 1
    assert i_done.sprint_id == sprint.id
    # Unfinished moved to sprint 2
    assert i_unfin1.sprint_id == next_sprint.id
    assert i_unfin2.sprint_id == next_sprint.id


@pytest.mark.django_db
def test_kanban_board_columns_and_methodology(client, project_setup):
    scrum_proj = project_setup['scrum_proj']
    kanban_proj = project_setup['kanban_proj']
    dev = project_setup['dev']

    # 1. Scrum Project: No active sprint -> columns empty
    client.force_authenticate(user=dev)
    board_url_scrum = reverse('project-board', kwargs={'id': scrum_proj.id})
    res_scrum_empty = client.get(board_url_scrum)
    assert res_scrum_empty.status_code == status.HTTP_200_OK
    assert res_scrum_empty.json()['active_sprint'] is None
    assert res_scrum_empty.json()['columns']['todo'] == []

    # Activate sprint and add issues
    active_sprint = Sprint.objects.create(project=scrum_proj, name="Sprint Active", status="active")
    Issue.objects.create(project=scrum_proj, number=1, reporter=dev, sprint=active_sprint, title="Task Todo", status="todo")
    Issue.objects.create(project=scrum_proj, number=2, reporter=dev, sprint=active_sprint, title="Task Progress", status="in_progress")
    Issue.objects.create(project=scrum_proj, number=3, reporter=dev, sprint=active_sprint, title="Task Done", status="done")

    res_scrum_active = client.get(board_url_scrum)
    assert res_scrum_active.status_code == status.HTTP_200_OK
    assert res_scrum_active.json()['active_sprint']['name'] == 'Sprint Active'
    assert len(res_scrum_active.json()['columns']['todo']) == 1
    assert len(res_scrum_active.json()['columns']['in_progress']) == 1
    assert len(res_scrum_active.json()['columns']['done']) == 1

    # 2. Kanban Project: Always returns all project issues
    Issue.objects.create(project=kanban_proj, number=1, reporter=dev, title="Kanban Item 1", status="todo")
    Issue.objects.create(project=kanban_proj, number=2, reporter=dev, title="Kanban Item 2", status="in_review")

    board_url_kanban = reverse('project-board', kwargs={'id': kanban_proj.id})
    res_kanban = client.get(board_url_kanban)
    assert res_kanban.status_code == status.HTTP_200_OK
    assert res_kanban.json()['methodology'] == 'kanban'
    assert len(res_kanban.json()['columns']['todo']) == 1
    assert len(res_kanban.json()['columns']['in_review']) == 1


@pytest.mark.django_db
def test_dashboard_aggregations_and_overdue(client, project_setup):
    proj = project_setup['scrum_proj']
    dev = project_setup['dev']
    today = timezone.now().date()

    # Active sprint
    sprint = Sprint.objects.create(project=proj, name="Sprint 1", status="active")

    # Create issues
    # 2 done (5 + 3 pts), 1 in_progress (4 pts), 1 overdue todo (2 pts)
    Issue.objects.create(project=proj, number=1, reporter=dev, sprint=sprint, title="Done 1", status="done", story_points=5)
    Issue.objects.create(project=proj, number=2, reporter=dev, sprint=sprint, title="Done 2", status="done", story_points=3)
    Issue.objects.create(project=proj, number=3, reporter=dev, sprint=sprint, title="Active Task", status="in_progress", story_points=4)
    Issue.objects.create(
        project=proj, number=4, reporter=dev, sprint=sprint,
        title="Overdue Task", status="todo", story_points=2,
        due_date=today - timedelta(days=2)
    )

    client.force_authenticate(user=dev)
    dash_url = reverse('project-dashboard', kwargs={'id': proj.id})
    res = client.get(dash_url)
    assert res.status_code == status.HTTP_200_OK
    data = res.json()

    # Metrics
    metrics = data['metrics']
    assert metrics['total_issues'] == 4
    assert metrics['in_progress'] == 1
    assert metrics['done'] == 2
    assert metrics['overdue'] == 1
    assert metrics['completion_percentage'] == 50.0

    # Active sprint metrics: 8 / 14 pts = 57.1%
    active_sprint_metrics = data['active_sprint']
    assert active_sprint_metrics['total_points'] == 14
    assert active_sprint_metrics['done_points'] == 8
    assert active_sprint_metrics['progress_percentage'] == 57.1

    # Overdue list
    assert len(data['overdue_issues']) == 1
    assert data['overdue_issues'][0]['key'] == 'SCRUM-4'


@pytest.mark.django_db
def test_sprint_report_metrics(client, project_setup):
    proj = project_setup['scrum_proj']
    pm = project_setup['pm']

    sprint = Sprint.objects.create(project=proj, name="Sprint Target", status="completed")
    Issue.objects.create(project=proj, number=1, reporter=pm, sprint=sprint, title="Story 1", status="done", story_points=8, type="story")
    Issue.objects.create(project=proj, number=2, reporter=pm, sprint=sprint, title="Bug 1", status="done", story_points=3, type="bug")

    client.force_authenticate(user=pm)
    report_url = reverse('sprint-report', kwargs={'id': sprint.id})
    res = client.get(report_url)
    assert res.status_code == status.HTTP_200_OK

    report = res.json()
    assert report['metrics']['completed_issues'] == 2
    assert report['metrics']['velocity_points'] == 11
    assert report['issues_by_type']['story'] == 1
    assert report['issues_by_type']['bug'] == 1

