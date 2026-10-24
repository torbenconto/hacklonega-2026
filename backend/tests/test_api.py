import unittest

from fastapi.testclient import TestClient

from main import app


class DemoApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def test_existing_endpoints(self):
        self.assertEqual(self.client.get("/").json(), {"message": "Hello from FastAPI!"})
        self.assertEqual(self.client.get("/health").json(), {"status": "ok"})

    def test_upload_returns_metadata(self):
        for content_type in ("image/jpeg", "image/png", "image/webp"):
            with self.subTest(content_type=content_type):
                response = self.client.post(
                    "/images/upload", files={"file": ("fish.jpg", b"demo", content_type)}
                )
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json(), {
                    "filename": "fish.jpg", "content_type": content_type, "byte_count": 4
                })

    def test_upload_validation(self):
        cases = [
            (b"demo", "text/plain", 415),
            (b"", "image/png", 400),
            (b"x" * (5 * 1024 * 1024), "image/png", 200),
            (b"x" * (5 * 1024 * 1024 + 1), "image/png", 413),
        ]
        for contents, content_type, expected in cases:
            with self.subTest(size=len(contents), content_type=content_type):
                response = self.client.post(
                    "/images/upload", files={"file": ("fish.png", contents, content_type)}
                )
                self.assertEqual(response.status_code, expected)
        self.assertEqual(self.client.post("/images/upload").status_code, 422)

    def test_login_is_a_placeholder(self):
        response = self.client.post(
            "/auth/login", json={"username": "demo", "password": "private-demo-value"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["authenticated"])
        self.assertEqual(response.json()["status"], "demo_placeholder")
        self.assertNotIn("private-demo-value", response.text)
        self.assertNotIn("token", response.json())

    def test_login_validation(self):
        for payload in ({}, {"username": "", "password": "demo"},
                        {"username": "demo", "password": ""}):
            with self.subTest(payload=payload):
                self.assertEqual(self.client.post("/auth/login", json=payload).status_code, 422)

    def test_regulations_are_not_evaluated(self):
        fish = {"species": "largemouth bass", "weight_lbs": 2.5, "length_inches": 16}
        response = self.client.post("/regulations/check", json=fish)
        self.assertEqual(response.status_code, 200)
        result = response.json()
        for key, value in fish.items():
            self.assertEqual(result[key], value)
        self.assertEqual(result["status"], "not_evaluated")
        self.assertEqual(result["jurisdiction"], "Georgia")
        self.assertEqual(result["water_type"], "freshwater")

    def test_regulations_validation(self):
        fish = {"species": "bass", "weight_lbs": 2.5, "length_inches": 16}
        for key, value in (("species", ""), ("species", "   "),
                           ("weight_lbs", 0), ("weight_lbs", -1),
                           ("length_inches", 0), ("length_inches", -1)):
            with self.subTest(key=key, value=value):
                response = self.client.post("/regulations/check", json={**fish, key: value})
                self.assertEqual(response.status_code, 422)
        self.assertEqual(self.client.post("/regulations/check", json={}).status_code, 422)

    def test_openapi_includes_all_routes(self):
        response = self.client.get("/openapi.json")
        self.assertEqual(response.status_code, 200)
        for path in ("/", "/health", "/images/upload", "/auth/login", "/regulations/check"):
            self.assertIn(path, response.json()["paths"])


if __name__ == "__main__":
    unittest.main()
