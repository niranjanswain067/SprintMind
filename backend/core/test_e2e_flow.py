import pytest
from rest_framework import status
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.workspaces.models import WorkspaceMember
from apps.issues.models import Issue


@pytest.mark.django_db
class TestEndToEndCriticalJourney:
    """
    End-to-End critical path integration test suite covering:
    1. Full registration & authentication
    2. Workspace creation & membership
    3. Project creation
    4. Backlog creation & ranking
    5. Sprint planning, active sprint transition, issue status changes
    6. Sprint completion with rollover
    7. RBAC security enforcement (Viewer received 403 on write attempts)
    """

    def test_full_user_and_project_lifecycle(self):
        client = APIClient()

        # 1. User Registration
        reg_resp = client.post('/api/v1/auth/register/', {
            'email': 'lead@sprintmind.io',
            'name': 'Tech Lead',
            'password': 'ComplexPassword123!',
        })
        assert reg_resp.status_code == status.HTTP_201_CREATED
        tokens = reg_resp.data.get('tokens')
        assert tokens and 'access' in tokens
        access_token = tokens['access']
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

        # 2. Workspace Creation
        ws_resp = client.post('/api/v1/workspaces/', {'name': 'Apollo Team'})
        assert ws_resp.status_code == status.HTTP_201_CREATED
        ws_id = ws_resp.data['id']
        assert ws_resp.data['current_user_role'] == 'admin'

        # 3. Project Creation
        proj_resp = client.post('/api/v1/projects/', {
            'workspace_id': ws_id,
            'name': 'Lunar Lander App',
            'key': 'LLA',
            'methodology': 'scrum',
        })
        assert proj_resp.status_code == status.HTTP_201_CREATED
        proj_id = proj_resp.data['id']
        assert proj_resp.data['key'] == 'LLA'

        # 4. Create Backlog Items
        issue1_resp = client.post(f'/api/v1/projects/{proj_id}/issues/', {
            'title': 'Navigation guidance telemetry',
            'type': 'story',
            'priority': 'high',
            'story_points': 5,
        })
        assert issue1_resp.status_code == status.HTTP_201_CREATED
        issue1_id = issue1_resp.data['id']
        assert issue1_resp.data['key'] == 'LLA-1'

        issue2_resp = client.post(f'/api/v1/projects/{proj_id}/issues/', {
            'title': 'Thruster calibration check',
            'type': 'task',
            'priority': 'medium',
            'story_points': 3,
        })
        assert issue2_resp.status_code == status.HTTP_201_CREATED
        issue2_id = issue2_resp.data['id']
        assert issue2_resp.data['key'] == 'LLA-2'

        # Verify Backlog listing
        backlog_resp = client.get(f'/api/v1/projects/{proj_id}/backlog/')
        assert backlog_resp.status_code == status.HTTP_200_OK
        assert len(backlog_resp.data) == 2

        # 5. Sprint Planning
        sprint_resp = client.post(f'/api/v1/projects/{proj_id}/sprints/', {
            'name': 'Apollo Sprint 1',
            'goal': 'Initial orbital trajectory testing',
        })
        assert sprint_resp.status_code == status.HTTP_201_CREATED
        sprint_id = sprint_resp.data['id']
        assert sprint_resp.data['status'] == 'planned'

        # Assign issues to sprint
        assign_resp = client.post(f'/api/v1/sprints/{sprint_id}/issues/', {
            'issue_ids': [issue1_id, issue2_id],
        })
        assert assign_resp.status_code == status.HTTP_200_OK

        # Start Sprint
        start_resp = client.post(f'/api/v1/sprints/{sprint_id}/start/', {
            'name': 'Apollo Sprint 1',
            'start_date': '2026-11-01',
            'end_date': '2026-11-15',
        })
        assert start_resp.status_code == status.HTTP_200_OK
        assert start_resp.data['status'] == 'active'

        # 6. Move Issue 1 on Kanban Board (todo -> done)
        move_resp = client.patch(f'/api/v1/issues/{issue1_id}/move/', {
            'status': 'done',
            'rank': 1500,
        })
        assert move_resp.status_code == status.HTTP_200_OK
        assert move_resp.data['status'] == 'done'

        # 7. Complete Sprint (Issue 1 is done, Issue 2 rolls over to backlog)
        complete_resp = client.post(f'/api/v1/sprints/{sprint_id}/complete/', {
            'unfinished_issues_destination': 'backlog',
        })
        assert complete_resp.status_code == status.HTTP_200_OK
        assert complete_resp.data['status'] == 'completed'

        # Verify Issue 2 returned to unassigned backlog, Issue 1 remained completed in sprint
        issue1 = Issue.objects.get(id=issue1_id)
        issue2 = Issue.objects.get(id=issue2_id)
        assert issue1.status == 'done'
        assert issue1.sprint_id == sprint_id
        assert issue2.sprint_id is None

        # 8. RBAC Verification with Viewer Role
        viewer_user = User.objects.create_user(
            email='viewer@sprintmind.io',
            name='Auditor Viewer',
            password='Password123!'
        )
        WorkspaceMember.objects.create(
            workspace_id=ws_id,
            user=viewer_user,
            role='viewer'
        )

        viewer_client = APIClient()
        viewer_login = viewer_client.post('/api/v1/auth/login/', {
            'email': 'viewer@sprintmind.io',
            'password': 'Password123!'
        })
        viewer_token = viewer_login.data['tokens']['access']
        viewer_client.credentials(HTTP_AUTHORIZATION=f'Bearer {viewer_token}')

        # Viewer can read backlog
        v_read = viewer_client.get(f'/api/v1/projects/{proj_id}/backlog/')
        assert v_read.status_code == status.HTTP_200_OK

        # Viewer CANNOT create an issue (must receive 403 Forbidden)
        v_write = viewer_client.post(f'/api/v1/projects/{proj_id}/issues/', {
            'title': 'Unauthorized issue by viewer',
            'type': 'bug',
        })
        assert v_write.status_code == status.HTTP_403_FORBIDDEN

        # Viewer CANNOT delete an issue (must receive 403 Forbidden)
        v_del = viewer_client.delete(f'/api/v1/issues/{issue1_id}/')
        assert v_del.status_code == status.HTTP_403_FORBIDDEN
