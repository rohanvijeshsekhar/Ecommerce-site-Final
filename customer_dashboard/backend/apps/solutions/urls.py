from django.urls import path
from .views import (
    ClinicalSolutionViewSet,
    admin_solutions_list_create,
    admin_solution_detail_update_delete,
    admin_solution_toggle_status,
    admin_solutions_reorder,
)

urlpatterns = [
    # Customer APIs
    path("", ClinicalSolutionViewSet.as_view({"get": "list"}), name="solution-list"),
    path("<slug:slug>/", ClinicalSolutionViewSet.as_view({"get": "retrieve"}), name="solution-detail"),

    # Admin APIs
    path("admin/list/", admin_solutions_list_create, name="admin-solution-list-create"),
    path("admin/<str:pk>/", admin_solution_detail_update_delete, name="admin-solution-detail-update-delete"),
    path("admin/<str:pk>/status/", admin_solution_toggle_status, name="admin-solution-toggle-status"),
    path("admin/reorder/batch/", admin_solutions_reorder, name="admin-solutions-reorder"),
]
