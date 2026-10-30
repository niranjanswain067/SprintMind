from django.urls import path
from apps.projects.views import (
    ProjectListCreateView,
    ProjectDetailView,
    ProjectArchiveView,
)
from apps.issues.views import (
    ProjectIssueListCreateView,
    ProjectBacklogListView,
    ProjectBacklogReorderView,
    ProjectIssueBulkCreateView,
)
from apps.sprints.views import ProjectSprintListCreateView
from apps.reports.views import ProjectBoardView, ProjectDashboardView

urlpatterns = [
    path('', ProjectListCreateView.as_view(), name='project-list-create'),
    path('<int:pk>/', ProjectDetailView.as_view(), name='project-detail'),
    path('<int:pk>/archive/', ProjectArchiveView.as_view(), name='project-archive'),

    # Phase 2: Issues and Backlog
    path('<int:id>/issues/', ProjectIssueListCreateView.as_view(), name='project-issue-list-create'),
    path('<int:id>/issues/bulk-create/', ProjectIssueBulkCreateView.as_view(), name='project-issue-bulk-create'),
    path('<int:id>/backlog/', ProjectBacklogListView.as_view(), name='project-backlog-list'),
    path('<int:id>/backlog/reorder/', ProjectBacklogReorderView.as_view(), name='project-backlog-reorder'),

    # Phase 3: Sprints, Board & Dashboard
    path('<int:id>/sprints/', ProjectSprintListCreateView.as_view(), name='project-sprint-list-create'),
    path('<int:id>/board/', ProjectBoardView.as_view(), name='project-board'),
    path('<int:id>/dashboard/', ProjectDashboardView.as_view(), name='project-dashboard'),
]
