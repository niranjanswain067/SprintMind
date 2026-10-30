from typing import List, Optional
from pydantic import BaseModel, Field


class StoryDraft(BaseModel):
    title: str = Field(description="Actionable user story title")
    description: str = Field(description="Story description in 'As a... I want to... so that...' format")
    acceptance_criteria: List[str] = Field(default_factory=list, description="Testable bullet points")
    story_points: Optional[int] = Field(default=3, description="Estimated story points (e.g. 1, 2, 3, 5, 8)")


class StoriesResponse(BaseModel):
    drafts: List[StoryDraft] = Field(description="List of proposed user story drafts")
    disclaimer: Optional[str] = Field(
        default="✨ AI-generated draft. Review, edit, or discard before saving."
    )


class TaskDraft(BaseModel):
    title: str = Field(description="Actionable sub-task title")
    estimated_points: Optional[int] = Field(default=1, description="Estimated points (e.g. 1, 2, 3)")


class TasksResponse(BaseModel):
    tasks: List[TaskDraft] = Field(description="Actionable engineering sub-tasks breakdown")


class CriteriaResponse(BaseModel):
    criteria: List[str] = Field(description="List of testable acceptance criteria bullet points")


class BugAnalysisResponse(BaseModel):
    enhanced_summary: str = Field(description="Clear, refined technical bug summary")
    suggested_severity: str = Field(description="Suggested severity: low, medium, high, or critical")
    missing_information: List[str] = Field(
        default_factory=list,
        description="Missing context, reproduction steps, or environment details"
    )


class SprintSummaryResponse(BaseModel):
    summary_draft: str = Field(description="Executive summary and release notes for sprint closure")

