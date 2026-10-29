import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import (
    ValidationError,
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied,
    NotFound,
    Throttled,
)


logger = logging.getLogger(__name__)

CODE_MAP = {
    400: 'bad_request',
    401: 'authentication_failed',
    403: 'permission_denied',
    404: 'not_found',
    405: 'method_not_allowed',
    409: 'conflict',
    429: 'rate_limited',
    500: 'internal_server_error',
    502: 'bad_gateway',
    504: 'gateway_timeout',
}


def custom_exception_handler(exc, context):
    """
    Standard JSON error envelope handler for SprintMind API:
    {
      "error": {
        "code": "permission_denied",
        "message": "Human readable summary",
        "details": {}
      }
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        status_code = response.status_code
        default_code = CODE_MAP.get(status_code, 'api_error')

        # Determine error code
        if isinstance(exc, ValidationError):
            code = 'validation_error'
            message = 'Request validation failed.'
            details = response.data
        elif isinstance(exc, (AuthenticationFailed, NotAuthenticated)):
            code = 'authentication_failed'
            message = str(response.data.get('detail', 'Authentication credentials were not provided or are invalid.'))
            details = response.data if isinstance(response.data, dict) else {'detail': response.data}
        elif isinstance(exc, PermissionDenied):
            code = 'permission_denied'
            message = str(response.data.get('detail', 'You do not have access to perform this action.'))
            details = response.data if isinstance(response.data, dict) else {'detail': response.data}
        elif isinstance(exc, NotFound):
            code = 'not_found'
            message = str(response.data.get('detail', 'The requested resource was not found.'))
            details = response.data if isinstance(response.data, dict) else {'detail': response.data}
        elif isinstance(exc, Throttled):
            code = 'rate_limited'
            message = str(response.data.get('detail', 'Request limit exceeded. Please try again later.'))
            details = response.data if isinstance(response.data, dict) else {'detail': response.data}
        else:
            code = getattr(exc, 'default_code', default_code)
            if isinstance(response.data, dict) and 'detail' in response.data:
                message = str(response.data['detail'])
                details = response.data
            else:
                message = str(exc) if str(exc) else 'An error occurred processing the request.'
                details = response.data

        response.data = {
            'error': {
                'code': str(code),
                'message': message,
                'details': details
            }
        }
        return response

    # Unhandled exceptions (500 Internal Server Error)
    logger.exception("Unhandled Exception: %s", exc, extra={'context': context})
    return Response(
        {
            'error': {
                'code': 'internal_server_error',
                'message': 'An unexpected error occurred on the server.',
                'details': {}
            }
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
