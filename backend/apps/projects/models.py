from django.db import models
from django.utils import timezone
from apps.workspaces.models import Workspace


class Project(models.Model):
    METHODOLOGY_SCRUM = 'scrum'
    METHODOLOGY_KANBAN = 'kanban'

    METHODOLOGY_CHOICES = (
        (METHODOLOGY_SCRUM, 'Scrum'),
        (METHODOLOGY_KANBAN, 'Kanban'),
    )

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='projects'
    )
    name = models.CharField(max_length=120)
    key = models.CharField(max_length=10)
    description = models.TextField(blank=True, default='')
    methodology = models.CharField(
        max_length=10,
        choices=METHODOLOGY_CHOICES,
        default=METHODOLOGY_SCRUM
    )
    issue_counter = models.IntegerField(default=0)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'projects'
        constraints = [
            models.UniqueConstraint(
                fields=['workspace', 'key'],
                name='unique_project_key_per_workspace'
            )
        ]
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if self.key:
            self.key = self.key.upper().strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.key})"
