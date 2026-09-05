"""
FAAZO – Inventory Views (Phase 6A)

Endpoints:
  GET    /api/v1/products/{slug}/inventory/         → retrieve inventory
  PATCH  /api/v1/products/{slug}/inventory/         → update inventory (admin)
  GET    /api/v1/products/inventory-stats/          → dashboard aggregate stats (admin)
"""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView

from apps.common.permissions import IsAdmin
from apps.common.responses import success_response, error_response
from apps.products.models import Product, ProductStatus

from .models import ProductInventory
from .serializers import ProductInventorySerializer


class ProductInventoryView(APIView):
    """
    Retrieve or update inventory for a single product.

    - GET   — Admin only (stock levels are internal data).
    - PATCH — Admin only.
    """

    def get_permissions(self):
        return [IsAuthenticated(), IsAdmin()]

    def _get_product(self, slug):
        try:
            return Product.all_objects.select_related("inventory").get(slug=slug)
        except Product.DoesNotExist:
            return None

    def _get_or_create_inventory(self, product):
        inventory, _ = ProductInventory.objects.get_or_create(product=product)
        return inventory

    def get(self, request, slug):
        product = self._get_product(slug)
        if not product:
            return error_response("Product not found.", status_code=status.HTTP_404_NOT_FOUND)

        inventory = self._get_or_create_inventory(product)
        serializer = ProductInventorySerializer(inventory, context={"request": request})
        return success_response(data=serializer.data)

    def patch(self, request, slug):
        product = self._get_product(slug)
        if not product:
            return error_response("Product not found.", status_code=status.HTTP_404_NOT_FOUND)

        inventory = self._get_or_create_inventory(product)
        serializer = ProductInventorySerializer(inventory, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save(updated_by=request.user)
        except Exception as exc:
            return error_response(str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        return success_response(data=serializer.data, message="Inventory updated.")


class InventoryStatsView(APIView):
    """
    GET /api/v1/products/inventory-stats/
    Returns aggregate stock stats for the admin dashboard.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from django.db.models import Sum, Count, Q
        from apps.products.models import Product

        # Active products only for dashboard stats
        active_products = Product.objects.filter(is_deleted=False)
        total = active_products.count()

        # Compute stock status per product
        inventories = ProductInventory.objects.filter(
            product__is_deleted=False
        ).select_related("product")

        in_stock    = 0
        low_stock   = 0
        out_of_stock = 0

        for inv in inventories:
            s = inv.stock_status
            if s == "in_stock":
                in_stock += 1
            elif s == "low_stock":
                low_stock += 1
            else:
                out_of_stock += 1

        # Products with no inventory record count as out of stock
        products_with_inventory = inventories.values_list("product_id", flat=True)
        missing = active_products.exclude(id__in=products_with_inventory).count()
        out_of_stock += missing

        return success_response(data={
            "total_products": total,
            "in_stock": in_stock,
            "low_stock": low_stock,
            "out_of_stock": out_of_stock,
        })
