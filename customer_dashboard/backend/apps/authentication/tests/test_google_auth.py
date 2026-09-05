"""
FAAZO – Google OAuth 2.0 Integration Test Suite

Tests:
- New user Google Sign-Up
- Existing Google user Sign-In
- Account linking for existing email user
- Unverified Google email rejection
- Invalid / expired token rejection
- Blocked / deactivated / deleted user rejection
- DeviceSession and AuditLog creation
"""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from apps.authentication.models import AuditLog, DeviceSession
from apps.users.models import UserProfile, UserRole

User = get_user_model()


class GoogleAuthV2Tests(APITestCase):
    def setUp(self):
        self.url = "/api/v1/auth/v2/google/"
        self.valid_google_payload = {
            "sub": "google-sub-123456789",
            "email": "doctor@clinic.com",
            "name": "Dr. Aditya Sharma",
            "given_name": "Aditya",
            "family_name": "Sharma",
            "picture": "https://lh3.googleusercontent.com/avatar.jpg",
        }

    @patch("apps.authentication.v2_views.GoogleAuthService.verify_google_token")
    def test_unregistered_google_user_sign_up_creates_account(self, mock_verify):
        """Verify automatic account creation for new Google users."""
        mock_verify.return_value = self.valid_google_payload

        response = self.client.post(self.url, {"id_token": "valid-dummy-id-token"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["auth_action"], "GOOGLE_SIGNUP")
        self.assertEqual(response.data["data"]["user"]["email"], "doctor@clinic.com")
        self.assertTrue(User.objects.filter(email="doctor@clinic.com", google_sub="google-sub-123456789").exists())
        self.assertTrue(AuditLog.objects.filter(action="GOOGLE_SIGNUP", status="SUCCESS").exists())

    @patch("apps.authentication.v2_views.GoogleAuthService.verify_google_token")
    def test_existing_google_user_login(self, mock_verify):
        """Verify login for existing Google user."""
        user = User.objects.create(
            email="doctor@clinic.com",
            full_name="Dr. Aditya Sharma",
            auth_provider="google",
            google_sub="google-sub-123456789",
            is_email_verified=True,
        )
        mock_verify.return_value = self.valid_google_payload

        response = self.client.post(self.url, {"id_token": "valid-dummy-id-token"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["user"]["id"], str(user.id))

        # Verify AuditLog
        self.assertTrue(AuditLog.objects.filter(user=user, action="GOOGLE_LOGIN", status="SUCCESS").exists())

    @patch("apps.authentication.v2_views.GoogleAuthService.verify_google_token")
    def test_account_linking_for_existing_email_user(self, mock_verify):
        """Verify Google account linking when email already exists without creating duplicate users."""
        user = User.objects.create(
            email="doctor@clinic.com",
            full_name="Aditya Sharma",
            auth_provider="email",
            is_email_verified=False,
            profile_picture="https://custom.site/my-avatar.jpg",
        )
        user.set_password("SecretPassword123")
        user.save()

        mock_verify.return_value = self.valid_google_payload

        response = self.client.post(self.url, {"id_token": "valid-dummy-id-token"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(User.objects.filter(email="doctor@clinic.com").count(), 1)

        user.refresh_from_db()
        self.assertEqual(user.google_sub, "google-sub-123456789")
        self.assertEqual(user.auth_provider, "google")
        self.assertTrue(user.is_email_verified)
        # Custom avatar preserved (not overwritten)
        self.assertEqual(user.profile_picture, "https://custom.site/my-avatar.jpg")

        # Verify AuditLog
        self.assertTrue(AuditLog.objects.filter(user=user, action="GOOGLE_ACCOUNT_LINKED", status="SUCCESS").exists())

    @patch("apps.authentication.v2_views.GoogleAuthService.verify_google_token")
    def test_unverified_google_email_rejection(self, mock_verify):
        """Verify rejection when Google email_verified flag is False."""
        mock_verify.side_effect = ValueError("Google account email is not verified.")

        response = self.client.post(self.url, {"id_token": "unverified-email-id-token"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])
        self.assertIn("Google account email is not verified", response.data["message"])

        # AuditLog failure recorded
        self.assertTrue(AuditLog.objects.filter(action="GOOGLE_AUTH_FAILED", status="FAILURE").exists())

    @patch("apps.authentication.v2_views.GoogleAuthService.verify_google_token")
    def test_invalid_google_token_rejection(self, mock_verify):
        """Verify rejection when Google ID token is invalid or expired."""
        mock_verify.side_effect = ValueError("Failed to verify Google ID Token. The token may be expired or invalid.")

        response = self.client.post(self.url, {"id_token": "invalid-token"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])

        # AuditLog failure recorded
        self.assertTrue(AuditLog.objects.filter(action="GOOGLE_AUTH_FAILED", status="FAILURE").exists())

    @patch("apps.authentication.v2_views.GoogleAuthService.verify_google_token")
    def test_blocked_user_rejection(self, mock_verify):
        """Verify 403 Forbidden response for blocked user attempting Google login."""
        user = User.objects.create(
            email="blocked@clinic.com",
            full_name="Blocked User",
            google_sub="google-sub-blocked",
            auth_provider="google",
        )
        profile = user.profile
        profile.is_blocked = True
        profile.save()

        mock_verify.return_value = {
            "sub": "google-sub-blocked",
            "email": "blocked@clinic.com",
            "name": "Blocked User",
        }

        response = self.client.post(self.url, {"id_token": "dummy-token"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(response.data["success"])
        self.assertIn("blocked", response.data["message"].lower())

    @patch("apps.authentication.v2_views.GoogleAuthService.verify_google_token")
    def test_deactivated_user_rejection(self, mock_verify):
        """Verify 403 Forbidden response for inactive user attempting Google login."""
        user = User.objects.create(
            email="inactive@clinic.com",
            full_name="Inactive User",
            google_sub="google-sub-inactive",
            auth_provider="google",
            is_active=False,
        )

        mock_verify.return_value = {
            "sub": "google-sub-inactive",
            "email": "inactive@clinic.com",
            "name": "Inactive User",
        }

        response = self.client.post(self.url, {"id_token": "dummy-token"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(response.data["success"])
        self.assertIn("deactivated", response.data["message"].lower())
