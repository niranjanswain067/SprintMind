class AIAssistantException(Exception):
    """Base exception for AI Assistant errors."""
    code = "ai_error"
    message = "An error occurred while generating AI draft."

    def __init__(self, message=None):
        if message:
            self.message = message
        super().__init__(self.message)


class AITimeoutException(AIAssistantException):
    code = "ai_timeout"
    message = "AI service request timed out after 30 seconds. Please try again."


class AIRateLimitedException(AIAssistantException):
    code = "ai_rate_limited"
    message = "AI assistant rate limit reached. Please wait before making more requests."


class AIInvalidOutputException(AIAssistantException):
    code = "ai_invalid_output"
    message = "AI service returned an invalid structured output. Please retry."


class AIUnavailableException(AIAssistantException):
    code = "ai_unavailable"
    message = "AI assistant service is currently unavailable. Please verify API configuration."

