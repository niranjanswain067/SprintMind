from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.projects.models import Project


class Issue(models.Model):
    TYPE_EPIC = 'epic'
    TYPE_STORY = 'story'
    TYPE_TASK = 'task'
    TYPE_BUG = 'bug'

    TYPE_CHOICES = (
        (TYPE_EPIC, 'Epic'),
        (TYPE_STORY, 'Story'),
        (TYPE_TASK, 'Task'),
        (TYPE_BUG, 'Bug'),
    )

    STATUS_TODO = 'todo'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_IN_REVIEW = 'in_review'
    STATUS_DONE = 'done'

    STATUS_CHOICES = (
        (STATUS_TODO, 'To Do'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_IN_REVIEW, 'In Review'),
        (STATUS_DONE, 'Done'),
    )

    PRIORITY_LOW = 'low'
    PRIORITY_MEDIUM = 'medium'
    PRIORITY_HIGH = 'high'
    PRIORITY_CRITICAL = 'critical'

    PRIORITY_CHOICES = (
        (PRIORITY_LOW, 'Low'),
        (PRIORITY_MEDIUM, 'Medium'),
        (PRIORITY_HIGH, 'High'),
        (PRIORITY_CRITICAL, 'Critical'),
    )

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='issues'
    )
    number = models.IntegerField()
    type = models.CharField(
        max_length=10,
        choices=TYPE_CHOICES,
        default=TYPE_STORY
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    acceptance_criteria = models.TextField(blank=True, default='')
    status = models.CharField(
        max_length=12,
        choices=STATUS_CHOICES,
        default=STATUS_TODO,
        db_index=True
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default=PRIORITY_MEDIUM
    )
    story_points = models.SmallIntegerField(null=True, blank=True)
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='assigned_issues'
    )
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='reported_issues'
    )
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='subtasks'
    )
    sprint = models.ForeignKey(
        'sprints.Sprint',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='issues'
    )
    rank = models.DecimalField(
        max_digits=15,
        decimal_places=6,
        default=1000.000000,
        db_index=True
    )
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'issues'
        ordering = ['rank', 'number']
        constraints = [
            models.UniqueConstraint(
                fields=['project', 'number'],
                name='unique_issue_number_per_project'
            )
        ]
        indexes = [
            models.Index(fields=['project', 'status'], name='idx_issue_proj_status'),
            models.Index(fields=['project', 'sprint'], name='idx_issue_proj_sprint'),
            models.Index(fields=['assignee'], name='idx_issue_assignee'),
            models.Index(fields=['project', 'due_date'], name='idx_issue_proj_duedate'),
        ]

    @property
    def key(self):
        return f"{self.project.key}-{self.number}"

    def __str__(self):
        return f"{self.key}: {self.title}"


class Comment(models.Model):
    issue = models.ForeignKey(
        Issue,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='issue_comments'
    )
    body = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'comments'
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author.name} on {self.issue.key}"


class ActivityLog(models.Model):
    issue = models.ForeignKey(
        Issue,
        on_delete=models.CASCADE,
        related_name='activity_logs'
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='issue_activities'
    )
    action = models.CharField(max_length=50)
    detail = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'activity_logs'
        ordering = ['-created_at']

    def __str__(self):
        actor_name = self.actor.name if self.actor else 'System'
        return f"{actor_name} {self.action} on {self.issue.key}"

