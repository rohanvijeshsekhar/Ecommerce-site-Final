from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.blog.models import BlogCategory, Tag, BlogPost, PostStatus
from apps.blog.sanitizer import sanitize_blog_html

User = get_user_model()


class BlogModelAndSanitizerTestCase(TestCase):
    def setUp(self):
        self.category = BlogCategory.objects.create(name="Equipment Care", description="Equipment maintenance guides")
        self.tag = Tag.objects.create(name="Handpiece")

    def test_blog_post_creation_and_auto_slug(self):
        post = BlogPost.objects.create(
            title="Essential Handpiece Sterilization",
            excerpt="Daily care steps for handpiece turbines.",
            content="<p>Clean thoroughly.</p>",
            category=self.category,
            status=PostStatus.DRAFT,
        )
        self.assertEqual(post.slug, "essential-handpiece-sterilization")
        self.assertEqual(post.status, PostStatus.DRAFT)
        self.assertIsNone(post.published_at)

    def test_unique_slug_generation(self):
        post1 = BlogPost.objects.create(title="Handpiece Sterilization", status=PostStatus.DRAFT)
        post2 = BlogPost.objects.create(title="Handpiece Sterilization", status=PostStatus.DRAFT)
        self.assertEqual(post1.slug, "handpiece-sterilization")
        self.assertEqual(post2.slug, "handpiece-sterilization-1")

    def test_auto_published_at_timestamp(self):
        post = BlogPost.objects.create(title="Published Article", status=PostStatus.PUBLISHED)
        self.assertIsNotNone(post.published_at)
        self.assertLessEqual(post.published_at, timezone.now())

    def test_html_sanitizer_removes_dangerous_tags_and_events(self):
        malicious_html = """
        <h1>Safe Title</h1>
        <p>Safe text with <a href="javascript:alert(1)">bad link</a> and <a href="https://faazo.com">good link</a>.</p>
        <script>alert('xss');</script>
        <iframe src="http://attacker.com"></iframe>
        <img src="valid.jpg" onerror="alert('hack')" alt="Valid Image" />
        """
        clean_html = sanitize_blog_html(malicious_html)

        self.assertNotIn("<script>", clean_html)
        self.assertNotIn("<iframe>", clean_html)
        self.assertNotIn("onerror", clean_html)
        self.assertNotIn("javascript:", clean_html)
        self.assertIn("<h1>Safe Title</h1>", clean_html)
        self.assertIn('<a href="https://faazo.com">good link</a>', clean_html)
        self.assertIn('alt="Valid Image"', clean_html)


class PublicBlogApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.cat_equipment = BlogCategory.objects.create(name="Equipment Care", slug="equipment-care")
        self.cat_imaging = BlogCategory.objects.create(name="Imaging", slug="imaging")
        self.tag_handpiece = Tag.objects.create(name="Handpiece", slug="handpiece")

        # Published post
        self.pub_post = BlogPost.objects.create(
            title="Published Article Guide",
            slug="published-article-guide",
            excerpt="Published excerpt",
            content="<p>Published content</p>",
            category=self.cat_equipment,
            status=PostStatus.PUBLISHED,
            published_at=timezone.now(),
            meta_title="SEO Title",
            meta_description="SEO Description",
        )
        self.pub_post.tags.add(self.tag_handpiece)

        # Draft post
        self.draft_post = BlogPost.objects.create(
            title="Draft Article Secret",
            slug="draft-article-secret",
            excerpt="Draft excerpt",
            content="<p>Draft content</p>",
            category=self.cat_equipment,
            status=PostStatus.DRAFT,
        )

        # Archived post
        self.archived_post = BlogPost.objects.create(
            title="Archived Old Article",
            slug="archived-old-article",
            excerpt="Archived excerpt",
            content="<p>Archived content</p>",
            category=self.cat_imaging,
            status=PostStatus.ARCHIVED,
            published_at=timezone.now(),
        )

    def test_public_blog_list_shows_only_published(self):
        response = self.client.get("/api/v1/blog/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data["success"])
        items = data["data"]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["slug"], "published-article-guide")

    def test_public_blog_detail_published_ok(self):
        response = self.client.get("/api/v1/blog/published-article-guide/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["data"]["title"], "Published Article Guide")
        self.assertEqual(data["data"]["meta_title"], "SEO Title")

    def test_public_blog_detail_draft_returns_404(self):
        response = self.client.get("/api/v1/blog/draft-article-secret/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_public_blog_detail_archived_returns_404(self):
        response = self.client.get("/api/v1/blog/archived-old-article/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_public_blog_detail_nonexistent_returns_404(self):
        response = self.client.get("/api/v1/blog/random-invalid-slug/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_category_and_tag_filtering(self):
        response_cat = self.client.get("/api/v1/blog/?category=equipment-care")
        self.assertEqual(response_cat.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_cat.json()["data"]), 1)

        response_tag = self.client.get("/api/v1/blog/?tag=handpiece")
        self.assertEqual(response_tag.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_tag.json()["data"]), 1)

        response_empty = self.client.get("/api/v1/blog/?category=imaging")
        self.assertEqual(response_empty.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_empty.json()["data"]), 0)

    def test_blog_search(self):
        response = self.client.get("/api/v1/blog/?q=Published")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()["data"]), 1)

        response_nomatch = self.client.get("/api/v1/blog/?q=NonExistentKeyword")
        self.assertEqual(response_nomatch.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_nomatch.json()["data"]), 0)


class AdminBlogApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_superuser(
            email="admin@faazo.com",
            password="adminpassword123",
            full_name="FAAZO Admin",
            role="admin",
        )
        self.customer_user = User.objects.create_user(
            email="customer@faazo.com",
            password="customerpassword123",
            full_name="Dr. Customer",
            role="customer",
        )
        self.category = BlogCategory.objects.create(name="Clinical Tips", slug="clinical-tips")

    def test_customer_cannot_access_admin_blog_api(self):
        self.client.force_authenticate(user=self.customer_user)

        # GET admin list
        res_get = self.client.get("/api/v1/blog/admin/")
        self.assertEqual(res_get.status_code, status.HTTP_403_FORBIDDEN)

        # POST admin create
        res_post = self.client.post("/api/v1/blog/admin/", {"title": "Test Title"})
        self.assertEqual(res_post.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_access_admin_blog_api(self):
        res = self.client.get("/api/v1/blog/admin/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_crud_workflow(self):
        self.client.force_authenticate(user=self.admin_user)

        # 1. Create Draft Post
        create_payload = {
            "title": "New Clinical Research Guide",
            "excerpt": "Short excerpt for research guide",
            "content": "<p>Rich content with <script>alert(1)</script> dangerous tags.</p>",
            "category_id": str(self.category.id),
            "tag_names": ["Research", "Clinical"],
            "status": "DRAFT",
            "meta_title": "SEO Title Test",
        }
        res_create = self.client.post("/api/v1/blog/admin/", create_payload, format="json")
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        post_id = res_create.json()["data"]["id"]
        post_slug = res_create.json()["data"]["slug"]

        # Verify content was sanitized on creation
        self.assertNotIn("<script>", res_create.json()["data"]["content"])

        # Verify post is in DRAFT status and NOT visible publicly
        res_pub_detail = self.client.get(f"/api/v1/blog/{post_slug}/")
        self.assertEqual(res_pub_detail.status_code, status.HTTP_404_NOT_FOUND)

        # 2. Publish Action
        res_pub = self.client.post(f"/api/v1/blog/admin/{post_id}/publish/")
        self.assertEqual(res_pub.status_code, status.HTTP_200_OK)
        self.assertEqual(res_pub.json()["data"]["status"], "PUBLISHED")

        # Verify NOW visible publicly
        res_pub_detail2 = self.client.get(f"/api/v1/blog/{post_slug}/")
        self.assertEqual(res_pub_detail2.status_code, status.HTTP_200_OK)

        # 3. Edit / Patch Post
        res_patch = self.client.patch(f"/api/v1/blog/admin/{post_id}/", {"title": "Updated Clinical Research Title"}, format="json")
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(res_patch.json()["data"]["title"], "Updated Clinical Research Title")

        # 4. Draft Action
        res_draft = self.client.post(f"/api/v1/blog/admin/{post_id}/draft/")
        self.assertEqual(res_draft.status_code, status.HTTP_200_OK)
        self.assertEqual(res_draft.json()["data"]["status"], "DRAFT")

        # Verify removed from public
        res_pub_detail3 = self.client.get(f"/api/v1/blog/{post_slug}/")
        self.assertEqual(res_pub_detail3.status_code, status.HTTP_404_NOT_FOUND)

        # 5. Archive Action
        res_archive = self.client.post(f"/api/v1/blog/admin/{post_id}/archive/")
        self.assertEqual(res_archive.status_code, status.HTTP_200_OK)
        self.assertEqual(res_archive.json()["data"]["status"], "ARCHIVED")

        # 6. Delete Action
        res_del = self.client.delete(f"/api/v1/blog/admin/{post_id}/")
        self.assertEqual(res_del.status_code, status.HTTP_200_OK)

        # Verify permanently deleted
        res_get_del = self.client.get(f"/api/v1/blog/admin/{post_id}/")
        self.assertEqual(res_get_del.status_code, status.HTTP_404_NOT_FOUND)
