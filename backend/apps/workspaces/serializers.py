from rest_framework import serializers
from apps.workspaces.models import Workspace, WorkspaceMember


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    name = serializers.CharField(source='user.name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = WorkspaceMember
        fields = ('id', 'user_id', 'name', 'email', 'role', 'joined_at')
        read_only_fields = ('id', 'user_id', 'name', 'email', 'joined_at')


class WorkspaceSerializer(serializers.ModelSerializer):
    owner_id = serializers.IntegerField(source='owner.id', read_only=True)
    owner_name = serializers.CharField(source='owner.name', read_only=True)
    current_user_role = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = ('id', 'name', 'owner_id', 'owner_name', 'created_at', 'current_user_role')
        read_only_fields = ('id', 'owner_id', 'owner_name', 'created_at')

    def get_current_user_role(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        membership = WorkspaceMember.objects.filter(workspace=obj, user=request.user).first()
        return membership.role if membership else None


class WorkspaceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ('name',)

    def validate_name(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError('Workspace name cannot be empty.')
        return cleaned


class WorkspaceMemberInviteSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    role = serializers.ChoiceField(choices=WorkspaceMember.ROLE_CHOICES, default=WorkspaceMember.ROLE_DEVELOPER)

    def validate_email(self, value):
        return value.lower().strip()


class WorkspaceMemberRoleUpdateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=WorkspaceMember.ROLE_CHOICES, required=True)
