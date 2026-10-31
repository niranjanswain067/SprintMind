from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Sum, Case, When, Value, IntegerField
from django.utils import timezone

from apps.projects.models import Project
from apps.sprints.models import Sprint
from apps.issues.models import Issue, ActivityLog
from apps.sprints.serializers import (
    SprintSerializer,
    SprintDetailSerializer,
    SprintCreateUpdateSerializer,
    SprintCompleteSerializer,
    SprintIssueAssignSerializer,
)
from common.permissions import (
    IsWorkspaceMember,
    CanManageProject,
    CanEditIssues,
)


class ProjectSprintListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_workspace_id(self):
        project_id = self.kwargs.get('id')
        return Project.objects.filter(id=project_id).values_list('workspace_id', flat=True).first()

    def get_project(self):
        return get_object_or_404(Project, id=self.kwargs.get('id'))

    def get(self, request, id):
        project = self.get_project()
        queryset = Sprint.objects.filter(project=project).prefetch_related('issues')

        status_param = request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        # Custom ordering: active first (1), planned second (2), completed last (3)
        queryset = queryset.annotate(
            status_order=Case(
                When(status='active', then=Value(1)),
                When(status='planned', then=Value(2)),
                When(status='completed', then=Value(3)),
                default=Value(4),
                output_field=IntegerField(),
            )
        ).order_by('status_order', '-created_at')

        serializer = SprintSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, id):
        project = self.get_project()
        # Verify CanManageProject
        if not CanManageProject().has_permission(request, self):
            return Response(
                {'error': {'code': 'permission_denied', 'message': 'Only Admins and Project Managers can create sprints.'}},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = SprintCreateUpdateSerializer(
            data=request.data,
            context={'project': project}
        )
        if serializer.is_valid():
            sprint = serializer.save()
            return Response(SprintDetailSerializer(sprint).data, status=status.HTTP_201_CREATED)
        return Response(
            {'error': {'code': 'validation_error', 'message': 'Invalid sprint data.', 'details': serializer.errors}},
            status=status.HTTP_400_BAD_REQUEST
        )


class SprintDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_workspace_id(self):
        sprint_id = self.kwargs.get('pk')
        return Sprint.objects.filter(id=sprint_id).values_list('project__workspace_id', flat=True).first()

    def get_object(self):
        sprint = get_object_or_404(
            Sprint.objects.select_related('project')
            .prefetch_related('issues__assignee', 'issues__reporter', 'issues__parent'),
            pk=self.kwargs.get('pk')
        )
        self.check_object_permissions(self.request, sprint)
        return sprint

    def get(self, request, pk):
        sprint = self.get_object()
        serializer = SprintDetailSerializer(sprint)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        sprint = self.get_object()
        if not CanManageProject().has_object_permission(request, self, sprint.project):
            return Response(
                {'error': {'code': 'permission_denied', 'message': 'Only Admins and Project Managers can edit sprints.'}},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = SprintCreateUpdateSerializer(
            sprint,
            data=request.data,
            partial=True,
            context={'project': sprint.project}
        )
        if serializer.is_valid():
            updated_sprint = serializer.save()
            return Response(SprintDetailSerializer(updated_sprint).data, status=status.HTTP_200_OK)
        return Response(
            {'error': {'code': 'validation_error', 'message': 'Failed to update sprint.', 'details': serializer.errors}},
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, pk):
        sprint = self.get_object()
        if not CanManageProject().has_object_permission(request, self, sprint.project):
            return Response(
                {'error': {'code': 'permission_denied', 'message': 'Only Admins and Project Managers can delete sprints.'}},
                status=status.HTTP_403_FORBIDDEN
            )

        # Move issues back to backlog before deleting
        with transaction.atomic():
            sprint.issues.update(sprint=None)
            sprint.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class SprintStartView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_workspace_id(self):
        sprint_id = self.kwargs.get('id')
        return Sprint.objects.filter(id=sprint_id).values_list('project__workspace_id', flat=True).first()

    def post(self, request, id):
        sprint = get_object_or_404(Sprint.objects.select_related('project'), id=id)

        if not CanManageProject().has_object_permission(request, self, sprint.project):
            return Response(
                {'error': {'code': 'permission_denied', 'message': 'Only Admins and Project Managers can start sprints.'}},
                status=status.HTTP_403_FORBIDDEN
            )

        if sprint.status == 'active':
            return Response(
                {'error': {'code': 'already_active', 'message': 'Sprint is already active.'}},
                status=status.HTTP_400_BAD_REQUEST
            )
        if sprint.status == 'completed':
            return Response(
                {'error': {'code': 'already_completed', 'message': 'Cannot restart a completed sprint.'}},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate that no other sprint is currently active in this project
        active_exists = Sprint.objects.filter(project=sprint.project, status='active').exclude(id=sprint.id).exists()
        if active_exists:
            return Response(
                {'error': {'code': 'active_sprint_exists', 'message': 'Another sprint is already active in this project.'}},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Optional updates from payload (dates, goal, etc.)
        start_date = request.data.get('start_date') or sprint.start_date or timezone.now().date()
        end_date = request.data.get('end_date') or sprint.end_date
        goal = request.data.get('goal', sprint.goal)

        sprint.status = 'active'
        sprint.start_date = start_date
        sprint.end_date = end_date
        sprint.goal = goal
        sprint.save()

        return Response(SprintDetailSerializer(sprint).data, status=status.HTTP_200_OK)


class SprintCompleteView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_workspace_id(self):
        sprint_id = self.kwargs.get('id')
        return Sprint.objects.filter(id=sprint_id).values_list('project__workspace_id', flat=True).first()

    def post(self, request, id):
        sprint = get_object_or_404(Sprint.objects.select_related('project'), id=id)

        if not CanManageProject().has_object_permission(request, self, sprint.project):
            return Response(
                {'error': {'code': 'permission_denied', 'message': 'Only Admins and Project Managers can complete sprints.'}},
                status=status.HTTP_403_FORBIDDEN
            )

        if sprint.status == 'completed':
            return Response(
                {'error': {'code': 'already_completed', 'message': 'Sprint is already completed.'}},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = SprintCompleteSerializer(data=request.data, context={'sprint': sprint})
        if not serializer.is_valid():
            return Response(
                {'error': {'code': 'validation_error', 'message': 'Invalid completion options.', 'details': serializer.errors}},
                status=status.HTTP_400_BAD_REQUEST
            )

        dest = serializer.validated_data['unfinished_issues_destination']
        target_sprint = serializer.validated_data.get('target_sprint_obj')

        with transaction.atomic():
            # Incomplete issues (status != 'done')
            incomplete_issues = sprint.issues.exclude(status='done')
            incomplete_count = incomplete_issues.count()

            if dest == 'backlog' or not target_sprint:
                incomplete_issues.update(sprint=None)
            else:
                incomplete_issues.update(sprint=target_sprint)

            sprint.status = 'completed'
            if not sprint.end_date:
                sprint.end_date = timezone.now().date()
            sprint.save()

        detail_data = SprintDetailSerializer(sprint).data
        detail_data['incomplete_issues_moved'] = incomplete_count
        detail_data['destination'] = dest

        return Response(detail_data, status=status.HTTP_200_OK)


class SprintIssuesAddView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember, CanEditIssues]

    def get_workspace_id(self):
        sprint_id = self.kwargs.get('id')
        return Sprint.objects.filter(id=sprint_id).values_list('project__workspace_id', flat=True).first()

    def post(self, request, id):
        sprint = get_object_or_404(Sprint.objects.select_related('project'), id=id)

        serializer = SprintIssueAssignSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': {'code': 'validation_error', 'message': 'Invalid issue IDs.', 'details': serializer.errors}},
                status=status.HTTP_400_BAD_REQUEST
            )

        issue_ids = serializer.validated_data['issue_ids']
        updated_count = Issue.objects.filter(
            project=sprint.project,
            id__in=issue_ids
        ).update(sprint=sprint)

        for issue_id in issue_ids:
            ActivityLog.objects.create(
                issue_id=issue_id,
                actor=request.user,
                action='assigned_to_sprint',
                detail={'sprint_id': sprint.id, 'sprint_name': sprint.name}
            )

        return Response(
            {'message': f'{updated_count} issues assigned to {sprint.name}', 'sprint': SprintDetailSerializer(sprint).data},
            status=status.HTTP_200_OK
        )


class SprintIssueRemoveView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember, CanEditIssues]

    def get_workspace_id(self):
        sprint_id = self.kwargs.get('id')
        return Sprint.objects.filter(id=sprint_id).values_list('project__workspace_id', flat=True).first()

    def delete(self, request, id, issue_id):
        sprint = get_object_or_404(Sprint.objects.select_related('project'), id=id)

        issue = get_object_or_404(Issue, id=issue_id, project=sprint.project)
        if issue.sprint_id == sprint.id:
            issue.sprint = None
            issue.save(update_fields=['sprint'])

            ActivityLog.objects.create(
                issue=issue,
                actor=request.user,
                action='removed_from_sprint',
                detail={'sprint_id': sprint.id, 'sprint_name': sprint.name}
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class SprintReportView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_workspace_id(self):
        sprint_id = self.kwargs.get('id')
        return Sprint.objects.filter(id=sprint_id).values_list('project__workspace_id', flat=True).first()

    def get(self, request, id):
        sprint = get_object_or_404(Sprint.objects.select_related('project'), id=id)

        issues = sprint.issues.all()
        total_issues = issues.count()
        completed_issues = issues.filter(status='done').count()
        incomplete_issues = total_issues - completed_issues

        total_points = issues.aggregate(pts=Sum('story_points'))['pts'] or 0
        completed_points = issues.filter(status='done').aggregate(pts=Sum('story_points'))['pts'] or 0

        # Group by status
        status_counts = {
            'todo': issues.filter(status='todo').count(),
            'in_progress': issues.filter(status='in_progress').count(),
            'in_review': issues.filter(status='in_review').count(),
            'done': completed_issues,
        }

        # Group by type
        type_counts = {
            'story': issues.filter(type='story').count(),
            'task': issues.filter(type='task').count(),
            'bug': issues.filter(type='bug').count(),
            'epic': issues.filter(type='epic').count(),
        }

        report_data = {
            'sprint': SprintSerializer(sprint).data,
            'metrics': {
                'total_issues': total_issues,
                'completed_issues': completed_issues,
                'incomplete_issues': incomplete_issues,
                'total_points': total_points,
                'completed_points': completed_points,
                'completion_percentage': round((completed_issues / total_issues * 100), 1) if total_issues > 0 else 0.0,
                'velocity_points': completed_points,
            },
            'issues_by_status': status_counts,
            'issues_by_type': type_counts,
        }
        return Response(report_data, status=status.HTTP_200_OK)

