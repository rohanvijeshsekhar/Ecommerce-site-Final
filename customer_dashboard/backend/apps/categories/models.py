"""
FAAZO – Category Models

Design decisions:
- Adjacency list (self-referential FK) supports unlimited nesting depth.
- No MPTT/CTE dependency — safe for dental catalog depth (typically ≤ 5 levels).
- get_ancestors() / get_descendants() use recursive Python iteration,
  not recursive SQL, keeping queries simple and debuggable.
- full_path property: "Dental Chairs > Accessories > Headrests"
- Categories are soft-deletable but only if they have no active products.
"""

from django.db import models
from django.utils.text import slugify

from apps.common.image_optimizer import OptimizedImageField
from apps.common.mixins import BaseModel



# ============================================================
# Category
# ============================================================

class Category(BaseModel):
    """
    Unlimited depth catalog taxonomy via self-referential FK.

    Nesting:
        parent=None           → root category  (e.g. "Dental Chairs")
        parent=<Category>     → child category (e.g. "Accessories")
        parent=<Category>     → sub-child      (e.g. "Headrests")
        ... (no depth limit)

    The customer UX can render any level of depth as needed.
    The admin UI renders this as an indented tree.
    """

    class Meta:
        verbose_name = "Category"
        verbose_name_plural = "Categories"
        ordering = ["sort_order", "name"]

    # ── Identity ─────────────────────────────────────────────

    name = models.CharField(
        max_length=200,
        verbose_name="Name",
    )
    slug = models.SlugField(
        max_length=220,
        unique=True,
        blank=True,
        db_index=True,
        verbose_name="Slug",
    )
    description = models.TextField(
        blank=True,
        verbose_name="Description",
    )

    # ── Hierarchy ────────────────────────────────────────────

    parent = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,  # cannot delete a category that has children
        null=True,
        blank=True,
        related_name="children",
        db_index=True,
        verbose_name="Parent Category",
        help_text="Leave blank for root-level categories.",
    )

    # ── Display ──────────────────────────────────────────────

    image = OptimizedImageField(
        upload_to="categories/images/",
        null=True,
        blank=True,
        verbose_name="Category Image",
    )
    sort_order = models.PositiveSmallIntegerField(
        default=0,
        db_index=True,
        verbose_name="Sort Order",
        help_text="Lower numbers appear first within the same parent.",
    )

    # ── Admin ────────────────────────────────────────────────

    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Active",
    )

    # ── Lifecycle ────────────────────────────────────────────

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            n = 1
            while Category.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.full_path

    # ── Hierarchy helpers ────────────────────────────────────

    @property
    def full_path(self) -> str:
        """
        Returns the full breadcrumb path.
        Example: "Dental Chairs > Accessories > Headrests"
        """
        parts = [self.name]
        node = self
        while node.parent_id is not None:
            node = node.parent
            parts.insert(0, node.name)
        return " > ".join(parts)

    @property
    def depth(self) -> int:
        """Depth from root. Root categories have depth=0."""
        d = 0
        node = self
        while node.parent_id is not None:
            node = node.parent
            d += 1
        return d

    @property
    def ancestors(self):
        """
        Returns a list of ancestor Category instances from root to parent.
        Ordered: [root, ..., immediate_parent]
        """
        ancestors = []
        node = self
        while node.parent_id is not None:
            node = node.parent
            ancestors.insert(0, node)
        return ancestors

    def get_descendants(self, include_self=False):
        """
        Returns a flat list of all descendant Category instances.
        Uses BFS to avoid deep recursion.
        """
        result = []
        if include_self:
            result.append(self)
        queue = list(self.children.filter(is_active=True))
        while queue:
            child = queue.pop(0)
            result.append(child)
            queue.extend(child.children.filter(is_active=True))
        return result

    @property
    def is_leaf(self) -> bool:
        """True if this category has no child categories."""
        return not self.children.exists()

    @property
    def is_root(self) -> bool:
        """True if this category has no parent."""
        return self.parent_id is None

    @property
    def active_product_count(self) -> int:
        """
        Count of active products in this category and all its descendants.
        """
        descendants = self.get_descendants(include_self=True)
        from apps.products.models import Product
        return Product.objects.filter(
            category__in=descendants,
            is_deleted=False,
            status="active"
        ).count()
