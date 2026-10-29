from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.projects.models import Project
from apps.projects.serializers import (
    ProjectSerializer,
    ProjectCreateSerializer,
    ProjectUpdateSerializer,
)
from apps.workspaces.models import WorkspaceMember


class ProjectListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List Workspace Projects",
        parameters=[
            OpenApiParameter(name='workspace_id', description='Workspace ID filter', required=False, type=int),
            OpenApiParameter(name='is_archived', description='Filter by archive status', required=False, type=bool),
        ],
        responses={200: ProjectSerializer(many=True)}
    )
    def get(self, request):
        workspace_id = request.query_params.get('workspace_id') or request.headers.get('X-Workspace-ID')
        is_archived_param = request.query_params.get('is_archived')

        user_workspaces = WorkspaceMember.objects.filter(user=request.user).values_list('workspace_id', flat=True)

        if workspace_id:
            try:
                ws_id = int(workspace_id)
            except ValueError:
                return Response(
                    {
                        'error': {
                            'code': 'validation_error',
                            'message': 'Invalid workspace_id parameter.',
                            'details': {},
                        }
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            if ws_id not in user_workspaces:
                return Response(
                    {
                        'error': {
                            'code': 'permission_denied',
                            'message': 'You do not have access to this workspace.',
                            'details': {},
                        }
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
            queryset = Project.objects.filter(workspace_id=ws_id)
        else:
            queryset = Project.objects.filter(workspace_id__in=user_workspaces)

        if is_archived_param is not None:
            is_archived = is_archived_param.lower() in ('true', '1')
            queryset = queryset.filter(is_archived=is_archived)

        serializer = ProjectSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Create Project",
        request=ProjectCreateSerializer,
        responses={201: ProjectSerializer}
    )
    def post(self, request):
        serializer = ProjectCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        workspace_id = serializer.validated_data['workspace_id']

        # Enforce RBAC: user must be admin or manager
        membership = WorkspaceMember.objects.filter(
            workspace_id=workspace_id,
            user=request.user
        ).first()

        if not membership or membership.role not in [WorkspaceMember.ROLE_ADMIN, WorkspaceMember.ROLE_MANAGER]:
            return Response(
                {
                    'error': {
                        'code': 'permission_denied',
                        'message': 'Only Workspace Admins or Project Managers can create projects.',
                        'details': {},
                    }
                },
                status=status.HTTP_403_FORBIDDEN
            )

        project = Project.objects.create(
            workspace_id=workspace_id,
            name=serializer.validated_data['name'].strip(),
            key=serializer.validated_data['key'],
            description=serializer.validated_data.get('description', '').strip(),
            methodology=serializer.validated_data.get('methodology', Project.METHODOLOGY_SCRUM),
        )

        return Response(ProjectSerializer(project).data, status=status.HTTP_201_CREATED)


class ProjectDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get Project Details",
        responses={200: ProjectSerializer}
    )
    def get(self, request, pk):
        project = get_object_or_404(Project.objects.select_related('workspace'), pk=pk)

        # Tenant isolation
        if not WorkspaceMember.objects.filter(workspace=project.workspace, user=request.user).exists():
            return Response(
                {
                    'error': {
                        'code': 'permission_denied',
                        'message': 'You do not have access to this project.',
                        'details': {},
                    }
                },
                status=status.HTTP_403_FORBIDDEN
            )

        return Response(ProjectSerializer(project).data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Update Project Details",
        request=ProjectUpdateSerializer,
        responses={200: ProjectSerializer}
    )
    def patch(self, request, pk):
        project = get_object_or_404(Project.objects.select_related('workspace'), pk=pk)

        membership = WorkspaceMember.objects.filter(workspace=project.workspace, user=request.user).first()
        if not membership or membership.role not in [WorkspaceMember.ROLE_ADMIN, WorkspaceMember.ROLE_MANAGER]:
            return Response(
                {
                    'error': {
                        'code': 'permission_denied',
                        'message': 'Only Admins or Project Managers can edit project details.',
                        'details': {},
                    }
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ProjectUpdateSerializer(project, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProjectSerializer(project).data, status=status.HTTP_200_OK)


class ProjectArchiveView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Archive Project",
        responses={200: ProjectSerializer}
    )
    def post(self, request, pk):
        project = get_object_or_404(Project.objects.select_related('workspace'), pk=pk)

        membership = WorkspaceMember.objects.filter(workspace=project.workspace, user=request.user).first()
        if not membership or membership.role not in [WorkspaceMember.ROLE_ADMIN, WorkspaceMember.ROLE_MANAGER]:
            return Response(
                {
                    'error': {
                        'code': 'permission_denied',
                        'message': 'Only Admins or Project Managers can archive projects.',
                        'details': {},
                    }
                },
                status=status.HTTP_403_FORBIDDEN
            )

        project.is_archived = True
        project.save(update_fields=['is_archived', 'updated_at'])
        return Response(ProjectSerializer(project).data, status=status.HTTP_200_OK)
