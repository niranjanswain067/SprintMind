from django.urls import path
from apps.sprints.views import (
    SprintDetailView,
    SprintStartView,
    SprintCompleteView,
    SprintIssuesAddView,
    SprintIssueRemoveView,
    SprintReportView,
)

urlpatterns = [
    path('<int:pk>/', SprintDetailView.as_view(), name='sprint-detail'),
    path('<int:id>/start/', SprintStartView.as_view(), name='sprint-start'),
    path('<int:id>/complete/', SprintCompleteView.as_view(), name='sprint-complete'),
    path('<int:id>/issues/', SprintIssuesAddView.as_view(), name='sprint-issues-add'),
    path('<int:id>/issues/<int:issue_id>/', SprintIssueRemoveView.as_view(), name='sprint-issue-remove'),
    path('<int:id>/report/', SprintReportView.as_view(), name='sprint-report'),
]

