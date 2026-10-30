from django.urls import path
from apps.ai_assistant.views import (
    AIStoriesView,
    AITasksView,
    AICriteriaView,
    AIBugAnalysisView,
    AISprintSummaryView,
)

urlpatterns = [
    path('stories/', AIStoriesView.as_view(), name='ai-stories'),
    path('tasks/', AITasksView.as_view(), name='ai-tasks'),
    path('criteria/', AICriteriaView.as_view(), name='ai-criteria'),
    path('bug-analysis/', AIBugAnalysisView.as_view(), name='ai-bug-analysis'),
    path('sprint-summary/', AISprintSummaryView.as_view(), name='ai-sprint-summary'),
]

