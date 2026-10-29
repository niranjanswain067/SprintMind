from django.urls import path
from apps.workspaces.views import (
    WorkspaceListCreateView,
    WorkspaceDetailView,
    WorkspaceMemberListCreateView,
    WorkspaceMemberDetailView,
)

urlpatterns = [
    path('', WorkspaceListCreateView.as_view(), name='workspace-list-create'),
    path('<int:pk>/', WorkspaceDetailView.as_view(), name='workspace-detail'),
    path('<int:pk>/members/', WorkspaceMemberListCreateView.as_view(), name='workspace-members-list-create'),
    path('<int:pk>/members/<int:user_id>/', WorkspaceMemberDetailView.as_view(), name='workspace-member-detail'),
]
