#!/usr/bin/env python3
"""Bundle the static Flightdeck application as one offline HTML file using Python 3."""

import argparse
import base64
import json
import mimetypes
import re
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = Path("flightdeck-737.html")
CSS_URL = re.compile(r"""url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"]*))\s*\)""", re.I)
ASSET_TYPES = {
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
}


def local_path(base, reference):
    ref = urlsplit(reference)
    if ref.scheme or ref.netloc or ref.path.startswith("/"):
        raise ValueError(f"Offline resource must be a local relative path: {reference}")
    path = (base / unquote(ref.path)).resolve()
    if ROOT not in path.parents or not path.is_file():
        raise ValueError(f"Missing local resource: {reference}")
    return path


def asset_type(path):
    return ASSET_TYPES.get(path.suffix.lower()) or mimetypes.guess_type(path.name)[0]


def data_uri(path):
    mime = asset_type(path)
    if not mime or not mime.startswith(("image/", "font/", "audio/")):
        raise ValueError(f"Unsupported offline asset type: {path.name}")
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def script_tag(code):
    # An HTML parser recognizes the end tag even when it occurs in a JS string.
    if re.search(r"</script\b", code, re.I):
        raise ValueError("An embedded script contains a literal closing script tag")
    return "<script>\n" + code + "\n</script>"


class OfflinePage(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.html = []
        self.scripts = []
        self.external_script = False
        self.style_assets = {}
        # Runtime markup can choose different map icons and camera views.
        self.assets = {}
        for path in sorted((ROOT / "assets").rglob("*")):
            if path.is_file() and (asset_type(path) or "").startswith(("image/", "font/", "audio/")):
                self.assets[path.relative_to(ROOT).as_posix()] = data_uri(path)

    def stylesheet(self, path):
        css = path.read_text(encoding="utf-8")
        if re.search(r"@import\b", css, re.I):
            raise ValueError(f"Use local stylesheet links instead of @import in {path.name}")

        def replace_url(match):
            reference = next(value for value in match.groups() if value is not None).strip()
            if reference.startswith(("data:", "#")):
                return match.group(0)
            asset = local_path(path.parent, reference)
            key = asset.relative_to(ROOT).as_posix()
            if key not in self.assets:
                self.assets[key] = data_uri(asset)
            if key not in self.style_assets:
                self.style_assets[key] = f"--flightdeck-asset-{len(self.style_assets)}"
            return f"var({self.style_assets[key]})"

        return "<style>\n" + CSS_URL.sub(replace_url, css) + "\n</style>"

    def asset_bootstrap(self):
        # Store each large photograph once even if both CSS and JS display it.
        asset_json = json.dumps(self.assets, separators=(",", ":"), ensure_ascii=True)
        style_json = json.dumps(self.style_assets, separators=(",", ":"), ensure_ascii=True)
        return script_tag(
            "(() => {\n"
            f"  const assets = {asset_json};\n"
            "  window.flightdeckAsset = path => assets[path] || path;\n"
            f"  const styles = {style_json};\n"
            "  for (const [path, name] of Object.entries(styles)) {\n"
            "    document.documentElement.style.setProperty(name, 'url(\"' + assets[path] + '\")');\n"
            "  }\n"
            "})();"
        )

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "script" and values.get("src"):
            if "async" in values or values.get("type", "") not in ("", "text/javascript", "application/javascript"):
                raise ValueError("Offline scripts must use classic ordered execution")
            self.scripts.append(local_path(ROOT, values["src"]))
            self.external_script = True
            return
        rel = (values.get("rel") or "").lower().split()
        if tag == "link" and "stylesheet" in rel:
            self.html.append(self.stylesheet(local_path(ROOT, values["href"])))
            return
        attribute = "href" if tag == "link" and "icon" in rel else "src" if tag == "img" else None
        if attribute and values.get(attribute) and not values[attribute].startswith("data:"):
            key = local_path(ROOT, values[attribute]).relative_to(ROOT).as_posix()
            values[attribute] = self.assets[key]
            serialized = "".join(
                " " + name if value is None else f' {name}="{escape(value, quote=True)}"'
                for name, value in values.items()
            )
            self.html.append("<" + tag + serialized + ">")
            return
        self.html.append(self.get_starttag_text())

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if tag == "script" and self.external_script:
            self.external_script = False
            return
        if tag == "body":
            self.html.append(self.asset_bootstrap())
            for path in self.scripts:
                self.html.append(script_tag(path.read_text(encoding="utf-8")))
        self.html.append(f"</{tag}>")

    def handle_data(self, data):
        if self.external_script and data.strip():
            raise ValueError("Unexpected inline content in external script")
        if not self.external_script:
            self.html.append(data)

    def handle_decl(self, decl):
        self.html.append(f"<!{decl}>")

    def handle_comment(self, data):
        self.html.append(f"<!--{data}-->")

    def handle_entityref(self, name):
        self.html.append(f"&{name};")

    def handle_charref(self, name):
        self.html.append(f"&#{name};")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", nargs="?", type=Path, default=DEFAULT_OUTPUT, help="destination HTML file")
    output = parser.parse_args().output.resolve()
    if output == ROOT / "index.html":
        parser.error("The output must be different from the source index.html")
    page = OfflinePage()
    page.feed((ROOT / "index.html").read_text(encoding="utf-8"))
    page.close()
    if not page.scripts:
        parser.error("No application scripts found")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("".join(page.html), encoding="utf-8")
    print(f"{output.name}: {output.stat().st_size:,} bytes, {len(page.scripts)} scripts, {len(page.assets)} assets")


if __name__ == "__main__":
    main()
