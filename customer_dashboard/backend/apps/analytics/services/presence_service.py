"""
FAAZO – Storefront Live Visitor Presence Service
================================================

Tracks real-time presence of anonymous & authenticated customers on the
PUBLIC FAAZO storefront using a lightweight heartbeat mechanism.

Security & Integrity Rules:
1. /admin and /admin/* routes are strictly EXCLUDED.
2. Bots, crawlers, and automated scanners are filtered out.
3. Uses anonymous stable visitor IDs (UUID) — no personal data stored.
4. Heartbeat window: active within last 300 seconds (5 minutes).
5. Redis / Django cache backed with automatic expiry.
"""

import logging
import time
from typing import Dict, Any, Optional
from django.core.cache import cache

logger = logging.getLogger("faazo.analytics")

PRESENCE_TIMEOUT_SECONDS = 300  # 5 minutes sliding active window
CACHE_KEY_REGISTRY = "faazo:live_presence:visitors_v1"
KNOWN_BOT_TOKENS = (
    "bot", "crawler", "spider", "headless", "googlebot",
    "bingbot", "yandex", "baiduspider", "facebookexternalhit",
    "slurp", "duckduckbot", "ahrefsbot", "semrushbot"
)


class PresenceService:
    """Service managing live customer presence on the storefront."""

    @staticmethod
    def is_admin_path(path: Optional[str]) -> bool:
        if not path:
            return False
        clean = path.strip().lower()
        return clean == "/admin" or clean.startswith("/admin/")

    @staticmethod
    def is_bot_user_agent(user_agent: Optional[str]) -> bool:
        if not user_agent:
            return False
        ua = user_agent.lower()
        return any(bot in ua for bot in KNOWN_BOT_TOKENS)

    @classmethod
    def record_heartbeat(
        cls,
        visitor_id: str,
        path: Optional[str] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> bool:
        """
        Record a customer heartbeat from the storefront.
        Returns True if accepted, False if filtered out.
        """
        if not visitor_id or not isinstance(visitor_id, str):
            return False

        clean_id = visitor_id.strip()[:64]
        if not clean_id:
            return False

        # Exclude admin routes
        if cls.is_admin_path(path):
            return False

        # Exclude bot traffic
        if cls.is_bot_user_agent(user_agent):
            return False

        now = time.time()

        try:
            # Read current active registry dict: { visitor_id: timestamp }
            registry: Dict[str, float] = cache.get(CACHE_KEY_REGISTRY) or {}
            
            # Update visitor timestamp
            registry[clean_id] = now

            # Clean expired visitors (older than 5 minutes)
            cutoff = now - PRESENCE_TIMEOUT_SECONDS
            active_registry = {vid: ts for vid, ts in registry.items() if ts >= cutoff}

            # Save back to cache with 10 minute buffer
            cache.set(CACHE_KEY_REGISTRY, active_registry, timeout=PRESENCE_TIMEOUT_SECONDS * 2)
            return True
        except Exception as exc:
            logger.warning("[PresenceService] Failed to record heartbeat: %s", exc)
            return False

    @classmethod
    def get_live_visitor_count(cls) -> int:
        """
        Returns the number of unique active visitors who sent a heartbeat
        within the last 5 minutes.
        """
        try:
            now = time.time()
            cutoff = now - PRESENCE_TIMEOUT_SECONDS
            registry: Dict[str, float] = cache.get(CACHE_KEY_REGISTRY) or {}

            # Filter active in the last 5 minutes
            active_count = sum(1 for ts in registry.values() if ts >= cutoff)
            return active_count
        except Exception as exc:
            logger.warning("[PresenceService] Failed to get live visitor count: %s", exc)
            return 0
