from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("homepage", "0017_alter_dailyoffer_cta_text_alter_dailyoffer_theme_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="homepagepromobanner",
            name="border_color",
            field=models.CharField(
                blank=True,
                default="#005F63",
                help_text="Hex color for optional border, e.g. #005F63",
                max_length=50,
                verbose_name="Border Color",
            ),
        ),
    ]
