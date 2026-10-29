from django.urls import path
from apps.issues.views import (
    IssueDetailView,
    IssueMoveView,
    IssueCommentListCreateView,
    IssueActivityListView,
)

urlpatterns = [
    path('<int:pk>/', IssueDetailView.as_view(), name='issue-detail'),
    path('<int:pk>/move/', IssueMoveView.as_view(), name='issue-move'),
    path('<int:pk>/comments/', IssueCommentListCreateView.as_view(), name='issue-comments'),
    path('<int:pk>/activity/', IssueActivityListView.as_view(), name='issue-activity'),
]

