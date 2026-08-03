"""
Abstract Base Provider for OTP Delivery.
Allows pluggable Email and SMS providers (e.g. Sangamam, Twilio, Mock).
"""

from abc import ABC, abstractmethod


class BaseOTPProvider(ABC):
    """
    Interface for OTP Delivery Providers.
    """

    @abstractmethod
    def send_otp(self, target: str, otp_code: str, purpose: str = "registration") -> bool:
        """
        Send OTP to target (email or phone).
        Returns True if successfully dispatched, False otherwise.
        """
        pass
