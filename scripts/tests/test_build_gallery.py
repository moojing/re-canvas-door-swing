import ast
import base64
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock


SCRIPT = Path(__file__).resolve().parents[2] / ".claude" / "skills" / "check-door" / "scripts" / "build_gallery.py"


def read_literal_assignment(name: str):
    module = ast.parse(SCRIPT.read_text(encoding="utf-8"))
    for node in module.body:
        if not isinstance(node, ast.Assign):
            continue
        for target in node.targets:
            if isinstance(target, ast.Name) and target.id == name:
                return ast.literal_eval(node.value)
    raise AssertionError(f"assignment {name} not found")


class BuildGalleryTests(unittest.TestCase):
    """Verify generated gallery UI labels stay in sync with canonical counts."""

    def test_c06_still_keeps_manual_timestamp_override(self):
        overrides = read_literal_assignment("OVERRIDE")
        self.assertEqual(overrides[("1-2", "c06")], 1.0)
        module = ast.parse(SCRIPT.read_text(encoding="utf-8"))
        self.assertFalse(any(
            isinstance(node, ast.Assign) and any(
                isinstance(target, ast.Name) and target.id == "GIF_OVERRIDE"
                for target in node.targets
            ) for node in module.body
        ), "GIFs must preserve the complete source instead of manual clip windows")

    def test_render_delegates_full_source_gif_without_clip_arguments(self):
        module = ast.parse(SCRIPT.read_text(encoding="utf-8"))
        render_node = next(node for node in module.body
                           if isinstance(node, ast.FunctionDef) and node.name == "render")
        with tempfile.TemporaryDirectory() as tmp:
            assets = Path(tmp)
            (assets / "stills").mkdir()
            (assets / "gifs").mkdir()
            calls = []

            def run(command, **kwargs):
                self.assertTrue(kwargs.get("check"))
                calls.append(command)
                if command[0] == "ffmpeg":
                    Path(command[-1]).write_bytes(b"still fixture")

            namespace = dict(os=os, base64=base64, subprocess=Mock(run=run),
                             ASSETS=str(assets), GALLERY_ROOT=str(assets), BRI="still-filter",
                             find_video=lambda *_: "/source/full video.mp4",
                             pick_timestamp=lambda _: 1.0, duration=lambda _: 12.0,
                             frame_stats=lambda *_: (0, 0, 0),
                             GIF_OVERRIDE={("1-2", "c06"): (0.2, 1.7)})
            exec(compile(ast.Module(body=[render_node], type_ignores=[]), str(SCRIPT), "exec"), namespace)
            result = namespace["render"]("1-2", "c06")
            self.assertEqual(calls[-1], [
                "node", str(assets / "scripts" / "build-gallery-gifs.mjs"),
                "--one", "/source/full video.mp4", "--output", str(assets / "gifs" / "1-2_c06.gif"),
            ])
            self.assertNotIn("-ss", calls[-1])
            self.assertNotIn("-t", calls[-1])
            self.assertEqual(len(calls), 2)
            self.assertIn("-ss", calls[0])  # Still framing retains its chosen timestamp.
            self.assertEqual(result[-2:], ("stills/1-2_c06.jpg", "gifs/1-2_c06.gif"))
            self.assertFalse((assets / "gifs" / "1-2_c06.gif").exists())  # No GIF read/embedding.

    def test_animation_array_uses_relative_gif_assets(self):
        module = ast.parse(SCRIPT.read_text(encoding="utf-8"))
        assignment = next(node for node in module.body if isinstance(node, ast.Assign)
                          and any(isinstance(target, ast.Name) and target.id == "anim_js"
                                  for target in node.targets))
        from urllib.parse import quote
        helper = next(node for node in module.body if isinstance(node, ast.FunctionDef)
                      and node.name == "gif_url_for_output")
        namespace = {"json": json, "os": os, "quote": quote, "ASSETS": "/gallery",
                     "OUT": "/gallery/index.html", "doors": [
            {"gif_path": "gifs/1-2_c06.gif", "gif": "legacy-embedded-data"},
            {"gif_path": None},
        ]}
        exec(compile(ast.Module(body=[helper, assignment], type_ignores=[]), str(SCRIPT), "exec"), namespace)
        self.assertEqual(namespace["anim_js"], 'const ANIM=["gifs/1-2_c06.gif",null];')
        self.assertNotIn("base64", namespace["anim_js"])

    def test_custom_output_resolves_gifs_from_the_html_location(self):
        module = ast.parse(SCRIPT.read_text(encoding="utf-8"))
        assignment = next(node for node in module.body if isinstance(node, ast.Assign)
                          and any(isinstance(target, ast.Name) and target.id == "anim_js"
                                  for target in node.targets))
        helpers = [node for node in module.body
                   if isinstance(node, ast.FunctionDef) and node.name == "gif_url_for_output"]
        from urllib.parse import quote, unquote
        with tempfile.TemporaryDirectory() as tmp:
            assets = Path(tmp) / "gallery # assets"
            output = Path(tmp) / "preview" / "custom.html"
            namespace = dict(json=json, os=os, quote=quote, ASSETS=str(assets), OUT=str(output),
                             doors=[{"gif_path": "gifs/1-2_c06.gif"}, {"gif_path": None}])
            exec(compile(ast.Module(body=helpers + [assignment], type_ignores=[]), str(SCRIPT), "exec"), namespace)
            urls = json.loads(namespace["anim_js"][len("const ANIM="):-1])
            resolved = (output.parent / unquote(urls[0])).resolve()
            self.assertEqual(resolved, (assets / "gifs/1-2_c06.gif").resolve())
            self.assertIn("%23", urls[0])
            self.assertIsNone(urls[1])

    def test_filter_buttons_include_live_counts(self):
        with tempfile.TemporaryDirectory() as tmp:
            gallery = Path(tmp)
            (gallery / "docs").mkdir()
            (gallery / "materials" / "door-transitions").mkdir(parents=True)
            (gallery / "docs" / "door-classifications.md").write_text(
                "\n".join([
                    "# 開門動畫檢查紀錄",
                    "",
                    "## 1-1 1996 Biohazard",
                    "",
                    "| 代碼 | 名稱 | 變體數 | 形式 | 材質 | 動畫 | 配件 | CSV | 核對 | 備註 |",
                    "|------|------|--------|------|------|------|------|-----|------|------|",
                    "| a01 | 測試單門 | 1 | 單門 | 木門 | 鉸鏈單開 | 把手 | 2/3h | ✅ 合理 | ok |",
                    "| b05 | 測試雙拱門 | 1 | 雙門 | 石門 | 鉸鏈雙開 | 無 | ❌ | ❌ 無法製作 | no |",
                    "",
                    "## 1-2 1998 Biohazard 2",
                    "",
                    "| 代碼 | 名稱 | 變體數 | 形式 | 材質 | 動畫 | 配件 | CSV | 核對 | 備註 |",
                    "|------|------|--------|------|------|------|------|-----|------|------|",
                    "| a08 | 測試把手門 | 1 | 單門 | 金屬 | 鉸鏈單開 | 把手 | 3/4h | ✅ 比評估樂觀 | opt |",
                    "",
                    "## 1-3 1999 Biohazard 3",
                    "",
                    "| 代碼 | 名稱 | 變體數 | 形式 | 材質 | 動畫 | 配件 | CSV | 核對 | 備註 |",
                    "|------|------|--------|------|------|------|------|-----|------|------|",
                    "| b06 | 測試雙門 | 1 | 雙門 | 鐵門 | 鉸鏈雙開 | 鎖 | 1/2h | ⚠️ 有出入 | warn |",
                    "",
                    "## 1-4 2000 Biohazard Gun Survivor",
                    "",
                    "| 代碼 | 名稱 | 變體數 | 形式 | 材質 | 動畫 | 配件 | CSV | 核對 | 備註 |",
                    "|------|------|--------|------|------|------|------|-----|------|------|",
                    "| c01 | 測試梯門 | 1 | 非門 | 金屬 | 水平滑動 | 無 | 1/2h | ⚠️ 需重估 | recheck |",
                    "",
                ]),
                encoding="utf-8",
            )

            env = os.environ.copy()
            env["DOOR_GALLERY_ROOT"] = str(gallery)
            output = gallery / "index.html"
            subprocess.run(  # noqa: S603 - executable is resolved; arguments are fixed
                [sys.executable, str(SCRIPT), str(output)],
                check=True,
                env=env,
                cwd=SCRIPT.parent.parent.parent.parent.parent,
            )

            html = output.read_text(encoding="utf-8")
            manifest = (gallery / "doors.json").read_text(encoding="utf-8")
            self.assertIn('data-f="all">全部 (5)</button>', html)
            self.assertIn('data-f="v-ok">✅ 合理 (1)</button>', html)
            self.assertIn('data-f="v-opt">✅ 比評估樂觀 (1)</button>', html)
            self.assertIn('data-f="v-warn">⚠️ 有出入/需重估 (2)</button>', html)
            self.assertIn('data-f="v-no">❌ 無法製作 (1)</button>', html)
            self.assertIn('data-f="risk">⚠ 樂觀待驗證 (2)</button>', html)
            self.assertNotIn("原評估不做", html)
            self.assertIn('"csv_excluded": true', manifest)


if __name__ == "__main__":
    unittest.main()
