"""Read-only checks for the public website. No accounts, keys or dependencies."""
import concurrent.futures
import json
import re
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

ORIGIN = "https://freeresourceatlas.com"

def read(path):
    request = urllib.request.Request(ORIGIN + path, headers={"User-Agent": "FreeResourceAtlas-Health/1.0", "Accept": "*/*"})
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            body = response.read(2_000_001)
            assert len(body) <= 2_000_000, "Response exceeded the check limit"
            assert response.url.startswith(ORIGIN + "/"), "Unexpected destination"
            return response.status, response.headers, body
    except urllib.error.HTTPError as error:
        return error.code, error.headers, error.read(100_000)

def check(path):
    status, headers, body = read(path)
    if path == "/missing-production-health-page":
        assert status == 404, "Missing URLs must return 404"
    else:
        assert status == 200, "HTTP " + str(status)
    if path == "/":
        html = body.decode()
        assert "FreeResourceAtlas" in html and "<h1" in html
        assert "content-security-policy" in headers
        asset = re.search(r'<script[^>]+src="(/assets/[^\"]+\.js)"', html)
        assert asset, "Client bundle was not found"
        asset_status, asset_headers, _ = read(asset.group(1))
        assert asset_status == 200 and "javascript" in asset_headers.get("Content-Type", ""), "Client bundle failed"
    elif path.startswith("/api/resources"):
        data = json.loads(body)
        assert data.get("resources"), "Search returned no resources"
    elif path == "/sitemap.xml":
        assert b"<urlset" in body or b"<sitemapindex" in body
        assert b"/admin" not in body and b"country=" not in body
    elif path == "/admin":
        assert "no-store" in headers.get("Cache-Control", "")
        assert "noindex" in headers.get("X-Robots-Tag", "")
        assert b"Admin sign in" in body and b"Editable resources" not in body
    elif path == "/robots.txt":
        assert b"Sitemap:" in body
    return {"path": path, "status": "passed", "http": status}

paths = ["/", "/api/resources?q=games", "/sitemap.xml", "/robots.txt", "/admin", "/missing-production-health-page"]
results = []
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    pending = {pool.submit(check, path): path for path in paths}
    for future in concurrent.futures.as_completed(pending):
        try:
            results.append(future.result())
        except Exception as error:
            results.append({"path": pending[future], "status": "failed", "error": str(error)})
print(json.dumps({"checked_at": datetime.now(timezone.utc).isoformat(), "checks": sorted(results, key=lambda item: item["path"])}, indent=2))
sys.exit(1 if any(item["status"] == "failed" for item in results) else 0)
