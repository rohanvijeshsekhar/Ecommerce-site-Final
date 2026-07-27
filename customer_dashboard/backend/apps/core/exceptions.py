"""
Custom exception handler for DRF.
Wraps all API errors in the standardized FAAZO response format.
"""

import logging

from rest_framework.views import exception_handler
from rest_framework import status

logger = logging.getLogger('apps.core')


def custom_exception_handler(exc, context):
    """
    Custom exception handler that wraps DRF exceptions
    into the standardized FAAZO response format:
    {success: bool, message: str, data: any, errors: dict}
    """
    response = exception_handler(exc, context)

    if response is not None:
        # Determine the error message
        if isinstance(response.data, dict):
            if 'detail' in response.data:
                message = str(response.data['detail'])
                errors = {'detail': message}
            else:
                message = 'Validation failed.'
                errors = response.data
        elif isinstance(response.data, list):
            message = str(response.data[0]) if response.data else 'An error occurred.'
            errors = {'detail': response.data}
        else:
            message = str(response.data)
            errors = {'detail': message}

        response.data = {
            'success': False,
            'message': message,
            'data': None,
            'errors': errors,
        }

        # Log server errors
        if response.status_code >= 500:
            view_name = 'Unknown'
            if context.get('view'):
                view_name = context['view'].__class__.__name__
            logger.error(
                f'Server error: {message}',
                extra={
                    'status_code': response.status_code,
                    'view': view_name,
                },
                exc_info=True,
            )

    return response
