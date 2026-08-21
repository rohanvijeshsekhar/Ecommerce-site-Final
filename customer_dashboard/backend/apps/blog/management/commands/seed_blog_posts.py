from datetime import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.blog.models import BlogCategory, Tag, BlogPost, PostStatus


SEED_ARTICLES = [
    {
        "slug": "maintenance-guide-dental-handpieces",
        "title": "Essential Sterilization & Lubrication Guide for High-Speed Handpieces",
        "excerpt": "Maximize turbine lifespan and prevent premature bearing failure with daily clinical lubrication protocols.",
        "category_name": "Equipment Care",
        "author_name_override": "Dr. Rahul Sharma",
        "published_at": "2026-07-24T10:00:00Z",
        "is_featured": True,
        "tags": ["Handpieces", "Sterilization", "Maintenance"],
        "content": """<p>Operating a high-volume dental practice requires seamless integration between clinical technique and reliable equipment engineering. High-speed handpiece turbines operate at speeds upwards of 400,000 RPM, subjecting miniature ceramic micro-bearings to extreme centrifugal stress, thermal expansion, and fluid contamination.</p>
<h2>Clinical Maintenance Protocols</h2>
<p>Proper sterilization protocols not only meet strict infection control standards but also protect delicate internal components. Always purge air and water lines for 30 seconds post-procedure before detaching the handpiece.</p>
<ul>
  <li><strong>Pre-Cleaning:</strong> Wipe the exterior body with an approved non-abrasive disinfectant wipe. Never submerge handpieces in ultrasonic baths.</li>
  <li><strong>Automated Lubrication:</strong> Use pressurized synthetic lubricant sprays before every autoclave cycle. Ensure oil exits through the chuck mechanism cleanly.</li>
  <li><strong>Autoclaving:</strong> Process handpieces at 134°C (273°F) using standard vacuum autoclaves. Allow complete dry cycles to prevent internal corrosion.</li>
</ul>
<blockquote>Regular maintenance increases handpiece turbine operational lifespan by up to 300%, directly reducing capital replacement expenditure.</blockquote>""",
        "meta_title": "Sterilization & Lubrication Guide for High-Speed Handpieces | FAAZO",
        "meta_description": "Learn essential clinical maintenance protocols to maximize dental handpiece turbine lifespan and prevent premature bearing failure.",
        "meta_keywords": "dental handpiece, sterilization, lubrication, equipment care, turbine lifespan",
    },
    {
        "slug": "cbct-vs-2d-panoramic-imaging",
        "title": "3D CBCT vs 2D Panoramic: Clinical Diagnostic Yield & ROI for Endodontics",
        "excerpt": "Compare diagnostic accuracy in root canal anatomies and calculate practice return on investment for 3D imaging.",
        "category_name": "Imaging & Diagnostics",
        "author_name_override": "Dr. Ananya Patel",
        "published_at": "2026-07-18T10:00:00Z",
        "is_featured": False,
        "tags": ["CBCT", "3D Imaging", "Diagnostics", "Endodontics"],
        "content": """<p>Cone Beam Computed Tomography (CBCT) has transformed modern endodontics and implant planning by providing isotropic 3D volumetric resolution that overcomes anatomical superimposition inherent in traditional 2D radiography.</p>
<h2>Diagnostic Accuracy & Anatomy Visualization</h2>
<p>Studies show that 2D panoramic radiography fails to detect up to 34% of periapical lesions in complex multi-rooted molars. High-resolution CBCT reveals hidden MB2 canals, root fractures, internal resorption, and peri-implant bone defects with sub-millimeter precision.</p>
<h2>Practice ROI & Case Acceptance</h2>
<p>Investing in 3D imaging elevates diagnostic confidence and patient communication. Showing 3D anatomical reconstructions during treatment consultations significantly improves patient trust and case acceptance rates for complex procedures.</p>""",
        "meta_title": "3D CBCT vs 2D Panoramic: Diagnostic Yield & ROI | FAAZO",
        "meta_description": "Compare 3D CBCT volumetric imaging against 2D panoramic radiography for endodontic accuracy and clinic investment return.",
        "meta_keywords": "CBCT, 3D imaging, panoramic radiography, endodontics, diagnostic yield",
    },
    {
        "slug": "choosing-the-right-dental-chair",
        "title": "Ergonomic Criteria for Selecting Ergonomic Patient Chairs in High-Volume Clinics",
        "excerpt": "Reduce practitioner lumbar fatigue and improve patient comfort during extended restorative sessions.",
        "category_name": "Practice Setup",
        "author_name_override": "FAAZO Engineering Team",
        "published_at": "2026-07-10T10:00:00Z",
        "is_featured": False,
        "tags": ["Dental Chairs", "Ergonomics", "Practice Setup"],
        "content": """<p>Dental practitioners suffer from high rates of occupational musculoskeletal disorders. Selecting the right patient delivery system and ergonomic chair geometry is paramount for long-term career longevity and clinical efficiency.</p>
<h2>Key Ergonomic Selection Criteria</h2>
<p>When evaluating clinical chairs, consider thin backrest profiles, double-articulating headrests, and smooth hydraulic elevation movement that allows proper leg position without forcing spinal flexion.</p>
<ul>
  <li><strong>Thin Backrest Design:</strong> Enables close proximity to the patient without reaching or twisting the lumbar spine.</li>
  <li><strong>Seamless Upholstery:</strong> High-grade antimicrobial upholstery allows effortless wiping and compliance with clinical sanitation standards.</li>
  <li><strong>Integrated Delivery Unit:</strong> Flexible whip-arm or over-the-patient delivery systems reduce repetitive shoulder strain during 8-hour clinic days.</li>
</ul>""",
        "meta_title": "Selecting Ergonomic Dental Patient Chairs | FAAZO",
        "meta_description": "Discover essential ergonomic selection criteria for dental patient chairs to reduce practitioner fatigue and improve clinical efficiency.",
        "meta_keywords": "dental chair, ergonomics, clinic setup, patient chair selection",
    },
]


class Command(BaseCommand):
    help = "Idempotently seed the initial 3 hardcoded blog posts into database BlogPost records."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding hardcoded blog articles into database..."))
        seeded_count = 0

        for art_data in SEED_ARTICLES:
            cat, _ = BlogCategory.objects.get_or_create(
                name=art_data["category_name"],
            )

            pub_datetime = datetime.fromisoformat(art_data["published_at"].replace("Z", "+00:00"))

            post, created = BlogPost.objects.update_or_create(
                slug=art_data["slug"],
                defaults={
                    "title": art_data["title"],
                    "excerpt": art_data["excerpt"],
                    "content": art_data["content"],
                    "category": cat,
                    "author_name_override": art_data["author_name_override"],
                    "status": PostStatus.PUBLISHED,
                    "is_featured": art_data["is_featured"],
                    "published_at": pub_datetime,
                    "meta_title": art_data["meta_title"],
                    "meta_description": art_data["meta_description"],
                    "meta_keywords": art_data["meta_keywords"],
                },
            )

            # Assign tags
            tag_objs = []
            for tag_name in art_data["tags"]:
                tobj, _ = Tag.objects.get_or_create(name=tag_name)
                tag_objs.append(tobj)
            post.tags.set(tag_objs)

            status_str = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"  [{status_str}] BlogPost: {post.title} (slug={post.slug})"))
            seeded_count += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {seeded_count} blog posts (Idempotent execution)."))
