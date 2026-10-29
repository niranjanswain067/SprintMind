from rest_framework import serializers
from apps.projects.models import Project
from apps.workspaces.models import Workspace


class ProjectSerializer(serializers.ModelSerializer):
    workspace_id = serializers.IntegerField(source='workspace.id', read_only=True)

    class Meta:
        model = Project
        fields = (
            'id',
            'workspace_id',
            'name',
            'key',
            'description',
            'methodology',
            'issue_counter',
            'is_archived',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'workspace_id', 'issue_counter', 'created_at', 'updated_at')


class ProjectCreateSerializer(serializers.ModelSerializer):
    workspace_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Project
        fields = ('workspace_id', 'name', 'key', 'description', 'methodology')

    def validate_key(self, value):
        cleaned = value.strip().upper()
        if not cleaned.isalnum():
            raise serializers.ValidationError('Project key must be alphanumeric (e.g. SM, PROJ1).')
        if len(cleaned) < 2 or len(cleaned) > 10:
            raise serializers.ValidationError('Project key must be between 2 and 10 characters.')
        return cleaned

    def validate(self, attrs):
        workspace_id = attrs.get('workspace_id')
        key = attrs.get('key')

        if not Workspace.objects.filter(id=workspace_id).exists():
            raise serializers.ValidationError({'workspace_id': 'Workspace does not exist.'})

        if Project.objects.filter(workspace_id=workspace_id, key=key).exists():
            raise serializers.ValidationError({'key': f"Project key '{key}' already exists in this workspace."})

        return attrs


class ProjectUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ('name', 'description')
