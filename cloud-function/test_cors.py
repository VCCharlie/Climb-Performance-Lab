import importlib.util
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch


def load_main_module():
    if "functions_framework" not in sys.modules:
        sys.modules["functions_framework"] = types.SimpleNamespace(http=lambda f: f)
    if "flask" not in sys.modules:
        sys.modules["flask"] = types.SimpleNamespace(jsonify=lambda payload: payload)

    module_path = Path(__file__).with_name("main.py")
    spec = importlib.util.spec_from_file_location("cloud_function_main", module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


main = load_main_module()


class CorsOriginTests(unittest.TestCase):
    def test_default_allowlist_includes_github_pages_origin(self):
        with patch.dict("os.environ", {}, clear=True):
            self.assertEqual(
                main.resolve_cors_origin("https://vccharlie.github.io"),
                "https://vccharlie.github.io",
            )

    def test_env_allowlist_overrides_defaults(self):
        with patch.dict("os.environ", {"ALLOWED_CORS_ORIGINS": "https://example.com"}, clear=True):
            self.assertIsNone(
                main.resolve_cors_origin("https://vccharlie.github.io")
            )

    def test_rejects_wildcard(self):
        with patch.dict("os.environ", {"ALLOWED_CORS_ORIGINS": "*"}, clear=True):
            self.assertIsNone(
                main.resolve_cors_origin("*")
            )
            self.assertIsNone(
                main.resolve_cors_origin("https://example.com")
            )


if __name__ == "__main__":
    unittest.main()
