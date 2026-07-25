from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import ClinicalSolution, ClinicalSolutionProduct
from .serializers import (
    ClinicalSolutionCreateUpdateSerializer,
    ClinicalSolutionDetailSerializer,
    ClinicalSolutionListSerializer,
)


class ClinicalSolutionViewSet(viewsets.ModelViewSet):
    queryset = ClinicalSolution.objects.all()
    lookup_field = "slug"

    def get_permissions(self):
        return [AllowAny()]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ClinicalSolutionDetailSerializer
        if self.action in ["create", "update", "partial_update"]:
            return ClinicalSolutionCreateUpdateSerializer
        return ClinicalSolutionListSerializer

    def get_queryset(self):
        qs = ClinicalSolution.objects.all()
        if not self.request.path.startswith("/api/v1/solutions/admin") and "admin" not in self.request.query_params:
            qs = qs.filter(is_active=True)
            if self.request.query_params.get("homepage") == "true":
                qs = qs.filter(show_on_homepage=True)
        return qs.order_by("display_order", "title")

    def retrieve(self, request, *args, **kwargs):
        lookup = kwargs.get("slug")
        solution = None
        if str(lookup).isdigit():
            solution = ClinicalSolution.objects.filter(pk=lookup).first()
        if not solution:
            solution = ClinicalSolution.objects.filter(slug=lookup).first()
        if not solution:
            return Response({"detail": "Clinical solution not found"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = ClinicalSolutionDetailSerializer(solution, context={"request": request})
        return Response({"success": True, "data": serializer.data})

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        
        status_param = request.query_params.get("status")
        if status_param == "active":
            qs = qs.filter(is_active=True)
        elif status_param == "inactive":
            qs = qs.filter(is_active=False)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(title__icontains=search)

        serializer = ClinicalSolutionListSerializer(qs, many=True, context={"request": request})
        return Response({"success": True, "count": qs.count(), "data": serializer.data})


# ── Admin-Specific API Endpoints ────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def admin_solutions_list_create(request):
    if request.method == "GET":
        qs = ClinicalSolution.objects.all()
        
        status_param = request.query_params.get("status")
        if status_param == "active":
            qs = qs.filter(is_active=True)
        elif status_param == "inactive":
            qs = qs.filter(is_active=False)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(title__icontains=search)

        qs = qs.order_by("display_order", "title")
        serializer = ClinicalSolutionListSerializer(qs, many=True, context={"request": request})
        return Response({"success": True, "count": qs.count(), "data": serializer.data})

    elif request.method == "POST":
        serializer = ClinicalSolutionCreateUpdateSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            solution = serializer.save()
            return Response({
                "success": True,
                "message": "Clinical Solution created successfully",
                "data": ClinicalSolutionDetailSerializer(solution, context={"request": request}).data
            }, status=status.HTTP_201_CREATED)
        return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([AllowAny])
def admin_solution_detail_update_delete(request, pk):
    solution = None
    if str(pk).isdigit():
        solution = ClinicalSolution.objects.filter(pk=pk).first()
    if not solution:
        solution = ClinicalSolution.objects.filter(slug=pk).first()
    if not solution:
        return Response({"success": False, "message": "Clinical Solution not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        serializer = ClinicalSolutionDetailSerializer(solution, context={"request": request})
        return Response({"success": True, "data": serializer.data})

    elif request.method in ["PUT", "PATCH"]:
        serializer = ClinicalSolutionCreateUpdateSerializer(solution, data=request.data, partial=True, context={"request": request})
        if serializer.is_valid():
            updated = serializer.save()
            return Response({
                "success": True,
                "message": "Clinical Solution updated successfully",
                "data": ClinicalSolutionDetailSerializer(updated, context={"request": request}).data
            })
        return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == "DELETE":
        solution.delete()
        return Response({"success": True, "message": "Clinical Solution deleted successfully"})


@api_view(["PATCH"])
@permission_classes([AllowAny])
def admin_solution_toggle_status(request, pk):
    solution = None
    if str(pk).isdigit():
        solution = ClinicalSolution.objects.filter(pk=pk).first()
    if not solution:
        solution = ClinicalSolution.objects.filter(slug=pk).first()
    if not solution:
        return Response({"success": False, "message": "Clinical Solution not found"}, status=status.HTTP_404_NOT_FOUND)
    
    solution.is_active = not solution.is_active
    solution.save()
    return Response({
        "success": True,
        "message": f"Solution status changed to {'Active' if solution.is_active else 'Inactive'}",
        "is_active": solution.is_active
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def admin_solutions_reorder(request):
    orders = request.data.get("orders", [])
    if not isinstance(orders, list):
        return Response({"success": False, "message": "Invalid orders payload format"}, status=status.HTTP_400_BAD_REQUEST)

    for item in orders:
        sol_id = item.get("id")
        order_val = item.get("display_order")
        if sol_id is not None and order_val is not None:
            if str(sol_id).isdigit():
                ClinicalSolution.objects.filter(id=sol_id).update(display_order=order_val)
            else:
                ClinicalSolution.objects.filter(slug=sol_id).update(display_order=order_val)

    return Response({"success": True, "message": "Display order updated successfully"})
