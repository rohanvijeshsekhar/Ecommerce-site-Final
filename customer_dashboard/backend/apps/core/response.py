"""
Standardized API response format for all FAAZO endpoints.
Ensures consistent JSON structure across the entire API.
"""

from rest_framework.response import Response
from rest_framework import status


def success_response(data=None, message='Success', status_code=status.HTTP_200_OK):
    """Return a standardized success response."""
    return Response(
        {
            'success': True,
            'message': message,
            'data': data,
            'errors': None,
        },
        status=status_code,
    )


def error_response(message='An error occurred', errors=None, status_code=status.HTTP_400_BAD_REQUEST):
    """Return a standardized error response."""
    return Response(
        {
            'success': False,
            'message': message,
            'data': None,
            'errors': errors,
        },
        status=status_code,
    )


def created_response(data=None, message='Created successfully'):
    """Return a standardized 201 Created response."""
    return success_response(data=data, message=message, status_code=status.HTTP_201_CREATED)
