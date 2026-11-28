# Generated for ComboDealBannerSetting visual_layout

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("combos", "0002_combodealbannersetting"),
    ]

    operations = [
        migrations.AddField(
            model_name="combodealbannersetting",
            name="visual_layout",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Custom positioning, typography, and responsive element coordinates",
                verbose_name="Visual Drag-and-Drop Layout Configuration",
            ),
        ),
    ]
