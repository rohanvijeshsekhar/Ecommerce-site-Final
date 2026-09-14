# Generated for FAAZO Homepage Brand single-image & unique constraint

from django.db import migrations, models
import django.db.models.deletion


def deduplicate_homepage_brands(apps, schema_editor):
    HomepageBrand = apps.get_model("homepage", "HomepageBrand")
    from django.db.models import Count

    duplicate_groups = (
        HomepageBrand.objects.values("brand_id")
        .annotate(cnt=Count("id"))
        .filter(cnt__gt=1)
    )

    for entry in duplicate_groups:
        brand_id = entry["brand_id"]
        # Prioritize the latest created/updated record as canonical
        records = list(
            HomepageBrand.objects.filter(brand_id=brand_id).order_by("-created_at", "-updated_at")
        )
        canonical = records[0]
        redundant = records[1:]

        # Preserve logo_override if canonical is missing one but redundant has one
        if not canonical.logo_override:
            for red in redundant:
                if red.logo_override:
                    canonical.logo_override = red.logo_override
                    canonical.save(update_fields=["logo_override"])
                    break

        for red in redundant:
            red.delete()


class Migration(migrations.Migration):

    dependencies = [
        ("brands", "0001_initial"),
        ("homepage", "0005_alter_limitedtimeoffer_options_and_more"),
    ]

    operations = [
        migrations.RunPython(
            deduplicate_homepage_brands,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterModelOptions(
            name="homepagebrand",
            options={
                "ordering": ["-created_at"],
                "verbose_name": "Homepage Brand",
                "verbose_name_plural": "Homepage Brands",
            },
        ),
        migrations.AlterField(
            model_name="homepagebrand",
            name="brand",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="homepage_showcases",
                to="brands.brand",
                unique=True,
                verbose_name="Brand",
            ),
        ),
    ]
