from rest_framework import serializers
from django.db import transaction
from django.db.models import Max
from decimal import Decimal
from apps.accounts.models import User
from apps.projects.models import Project
from apps.sprints.models import Sprint
from apps.issues.models import Issue, Comment, ActivityLog


class UserSummarySerializer(serializers.ModelSerializer):
    initials = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'initials']

    def get_initials(self, obj):
        if not obj.name:
            return ""
        parts = obj.name.strip().split()
        if len(parts) >= 2:
            return f"{parts[0][0]}{parts[1][0]}".upper()
        return obj.name[:2].upper()


class CommentSerializer(serializers.ModelSerializer):
    author = UserSummarySerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'issue_id', 'author', 'body', 'created_at']
        read_only_fields = ['id', 'issue_id', 'author', 'created_at']


class ActivityLogSerializer(serializers.ModelSerializer):
    actor = UserSummarySerializer(read_only=True)

    class Meta:
        model = ActivityLog
        fields = ['id', 'issue_id', 'actor', 'action', 'detail', 'created_at']
        read_only_fields = ['id', 'issue_id', 'actor', 'created_at']


class SubtaskSummarySerializer(serializers.ModelSerializer):
    key = serializers.CharField(read_only=True)
    assignee = UserSummarySerializer(read_only=True)

    class Meta:
        model = Issue
        fields = [
            'id', 'key', 'number', 'type', 'title', 'status',
            'priority', 'story_points', 'assignee', 'due_date'
        ]


class IssueListSerializer(serializers.ModelSerializer):
    key = serializers.CharField(read_only=True)
    assignee = UserSummarySerializer(read_only=True)
    reporter = UserSummarySerializer(read_only=True)
    subtask_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    parent_key = serializers.SerializerMethodField()

    class Meta:
        model = Issue
        fields = [
            'id', 'key', 'number', 'project_id', 'type', 'title',
            'description', 'acceptance_criteria', 'status', 'priority',
            'story_points', 'assignee', 'reporter', 'parent_id', 'parent_key',
            'sprint_id', 'rank', 'due_date', 'subtask_count', 'comment_count',
            'created_at', 'updated_at'
        ]

    def get_subtask_count(self, obj):
        return getattr(obj, 'subtask_count', obj.subtasks.count())

    def get_comment_count(self, obj):
        return getattr(obj, 'comment_count', obj.comments.count())

    def get_parent_key(self, obj):
        if obj.parent_id and obj.parent:
            return obj.parent.key
        return None


