from django.db import models
from django.conf import settings
from django.utils import timezone


class AIRequestLog(models.Model):
    FEATURE_STORIES = 'stories'
    FEATURE_TASKS = 'tasks'
    FEATURE_CRITERIA = 'criteria'
    FEATURE_BUG = 'bug'
    FEATURE_SPRINT_SUMMARY = 'sprint_summary'

    FEATURE_CHOICES = (
        (FEATURE_STORIES, 'Requirements to Stories'),
        (FEATURE_TASKS, 'Task Breakdown'),
        (FEATURE_CRITERIA, 'Acceptance Criteria'),
        (FEATURE_BUG, 'Bug Analysis'),
        (FEATURE_SPRINT_SUMMARY, 'Sprint Summary'),
    )

    STATUS_SUCCESS = 'success'
    STATUS_ERROR = 'error'
    STATUS_TIMEOUT = 'timeout'
    STATUS_RATE_LIMITED = 'rate_limited'

    STATUS_CHOICES = (
        (STATUS_SUCCESS, 'Success'),
        (STATUS_ERROR, 'Error'),
        (STATUS_TIMEOUT, 'Timeout'),
        (STATUS_RATE_LIMITED, 'Rate Limited'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='ai_request_logs'
    )
    feature = models.CharField(max_length=30, choices=FEATURE_CHOICES, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SUCCESS)
    latency_ms = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = 'ai_request_logs'
        ordering = ['-created_at']

    def __str__(self):
        user_name = self.user.name if self.user else 'Anonymous'
        return f"AI [{self.feature}] - {self.status} ({self.latency_ms}ms) by {user_name}"

