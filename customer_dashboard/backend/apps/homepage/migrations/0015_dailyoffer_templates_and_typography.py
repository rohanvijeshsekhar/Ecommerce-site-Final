# Generated manually for DailyOffer template and typography system

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("homepage", "0014_branddeal_accent_color_branddeal_bg_color_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="dailyoffer",
            name="countdown_template",
            field=models.CharField(
                choices=[
                    ("minimal_inline", "Minimal Inline"),
                    ("compact_cards", "Compact Cards"),
                    ("elegant_text", "Elegant Text Countdown"),
                    ("outlined", "Outlined Countdown"),
                    ("dark_premium", "Dark Premium Countdown"),
                ],
                default="minimal_inline",
                max_length=30,
                verbose_name="Countdown Design Template",
            ),
        ),
        migrations.AddField(
            model_name="dailyoffer",
            name="countdown_size",
            field=models.CharField(
                choices=[("compact", "Compact"), ("regular", "Regular"), ("large", "Large")],
                default="regular",
                max_length=20,
                verbose_name="Countdown Size",
            ),
        ),
        migrations.AddField(
            model_name="dailyoffer",
            name="expired_behavior",
            field=models.CharField(
                choices=[
                    ("show_expired_badge", "Show Expired Badge"),
                    ("hide_cta", "Hide CTA Button"),
                    ("disable_cta", "Disable CTA Button"),
                ],
                default="show_expired_badge",
                max_length=30,
                verbose_name="Expired Offer Behaviour",
            ),
        ),
        migrations.AddField(
            model_name="dailyoffer",
            name="cta_template",
            field=models.CharField(
                choices=[
                    ("solid", "Minimal Solid"),
                    ("outline", "Outline"),
                    ("text_link", "Text Link"),
                    ("soft_filled", "Soft Filled"),
                    ("dark_premium", "Premium Dark"),
                ],
                default="solid",
                max_length=30,
                verbose_name="CTA Design Template",
            ),
        ),
        migrations.AddField(
            model_name="dailyoffer",
            name="cta_size",
            field=models.CharField(
                choices=[("small", "Small"), ("medium", "Medium"), ("large", "Large")],
                default="medium",
                max_length=20,
                verbose_name="CTA Button Size",
            ),
        ),
        migrations.AddField(
            model_name="dailyoffer",
            name="cta_border_radius",
            field=models.CharField(
                choices=[
                    ("none", "Square (None)"),
                    ("sm", "Subtle (Small)"),
                    ("md", "Medium Rounded"),
                    ("lg", "Large Rounded"),
                    ("full", "Pill (Full)"),
                ],
                default="md",
                max_length=20,
                verbose_name="CTA Border Radius",
            ),
        ),
        migrations.AddField(
            model_name="dailyoffer",
            name="cta_show_arrow",
            field=models.BooleanField(
                default=True,
                verbose_name="Show Arrow Icon on CTA",
            ),
        ),
        migrations.AddField(
            model_name="dailyoffer",
            name="cta_open_in_new_tab",
            field=models.BooleanField(
                default=False,
                verbose_name="Open CTA Link in New Tab",
            ),
        ),
        migrations.AddField(
            model_name="dailyoffer",
            name="heading_font_family",
            field=models.CharField(
                blank=True,
                default="Inter",
                max_length=50,
                verbose_name="Heading Font Family",
            ),
        ),
        migrations.AddField(
            model_name="dailyoffer",
            name="description_font_family",
            field=models.CharField(
                blank=True,
                default="Inter",
                max_length=50,
                verbose_name="Description Font Family",
            ),
        ),
        migrations.AddField(
            model_name="dailyoffer",
            name="countdown_font_family",
            field=models.CharField(
                blank=True,
                default="Inter",
                max_length=50,
                verbose_name="Countdown Font Family",
            ),
        ),
        migrations.AddField(
            model_name="dailyoffer",
            name="cta_font_family",
            field=models.CharField(
                blank=True,
                default="Inter",
                max_length=50,
                verbose_name="CTA Button Font Family",
            ),
        ),
        migrations.AddField(
            model_name="dailyoffer",
            name="cta_font_weight",
            field=models.CharField(
                choices=[
                    ("normal", "Normal (400)"),
                    ("medium", "Medium (500)"),
                    ("semibold", "Semibold (600)"),
                    ("bold", "Bold (700)"),
                    ("extrabold", "Extrabold (800)"),
                ],
                default="bold",
                max_length=20,
                verbose_name="CTA Font Weight",
            ),
        ),
    ]
