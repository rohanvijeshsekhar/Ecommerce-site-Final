import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from apps.common.image_optimizer import OptimizedImageField



class BlogCategory(models.Model):
    """
    Categories for organizing blog articles (e.g. Equipment Care, Imaging & Diagnostics, Practice Setup).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Category Name")
    slug = models.SlugField(max_length=255, unique=True, db_index=True, verbose_name="Slug")
    description = models.TextField(blank=True, verbose_name="Description")
    is_active = models.BooleanField(default=True, db_index=True, verbose_name="Is Active")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "blog_categories"
        verbose_name = "Blog Category"
        verbose_name_plural = "Blog Categories"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while BlogCategory.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


class Tag(models.Model):
    """
    Tags for many-to-many indexing of blog posts.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, verbose_name="Tag Name")
    slug = models.SlugField(max_length=100, unique=True, db_index=True, verbose_name="Slug")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")

    class Meta:
        db_table = "blog_tags"
        verbose_name = "Blog Tag"
        verbose_name_plural = "Blog Tags"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Tag.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


class PostStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    PUBLISHED = "PUBLISHED", "Published"
    ARCHIVED = "ARCHIVED", "Archived"


class BlogPost(models.Model):
    """
    Core BlogPost model for FAAZO Production Blog CMS.
    Enforces status workflow (DRAFT, PUBLISHED, ARCHIVED), SEO metadata,
    author attribution, rich content, and unique indexed slugs.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, verbose_name="Article Title")
    slug = models.SlugField(max_length=255, unique=True, blank=True, db_index=True, verbose_name="Slug")
    excerpt = models.TextField(blank=True, verbose_name="Short Summary / Excerpt")
    content = models.TextField(blank=True, verbose_name="Article Content (HTML/Rich-Text)")
    featured_image = OptimizedImageField(
        upload_to="blog/featured/%Y/%m/",
        null=True,
        blank=True,
        verbose_name="Featured Image",
    )
    featured_image_url = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name="External / Fallback Featured Image URL",
    )

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="blog_posts",
        verbose_name="Author User",
    )
    author_name_override = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Author Display Name Override",
        help_text="Custom author name (e.g. 'Dr. Rahul Sharma' or 'FAAZO Engineering Team')",
    )

    category = models.ForeignKey(
        BlogCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="posts",
        verbose_name="Category",
    )
    tags = models.ManyToManyField(
        Tag,
        blank=True,
        related_name="posts",
        verbose_name="Tags",
    )

    status = models.CharField(
        max_length=20,
        choices=PostStatus.choices,
        default=PostStatus.DRAFT,
        db_index=True,
        verbose_name="Publish Status",
    )
    is_featured = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Is Featured Article",
    )
    published_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Published At Date/Time",
    )

    # SEO & OpenGraph Fields
    meta_title = models.CharField(max_length=255, blank=True, verbose_name="SEO Meta Title")
    meta_description = models.TextField(blank=True, verbose_name="SEO Meta Description")
    meta_keywords = models.CharField(max_length=255, blank=True, verbose_name="SEO Meta Keywords")
    canonical_url = models.CharField(max_length=500, blank=True, verbose_name="Canonical URL")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "blog_posts"
        verbose_name = "Blog Post"
        verbose_name_plural = "Blog Posts"
        ordering = ["-published_at", "-created_at"]
        indexes = [
            models.Index(fields=["status", "published_at"]),
            models.Index(fields=["slug"]),
            models.Index(fields=["is_featured", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} [{self.status}]"

    @property
    def author_display_name(self) -> str:
        if self.author_name_override.strip():
            return self.author_name_override.strip()
        if self.author:
            name = getattr(self.author, "full_name", "").strip()
            if name:
                return name
            return self.author.email
        return "FAAZO Editorial Team"

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while BlogPost.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug

        # Automatically set published_at when transitioning to PUBLISHED if empty
        if self.status == PostStatus.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()

        super().save(*args, **kwargs)
