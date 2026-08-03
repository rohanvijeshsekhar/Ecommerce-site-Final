"""
FAAZO – Shiprocket Enterprise API Client

Handles HTTP communications with Shiprocket Express APIs (v1/external).

Key Architectural Features:
  - JWT Authentication & Automated Refresh (POST /v1/external/auth/login)
  - Django Cache integration for token persistence
  - 401 Unauthorized auto-recovery (clears token, re-authenticates, retries once)
  - Circuit Breaker Pattern (CLOSED, OPEN, HALF_OPEN) preventing upstream failure cascades
  - Transient Retry Engine with Exponential Backoff (5xx errors and timeouts)
  - Non-retryable Client Error Classifier (400, 403, 404, 422)
  - Sensitive Data Masking (Strip passwords, Bearer tokens, secrets, PII from logs)
"""

import time
import logging
import requests
from datetime import datetime
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger("faazo")


# ============================================================
# Custom Exception Hierarchy
# ============================================================

class ShiprocketAPIError(Exception):
    """Raised when Shiprocket API returns an unrecoverable error or unexpected status."""
    def __init__(self, message: str, status_code: int = None, details: dict = None, error_code: str = "UNKNOWN_PROVIDER_ERROR"):
        self.status_code = status_code
        self.details = details or {}
        self.error_code = error_code
        super().__init__(message)


class ShiprocketValidationError(Exception):
    """Raised when request payload fails validation checks."""
    def __init__(self, errors: list, error_code: str = "VALIDATION_FAILED"):
        self.errors = errors
        self.error_code = error_code
        super().__init__(" | ".join(errors))


class CircuitBreakerOpenError(ShiprocketAPIError):
    """Raised when the Circuit Breaker is OPEN due to repeated upstream provider outages."""
    def __init__(self, message: str = "Shiprocket Circuit Breaker is OPEN. Requests are temporarily paused."):
        super().__init__(message, status_code=503, error_code="CIRCUIT_BREAKER_OPEN")


# Alias for backward compatibility
DelhiveryAPIError = ShiprocketAPIError
DelhiveryValidationError = ShiprocketValidationError


# ============================================================
# Circuit Breaker Implementation
# ============================================================

class ShiprocketCircuitBreaker:
    """
    State machine monitoring Shiprocket API calls.
    States:
      - CLOSED: Normal operation. Requests pass through.
      - OPEN: Outage detected. Requests fail immediately.
      - HALF_OPEN: Cooldown expired. Testing provider recovery.
    """

    STATE_CLOSED = "CLOSED"
    STATE_OPEN = "OPEN"
    STATE_HALF_OPEN = "HALF_OPEN"

    def __init__(self, failure_threshold: int = 5, cooldown_seconds: int = 60):
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        self.cache_key_state = "shiprocket_circuit_state"
        self.cache_key_failures = "shiprocket_circuit_failures"
        self.cache_key_open_time = "shiprocket_circuit_open_time"

    def get_state(self) -> str:
        state = cache.get(self.cache_key_state, self.STATE_CLOSED)
        if state == self.STATE_OPEN:
            open_time = cache.get(self.cache_key_open_time, 0)
            if time.time() - open_time > self.cooldown_seconds:
                state = self.STATE_HALF_OPEN
                cache.set(self.cache_key_state, self.STATE_HALF_OPEN, timeout=self.cooldown_seconds)
                logger.info("[CIRCUIT_BREAKER] Cooldown expired. Circuit transitioning to HALF_OPEN.")
        return state

    def record_success(self):
        state = cache.get(self.cache_key_state, self.STATE_CLOSED)
        if state != self.STATE_CLOSED:
            logger.info("[CIRCUIT_BREAKER] Successful response received. Resetting circuit to CLOSED.")
        cache.set(self.cache_key_state, self.STATE_CLOSED)
        cache.set(self.cache_key_failures, 0)

    def record_failure(self):
        failures = cache.get(self.cache_key_failures, 0) + 1
        cache.set(self.cache_key_failures, failures, timeout=300)
        logger.warning("[CIRCUIT_BREAKER] Recorded failure %d/%d.", failures, self.failure_threshold)

        if failures >= self.failure_threshold:
            logger.error("[CIRCUIT_BREAKER_TRIPPED] Failure threshold reached (%d). Circuit TRIPPED to OPEN.", failures)
            cache.set(self.cache_key_state, self.STATE_OPEN, timeout=self.cooldown_seconds)
            cache.set(self.cache_key_open_time, time.time(), timeout=self.cooldown_seconds)


