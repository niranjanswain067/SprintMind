from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q
from decimal import Decimal

from apps.projects.models import Project
from apps.issues.models import Issue, Comment, ActivityLog
from apps.issues.serializers import (
    IssueListSerializer,
    IssueDetailSerializer,
    IssueCreateUpdateSerializer,
    IssueMoveSerializer,
    BacklogReorderSerializer,
    CommentSerializer,
    ActivityLogSerializer,
)
from common.permissions import (
    IsWorkspaceMember,
    CanEditIssues,
    CanManageProject,
)


class ProjectIssueListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember, CanEditIssues]

    def get_workspace_id(self):
        project_id = self.kwargs.get('id')
        return Project.objects.filter(id=project_id).values_list('workspace_id', flat=True).first()

    def get_project(self):
        project = get_object_or_404(Project, id=self.kwargs.get('id'))
        return project

    def get(self, request, id):
        project = self.get_project()
        queryset = Issue.objects.filter(project=project).select_related(
            'project', 'assignee', 'reporter', 'parent', 'sprint'
        ).prefetch_related('subtasks', 'comments')

        # Filter: type
        issue_type = request.query_params.get('type')
        if issue_type:
            queryset = queryset.filter(type=issue_type)

        # Filter: status
        status_param = request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        # Filter: priority
        priority = request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)

        # Filter: assignee
        assignee = request.query_params.get('assignee')
        if assignee:
            queryset = queryset.filter(assignee_id=assignee)

        # Filter: sprint
        sprint = request.query_params.get('sprint')
        if sprint is not None:
            if sprint == '' or sprint.lower() == 'null' or sprint == 'backlog':
                queryset = queryset.filter(sprint__isnull=True)
            else:
                queryset = queryset.filter(sprint_id=sprint)

        # Filter: parent or epic
        parent = request.query_params.get('parent') or request.query_params.get('epic')
        if parent:
            queryset = queryset.filter(parent_id=parent)

        # Filter: search query 'q'
        q = request.query_params.get('q')
        if q:
            queryset = queryset.filter(
                Q(title__icontains=q) |
                Q(description__icontains=q) |
                Q(acceptance_criteria__icontains=q)
            )

        queryset = queryset.order_by('rank', 'number')
        serializer = IssueListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, id):
        project = self.get_project()
        serializer = IssueCreateUpdateSerializer(
            data=request.data,
            context={'project': project, 'reporter': request.user}
        )
        if serializer.is_valid():
            issue = serializer.save()
            return Response(IssueDetailSerializer(issue).data, status=status.HTTP_201_CREATED)
        return Response(
            {'error': {'code': 'validation_error', 'message': 'Invalid issue data.', 'details': serializer.errors}},
            status=status.HTTP_400_BAD_REQUEST
        )


class ProjectBacklogListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_workspace_id(self):
        project_id = self.kwargs.get('id')
        return Project.objects.filter(id=project_id).values_list('workspace_id', flat=True).first()

    def get(self, request, id):
        project = get_object_or_404(Project, id=id)
        queryset = Issue.objects.filter(
            project=project,
            sprint__isnull=True
        ).select_related('project', 'assignee', 'reporter', 'parent').prefetch_related('subtasks', 'comments')

        # Filters
        issue_type = request.query_params.get('type')
        if issue_type:
            queryset = queryset.filter(type=issue_type)

        priority = request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)

        assignee = request.query_params.get('assignee')
        if assignee:
            queryset = queryset.filter(assignee_id=assignee)

        q = request.query_params.get('q')
        if q:
            queryset = queryset.filter(
                Q(title__icontains=q) |
                Q(description__icontains=q)
            )

        queryset = queryset.order_by('rank', 'number')
        serializer = IssueListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProjectBacklogReorderView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember, CanEditIssues]

    def get_workspace_id(self):
        project_id = self.kwargs.get('id')
        return Project.objects.filter(id=project_id).values_list('workspace_id', flat=True).first()

    def patch(self, request, id):
        project = get_object_or_404(Project, id=id)
        serializer = BacklogReorderSerializer(
            data=request.data,
            context={'project': project}
        )
        if serializer.is_valid():
            issue = serializer.save()
            return Response(IssueListSerializer(issue).data, status=status.HTTP_200_OK)
        return Response(
            {'error': {'code': 'validation_error', 'message': 'Invalid reorder data.', 'details': serializer.errors}},
            status=status.HTTP_400_BAD_REQUEST
        )


class IssueDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_workspace_id(self):
        issue_id = self.kwargs.get('pk')
        return Issue.objects.filter(id=issue_id).values_list('project__workspace_id', flat=True).first()

    def get_object(self):
        issue = get_object_or_404(
            Issue.objects.select_related('project', 'assignee', 'reporter', 'parent', 'sprint')
            .prefetch_related('subtasks', 'comments__author', 'activity_logs__actor'),
            pk=self.kwargs.get('pk')
        )
        self.check_object_permissions(self.request, issue)
        return issue

    def get(self, request, pk):
        issue = self.get_object()
        serializer = IssueDetailSerializer(issue)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        issue = self.get_object()
        # Verify user can edit issues
        can_edit = CanEditIssues().has_object_permission(request, self, issue)
        if not can_edit:
            return Response(
                {'error': {'code': 'permission_denied', 'message': 'You do not have permission to edit this issue.'}},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = IssueCreateUpdateSerializer(
            issue,
            data=request.data,
            partial=True,
            context={'actor': request.user}
        )
        if serializer.is_valid():
            updated_issue = serializer.save()
            return Response(IssueDetailSerializer(updated_issue).data, status=status.HTTP_200_OK)
        return Response(
            {'error': {'code': 'validation_error', 'message': 'Failed to update issue.', 'details': serializer.errors}},
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, pk):
        issue = self.get_object()
        # Only Admins and Project Managers can delete issues
        can_delete = CanManageProject().has_object_permission(request, self, issue)
        if not can_delete:
            return Response(
                {'error': {'code': 'permission_denied', 'message': 'Only Admins and Project Managers can delete issues.'}},
                status=status.HTTP_403_FORBIDDEN
            )

        issue.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class IssueMoveView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember, CanEditIssues]

    def get_workspace_id(self):
        issue_id = self.kwargs.get('pk')
        return Issue.objects.filter(id=issue_id).values_list('project__workspace_id', flat=True).first()

    def patch(self, request, pk):
        issue = get_object_or_404(Issue, pk=pk)
        self.check_object_permissions(request, issue)

        serializer = IssueMoveSerializer(data=request.data)
        if serializer.is_valid():
            new_status = serializer.validated_data['status']
            new_rank = serializer.validated_data['rank']

            old_status = issue.status
            issue.status = new_status
            issue.rank = Decimal(str(new_rank))
            issue.save(update_fields=['status', 'rank'])

            if old_status != new_status:
                ActivityLog.objects.create(
                    issue=issue,
                    actor=request.user,
                    action='status_changed',
                    detail={'field': 'status', 'old': old_status, 'new': new_status}
                )

            return Response(IssueDetailSerializer(issue).data, status=status.HTTP_200_OK)
        return Response(
            {'error': {'code': 'validation_error', 'message': 'Invalid status or rank.', 'details': serializer.errors}},
            status=status.HTTP_400_BAD_REQUEST
        )


class IssueCommentListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_workspace_id(self):
        issue_id = self.kwargs.get('pk')
        return Issue.objects.filter(id=issue_id).values_list('project__workspace_id', flat=True).first()

    def get(self, request, pk):
        issue = get_object_or_404(Issue, pk=pk)
        self.check_object_permissions(request, issue)

        comments = issue.comments.select_related('author').order_by('created_at')
        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, pk):
        issue = get_object_or_404(Issue, pk=pk)
        self.check_object_permissions(request, issue)

        body = request.data.get('body', '').strip()
        if not body:
            return Response(
                {'error': {'code': 'validation_error', 'message': 'Comment body cannot be empty.'}},
                status=status.HTTP_400_BAD_REQUEST
            )

        comment = Comment.objects.create(
            issue=issue,
            author=request.user,
            body=body
        )

        ActivityLog.objects.create(
            issue=issue,
            actor=request.user,
            action='comment_added',
            detail={'comment_id': comment.id}
        )

        return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class IssueActivityListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_workspace_id(self):
        issue_id = self.kwargs.get('pk')
        return Issue.objects.filter(id=issue_id).values_list('project__workspace_id', flat=True).first()

    def get(self, request, pk):
        issue = get_object_or_404(Issue, pk=pk)
        self.check_object_permissions(request, issue)

        activities = issue.activity_logs.select_related('actor').order_by('-created_at')
        serializer = ActivityLogSerializer(activities, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProjectIssueBulkCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember, CanEditIssues]

    def get_workspace_id(self):
        project_id = self.kwargs.get('id')
        return Project.objects.filter(id=project_id).values_list('workspace_id', flat=True).first()

    def post(self, request, id):
        project = get_object_or_404(Project, id=id)
        issues_data = request.data.get('issues', [])
        if not isinstance(issues_data, list) or len(issues_data) == 0:
            return Response(
                {'error': {'code': 'validation_error', 'message': 'List of issues is required.'}},
                status=status.HTTP_400_BAD_REQUEST
            )

        created_issues = []
        with transaction.atomic():
            for item in issues_data:
                serializer = IssueCreateUpdateSerializer(
                    data=item,
                    context={'project': project, 'reporter': request.user}
                )
                if serializer.is_valid():
                    issue = serializer.save()
                    created_issues.append(issue)
                else:
                    return Response(
                        {'error': {'code': 'validation_error', 'message': 'Failed to create bulk issues.', 'details': serializer.errors}},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        return Response(IssueListSerializer(created_issues, many=True).data, status=status.HTTP_201_CREATED)
