from django.db import models
from django.utils.text import slugify

from apps.common.image_optimizer import OptimizedImageField
from apps.products.models import Product


class ClinicalSolution(models.Model):
    title = models.CharField(max_length=255, verbose_name="Solution Title")
    slug = models.SlugField(max_length=255, unique=True, blank=True, verbose_name="Slug")
    short_description = models.TextField(blank=True, verbose_name="Short Description")
    description = models.TextField(blank=True, verbose_name="Detailed Description / Clinical Overview")
    
    banner_image = OptimizedImageField(upload_to="solutions/banners/", null=True, blank=True, verbose_name="Banner Image")
    banner_image_url = models.CharField(max_length=500, blank=True, null=True, verbose_name="Banner Image URL")
    thumbnail_image = OptimizedImageField(upload_to="solutions/thumbnails/", null=True, blank=True, verbose_name="Thumbnail Image")
    thumbnail_image_url = models.CharField(max_length=500, blank=True, null=True, verbose_name="Thumbnail Image URL")

    
    display_order = models.IntegerField(default=0, verbose_name="Display Order")
    is_active = models.BooleanField(default=True, verbose_name="Is Active")
    show_on_homepage = models.BooleanField(default=True, verbose_name="Show on Homepage")
    
    seo_title = models.CharField(max_length=255, blank=True, verbose_name="SEO Title")
    seo_description = models.TextField(blank=True, verbose_name="SEO Description")
    seo_keywords = models.CharField(max_length=255, blank=True, verbose_name="SEO Keywords")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Clinical Solution"
        verbose_name_plural = "Clinical Solutions"
        ordering = ["display_order", "title"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while ClinicalSolution.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def product_count(self):
        return self.solution_products.count()


class ClinicalSolutionProduct(models.Model):
    clinical_solution = models.ForeignKey(
        ClinicalSolution,
        related_name="solution_products",
        on_delete=models.CASCADE
    )
    product = models.ForeignKey(
        Product,
        related_name="solution_mappings",
        on_delete=models.CASCADE
    )
    display_order = models.IntegerField(default=0, verbose_name="Display Order")
    is_featured = models.BooleanField(default=False, verbose_name="Is Featured Inside Solution")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Clinical Solution Product Mapping"
        verbose_name_plural = "Clinical Solution Product Mappings"
        ordering = ["-is_featured", "display_order", "id"]
        unique_together = ["clinical_solution", "product"]

    def __str__(self):
        return f"{self.clinical_solution.title} -> {self.product.name}"
