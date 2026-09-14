from decimal import Decimal
from django.db.models import Q, F, Value
from django.db.models.functions import Coalesce
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from drf_spectacular.utils import extend_schema, OpenApiResponse
from apps.common.permissions import IsAdmin
from apps.categories.models import Category

from .models import BestSellerBanner, BestSellerProduct
from .serializers import BestSellerBannerSerializer, BestSellerProductSerializer, BestSellerProductAdminSerializer


class BestSellerPagination(PageNumberPagination):
    page_size = 24
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        products = data.get("products", []) if isinstance(data, dict) else data
        return Response({
            "success": True,
            "data": {"products": products},
            "products": products,
            "count": self.page.paginator.count,
            "total_pages": self.page.paginator.num_pages,
            "current_page": self.page.number,
            "next": self.get_next_link(),
            "previous": self.get_previous_link(),
        })


# ─── Storefront Views ─────────────────────────────────────────────────────────

class BestSellerBannerView(APIView):
    """
    GET /api/v1/bestsellers/banner/

    Returns the active Best Sellers hero banner configuration.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Get Best Sellers Banner",
        responses={
            200: OpenApiResponse(description="Active banner object or null if disabled"),
        },
        tags=["Best Sellers"],
    )
    def get(self, request):
        banner = BestSellerBanner.objects.filter(is_active=True).first()
        if banner:
            serializer = BestSellerBannerSerializer(banner, context={"request": request})
            banner_data = serializer.data
        else:
            banner_data = None

        return Response(
            {
                "success": True,
                "data": {"banner": banner_data},
                "banner": banner_data,
            },
            status=status.HTTP_200_OK,
        )


class BestSellerProductListView(APIView):
    """
    GET /api/v1/bestsellers/products/

    Returns list of active Best Seller products ordered by display_order.
    Supports contextual filtering by category, brand, price, rating, in_stock.
    Preserves admin-curated display_order by default.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Get Best Seller Products",
        responses={
            200: OpenApiResponse(description="List of active best seller products"),
        },
        tags=["Best Sellers"],
    )
    def get(self, request):
        qs = (
            BestSellerProduct.objects.filter(
                is_active=True,
                product__is_deleted=False,
                product__status__in=["active", "published"],
            )
            .select_related("product", "product__brand", "product__category", "product__pricing", "product__inventory")
            .prefetch_related("product__images")
        )

        # 1. Category filter (including descendants)
        cat_param = request.query_params.get("category", "").strip()
        if cat_param:
            cat_tokens = [t.strip() for t in cat_param.split(",") if t.strip()]
            cat_q = Q()
            for val in cat_tokens:
                cat_q |= (
                    Q(slug__iexact=val)
                    | Q(name__iexact=val)
                    | Q(id__iexact=val if len(val) == 36 else "00000000-0000-0000-0000-000000000000")
                )
            categories = Category.objects.filter(cat_q)
            if categories.exists():
                cat_ids = set()
                for cat in categories:
                    for desc in cat.get_descendants(include_self=True):
                        cat_ids.add(desc.id)
                qs = qs.filter(product__category_id__in=cat_ids)
            else:
                qs = qs.none()

        # 2. Brand filter (multi-select)
        brand_param = request.query_params.get("brand", "").strip()
        if brand_param:
            brand_tokens = [t.strip() for t in brand_param.split(",") if t.strip()]
            brand_q = Q()
            for val in brand_tokens:
                brand_q |= (
                    Q(product__brand__slug__iexact=val)
                    | Q(product__brand__name__iexact=val)
                    | Q(product__brand__id__iexact=val if len(val) == 36 else "00000000-0000-0000-0000-000000000000")
                )
            qs = qs.filter(brand_q)

        # 3. Price filter
        min_price = request.query_params.get("min_price")
        if min_price:
            try:
                qs = qs.filter(product__pricing__selling_price__gte=Decimal(min_price))
            except (ValueError, TypeError):
                pass

        max_price = request.query_params.get("max_price")
        if max_price:
            try:
                qs = qs.filter(product__pricing__selling_price__lte=Decimal(max_price))
            except (ValueError, TypeError):
                pass

        # 4. Rating filter
        min_rating = request.query_params.get("min_rating")
        if min_rating:
            try:
                qs = qs.filter(product__average_rating__gte=Decimal(min_rating))
            except (ValueError, TypeError):
                pass

        # 5. In-stock filter
        in_stock = request.query_params.get("in_stock")
        if in_stock in ["true", "True", "1"]:
            qs = qs.filter(
                Q(product__inventory__allow_backorders=True)
                | Q(product__inventory__current_stock__gt=F("product__inventory__reserved_stock"))
                | Q(product__inventory__isnull=True)
            )

        # 6. Sorting / Ordering (preserve curated display_order by default)
        ordering_param = request.query_params.get("ordering", "").strip()
        if ordering_param in ["price_asc", "price"]:
            qs = qs.annotate(
                effective_price_val=Coalesce(F("product__pricing__selling_price"), Value(Decimal("0.00")))
            ).order_by("effective_price_val", "display_order", "-created_at")
        elif ordering_param in ["price_desc", "-price"]:
            qs = qs.annotate(
                effective_price_val=Coalesce(F("product__pricing__selling_price"), Value(Decimal("0.00")))
            ).order_by("-effective_price_val", "display_order", "-created_at")
        elif ordering_param in ["newest", "-newest"]:
            qs = qs.order_by("-product__launched_at", "-product__created_at")
        elif ordering_param in ["rating", "-rating"]:
            qs = qs.order_by("-product__average_rating", "-product__total_reviews", "display_order")
        else:
            # DEFAULT: PRESERVE ADMIN CURATION ORDER
            qs = qs.order_by("display_order", "-created_at")

        paginator = BestSellerPagination()
        page = paginator.paginate_queryset(qs, request)
        
        if page is not None:
            serializer = BestSellerProductSerializer(page, many=True, context={"request": request})
            return paginator.get_paginated_response({"products": serializer.data})

        serializer = BestSellerProductSerializer(qs, many=True, context={"request": request})
        serialized_list = serializer.data

        return Response(
            {
                "success": True,
                "data": {"products": serialized_list},
                "products": serialized_list,
                "count": len(serialized_list),
            },
            status=status.HTTP_200_OK,
        )


