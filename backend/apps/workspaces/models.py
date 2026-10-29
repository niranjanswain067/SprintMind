from django.db import models
from django.conf import settings
from django.utils import timezone


class Workspace(models.Model):
    name = models.CharField(max_length=120)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_workspaces'
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workspaces'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class WorkspaceMember(models.Model):
    ROLE_ADMIN = 'admin'
    ROLE_MANAGER = 'manager'
    ROLE_DEVELOPER = 'developer'
    ROLE_VIEWER = 'viewer'

    ROLE_CHOICES = (
        (ROLE_ADMIN, 'Admin'),
        (ROLE_MANAGER, 'Project Manager'),
        (ROLE_DEVELOPER, 'Developer'),
        (ROLE_VIEWER, 'Viewer'),
    )

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='members'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='workspace_memberships'
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_DEVELOPER
    )
    joined_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'workspace_members'
        unique_together = ('workspace', 'user')
        ordering = ['joined_at']

    def __str__(self):
        return f"{self.user.name} ({self.role}) in {self.workspace.name}"