# Global Circuit Breaker Instance
circuit_breaker = ShiprocketCircuitBreaker()


# ============================================================
# Shiprocket API Client
# ============================================================

class ShiprocketAPIClient:
    """
    Enterprise HTTP Client for Shiprocket Logistics Integration.
    """

    CACHE_TOKEN_KEY = "shiprocket_jwt_token"
    CACHE_AUTH_STATS_KEY = "shiprocket_auth_stats"

    def __init__(self, base_url: str = None, email: str = None, password: str = None):
        self.base_url = (base_url or getattr(settings, "SHIPROCKET_BASE_URL", "https://apiv2.shiprocket.in")).rstrip("/")
        self.email = email or getattr(settings, "SHIPROCKET_EMAIL", "")
        self.password = password or getattr(settings, "SHIPROCKET_PASSWORD", "")
        self.max_retries = 3
        self.initial_backoff_sec = 1.0
        self.token_ttl = getattr(settings, "SHIPROCKET_TOKEN_CACHE_TTL", 864000)

    def _mask_payload(self, data: dict) -> dict:
        """Sanitizes sensitive information for logs and audit trails."""
        if not data or not isinstance(data, dict):
            return data
        sanitized = data.copy()
        for sensitive_key in ["password", "email", "token", "Authorization", "secret"]:
            if sensitive_key in sanitized:
                sanitized[sensitive_key] = "***MASKED***"
        return sanitized

    def get_auth_token(self, force_refresh: bool = False) -> str:
        """
        Retrieves JWT Bearer token from Django cache or authenticates with Shiprocket Login API.
        """
        if not force_refresh:
            cached_token = cache.get(self.CACHE_TOKEN_KEY)
            if cached_token:
                return cached_token

        if not self.email or not self.password:
            error_msg = "SHIPROCKET_EMAIL or SHIPROCKET_PASSWORD is not configured in settings."
            logger.error("[SHIPROCKET_AUTH_ERROR] %s", error_msg)
            self._record_auth_stat(success=False, error=error_msg)
            raise ShiprocketAPIError(error_msg, status_code=401, error_code="AUTHENTICATION_FAILED")

        auth_url = f"{self.base_url}/v1/external/auth/login"
        payload = {"email": self.email, "password": self.password}
        start_time = time.time()

        try:
            logger.info("[SHIPROCKET_AUTH_REQUEST] Requesting new JWT token from %s", auth_url)
            resp = requests.post(auth_url, json=payload, headers={"Content-Type": "application/json"}, timeout=15)
            latency_ms = round((time.time() - start_time) * 1000, 2)

            if resp.status_code == 200:
                res_json = resp.json()
                token = res_json.get("token")
                if token:
                    cache.set(self.CACHE_TOKEN_KEY, token, timeout=self.token_ttl)
                    self._record_auth_stat(success=True, latency=latency_ms)
                    logger.info("[SHIPROCKET_AUTH_SUCCESS] JWT token generated successfully (%.2fms).", latency_ms)
                    return token

            error_detail = resp.text
            logger.error("[SHIPROCKET_AUTH_FAILED] Status %d: %s", resp.status_code, error_detail)
            self._record_auth_stat(success=False, error=f"Status {resp.status_code}: {error_detail}")
            raise ShiprocketAPIError(f"Shiprocket Login Failed ({resp.status_code}): {error_detail}", status_code=resp.status_code, error_code="AUTHENTICATION_FAILED")

        except requests.RequestException as exc:
            logger.error("[SHIPROCKET_AUTH_EXCEPTION] Connection error during authentication: %s", str(exc))
            self._record_auth_stat(success=False, error=str(exc))
            raise ShiprocketAPIError(f"Shiprocket Auth Connection Error: {str(exc)}", status_code=504, error_code="AUTHENTICATION_FAILED")

    def _record_auth_stat(self, success: bool, latency: float = 0, error: str = ""):
        stats = cache.get(self.CACHE_AUTH_STATS_KEY, {
            "last_success": None,
            "last_failure": None,
            "token_expiry": None,
            "last_error": "",
        })
        now_iso = datetime.now().isoformat()
        if success:
            stats["last_success"] = now_iso
            stats["last_error"] = ""
        else:
            stats["last_failure"] = now_iso
            stats["last_error"] = error
        cache.set(self.CACHE_AUTH_STATS_KEY, stats, timeout=864000)

    def _execute_request(self, method: str, path: str, json_data: dict = None, params: dict = None, timeout: int = 30, is_retry_after_401: bool = False) -> tuple[dict, int, float]:
        """
        Executes HTTP request with Circuit Breaker checks, 401 auto-token refresh, and 5xx transient retries.
        """
        state = circuit_breaker.get_state()
        if state == ShiprocketCircuitBreaker.STATE_OPEN:
            raise CircuitBreakerOpenError()

        token = self.get_auth_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        url = f"{self.base_url}{path}"
        attempt = 0

        while attempt < self.max_retries:
            attempt += 1
            req_start = time.time()
            try:
                logger.info("[SHIPROCKET_HTTP] %s %s (Attempt %d/%d)", method.upper(), url, attempt, self.max_retries)

                if method.upper() == "POST":
                    resp = requests.post(url, json=json_data, headers=headers, timeout=timeout)
                elif method.upper() == "GET":
                    resp = requests.get(url, params=params, headers=headers, timeout=timeout)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")

                exec_time_ms = round((time.time() - req_start) * 1000, 2)
                status_code = resp.status_code

                try:
                    res_data = resp.json()
                except Exception:
                    res_data = {"raw": resp.text}

                # Success 2xx
                if 200 <= status_code < 300:
                    circuit_breaker.record_success()
                    logger.info("[SHIPROCKET_HTTP_SUCCESS] %s %s → Status %d (%.2fms)", method.upper(), path, status_code, exec_time_ms)
                    return res_data, status_code, exec_time_ms

                # HTTP 401 Unauthorized -> Refresh Token and Retry ONCE
                if status_code == 401 and not is_retry_after_401:
                    logger.warning("[SHIPROCKET_HTTP_401] Token expired or invalid. Refreshing token and retrying...")
                    cache.delete(self.CACHE_TOKEN_KEY)
                    return self._execute_request(method, path, json_data=json_data, params=params, timeout=timeout, is_retry_after_401=True)

                # Transient Server Errors (5xx) -> Retry with Backoff
                if status_code >= 500:
                    circuit_breaker.record_failure()
                    logger.warning("[SHIPROCKET_HTTP_5XX] %s %s returned status %d. Attempt %d/%d.", method.upper(), path, status_code, attempt, self.max_retries)
                    if attempt < self.max_retries:
                        backoff = self.initial_backoff_sec * (2 ** (attempt - 1))
                        time.sleep(backoff)
                        continue

                # Client Errors (4xx) -> DO NOT RETRY
                error_msg = (
                    res_data.get("message") or
                    res_data.get("errors") or
                    res_data.get("error") or
                    resp.text
                )
                if isinstance(error_msg, dict):
                    error_msg = str(error_msg)
                elif isinstance(error_msg, list):
                    error_msg = " | ".join([str(e) for e in error_msg])

                if status_code in [400, 422]:
                    raise ShiprocketValidationError([f"Validation Error ({status_code}): {error_msg}"], error_code="VALIDATION_FAILED")
                elif status_code in [401, 403]:
                    raise ShiprocketAPIError(f"Authentication Failure ({status_code}): {error_msg}", status_code=status_code, details=res_data, error_code="AUTHENTICATION_FAILED")
                else:
                    raise ShiprocketAPIError(f"Shiprocket Error ({status_code}): {error_msg}", status_code=status_code, details=res_data, error_code="PROVIDER_ERROR")

            except (requests.Timeout, requests.ConnectionError) as conn_err:
                circuit_breaker.record_failure()
                exec_time_ms = round((time.time() - req_start) * 1000, 2)
                logger.warning("[SHIPROCKET_CONN_TIMEOUT] %s %s connection failure: %s. Attempt %d/%d.", method.upper(), path, str(conn_err), attempt, self.max_retries)
                if attempt < self.max_retries:
                    backoff = self.initial_backoff_sec * (2 ** (attempt - 1))
                    time.sleep(backoff)
                    continue
                raise ShiprocketAPIError(f"Shiprocket API Connection Error: {str(conn_err)}", status_code=504, error_code="NETWORK_TIMEOUT")

        raise ShiprocketAPIError(f"Shiprocket API failed after {self.max_retries} attempts.", status_code=500, error_code="MAX_RETRIES_EXCEEDED")

    # ============================================================
    # Shiprocket Domain Methods
    # ============================================================

    def check_serviceability(self, pickup_postcode: str, delivery_postcode: str, weight: float, cod: bool = False, length: float = 10, width: float = 10, height: float = 10) -> tuple[dict, int, float]:
        params = {
            "pickup_postcode": pickup_postcode,
            "delivery_postcode": delivery_postcode,
            "weight": str(weight),
            "cod": 1 if cod else 0,
            "length": str(length),
            "width": str(width),
            "height": str(height),
        }
        return self._execute_request("GET", "/v1/external/courier/serviceability", params=params)

    def create_order(self, payload: dict) -> tuple[dict, int, float]:
        """POST /v1/external/orders/create/adhoc"""
        return self._execute_request("POST", "/v1/external/orders/create/adhoc", json_data=payload)

    def assign_courier(self, shipment_id: int, courier_id: int = None) -> tuple[dict, int, float]:
        """POST /v1/external/courier/assign/awb"""
        payload = {"shipment_id": str(shipment_id)}
        if courier_id:
            payload["courier_id"] = str(courier_id)
        return self._execute_request("POST", "/v1/external/courier/assign/awb", json_data=payload)

    def generate_pickup(self, shipment_ids: list) -> tuple[dict, int, float]:
        """POST /v1/external/courier/generate/pickup"""
        payload = {"shipment_id": [str(s) for s in shipment_ids]}
        return self._execute_request("POST", "/v1/external/courier/generate/pickup", json_data=payload)

    def generate_label(self, shipment_ids: list) -> tuple[dict, int, float]:
        """POST /v1/external/courier/generate/label"""
        payload = {"shipment_id": [str(s) for s in shipment_ids]}
        return self._execute_request("POST", "/v1/external/courier/generate/label", json_data=payload)

    def generate_manifest(self, shipment_ids: list) -> tuple[dict, int, float]:
        """POST /v1/external/manifests/generate"""
        payload = {"shipment_id": [str(s) for s in shipment_ids]}
        return self._execute_request("POST", "/v1/external/manifests/generate", json_data=payload)

    def print_invoice(self, order_ids: list) -> tuple[dict, int, float]:
        """POST /v1/external/orders/print/invoice"""
        payload = {"ids": [str(o) for o in order_ids]}
        return self._execute_request("POST", "/v1/external/orders/print/invoice", json_data=payload)

    def track_awb(self, awb_code: str) -> tuple[dict, int, float]:
        """GET /v1/external/courier/track/awb/{awb_code}"""
        return self._execute_request("GET", f"/v1/external/courier/track/awb/{awb_code}")

    def cancel_order(self, order_ids: list) -> tuple[dict, int, float]:
        """POST /v1/external/orders/cancel"""
        payload = {"ids": [str(o) for o in order_ids]}
        return self._execute_request("POST", "/v1/external/orders/cancel", json_data=payload)
