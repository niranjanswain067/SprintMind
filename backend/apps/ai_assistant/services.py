import time
import json
import logging
from django.conf import settings
from django.utils import timezone
import groq

from apps.ai_assistant.models import AIRequestLog
from apps.ai_assistant.schemas import (
    StoriesResponse,
    TasksResponse,
    CriteriaResponse,
    BugAnalysisResponse,
    SprintSummaryResponse,
)
from apps.ai_assistant.prompts import (
    STORIES_SYSTEM_PROMPT,
    TASKS_SYSTEM_PROMPT,
    CRITERIA_SYSTEM_PROMPT,
    BUG_ANALYSIS_SYSTEM_PROMPT,
    SPRINT_SUMMARY_SYSTEM_PROMPT,
)
from apps.ai_assistant.exceptions import (
    AITimeoutException,
    AIRateLimitedException,
    AIInvalidOutputException,
    AIUnavailableException,
)

logger = logging.getLogger(__name__)

MAX_INPUT_LENGTH = 4000


class GroqAIService:
    def __init__(self):
        self.api_key = getattr(settings, 'GROQ_API_KEY', '') or ''
        self.model = getattr(settings, 'GROQ_MODEL', 'llama-3.3-70b-versatile')
        self.timeout = getattr(settings, 'AI_TIMEOUT_SECONDS', 30)

    def _get_client(self):
        if not self.api_key or self.api_key.startswith('gsk_your_groq_api_key'):
            raise AIUnavailableException(
                "Groq API key is not configured. Please set GROQ_API_KEY in your environment."
            )
        return groq.Groq(api_key=self.api_key, timeout=self.timeout)

    def _execute_prompt(self, feature, system_prompt, user_content, schema_class, user=None):
        if len(user_content) > MAX_INPUT_LENGTH:
            user_content = user_content[:MAX_INPUT_LENGTH]

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]

        start_time = time.time()
        status_result = AIRequestLog.STATUS_ERROR

        try:
            client = self._get_client()

            # Attempt initial call + up to 1 retry on malformed JSON
            last_parse_err = None
            for attempt in range(2):
                try:
                    completion = client.chat.completions.create(
                        model=self.model,
                        messages=messages,
                        response_format={"type": "json_object"},
                        temperature=0.2,
                    )
                    raw_text = completion.choices[0].message.content
                    if not raw_text:
                        raise ValueError("Empty response from Groq API")

                    # Parse & validate with Pydantic schema
                    validated_output = schema_class.model_validate_json(raw_text)
                    status_result = AIRequestLog.STATUS_SUCCESS
                    return validated_output.model_dump()
                except (groq.APITimeoutError, groq.RateLimitError, groq.APIConnectionError, groq.InternalServerError):
                    raise
                except (json.JSONDecodeError, ValueError, Exception) as e:
                    last_parse_err = e
                    if attempt == 0:
                        logger.warning(f"Groq output parse attempt 1 failed ({e}). Retrying...")
                        continue
                    raise AIInvalidOutputException(f"Failed to parse structured AI output: {str(e)}")

        except groq.APITimeoutError:
            status_result = AIRequestLog.STATUS_TIMEOUT
            raise AITimeoutException()
        except groq.RateLimitError:
            status_result = AIRequestLog.STATUS_RATE_LIMITED
            raise AIRateLimitedException()
        except (groq.APIConnectionError, groq.InternalServerError) as e:
            status_result = AIRequestLog.STATUS_ERROR
            raise AIUnavailableException(f"Groq service error: {str(e)}")
        except AIUnavailableException:
            status_result = AIRequestLog.STATUS_ERROR
            raise
        except (AIInvalidOutputException, AITimeoutException, AIRateLimitedException):
            raise
        except Exception as e:
            status_result = AIRequestLog.STATUS_ERROR
            logger.error(f"Unexpected AI error: {e}", exc_info=True)
            raise AIInvalidOutputException(f"Unexpected error while processing AI request: {str(e)}")
        finally:
            latency_ms = int((time.time() - start_time) * 1000)
            try:
                AIRequestLog.objects.create(
                    user=user if user and user.is_authenticated else None,
                    feature=feature,
                    status=status_result,
                    latency_ms=latency_ms,
                )
            except Exception as log_err:
                logger.error(f"Failed to write AI audit log: {log_err}")

    def generate_stories(self, requirements, user=None):
        return self._execute_prompt(
            feature=AIRequestLog.FEATURE_STORIES,
            system_prompt=STORIES_SYSTEM_PROMPT,
            user_content=f"Requirements:\n{requirements}",
            schema_class=StoriesResponse,
            user=user,
        )

    def generate_tasks(self, story_title, story_description, user=None):
        user_content = f"Story Title: {story_title}\nStory Description:\n{story_description}"
        return self._execute_prompt(
            feature=AIRequestLog.FEATURE_TASKS,
            system_prompt=TASKS_SYSTEM_PROMPT,
            user_content=user_content,
            schema_class=TasksResponse,
            user=user,
        )

    def generate_criteria(self, title, description, user=None):
        user_content = f"Feature Title: {title}\nFeature Description:\n{description}"
        return self._execute_prompt(
            feature=AIRequestLog.FEATURE_CRITERIA,
            system_prompt=CRITERIA_SYSTEM_PROMPT,
            user_content=user_content,
            schema_class=CriteriaResponse,
            user=user,
        )

    def analyze_bug(self, title, description, user=None):
        user_content = f"Bug Title: {title}\nBug Description:\n{description}"
        return self._execute_prompt(
            feature=AIRequestLog.FEATURE_BUG,
            system_prompt=BUG_ANALYSIS_SYSTEM_PROMPT,
            user_content=user_content,
            schema_class=BugAnalysisResponse,
            user=user,
        )

    def generate_sprint_summary(
        self,
        sprint_name,
        completed_issues,
        incomplete_issues,
        completed_points,
        total_points,
        user=None,
    ):
        user_content = (
            f"Sprint Name: {sprint_name}\n"
            f"Real Metrics:\n"
            f"- Completed Issues: {completed_issues}\n"
            f"- Incomplete Issues: {incomplete_issues}\n"
            f"- Completed Story Points (Velocity): {completed_points}\n"
            f"- Total Committed Story Points: {total_points}\n"
        )
        return self._execute_prompt(
            feature=AIRequestLog.FEATURE_SPRINT_SUMMARY,
            system_prompt=SPRINT_SUMMARY_SYSTEM_PROMPT,
            user_content=user_content,
            schema_class=SprintSummaryResponse,
            user=user,
        )