# ─── Admin Views ──────────────────────────────────────────────────────────────

class AdminBestSellerBannerView(APIView):
    """
    Admin endpoint for managing the Best Seller banner.
    GET  /api/v1/bestsellers/admin/banner/   — retrieve first (or null)
    POST /api/v1/bestsellers/admin/banner/   — create
    """

    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        banner = BestSellerBanner.objects.first()
        if not banner:
            return Response({"success": True, "data": None})
        return Response({
            "success": True,
            "data": BestSellerBannerSerializer(banner, context={"request": request}).data,
        })

    def post(self, request):
        banner = BestSellerBanner.objects.first()
        if banner:
            serializer = BestSellerBannerSerializer(banner, data=request.data, partial=True, context={"request": request})
        else:
            serializer = BestSellerBannerSerializer(data=request.data, context={"request": request})

        if serializer.is_valid():
            serializer.save()
            return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK if banner else status.HTTP_201_CREATED)
        return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class AdminBestSellerBannerDetailView(APIView):
    """
    Admin endpoint for updating/deleting a specific banner.
    PATCH  /api/v1/bestsellers/admin/banner/<pk>/
    DELETE /api/v1/bestsellers/admin/banner/<pk>/
    """

    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self, pk):
        try:
            return BestSellerBanner.objects.get(pk=pk)
        except BestSellerBanner.DoesNotExist:
            return None

    def patch(self, request, pk):
        banner = self.get_object(pk)
        if not banner:
            return Response({"success": False, "message": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = BestSellerBannerSerializer(banner, data=request.data, partial=True, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response({"success": True, "data": serializer.data})
        return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        banner = self.get_object(pk)
        if not banner:
            return Response({"success": False, "message": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        banner.delete()
        return Response({"success": True, "message": "Banner deleted"}, status=status.HTTP_204_NO_CONTENT)


class AdminBestSellerProductListView(APIView):
    """
    GET  /api/v1/bestsellers/admin/products/  — list all (active + inactive)
    POST /api/v1/bestsellers/admin/products/  — add a product
    """

    permission_classes = [AllowAny]

    def get(self, request):
        qs = (
            BestSellerProduct.objects
            .select_related("product", "product__brand", "product__category", "product__pricing", "product__inventory")
            .prefetch_related("product__images")
            .order_by("display_order", "-created_at")
        )
        serializer = BestSellerProductAdminSerializer(qs, many=True, context={"request": request})
        return Response({"success": True, "data": serializer.data, "count": len(serializer.data)})

    def post(self, request):
        serializer = BestSellerProductAdminSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response({"success": True, "data": serializer.data}, status=status.HTTP_201_CREATED)
        return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class AdminBestSellerProductDetailView(APIView):
    """
    PATCH  /api/v1/bestsellers/admin/products/<pk>/  — update order / active
    DELETE /api/v1/bestsellers/admin/products/<pk>/  — remove
    """

    permission_classes = [AllowAny]

    def get_object(self, pk):
        try:
            return BestSellerProduct.objects.select_related("product").get(pk=pk)
        except BestSellerProduct.DoesNotExist:
            return None

    def patch(self, request, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response({"success": False, "message": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = BestSellerProductAdminSerializer(obj, data=request.data, partial=True, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response({"success": True, "data": serializer.data})
        return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response({"success": False, "message": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        obj.delete()
        return Response({"success": True, "message": "Removed"}, status=status.HTTP_204_NO_CONTENT)
