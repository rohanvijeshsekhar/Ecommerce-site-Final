"""
FAAZO – Google OAuth 2.0 Token Verification Service

Verifies Google ID Tokens using Google's official public keys and cryptography.
Validates:
- Signature
- Expiration
- Issuer (accounts.google.com)
- Audience (GOOGLE_CLIENT_ID, if set)
- Email Verification Status
"""

import logging
from typing import Any, Dict

from django.conf import settings
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

logger = logging.getLogger("faazo.auth")


class GoogleAuthService:
    """
    Service layer for Google OAuth 2.0 verification.
    """

    ALLOWED_ISSUERS = [
        "accounts.google.com",
        "https://accounts.google.com",
    ]

    @classmethod
    def verify_google_token(cls, id_token_str: str) -> Dict[str, Any]:
        """
        Verifies a Google ID Token string against Google's public keys.

        Returns a dictionary containing validated Google user payload:
            - sub: Google unique Subject ID
            - email: Verified user email address
            - name: Full name
            - given_name: First name (optional)
            - family_name: Last name (optional)
            - picture: Profile picture URL (optional)
        """
        if not id_token_str or not isinstance(id_token_str, str):
            raise ValueError("Google ID Token is required and must be a non-empty string.")

        try:
            request = google_requests.Request()
            client_id = getattr(settings, "GOOGLE_CLIENT_ID", "") or None

            # Verify the ID Token with Google's public keys
            payload = google_id_token.verify_oauth2_token(
                id_token_str,
                request,
                audience=client_id,
            )

            # Validate issuer
            issuer = payload.get("iss")
            if issuer not in cls.ALLOWED_ISSUERS:
                logger.warning("[GOOGLE_AUTH_FAILED] Invalid issuer: %s", issuer)
                raise ValueError(f"Invalid Google ID Token issuer: {issuer}")

            # Validate email verification flag
            email_verified = payload.get("email_verified")
            if not email_verified:
                logger.warning("[GOOGLE_AUTH_FAILED] Unverified email: %s", payload.get("email"))
                raise ValueError("Google account email is not verified.")

            email = payload.get("email")
            sub = payload.get("sub")
            if not email or not sub:
                raise ValueError("Google ID Token missing required claims (email or sub).")

            return {
                "sub": sub,
                "email": email.lower().strip(),
                "name": payload.get("name") or email.split("@")[0],
                "given_name": payload.get("given_name", ""),
                "family_name": payload.get("family_name", ""),
                "picture": payload.get("picture", ""),
            }

        except ValueError as ve:
            logger.warning("[GOOGLE_AUTH_VERIFICATION_ERROR] %s", str(ve))
            raise ve
        except Exception as e:
            logger.error("[GOOGLE_AUTH_UNEXPECTED_ERROR] %s", str(e), exc_info=True)
            raise ValueError("Failed to verify Google ID Token. The token may be expired or invalid.")
