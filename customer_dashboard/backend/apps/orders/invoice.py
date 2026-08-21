"""
FAAZO ? GST Tax Invoice PDF Generator
=======================================

Generates a professional, GST-compliant Tax Invoice PDF using ReportLab.
Supports intra-state (CGST+SGST) and inter-state (IGST) breakdowns.
All prices are GST-INCLUSIVE.
"""

from io import BytesIO
from decimal import Decimal
from django.conf import settings
from django.utils import timezone

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether, Image
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from apps.common.tax_engine import (
    extract_gst_from_inclusive,
    determine_is_intra_state,
    get_warehouse_state,
)

PAISE = Decimal("0.01")


def generate_gst_invoice_pdf(order) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=12 * mm,
        leftMargin=12 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm,
    )

    styles = getSampleStyleSheet()

    # Typography & Styles
    title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0F172A'),
        fontName='Helvetica-Bold',
        alignment=2,
    )
    subtitle_style = ParagraphStyle(
        'InvoiceSubTitle',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#64748B'),
        alignment=2,
    )
    bold_label = ParagraphStyle(
        'BoldLabel',
        parent=styles['Normal'],
        fontSize=8.5,
        leading=11,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#1E293B'),
    )
    normal_text = ParagraphStyle(
        'NormalText',
        parent=styles['Normal'],
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#334155'),
    )
    hdr_cell = ParagraphStyle(
        'HdrCell',
        parent=styles['Normal'],
        fontSize=7.5,
        leading=9.5,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#FFFFFF'),
        alignment=1,
    )
    cell_text = ParagraphStyle(
        'CellText',
        parent=styles['Normal'],
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#1E293B'),
    )
    cell_center = ParagraphStyle(
        'CellCenter',
        parent=styles['Normal'],
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#1E293B'),
        alignment=1,
    )
    cell_right = ParagraphStyle(
        'CellRight',
        parent=styles['Normal'],
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#1E293B'),
        alignment=2,
    )

    story = []

    # 1. Header (Seller Info vs Invoice Info)
    try:
        warehouse_state = get_warehouse_state()
    except Exception:
        warehouse_state = "Maharashtra"

    raw_seller_gstin = getattr(settings, "FAAZO_SELLER_GSTIN", "").strip()
    seller_gstin = raw_seller_gstin if raw_seller_gstin else "UNCONFIGURED (Set FAAZO_SELLER_GSTIN in env)"
    seller_name = "FAAZO Dental Solutions Pvt. Ltd."
    seller_addr = f"123 Healthcare Tech Park, Medical Hub\nState: {warehouse_state}, India\nGSTIN: {seller_gstin}\nEmail: support@faazo.com | Phone: +91 98765 43210"

    inv_num = order.invoice_number or f"INV-{order.order_number}"
    inv_date = order.created_at.strftime('%d-%b-%Y')

    logo_path = os.path.join(settings.BASE_DIR, "static", "images", "logo.png")
    header_left = []
    if os.path.exists(logo_path):
        header_left.append(Image(logo_path, width=42 * mm, height=14 * mm))
        header_left.append(Spacer(1, 2 * mm))
    header_left.extend([
        Paragraph(f"<b>{seller_name}</b>", bold_label),
        Paragraph(seller_addr.replace('\n', '<br/>'), normal_text),
    ])

    header_right = [
        Paragraph("TAX INVOICE", title_style),
        Paragraph(f"<b>Invoice No:</b> {inv_num}", subtitle_style),
        Paragraph(f"<b>Date:</b> {inv_date}", subtitle_style),
        Paragraph(f"<b>Order No:</b> {order.order_number}", subtitle_style),
    ]

    header_table = Table(
        [[header_left, header_right]],
        colWidths=[105 * mm, 81 * mm]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 4 * mm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=4 * mm))

    # 2. Buyer & Shipping Info Table
    addr = order.shipping_address
    buyer_name = order.user.full_name
    buyer_clinic = addr.line1 if addr else ""
    buyer_street = addr.line2 if addr else ""
    buyer_city_state = f"{addr.city}, {addr.state} - {addr.pincode}" if addr else ""
    buyer_phone = addr.mobile if addr else ""

    buyer_profile = getattr(order.user, 'profile', None)
    buyer_gstin = getattr(buyer_profile, 'gst_number', '') or "URP (Unregistered)"

    delivery_state = addr.state if addr else warehouse_state
    is_intra = determine_is_intra_state(warehouse_state, delivery_state)

    b_info = [
        Paragraph("<b>Billed & Shipped To:</b>", bold_label),
        Paragraph(f"<b>{buyer_name}</b>", normal_text),
        Paragraph(f"Clinic: {buyer_clinic}", normal_text) if buyer_clinic else Paragraph("", normal_text),
        Paragraph(buyer_street, normal_text) if buyer_street else Paragraph("", normal_text),
        Paragraph(buyer_city_state, normal_text),
        Paragraph(f"Phone: {buyer_phone}", normal_text),
        Paragraph(f"GSTIN: {buyer_gstin}", normal_text),
    ]

    s_meta = [
        Paragraph("<b>Taxation Details:</b>", bold_label),
        Paragraph(f"Place of Supply: <b>{delivery_state}</b>", normal_text),
        Paragraph(f"State of Origin: <b>{warehouse_state}</b>", normal_text),
        Paragraph(f"Supply Type: <b>{'Intra-State (CGST + SGST)' if is_intra else 'Inter-State (IGST)'}</b>", normal_text),
        Paragraph(f"Payment Method: <b>{order.payment_method.upper()}</b>", normal_text),
    ]

    buyer_table = Table([[b_info, s_meta]], colWidths=[105 * mm, 81 * mm])
    buyer_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(buyer_table)
    story.append(Spacer(1, 4 * mm))

    # 3. Line Items Table (with GST split)
    if is_intra:
        # Intra-state table: #, Item, HSN, Qty, Unit Price (Incl), Taxable Val, CGST%, CGST, SGST%, SGST, Total
        headers = ["#", "Item Description", "HSN", "Qty", "Unit Price\n(Incl. GST)", "Taxable\nValue", "CGST\n%", "CGST\nAmt", "SGST\n%", "SGST\nAmt", "Total"]
        col_widths = [8*mm, 45*mm, 15*mm, 10*mm, 18*mm, 18*mm, 12*mm, 15*mm, 12*mm, 15*mm, 18*mm]
    else:
        # Inter-state table: #, Item, HSN, Qty, Unit Price (Incl), Taxable Val, IGST%, IGST Amt, Total
        headers = ["#", "Item Description", "HSN", "Qty", "Unit Price\n(Incl. GST)", "Taxable\nValue", "IGST\n%", "IGST\nAmt", "Total"]
        col_widths = [8*mm, 55*mm, 16*mm, 11*mm, 22*mm, 22*mm, 14*mm, 18*mm, 20*mm]

    table_data = [[Paragraph(h.replace('\n', '<br/>'), hdr_cell) for h in headers]]

    tot_taxable = Decimal("0.00")
    tot_cgst = Decimal("0.00")
    tot_sgst = Decimal("0.00")
    tot_igst = Decimal("0.00")
    tot_gst = Decimal("0.00")
    tot_selling = Decimal("0.00")

    for idx, item in enumerate(order.items.all(), 1):
        pricing_obj = getattr(item.product, 'pricing', None)
        gst_rate = item.gst_rate or (pricing_obj.gst_percentage if pricing_obj else Decimal("18.00"))
        hsn = item.hsn_code or (pricing_obj.hsn_code if pricing_obj else "") or "N/A"
        price_inc = item.price
        qty = item.quantity

        if item.taxable_subtotal is not None and item.total_gst_amount is not None:
            taxable_subtotal = item.taxable_subtotal
            cgst_amount = item.cgst_amount or Decimal("0.00")
            sgst_amount = item.sgst_amount or Decimal("0.00")
            igst_amount = item.igst_amount or Decimal("0.00")
            total_gst_amount = item.total_gst_amount
            line_total = price_inc * qty
        else:
            breakdown = extract_gst_from_inclusive(price_inc, gst_rate, qty, is_intra)
            taxable_subtotal = breakdown["taxable_subtotal"]
            cgst_amount = breakdown["cgst_amount"]
            sgst_amount = breakdown["sgst_amount"]
            igst_amount = breakdown["igst_amount"]
            total_gst_amount = breakdown["total_gst_amount"]
            line_total = breakdown["line_total"]

        tot_taxable += taxable_subtotal
        tot_cgst += cgst_amount
        tot_sgst += sgst_amount
        tot_igst += igst_amount
        tot_gst += total_gst_amount
        tot_selling += line_total

        half_rate = (gst_rate / Decimal("2")).quantize(PAISE)

        if is_intra:
            row = [
                Paragraph(str(idx), cell_center),
                Paragraph(item.product.name, cell_text),
                Paragraph(hsn, cell_center),
                Paragraph(str(qty), cell_center),
                Paragraph(f"Rs. {price_inc:.2f}", cell_right),
                Paragraph(f"Rs. {taxable_subtotal:.2f}", cell_right),
                Paragraph(f"{half_rate:.1f}%", cell_center),
                Paragraph(f"Rs. {cgst_amount:.2f}", cell_right),
                Paragraph(f"{half_rate:.1f}%", cell_center),
                Paragraph(f"Rs. {sgst_amount:.2f}", cell_right),
                Paragraph(f"Rs. {line_total:.2f}", cell_right),
            ]
        else:
            row = [
                Paragraph(str(idx), cell_center),
                Paragraph(item.product.name, cell_text),
                Paragraph(hsn, cell_center),
                Paragraph(str(qty), cell_center),
                Paragraph(f"Rs. {price_inc:.2f}", cell_right),
                Paragraph(f"Rs. {taxable_subtotal:.2f}", cell_right),
                Paragraph(f"{gst_rate:.1f}%", cell_center),
                Paragraph(f"Rs. {igst_amount:.2f}", cell_right),
                Paragraph(f"Rs. {line_total:.2f}", cell_right),
            ]
        table_data.append(row)

    items_table = Table(table_data, colWidths=col_widths)
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 4 * mm))

    # 4. Summary & Totals Block
    shipping = order.shipping_fee
    grand_total = tot_selling + shipping

    summary_rows = [
        [Paragraph("Taxable Value (Pre-Tax):", normal_text), Paragraph(f"Rs. {tot_taxable:.2f}", cell_right)],
    ]
    if is_intra:
        summary_rows.append([Paragraph("CGST Total:", normal_text), Paragraph(f"Rs. {tot_cgst:.2f}", cell_right)])
        summary_rows.append([Paragraph("SGST Total:", normal_text), Paragraph(f"Rs. {tot_sgst:.2f}", cell_right)])
    else:
        summary_rows.append([Paragraph("IGST Total:", normal_text), Paragraph(f"Rs. {tot_igst:.2f}", cell_right)])

    summary_rows.extend([
        [Paragraph("Total GST Component:", bold_label), Paragraph(f"Rs. {tot_gst:.2f}", cell_right)],
        [Paragraph("Product Subtotal (GST Inclusive):", bold_label), Paragraph(f"Rs. {tot_selling:.2f}", cell_right)],
        [Paragraph("Shipping Charges:", normal_text), Paragraph(f"Rs. {shipping:.2f}", cell_right)],
        [Paragraph("<b>GRAND TOTAL PAYABLE:</b>", bold_label), Paragraph(f"<b>Rs. {grand_total:.2f}</b>", cell_right)],
    ])

    summary_table = Table(summary_rows, colWidths=[65 * mm, 30 * mm])
    summary_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEBELOW', (0, -1), (-1, -1), 1, colors.HexColor('#0F172A')),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))

    note_box = [
        Paragraph("<b>Important Declaration:</b>", bold_label),
        Paragraph("1. All prices are <b>INCLUSIVE of applicable GST</b>.", normal_text),
        Paragraph("2. GST is extracted from the selling price as per Section 15 of CGST Act.", normal_text),
        Paragraph("3. This is a computer-generated invoice and does not require a signature.", normal_text),
    ]

    wrapper_table = Table([[note_box, summary_table]], colWidths=[91 * mm, 95 * mm])
    wrapper_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(KeepTogether([wrapper_table]))

    doc.build(story)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
