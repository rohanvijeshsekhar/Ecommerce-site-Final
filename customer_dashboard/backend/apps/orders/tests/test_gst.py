from decimal import Decimal
from django.test import TestCase, override_settings
from apps.common.tax_engine import (
    extract_gst_from_inclusive,
    calculate_order_tax_summary,
    determine_is_intra_state,
    get_warehouse_state,
)
from django.core.exceptions import ImproperlyConfigured


class TestExtractGST(TestCase):
    def test_118_intra(self):
        r = extract_gst_from_inclusive(Decimal('118'), Decimal('18'), 1, True)
        self.assertEqual(r['taxable_value_per_unit'], Decimal('100.00'))
        self.assertEqual(r['total_gst_amount'], Decimal('18.00'))
        self.assertEqual(r['cgst_amount'], Decimal('9.00'))
        self.assertEqual(r['sgst_amount'], Decimal('9.00'))
        self.assertEqual(r['igst_amount'], Decimal('0.00'))
        self.assertEqual(r['line_total'], Decimal('118.00'))

    def test_1180_intra(self):
        r = extract_gst_from_inclusive(Decimal('1180'), Decimal('18'), 1, True)
        self.assertEqual(r['taxable_value_per_unit'], Decimal('1000.00'))
        self.assertEqual(r['total_gst_amount'], Decimal('180.00'))
        self.assertEqual(r['cgst_amount'], Decimal('90.00'))
        self.assertEqual(r['sgst_amount'], Decimal('90.00'))
        self.assertEqual(r['line_total'], Decimal('1180.00'))

    def test_11800_intra(self):
        r = extract_gst_from_inclusive(Decimal('11800'), Decimal('18'), 1, True)
        self.assertEqual(r['taxable_value_per_unit'], Decimal('10000.00'))
        self.assertEqual(r['total_gst_amount'], Decimal('1800.00'))
        self.assertEqual(r['cgst_amount'], Decimal('900.00'))
        self.assertEqual(r['sgst_amount'], Decimal('900.00'))
        self.assertEqual(r['line_total'], Decimal('11800.00'))

    def test_1180_inter(self):
        r = extract_gst_from_inclusive(Decimal('1180'), Decimal('18'), 1, False)
        self.assertEqual(r['igst_amount'], Decimal('180.00'))
        self.assertEqual(r['cgst_amount'], Decimal('0.00'))
        self.assertEqual(r['sgst_amount'], Decimal('0.00'))
        self.assertEqual(r['line_total'], Decimal('1180.00'))

    def test_multi_qty(self):
        r = extract_gst_from_inclusive(Decimal('1180'), Decimal('18'), 3, True)
        self.assertEqual(r['line_total'], Decimal('3540.00'))
        self.assertEqual(r['taxable_subtotal'], Decimal('3000.00'))
        self.assertEqual(r['total_gst_amount'], Decimal('540.00'))
        self.assertEqual(r['cgst_amount'], Decimal('270.00'))
        self.assertEqual(r['sgst_amount'], Decimal('270.00'))

    def test_line_total_always_matches(self):
        for price, qty in [('118',1),('1180',5),('11800',2),('99.99',3)]:
            r = extract_gst_from_inclusive(Decimal(price), Decimal('18'), qty, True)
            expected = (Decimal(price) * qty).quantize(Decimal('0.01'))
            self.assertEqual(r['line_total'], expected)

    def test_taxable_plus_gst_equals_total(self):
        r = extract_gst_from_inclusive(Decimal('1180'), Decimal('18'), 5, True)
        self.assertEqual(r['taxable_subtotal'] + r['total_gst_amount'], r['line_total'])

    def test_5pct(self):
        r = extract_gst_from_inclusive(Decimal('1050'), Decimal('5'), 1, True)
        self.assertEqual(r['taxable_value_per_unit'], Decimal('1000.00'))
        self.assertEqual(r['total_gst_amount'], Decimal('50.00'))

    def test_12pct(self):
        r = extract_gst_from_inclusive(Decimal('1120'), Decimal('12'), 1, True)
        self.assertEqual(r['taxable_value_per_unit'], Decimal('1000.00'))
        self.assertEqual(r['total_gst_amount'], Decimal('120.00'))

    def test_zero_gst(self):
        r = extract_gst_from_inclusive(Decimal('1000'), Decimal('0'), 1, True)
        self.assertEqual(r['taxable_value_per_unit'], Decimal('1000.00'))
        self.assertEqual(r['total_gst_amount'], Decimal('0.00'))

    def test_28pct(self):
        r = extract_gst_from_inclusive(Decimal('1280'), Decimal('28'), 1, True)
        self.assertEqual(r['taxable_value_per_unit'], Decimal('1000.00'))
        self.assertEqual(r['total_gst_amount'], Decimal('280.00'))


