from rest_framework import permissions
from apps.workspaces.models import WorkspaceMember


def get_workspace_id(request, view):
    """
    Helper to resolve workspace ID from request header, query params, view kwargs, or request body.
    """
    if hasattr(view, 'get_workspace_id') and callable(getattr(view, 'get_workspace_id')):
        return view.get_workspace_id()

    workspace_id = request.headers.get('X-Workspace-ID')
    if not workspace_id:
        workspace_id = request.query_params.get('workspace_id')
    if not workspace_id and 'workspace_id' in view.kwargs:
        workspace_id = view.kwargs['workspace_id']
    if not workspace_id and 'pk' in view.kwargs and hasattr(view, 'workspace_pk'):
        workspace_id = view.kwargs['pk']
    if not workspace_id and request.data and isinstance(request.data, dict):
        workspace_id = request.data.get('workspace_id')
    if not workspace_id:
        project_id = view.kwargs.get('id') or view.kwargs.get('project_id')
        if project_id:
            from apps.projects.models import Project
            proj = Project.objects.filter(id=project_id).values_list('workspace_id', flat=True).first()
            if proj:
                workspace_id = proj
    return workspace_id


class IsWorkspaceMember(permissions.BasePermission):
    """
    Allows access only to authenticated users who are members of the specified workspace.
    """
    message = "You are not a member of this workspace."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        workspace_id = get_workspace_id(request, view)
        if not workspace_id:
            return True

        return WorkspaceMember.objects.filter(
            workspace_id=workspace_id,
            user=request.user
        ).exists()

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        workspace_id = getattr(obj, 'workspace_id', None) or getattr(obj, 'id', None)
        return WorkspaceMember.objects.filter(
            workspace_id=workspace_id,
            user=request.user
        ).exists()


class IsWorkspaceAdmin(permissions.BasePermission):
    """
    Allows access only to members with 'admin' role in the active workspace.
    """
    message = "Administrator privileges are required to perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        workspace_id = get_workspace_id(request, view)
        if not workspace_id:
            return True

        return WorkspaceMember.objects.filter(
            workspace_id=workspace_id,
            user=request.user,
            role=WorkspaceMember.ROLE_ADMIN
        ).exists()

    def has_object_permission(self, request, view, obj):
        workspace_id = getattr(obj, 'workspace_id', None) or getattr(obj, 'id', None)
        return WorkspaceMember.objects.filter(
            workspace_id=workspace_id,
            user=request.user,
            role=WorkspaceMember.ROLE_ADMIN
        ).exists()


class CanManageProject(permissions.BasePermission):
    """
    Allows access to Workspace Admins or Project Managers.
    """
    message = "You must be an Admin or Project Manager to manage projects."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        workspace_id = get_workspace_id(request, view)
        if not workspace_id:
            return True

        return WorkspaceMember.objects.filter(
            workspace_id=workspace_id,
            user=request.user,
            role__in=[WorkspaceMember.ROLE_ADMIN, WorkspaceMember.ROLE_MANAGER]
        ).exists()

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        workspace_id = getattr(obj, 'workspace_id', None)
        return WorkspaceMember.objects.filter(
            workspace_id=workspace_id,
            user=request.user,
            role__in=[WorkspaceMember.ROLE_ADMIN, WorkspaceMember.ROLE_MANAGER]
        ).exists()


class ReadOnlyForViewer(permissions.BasePermission):
    """
    Ensures users with 'viewer' role have read-only access.
    """
    message = "Viewers have read-only access and cannot modify workspace data."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        workspace_id = get_workspace_id(request, view)
        if not workspace_id:
            return True

        # Check if user is a viewer
        is_viewer = WorkspaceMember.objects.filter(
            workspace_id=workspace_id,
            user=request.user,
            role=WorkspaceMember.ROLE_VIEWER
        ).exists()

        return not is_viewer


class CanEditIssues(permissions.BasePermission):
    """
    Allows Admin, PM, or Developer to create and edit issues.
    Viewers have read-only access.
    """
    message = "You do not have permission to edit issues in this workspace."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        workspace_id = get_workspace_id(request, view)
        if not workspace_id:
            return True

        return WorkspaceMember.objects.filter(
            workspace_id=workspace_id,
            user=request.user,
            role__in=[
                WorkspaceMember.ROLE_ADMIN,
                WorkspaceMember.ROLE_MANAGER,
                WorkspaceMember.ROLE_DEVELOPER
            ]
        ).exists()

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        workspace_id = getattr(obj, 'workspace_id', None)
        if not workspace_id and hasattr(obj, 'project'):
            workspace_id = obj.project.workspace_id

        return WorkspaceMember.objects.filter(
            workspace_id=workspace_id,
            user=request.user,
            role__in=[
                WorkspaceMember.ROLE_ADMIN,
                WorkspaceMember.ROLE_MANAGER,
                WorkspaceMember.ROLE_DEVELOPER
            ]
        ).exists()
