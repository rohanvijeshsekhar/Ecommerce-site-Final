"""
FAAZO -- Dealer Pricing Authorization Regression Tests

Verifies the security invariant:

  dealer_status == approved  --> dealer pricing GRANTED
  dealer_status == pending   --> retail pricing ONLY
  dealer_status == rejected  --> retail pricing ONLY
  no DealerApplication       --> retail pricing ONLY (never approved)
  customer role              --> retail pricing ONLY

Also verifies IsApprovedDealer permission:
  APPROVED dealer  -> permitted
  PENDING dealer   -> 403
  REJECTED dealer  -> 403
  No application   -> 403
  Customer         -> permitted (non-dealers pass through)
"""

from django.test import TestCase
from apps.users.models import User, UserRole
from apps.dealer.models import DealerApplication, DealerStatus


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_dealer(email="dealer@test.com", password="TestPass123!"):
    return User.objects.create_user(
        email=email,
        full_name="Test Dealer",
        password=password,
        role=UserRole.DEALER,
    )


def _make_customer(email="cust@test.com", password="TestPass123!"):
    return User.objects.create_user(
        email=email,
        full_name="Test Customer",
        password=password,
        role=UserRole.CUSTOMER,
    )


def _make_application(user, status):
    return DealerApplication.objects.create(
        user=user,
        company_name="Test Co",
        status=status,
    )


# ---------------------------------------------------------------------------
# 1. User.dealer_status property
# ---------------------------------------------------------------------------

class DealerStatusPropertyTest(TestCase):

    def test_approved_dealer_returns_approved(self):
        user = _make_dealer("d_approved@test.com")
        _make_application(user, DealerStatus.APPROVED)
        self.assertEqual(user.dealer_status, "approved")

    def test_pending_dealer_returns_pending(self):
        user = _make_dealer("d_pending@test.com")
        _make_application(user, DealerStatus.PENDING)
        self.assertEqual(user.dealer_status, "pending")

    def test_rejected_dealer_returns_rejected(self):
        user = _make_dealer("d_rejected@test.com")
        _make_application(user, DealerStatus.REJECTED)
        self.assertEqual(user.dealer_status, "rejected")

    def test_dealer_without_application_is_pending_not_approved(self):
        """
        CRITICAL SECURITY: a dealer-role user with NO DealerApplication
        must NEVER receive approved. Safe fallback is pending.
        """
        user = _make_dealer("d_noapp@test.com")
        self.assertFalse(DealerApplication.objects.filter(user=user).exists())
        result = user.dealer_status
        self.assertEqual(
            result, "pending",
            f"SECURITY: dealer without application must be pending, not approved. Got: {result!r}"
        )
        self.assertNotEqual(
            result, "approved",
            "SECURITY VIOLATION: dealer without application returned approved!"
        )

    def test_customer_returns_none(self):
        user = _make_customer()
        self.assertIsNone(user.dealer_status)

    def test_is_approved_dealer_true_only_for_approved(self):
        user = _make_dealer("d_iap_approved@test.com")
        _make_application(user, DealerStatus.APPROVED)
        self.assertTrue(user.is_approved_dealer)

    def test_is_approved_dealer_false_for_pending(self):
        user = _make_dealer("d_iap_pending@test.com")
        _make_application(user, DealerStatus.PENDING)
        self.assertFalse(user.is_approved_dealer)

    def test_is_approved_dealer_false_for_rejected(self):
        user = _make_dealer("d_iap_rejected@test.com")
        _make_application(user, DealerStatus.REJECTED)
        self.assertFalse(user.is_approved_dealer)

    def test_is_approved_dealer_false_for_no_application(self):
        user = _make_dealer("d_iap_noapp@test.com")
        self.assertFalse(user.is_approved_dealer)

    def test_is_approved_dealer_false_for_customer(self):
        user = _make_customer("cust_iap@test.com")
        self.assertFalse(user.is_approved_dealer)


# ---------------------------------------------------------------------------
# 2. IsApprovedDealer permission class (unit level, no HTTP)
# ---------------------------------------------------------------------------

class IsApprovedDealerPermissionTest(TestCase):

    def _check(self, user):
        from apps.common.permissions import IsApprovedDealer

        class FakeRequest:
            pass

        req = FakeRequest()
        req.user = user
        return IsApprovedDealer().has_permission(req, view=None)

    def test_approved_dealer_passes(self):
        user = _make_dealer("perm_approved@test.com")
        _make_application(user, DealerStatus.APPROVED)
        self.assertTrue(self._check(user))

    def test_pending_dealer_blocked(self):
        user = _make_dealer("perm_pending@test.com")
        _make_application(user, DealerStatus.PENDING)
        self.assertFalse(self._check(user))

    def test_rejected_dealer_blocked(self):
        user = _make_dealer("perm_rejected@test.com")
        _make_application(user, DealerStatus.REJECTED)
        self.assertFalse(self._check(user))

    def test_no_application_dealer_blocked(self):
        user = _make_dealer("perm_noapp@test.com")
        self.assertFalse(DealerApplication.objects.filter(user=user).exists())
        self.assertFalse(self._check(user))

    def test_customer_passes_through(self):
        """Non-dealer users are allowed -- this permission only gates dealers."""
        user = _make_customer("perm_cust@test.com")
        self.assertTrue(self._check(user))

    def test_role_alone_does_not_grant_permission(self):
        """
        CRITICAL: A user with role=DEALER but NO application must be blocked.
        Role alone must never satisfy IsApprovedDealer.
        """
        user = _make_dealer("perm_role_only@test.com")
        self.assertFalse(DealerApplication.objects.filter(user=user).exists())
        result = self._check(user)
        self.assertFalse(
            result,
            "SECURITY VIOLATION: dealer role alone (no application) granted IsApprovedDealer!"
        )
