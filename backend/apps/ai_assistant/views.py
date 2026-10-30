from datetime import timedelta
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Sum
from django.utils import timezone
from django.conf import settings

from apps.projects.models import Project
from apps.issues.models import Issue
from apps.sprints.models import Sprint
from apps.ai_assistant.models import AIRequestLog
from apps.ai_assistant.services import GroqAIService
from apps.ai_assistant.exceptions import AIAssistantException
from common.permissions import IsWorkspaceMember, CanEditIssues


def check_ai_rate_limit(user):
    """
    Enforces maximum AI requests per hour per user.
    """
    if not user or not user.is_authenticated:
        return True

    limit = getattr(settings, 'AI_RATE_LIMIT_PER_HOUR', 20)
    one_hour_ago = timezone.now() - timedelta(hours=1)
    recent_count = AIRequestLog.objects.filter(
        user=user,
        created_at__gte=one_hour_ago
    ).count()

    return recent_count < limit


class AIStoriesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not check_ai_rate_limit(request.user):
            return Response(
                {'error': {'code': 'rate_limit_exceeded', 'message': 'AI rate limit exceeded (max 20 requests/hour). Please try again later.'}},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        project_id = request.data.get('project_id')
        requirements = request.data.get('requirements', '').strip()

        if not requirements:
            return Response(
                {'error': {'code': 'validation_error', 'message': 'Requirements text is required.'}},
                status=status.HTTP_400_BAD_REQUEST
            )

        if project_id:
            project = get_object_or_404(Project, id=project_id)
            # Verify workspace membership
            if not project.workspace.members.filter(user=request.user).exists():
                return Response(
                    {'error': {'code': 'permission_denied', 'message': 'You are not a member of this project workspace.'}},
                    status=status.HTTP_403_FORBIDDEN
                )

        try:
            service = GroqAIService()
            result = service.generate_stories(requirements, user=request.user)
            return Response(result, status=status.HTTP_200_OK)
        except AIAssistantException as e:
            return Response(
                {'error': {'code': e.code, 'message': e.message}},
                status=status.HTTP_503_SERVICE_UNAVAILABLE if e.code in ['ai_unavailable', 'ai_timeout'] else status.HTTP_400_BAD_REQUEST
            )


class AITasksView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not check_ai_rate_limit(request.user):
            return Response(
                {'error': {'code': 'rate_limit_exceeded', 'message': 'AI rate limit exceeded (max 20 requests/hour). Please try again later.'}},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        story_id = request.data.get('story_id')
        title = request.data.get('title', '').strip()
        description = request.data.get('description', '').strip()

        if story_id:
            issue = get_object_or_404(Issue, id=story_id)
            if not issue.project.workspace.members.filter(user=request.user).exists():
                return Response(
                    {'error': {'code': 'permission_denied', 'message': 'You are not a member of this workspace.'}},
                    status=status.HTTP_403_FORBIDDEN
                )
            title = issue.title
            description = issue.description

        if not title:
            return Response(
                {'error': {'code': 'validation_error', 'message': 'Story title or story_id is required.'}},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            service = GroqAIService()
            result = service.generate_tasks(title, description, user=request.user)
            return Response(result, status=status.HTTP_200_OK)
        except AIAssistantException as e:
            return Response(
                {'error': {'code': e.code, 'message': e.message}},
                status=status.HTTP_503_SERVICE_UNAVAILABLE if e.code in ['ai_unavailable', 'ai_timeout'] else status.HTTP_400_BAD_REQUEST
            )


class AICriteriaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not check_ai_rate_limit(request.user):
            return Response(
                {'error': {'code': 'rate_limit_exceeded', 'message': 'AI rate limit exceeded (max 20 requests/hour). Please try again later.'}},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        issue_id = request.data.get('issue_id')
        title = request.data.get('title', '').strip()
        description = request.data.get('description', '').strip()

        if issue_id:
            issue = get_object_or_404(Issue, id=issue_id)
            if not issue.project.workspace.members.filter(user=request.user).exists():
                return Response(
                    {'error': {'code': 'permission_denied', 'message': 'You are not a member of this workspace.'}},
                    status=status.HTTP_403_FORBIDDEN
                )
            title = issue.title
            description = issue.description

        if not title:
            return Response(
                {'error': {'code': 'validation_error', 'message': 'Title or issue_id is required.'}},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            service = GroqAIService()
            result = service.generate_criteria(title, description, user=request.user)
            return Response(result, status=status.HTTP_200_OK)
        except AIAssistantException as e:
            return Response(
                {'error': {'code': e.code, 'message': e.message}},
                status=status.HTTP_503_SERVICE_UNAVAILABLE if e.code in ['ai_unavailable', 'ai_timeout'] else status.HTTP_400_BAD_REQUEST
            )


class AIBugAnalysisView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not check_ai_rate_limit(request.user):
            return Response(
                {'error': {'code': 'rate_limit_exceeded', 'message': 'AI rate limit exceeded (max 20 requests/hour). Please try again later.'}},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        issue_id = request.data.get('issue_id')
        title = request.data.get('title', '').strip()
        description = request.data.get('description', '').strip()

        if issue_id:
            issue = get_object_or_404(Issue, id=issue_id)
            if not issue.project.workspace.members.filter(user=request.user).exists():
                return Response(
                    {'error': {'code': 'permission_denied', 'message': 'You are not a member of this workspace.'}},
                    status=status.HTTP_403_FORBIDDEN
                )
            title = issue.title
            description = issue.description

        if not title:
            return Response(
                {'error': {'code': 'validation_error', 'message': 'Bug title or issue_id is required.'}},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            service = GroqAIService()
            result = service.analyze_bug(title, description, user=request.user)
            return Response(result, status=status.HTTP_200_OK)
        except AIAssistantException as e:
            return Response(
                {'error': {'code': e.code, 'message': e.message}},
                status=status.HTTP_503_SERVICE_UNAVAILABLE if e.code in ['ai_unavailable', 'ai_timeout'] else status.HTTP_400_BAD_REQUEST
            )


class AISprintSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not check_ai_rate_limit(request.user):
            return Response(
                {'error': {'code': 'rate_limit_exceeded', 'message': 'AI rate limit exceeded (max 20 requests/hour). Please try again later.'}},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        sprint_id = request.data.get('sprint_id')
        if not sprint_id:
            return Response(
                {'error': {'code': 'validation_error', 'message': 'sprint_id is required.'}},
                status=status.HTTP_400_BAD_REQUEST
            )

        sprint = get_object_or_404(Sprint.objects.select_related('project__workspace'), id=sprint_id)
        if not sprint.project.workspace.members.filter(user=request.user).exists():
            return Response(
                {'error': {'code': 'permission_denied', 'message': 'You are not a member of this workspace.'}},
                status=status.HTTP_403_FORBIDDEN
            )

        # Real computed numbers from PostgreSQL / DB
        issues = sprint.issues.all()
        total_issues = issues.count()
        completed_issues = issues.filter(status='done').count()
        incomplete_issues = total_issues - completed_issues

        completed_points = issues.filter(status='done').aggregate(pts=Sum('story_points'))['pts'] or 0
        total_points = issues.aggregate(pts=Sum('story_points'))['pts'] or 0

        try:
            service = GroqAIService()
            ai_output = service.generate_sprint_summary(
                sprint_name=sprint.name,
                completed_issues=completed_issues,
                incomplete_issues=incomplete_issues,
                completed_points=completed_points,
                total_points=total_points,
                user=request.user,
            )

            return Response({
                'summary_draft': ai_output.get('summary_draft', ''),
                'metrics': {
                    'completed_issues': completed_issues,
                    'incomplete_issues': incomplete_issues,
                    'completed_points': completed_points,
                    'total_points': total_points,
                }
            }, status=status.HTTP_200_OK)
        except AIAssistantException as e:
            return Response(
                {'error': {'code': e.code, 'message': e.message}},
                status=status.HTTP_503_SERVICE_UNAVAILABLE if e.code in ['ai_unavailable', 'ai_timeout'] else status.HTTP_400_BAD_REQUEST
            )

