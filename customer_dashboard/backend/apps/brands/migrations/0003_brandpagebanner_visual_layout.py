# Generated for BrandPageBanner visual_layout

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("brands", "0002_alter_brand_options_brand_banner_image_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="brandpagebanner",
            name="visual_layout",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Custom positioning, typography, and responsive element coordinates",
                verbose_name="Visual Drag-and-Drop Layout Configuration",
            ),
        ),
    ]
