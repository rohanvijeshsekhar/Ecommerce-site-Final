# Generated for Universal Promotional Banner Drag-and-Drop Visual Positioning Editor

from django.db import migrations, models
import apps.common.image_optimizer


class Migration(migrations.Migration):

    dependencies = [
        ("homepage", "0015_dailyoffer_templates_and_typography"),
    ]

    operations = [
        migrations.AddField(
            model_name="homepagepromobanner",
            name="visual_layout",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Custom positioning, typography, and responsive element coordinates",
                verbose_name="Visual Drag-and-Drop Layout Configuration",
            ),
        ),
        migrations.AddField(
            model_name="heroslide",
            name="visual_layout",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Custom positioning, typography, and responsive element coordinates",
                verbose_name="Visual Drag-and-Drop Layout Configuration",
            ),
        ),
        migrations.AddField(
            model_name="limitedtimeoffer",
            name="visual_layout",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Custom positioning, typography, and responsive element coordinates",
                verbose_name="Visual Drag-and-Drop Layout Configuration",
            ),
        ),
        migrations.AddField(
            model_name="dailyoffer",
            name="visual_layout",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Custom positioning, typography, and responsive element coordinates",
                verbose_name="Visual Drag-and-Drop Layout Configuration",
            ),
        ),
        migrations.CreateModel(
            name="UniversalBanner",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Created At"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="Updated At"),
                ),
                (
                    "name",
                    models.CharField(
                        help_text="Administrative label for identifying this banner in the editor.",
                        max_length=200,
                        verbose_name="Banner Internal Title",
                    ),
                ),
                (
                    "slug",
                    models.SlugField(
                        max_length=200,
                        unique=True,
                        verbose_name="Banner Identifier / Slug",
                    ),
                ),
                (
                    "banner_type",
                    models.CharField(
                        choices=[
                            ("hero", "Hero Slide"),
                            ("daily_offer", "Daily Offer"),
                            ("limited_offer", "Limited Time Offer"),
                            ("promo_strip", "Promotional Strip / Announcement"),
                            ("category_promo", "Category Promotional Banner"),
                            ("brand_promo", "Brand Promotional Banner"),
                            ("bestseller", "Best Sellers Banner"),
                            ("custom", "Custom Campaign Banner"),
                        ],
                        default="promo",
                        max_length=50,
                        verbose_name="Banner Type",
                    ),
                ),
                (
                    "desktop_image",
                    apps.common.image_optimizer.OptimizedImageField(
                        blank=True,
                        null=True,
                        upload_to="homepage/universal_banners/desktop/",
                        verbose_name="Desktop Background Image",
                    ),
                ),
                (
                    "mobile_image",
                    apps.common.image_optimizer.OptimizedImageField(
                        blank=True,
                        null=True,
                        upload_to="homepage/universal_banners/mobile/",
                        verbose_name="Mobile Background Image",
                    ),
                ),
                (
                    "bg_color",
                    models.CharField(
                        blank=True,
                        default="#005F63",
                        max_length=50,
                        verbose_name="Fallback Background Color",
                    ),
                ),
                (
                    "visual_layout",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="Responsive coordinates, typography, layers, and interactive element settings.",
                        verbose_name="Visual Drag-and-Drop Layout Configuration",
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(
                        db_index=True,
                        default=True,
                        verbose_name="Is Active / Visible",
                    ),
                ),
                (
                    "sort_order",
                    models.PositiveSmallIntegerField(
                        db_index=True, default=0, verbose_name="Sort Order"
                    ),
                ),
            ],
            options={
                "verbose_name": "Universal Promotional Banner",
                "verbose_name_plural": "Universal Promotional Banners",
                "ordering": ["sort_order", "-updated_at"],
            },
        ),
    ]
