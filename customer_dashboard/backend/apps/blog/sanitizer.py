import re
from html.parser import HTMLParser
from typing import List, Tuple

ALLOWED_TAGS = {
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr",
    "b", "strong", "i", "em", "u", "s", "sub", "sup",
    "ul", "ol", "li",
    "a", "img", "blockquote", "figure", "figcaption",
    "span", "div", "pre", "code",
    "table", "thead", "tbody", "tr", "th", "td",
}

ALLOWED_ATTRIBUTES = {
    "a": {"href", "title", "target", "rel"},
    "img": {"src", "alt", "title", "width", "height", "class"},
    "code": {"class"},
    "span": {"class"},
    "p": {"class"},
    "div": {"class"},
    "td": {"colspan", "rowspan"},
    "th": {"colspan", "rowspan"},
}


class BlogHTMLSanitizer(HTMLParser):
    """
    Strict HTML Sanitizer Parser.
    Strip dangerous tags (script, iframe, style, object, embed, form, input, button)
    and dangerous attributes (on*, javascript: URLs, data: text/html).
    """

    def __init__(self):
        super().__init__()
        self.result: List[str] = []
        self.ignore_depth = 0

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, str]]):
        tag_lower = tag.lower()
        if tag_lower in {"script", "style", "iframe", "object", "embed", "applet", "form", "input", "button", "textarea"}:
            self.ignore_depth += 1
            return

        if self.ignore_depth > 0:
            return

        if tag_lower not in ALLOWED_TAGS:
            return

        cleaned_attrs = []
        allowed_attr_names = ALLOWED_ATTRIBUTES.get(tag_lower, set())

        for attr, value in attrs:
            attr_lower = attr.lower()
            if attr_lower.startswith("on"):
                continue  # strip inline JS event listeners (onerror, onclick, etc.)

            if attr_lower in allowed_attr_names:
                val = value or ""
                # Prevent javascript: or data: URIs in href / src
                if attr_lower in {"href", "src"}:
                    cleaned_val = val.strip().lower()
                    if cleaned_val.startswith("javascript:") or cleaned_val.startswith("vbscript:") or cleaned_val.startswith("data:text/html"):
                        continue
                cleaned_attrs.append(f'{attr_lower}="{self.escape_attr_value(val)}"')

        attr_str = (" " + " ".join(cleaned_attrs)) if cleaned_attrs else ""
        self.result.append(f"<{tag_lower}{attr_str}>")

    def handle_endtag(self, tag: str):
        tag_lower = tag.lower()
        if tag_lower in {"script", "style", "iframe", "object", "embed", "applet", "form", "input", "button", "textarea"}:
            if self.ignore_depth > 0:
                self.ignore_depth -= 1
            return

        if self.ignore_depth > 0:
            return

        if tag_lower in ALLOWED_TAGS and tag_lower not in {"br", "hr", "img"}:
            self.result.append(f"</{tag_lower}>")

    def handle_data(self, data: str):
        if self.ignore_depth > 0:
            return
        # Escape raw < and > in text nodes
        escaped_data = data.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        self.result.append(escaped_data)

    def handle_entityref(self, name: str):
        if self.ignore_depth > 0:
            return
        self.result.append(f"&{name};")

    def handle_charref(self, name: str):
        if self.ignore_depth > 0:
            return
        self.result.append(f"&#{name};")

    def escape_attr_value(self, val: str) -> str:
        return val.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")

    def get_clean_html(self) -> str:
        return "".join(self.result)


def sanitize_blog_html(html_content: str) -> str:
    """
    Sanitize raw HTML input to produce clean, XSS-safe HTML string.
    """
    if not html_content or not html_content.strip():
        return ""

    sanitizer = BlogHTMLSanitizer()
    try:
        sanitizer.feed(html_content)
        sanitizer.close()
        return sanitizer.get_clean_html()
    except Exception:
        # Fallback basic regex strip if parser encounters critical malformed error
        cleaned = re.sub(r"<(script|style|iframe|object|embed)[^>]*>.*?</\1>", "", html_content, flags=re.DOTALL | re.IGNORECASE)
        cleaned = re.sub(r"on\w+\s*=\s*[\"'][^\"']*[\"']", "", cleaned, flags=re.IGNORECASE)
        return cleaned