class TestOrderTaxSummary(TestCase):
    def test_single_no_shipping(self):
        items = [{'inclusive_price': Decimal('1180'), 'gst_rate': Decimal('18'), 'quantity': 1}]
        r = calculate_order_tax_summary(items, Decimal('0'), True)
        self.assertEqual(r['selling_subtotal'], Decimal('1180.00'))
        self.assertEqual(r['taxable_subtotal'], Decimal('1000.00'))
        self.assertEqual(r['total_gst'], Decimal('180.00'))
        self.assertEqual(r['total_amount'], Decimal('1180.00'))

    def test_not_inflated(self):
        items = [{'inclusive_price': Decimal('1180'), 'gst_rate': Decimal('18'), 'quantity': 1}]
        r = calculate_order_tax_summary(items, Decimal('0'), True)
        self.assertNotEqual(r['total_amount'], Decimal('1360.00'))
        self.assertEqual(r['total_amount'], Decimal('1180.00'))

    def test_with_shipping(self):
        items = [{'inclusive_price': Decimal('1180'), 'gst_rate': Decimal('18'), 'quantity': 1}]
        r = calculate_order_tax_summary(items, Decimal('1500'), True)
        self.assertEqual(r['selling_subtotal'], Decimal('1180.00'))
        self.assertEqual(r['taxable_subtotal'], Decimal('1000.00'))
        self.assertEqual(r['total_gst'], Decimal('180.00'))
        self.assertEqual(r['shipping_fee'], Decimal('1500.00'))
        self.assertEqual(r['total_amount'], Decimal('2680.00'))

    def test_inter_state(self):
        items = [{'inclusive_price': Decimal('1180'), 'gst_rate': Decimal('18'), 'quantity': 1}]
        r = calculate_order_tax_summary(items, Decimal('0'), False)
        self.assertEqual(r['total_cgst'], Decimal('0.00'))
        self.assertEqual(r['total_sgst'], Decimal('0.00'))
        self.assertEqual(r['total_igst'], Decimal('180.00'))

    def test_order_discount_coupon(self):
        items = [{'inclusive_price': Decimal('1180'), 'gst_rate': Decimal('18'), 'quantity': 1}]
        # ₹180 discount on ₹1,180 item -> net selling price = ₹1,000
        r = calculate_order_tax_summary(items, Decimal('0'), True, discount_amount=Decimal('180'))
        self.assertEqual(r['selling_subtotal'], Decimal('1180.00'))
        self.assertEqual(r['net_selling_subtotal'], Decimal('1000.00'))
        self.assertEqual(r['total_amount'], Decimal('1000.00'))

    def test_dealer_price_discount(self):
        items = [{'inclusive_price': Decimal('944'), 'gst_rate': Decimal('18'), 'quantity': 2}]
        r = calculate_order_tax_summary(items, Decimal('0'), True)
        self.assertEqual(r['selling_subtotal'], Decimal('1888.00'))
        self.assertEqual(r['taxable_subtotal'], Decimal('1600.00'))
        self.assertEqual(r['total_gst'], Decimal('288.00'))
        self.assertEqual(r['total_amount'], Decimal('1888.00'))


class TestIntraState(TestCase):
    def test_same(self):
        self.assertTrue(determine_is_intra_state('Maharashtra', 'Maharashtra'))

    def test_diff(self):
        self.assertFalse(determine_is_intra_state('Maharashtra', 'Karnataka'))

    def test_case_insensitive(self):
        self.assertTrue(determine_is_intra_state('maharashtra', 'MAHARASHTRA'))

    def test_whitespace(self):
        self.assertTrue(determine_is_intra_state('  Maharashtra  ', 'Maharashtra'))


class TestWarehouseState(TestCase):
    @override_settings(FAAZO_WAREHOUSE_STATE='Maharashtra')
    def test_valid(self):
        self.assertEqual(get_warehouse_state(), 'Maharashtra')

    @override_settings(FAAZO_WAREHOUSE_STATE='')
    def test_empty_raises(self):
        with self.assertRaises(ImproperlyConfigured):
            get_warehouse_state()
