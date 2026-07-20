import ast
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


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

    def test_c06_gallery_assets_use_manual_door_segment_overrides(self):
        overrides = read_literal_assignment("OVERRIDE")
        gif_overrides = read_literal_assignment("GIF_OVERRIDE")

        self.assertIn(("1-2", "c06"), overrides)
        self.assertIn(("1-2", "c06"), gif_overrides)

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
