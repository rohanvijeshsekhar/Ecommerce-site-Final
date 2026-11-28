from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("homepage", "0017_alter_dailyoffer_cta_text_alter_dailyoffer_theme_and_more"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE homepage_homepagepromobanner 
                    ADD COLUMN IF NOT EXISTS border_color varchar(50) DEFAULT '#005F63';
                    """,
                    reverse_sql="""
                    ALTER TABLE homepage_homepagepromobanner 
                    DROP COLUMN IF EXISTS border_color;
                    """,
                ),
            ],
            state_operations=[
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
            ],
        ),
    ]