class IssueDetailSerializer(serializers.ModelSerializer):
    key = serializers.CharField(read_only=True)
    assignee = UserSummarySerializer(read_only=True)
    reporter = UserSummarySerializer(read_only=True)
    subtasks = SubtaskSummarySerializer(many=True, read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    activity_logs = ActivityLogSerializer(many=True, read_only=True)
    parent_key = serializers.SerializerMethodField()

    class Meta:
        model = Issue
        fields = [
            'id', 'key', 'number', 'project_id', 'type', 'title',
            'description', 'acceptance_criteria', 'status', 'priority',
            'story_points', 'assignee', 'reporter', 'parent_id', 'parent_key',
            'sprint_id', 'rank', 'due_date', 'subtasks', 'comments',
            'activity_logs', 'created_at', 'updated_at'
        ]

    def get_parent_key(self, obj):
        if obj.parent_id and obj.parent:
            return obj.parent.key
        return None


class IssueCreateUpdateSerializer(serializers.ModelSerializer):
    assignee_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='assignee',
        required=False,
        allow_null=True
    )
    parent_id = serializers.PrimaryKeyRelatedField(
        queryset=Issue.objects.all(),
        source='parent',
        required=False,
        allow_null=True
    )
    sprint_id = serializers.PrimaryKeyRelatedField(
        queryset=Sprint.objects.all(),
        source='sprint',
        required=False,
        allow_null=True
    )

    class Meta:
        model = Issue
        fields = [
            'type', 'title', 'description', 'acceptance_criteria',
            'status', 'priority', 'story_points', 'assignee_id',
            'parent_id', 'sprint_id', 'due_date', 'rank'
        ]
        extra_kwargs = {
            'title': {'required': True},
            'rank': {'required': False},
        }

    def validate_story_points(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Story points cannot be negative.")
        return value

    def create(self, validated_data):
        project = self.context['project']
        reporter = self.context['reporter']

        with transaction.atomic():
            # Concurrently safe atomic issue number generation
            locked_project = Project.objects.select_for_update().get(id=project.id)
            locked_project.issue_counter += 1
            locked_project.save(update_fields=['issue_counter'])
            new_number = locked_project.issue_counter

            # Calculate rank if not provided: highest rank + 1000
            if 'rank' not in validated_data or validated_data['rank'] is None:
                max_rank = Issue.objects.filter(project=locked_project).aggregate(Max('rank'))['rank__max']
                if max_rank is not None:
                    validated_data['rank'] = Decimal(str(max_rank)) + Decimal('1000.0')
                else:
                    validated_data['rank'] = Decimal('1000.0')

            issue = Issue.objects.create(
                project=locked_project,
                number=new_number,
                reporter=reporter,
                **validated_data
            )

            ActivityLog.objects.create(
                issue=issue,
                actor=reporter,
                action='created',
                detail={'title': issue.title, 'type': issue.type}
            )

            return issue

    def update(self, instance, validated_data):
        actor = self.context.get('actor')
        changes = {}

        track_fields = ['title', 'status', 'priority', 'story_points', 'assignee', 'sprint', 'due_date', 'type']
        for field in track_fields:
            if field in validated_data:
                old_val = getattr(instance, field)
                new_val = validated_data[field]
                if old_val != new_val:
                    changes[field] = {
                        'old': str(old_val.id if hasattr(old_val, 'id') else old_val),
                        'new': str(new_val.id if hasattr(new_val, 'id') else new_val)
                    }

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if changes:
            action_desc = 'updated'
            if 'status' in changes and len(changes) == 1:
                action_desc = 'status_changed'
            elif 'assignee' in changes and len(changes) == 1:
                action_desc = 'assignee_changed'

            ActivityLog.objects.create(
                issue=instance,
                actor=actor,
                action=action_desc,
                detail=changes
            )

        return instance


class IssueMoveSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Issue.STATUS_CHOICES)
    rank = serializers.DecimalField(max_digits=15, decimal_places=6)


class BacklogReorderSerializer(serializers.Serializer):
    issue_id = serializers.IntegerField()
    prev_issue_id = serializers.IntegerField(required=False, allow_null=True)
    next_issue_id = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, attrs):
        project = self.context['project']
        issue_id = attrs['issue_id']
        try:
            issue = Issue.objects.get(id=issue_id, project=project)
        except Issue.DoesNotExist:
            raise serializers.ValidationError({"issue_id": "Issue not found in this project."})
        attrs['issue_obj'] = issue

        prev_id = attrs.get('prev_issue_id')
        if prev_id:
            try:
                attrs['prev_issue_obj'] = Issue.objects.get(id=prev_id, project=project)
            except Issue.DoesNotExist:
                raise serializers.ValidationError({"prev_issue_id": "Previous issue not found."})
        else:
            attrs['prev_issue_obj'] = None

        next_id = attrs.get('next_issue_id')
        if next_id:
            try:
                attrs['next_issue_obj'] = Issue.objects.get(id=next_id, project=project)
            except Issue.DoesNotExist:
                raise serializers.ValidationError({"next_issue_id": "Next issue not found."})
        else:
            attrs['next_issue_obj'] = None

        return attrs

    def save(self):
        issue = self.validated_data['issue_obj']
        prev_issue = self.validated_data['prev_issue_obj']
        next_issue = self.validated_data['next_issue_obj']

        if prev_issue and next_issue:
            # Midpoint between prev and next
            new_rank = (prev_issue.rank + next_issue.rank) / Decimal('2.0')
        elif prev_issue and not next_issue:
            # Placed at the bottom
            new_rank = prev_issue.rank + Decimal('1000.0')
        elif not prev_issue and next_issue:
            # Placed at the very top
            new_rank = next_issue.rank / Decimal('2.0')
        else:
            new_rank = Decimal('1000.0')

        issue.rank = new_rank
        issue.save(update_fields=['rank'])
        return issue

