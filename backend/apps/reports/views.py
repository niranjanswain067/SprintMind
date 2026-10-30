from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Q
from django.utils import timezone

from apps.projects.models import Project
from apps.sprints.models import Sprint
from apps.issues.models import Issue
from apps.issues.serializers import IssueListSerializer
from apps.sprints.serializers import SprintSerializer
from common.permissions import IsWorkspaceMember


class ProjectBoardView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_workspace_id(self):
        project_id = self.kwargs.get('id')
        return Project.objects.filter(id=project_id).values_list('workspace_id', flat=True).first()

    def get(self, request, id):
        project = get_object_or_404(Project, id=id)

        active_sprint = None
        if project.methodology == Project.METHODOLOGY_SCRUM:
            active_sprint = Sprint.objects.filter(project=project, status='active').first()
            if active_sprint:
                issues_qs = Issue.objects.filter(project=project, sprint=active_sprint)
            else:
                issues_qs = Issue.objects.none()
        else:
            # Kanban: all issues that are not archived
            issues_qs = Issue.objects.filter(project=project)

        # Filters
        assignee = request.query_params.get('assignee')
        if assignee:
            issues_qs = issues_qs.filter(assignee_id=assignee)

        issue_type = request.query_params.get('type')
        if issue_type:
            issues_qs = issues_qs.filter(type=issue_type)

        priority = request.query_params.get('priority')
        if priority:
            issues_qs = issues_qs.filter(priority=priority)

        q = request.query_params.get('q')
        if q:
            issues_qs = issues_qs.filter(
                Q(title__icontains=q) |
                Q(description__icontains=q)
            )

        issues_qs = issues_qs.select_related(
            'project', 'assignee', 'reporter', 'parent', 'sprint'
        ).prefetch_related('subtasks', 'comments').order_by('rank', 'number')

        all_issues = list(issues_qs)

        # Group by 4 columns
        columns = {
            'todo': [],
            'in_progress': [],
            'in_review': [],
            'done': [],
        }

        for issue in all_issues:
            if issue.status in columns:
                columns[issue.status].append(issue)
            else:
                columns['todo'].append(issue)

        serialized_columns = {
            col: IssueListSerializer(items, many=True).data
            for col, items in columns.items()
        }

        return Response({
            'project_id': project.id,
            'methodology': project.methodology,
            'active_sprint': SprintSerializer(active_sprint).data if active_sprint else None,
            'columns': serialized_columns,
            'total_count': len(all_issues),
        }, status=status.HTTP_200_OK)


class ProjectDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceMember]

    def get_workspace_id(self):
        project_id = self.kwargs.get('id')
        return Project.objects.filter(id=project_id).values_list('workspace_id', flat=True).first()

    def get(self, request, id):
        project = get_object_or_404(Project, id=id)
        today = timezone.now().date()

        issues_qs = Issue.objects.filter(project=project)
        total_issues = issues_qs.count()
        in_progress = issues_qs.filter(status='in_progress').count()
        done = issues_qs.filter(status='done').count()
        todo = issues_qs.filter(status='todo').count()
        in_review = issues_qs.filter(status='in_review').count()

        overdue_qs = issues_qs.filter(due_date__lt=today).exclude(status='done')
        overdue_count = overdue_qs.count()

        completion_pct = round((done / total_issues * 100), 1) if total_issues > 0 else 0.0

        # Active sprint data
        active_sprint_obj = Sprint.objects.filter(project=project, status='active').first()
        active_sprint_data = None
        if active_sprint_obj:
            sprint_issues = active_sprint_obj.issues.all()
            total_points = sprint_issues.aggregate(pts=Sum('story_points'))['pts'] or 0
            done_points = sprint_issues.filter(status='done').aggregate(pts=Sum('story_points'))['pts'] or 0

            if total_points > 0:
                sprint_progress = round((done_points / total_points * 100), 1)
            else:
                s_count = sprint_issues.count()
                s_done = sprint_issues.filter(status='done').count()
                sprint_progress = round((s_done / s_count * 100), 1) if s_count > 0 else 0.0

            active_sprint_data = {
                'id': active_sprint_obj.id,
                'name': active_sprint_obj.name,
                'goal': active_sprint_obj.goal,
                'start_date': str(active_sprint_obj.start_date) if active_sprint_obj.start_date else None,
                'end_date': str(active_sprint_obj.end_date) if active_sprint_obj.end_date else None,
                'total_points': total_points,
                'done_points': done_points,
                'progress_percentage': sprint_progress,
            }

        # Status distribution
        issues_by_status = {
            'todo': todo,
            'in_progress': in_progress,
            'in_review': in_review,
            'done': done,
        }

        # Priority distribution
        issues_by_priority = {
            'low': issues_qs.filter(priority='low').count(),
            'medium': issues_qs.filter(priority='medium').count(),
            'high': issues_qs.filter(priority='high').count(),
            'critical': issues_qs.filter(priority='critical').count(),
        }

        # Overdue issues list
        overdue_items = []
        for item in overdue_qs.select_related('assignee').order_by('due_date')[:10]:
            initials = ""
            if item.assignee and item.assignee.name:
                parts = item.assignee.name.strip().split()
                initials = f"{parts[0][0]}{parts[1][0]}".upper() if len(parts) >= 2 else item.assignee.name[:2].upper()

            overdue_items.append({
                'id': item.id,
                'key': item.key,
                'title': item.title,
                'due_date': str(item.due_date),
                'priority': item.priority,
                'assignee_name': item.assignee.name if item.assignee else None,
                'assignee_initials': initials or None,
            })

        return Response({
            'metrics': {
                'total_issues': total_issues,
                'in_progress': in_progress,
                'done': done,
                'overdue': overdue_count,
                'completion_percentage': completion_pct,
            },
            'active_sprint': active_sprint_data,
            'issues_by_status': issues_by_status,
            'issues_by_priority': issues_by_priority,
            'overdue_issues': overdue_items,
        }, status=status.HTTP_200_OK)

