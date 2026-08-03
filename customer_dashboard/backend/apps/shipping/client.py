"""
FAAZO – Shipping API Client Facade (Backward Compatibility Layer)

Re-exports ShiprocketAPIClient and custom exceptions for backward compatibility.
All logistics HTTP calls are handled via shiprocket_client.py.
"""

from .shiprocket_client import (
    ShiprocketAPIClient,
    ShiprocketAPIError,
    ShiprocketValidationError,
    CircuitBreakerOpenError,
    DelhiveryAPIError,
    DelhiveryValidationError,
    circuit_breaker,
)

# Alias for legacy references
DelhiveryAPIClient = ShiprocketAPIClient
