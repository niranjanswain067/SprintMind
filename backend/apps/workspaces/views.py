from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import transaction
from drf_spectacular.utils import extend_schema

from apps.workspaces.models import Workspace, WorkspaceMember
from apps.workspaces.serializers import (
    WorkspaceSerializer,
    WorkspaceCreateSerializer,
    WorkspaceMemberSerializer,
    WorkspaceMemberInviteSerializer,
    WorkspaceMemberRoleUpdateSerializer,
)
from apps.accounts.models import User
from common.permissions import IsWorkspaceMember, IsWorkspaceAdmin


class WorkspaceListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List Workspaces for Current User",
        responses={200: WorkspaceSerializer(many=True)}
    )
    def get(self, request):
        memberships = WorkspaceMember.objects.filter(user=request.user).values_list('workspace_id', flat=True)
        workspaces = Workspace.objects.filter(id__in=memberships).select_related('owner')
        serializer = WorkspaceSerializer(workspaces, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Create New Workspace",
        request=WorkspaceCreateSerializer,
        responses={201: WorkspaceSerializer}
    )
    def post(self, request):
        serializer = WorkspaceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            workspace = Workspace.objects.create(
                name=serializer.validated_data['name'],
                owner=request.user
            )
            WorkspaceMember.objects.create(
                workspace=workspace,
                user=request.user,
                role=WorkspaceMember.ROLE_ADMIN
            )

        return Response(
            WorkspaceSerializer(workspace, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class WorkspaceDetailView(APIView):
    permission_classes = [IsAuthenticated, IsWorkspaceMember]

    def get_workspace_id(self):
        return self.kwargs.get('pk')

    @extend_schema(
        summary="Get Workspace Details",
        responses={200: WorkspaceSerializer}
    )
    def get(self, request, pk):
        workspace = get_object_or_404(Workspace.objects.select_related('owner'), pk=pk)
        self.check_object_permissions(request, workspace)
        serializer = WorkspaceSerializer(workspace, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Update Workspace Name",
        request=WorkspaceCreateSerializer,
        responses={200: WorkspaceSerializer}
    )
    def patch(self, request, pk):
        workspace = get_object_or_404(Workspace, pk=pk)
        # Only Workspace Admins can edit the workspace
        is_admin = WorkspaceMember.objects.filter(
            workspace=workspace,
            user=request.user,
            role=WorkspaceMember.ROLE_ADMIN
        ).exists()

        if not is_admin:
            return Response(
                {
                    'error': {
                        'code': 'permission_denied',
                        'message': 'Only workspace admins can rename this workspace.',
                        'details': {},
                    }
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = WorkspaceCreateSerializer(workspace, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(WorkspaceSerializer(workspace, context={'request': request}).data, status=status.HTTP_200_OK)


class WorkspaceMemberListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsWorkspaceMember]

    def get_workspace_id(self):
        return self.kwargs.get('pk')

    @extend_schema(
        summary="List Workspace Members",
        responses={200: WorkspaceMemberSerializer(many=True)}
    )
    def get(self, request, pk):
        workspace = get_object_or_404(Workspace, pk=pk)
        members = WorkspaceMember.objects.filter(workspace=workspace).select_related('user')
        serializer = WorkspaceMemberSerializer(members, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Add / Invite Member to Workspace",
        request=WorkspaceMemberInviteSerializer,
        responses={201: WorkspaceMemberSerializer}
    )
    def post(self, request, pk):
        workspace = get_object_or_404(Workspace, pk=pk)
        # Admin required to add members
        is_admin = WorkspaceMember.objects.filter(
            workspace=workspace,
            user=request.user,
            role=WorkspaceMember.ROLE_ADMIN
        ).exists()

        if not is_admin:
            return Response(
                {
                    'error': {
                        'code': 'permission_denied',
                        'message': 'Only workspace admins can invite new members.',
                        'details': {},
                    }
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = WorkspaceMemberInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        role = serializer.validated_data['role']

        # Find or create user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={'name': email.split('@')[0]}
        )
        if created:
            user.set_unusable_password()
            user.save()

        if WorkspaceMember.objects.filter(workspace=workspace, user=user).exists():
            return Response(
                {
                    'error': {
                        'code': 'conflict',
                        'message': 'User is already a member of this workspace.',
                        'details': {},
                    }
                },
                status=status.HTTP_409_CONFLICT
            )

        member = WorkspaceMember.objects.create(
            workspace=workspace,
            user=user,
            role=role
        )

        return Response(
            WorkspaceMemberSerializer(member).data,
            status=status.HTTP_201_CREATED
        )


class WorkspaceMemberDetailView(APIView):
    permission_classes = [IsAuthenticated, IsWorkspaceAdmin]

    def get_workspace_id(self):
        return self.kwargs.get('pk')

    @extend_schema(
        summary="Change Member Role",
        request=WorkspaceMemberRoleUpdateSerializer,
        responses={200: WorkspaceMemberSerializer}
    )
    def patch(self, request, pk, user_id):
        workspace = get_object_or_404(Workspace, pk=pk)
        member = get_object_or_404(WorkspaceMember, workspace=workspace, user_id=user_id)

        if member.user == workspace.owner and request.data.get('role') != WorkspaceMember.ROLE_ADMIN:
            return Response(
                {
                    'error': {
                        'code': 'bad_request',
                        'message': 'Cannot demote the workspace owner from admin role.',
                        'details': {},
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = WorkspaceMemberRoleUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        member.role = serializer.validated_data['role']
        member.save()

        return Response(WorkspaceMemberSerializer(member).data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Remove Member from Workspace",
        responses={200: dict}
    )
    def delete(self, request, pk, user_id):
        workspace = get_object_or_404(Workspace, pk=pk)
        member = get_object_or_404(WorkspaceMember, workspace=workspace, user_id=user_id)

        if member.user == workspace.owner:
            return Response(
                {
                    'error': {
                        'code': 'bad_request',
                        'message': 'Cannot remove the workspace owner from the workspace.',
                        'details': {},
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        member.delete()
        return Response(
            {'message': 'Member removed from workspace successfully.'},
            status=status.HTTP_200_OK
        )
