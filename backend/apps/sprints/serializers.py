from rest_framework import serializers
from django.db import transaction
from django.db.models import Sum, Q
from django.utils import timezone
from apps.sprints.models import Sprint
from apps.issues.models import Issue
from apps.issues.serializers import IssueListSerializer


class SprintSerializer(serializers.ModelSerializer):
    issue_count = serializers.SerializerMethodField()
    total_points = serializers.SerializerMethodField()
    done_points = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Sprint
        fields = [
            'id', 'project_id', 'name', 'goal', 'start_date', 'end_date',
            'status', 'summary', 'issue_count', 'total_points',
            'done_points', 'progress_percentage', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'project_id', 'created_at', 'updated_at']

    def get_issue_count(self, obj):
        return obj.issues.count()

    def get_total_points(self, obj):
        total = obj.issues.aggregate(pts=Sum('story_points'))['pts']
        return total or 0

    def get_done_points(self, obj):
        done = obj.issues.filter(status='done').aggregate(pts=Sum('story_points'))['pts']
        return done or 0

    def get_progress_percentage(self, obj):
        total = self.get_total_points(obj)
        if not total:
            # If no points, calculate based on issue count
            count = obj.issues.count()
            if count == 0:
                return 0.0
            done_count = obj.issues.filter(status='done').count()
            return round((done_count / count) * 100, 1)
        done = self.get_done_points(obj)
        return round((done / total) * 100, 1)


class SprintDetailSerializer(SprintSerializer):
    issues = IssueListSerializer(many=True, read_only=True)

    class Meta(SprintSerializer.Meta):
        fields = SprintSerializer.Meta.fields + ['issues']


class SprintCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sprint
        fields = ['name', 'goal', 'start_date', 'end_date', 'status', 'summary']

    def validate(self, attrs):
        start = attrs.get('start_date') or (self.instance.start_date if self.instance else None)
        end = attrs.get('end_date') or (self.instance.end_date if self.instance else None)
        if start and end and end < start:
            raise serializers.ValidationError({"end_date": "End date cannot be earlier than start date."})

        # Validate active sprint uniqueness if status is 'active'
        new_status = attrs.get('status')
        if new_status == 'active':
            project = self.context.get('project') or (self.instance.project if self.instance else None)
            if project:
                qs = Sprint.objects.filter(project=project, status='active')
                if self.instance:
                    qs = qs.exclude(pk=self.instance.pk)
                if qs.exists():
                    raise serializers.ValidationError(
                        {"status": "Another sprint is already active in this project."}
                    )

        return attrs

    def create(self, validated_data):
        project = self.context['project']
        return Sprint.objects.create(project=project, **validated_data)


class SprintCompleteSerializer(serializers.Serializer):
    unfinished_issues_destination = serializers.ChoiceField(
        choices=['backlog', 'sprint'],
        default='backlog'
    )
    target_sprint_id = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, attrs):
        dest = attrs.get('unfinished_issues_destination')
        target_id = attrs.get('target_sprint_id')
        sprint = self.context['sprint']

        if dest == 'sprint':
            if not target_id:
                raise serializers.ValidationError(
                    {"target_sprint_id": "Target sprint is required when moving issues to another sprint."}
                )
            try:
                target_sprint = Sprint.objects.get(id=target_id, project=sprint.project)
                if target_sprint.id == sprint.id:
                    raise serializers.ValidationError(
                        {"target_sprint_id": "Target sprint cannot be the sprint being completed."}
                    )
                if target_sprint.status == 'completed':
                    raise serializers.ValidationError(
                        {"target_sprint_id": "Cannot move issues to an already completed sprint."}
                    )
                attrs['target_sprint_obj'] = target_sprint
            except Sprint.DoesNotExist:
                raise serializers.ValidationError(
                    {"target_sprint_id": "Target sprint not found in this project."}
                )
        return attrs


class SprintIssueAssignSerializer(serializers.Serializer):
    issue_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False
    )

