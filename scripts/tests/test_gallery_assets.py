import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.gallery_assets import (
    AssetError,
    build_inventory,
    build_frame_inventory,
    clean_local_gallery,
    destination_relative,
    migrate_videos,
    migrate_frames,
    validate_no_symlinks,
)


class GalleryAssetTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.source = self.root / "materials" / "1 開門動畫轉場製作"
        self.mirror = self.root / "materials" / "Organized" / "1 開門動畫轉場製作"
        self.destination = self.root / "gallery" / "materials" / "door-transitions"
        self.manifest = self.root / "docs" / "gallery-video-manifest.json"
        self.report = self.root / "docs" / "gallery-migration-verification.md"

    def tearDown(self):
        self.tmp.cleanup()

    def add_pair(self, game="1-1 1996 Biohazard", door="c05中庭電梯", name="c05-s1.mp4", data=b"video"):
        source = self.source / game / door / name
        mirror = self.mirror / game / door / name
        source.parent.mkdir(parents=True, exist_ok=True)
        mirror.parent.mkdir(parents=True, exist_ok=True)
        source.write_bytes(data)
        mirror.write_bytes(data)
        return source, mirror

    def test_destination_uses_ascii_game_and_code_directories(self):
        source, _ = self.add_pair()
        self.assertEqual(destination_relative(self.source, source), Path("1-1/c05/c05-s1.mp4"))

    def test_unmapped_directories_are_rejected(self):
        source, _ = self.add_pair(game="Biohazard", door="elevator")
        with self.assertRaises(AssetError):
            destination_relative(self.source, source)

    def test_duplicate_hashes_are_rejected(self):
        self.add_pair(door="a01單門", name="one.mp4", data=b"same")
        self.add_pair(door="a02單門", name="two.mp4", data=b"same")
        with self.assertRaisesRegex(AssetError, "duplicate SHA-256"):
            build_inventory(self.source, self.mirror)

    def test_source_mirror_mismatch_is_rejected(self):
        _, mirror = self.add_pair()
        mirror.write_bytes(b"different")
        with self.assertRaisesRegex(AssetError, "mirror mismatch"):
            build_inventory(self.source, self.mirror)

    def test_any_source_tree_symlink_is_rejected(self):
        self.add_pair()
        (self.source / "linked-dir").symlink_to(self.source / "1-1 1996 Biohazard", target_is_directory=True)
        with self.assertRaisesRegex(AssetError, "symlink"):
            validate_no_symlinks(self.source)

    def test_destination_symlink_is_rejected(self):
        self.add_pair()
        self.destination.parent.mkdir(parents=True)
        self.destination.symlink_to(self.source, target_is_directory=True)
        with self.assertRaisesRegex(AssetError, "symlink"):
            migrate_videos(self.source, self.mirror, self.destination, self.manifest, self.report)

    def test_migration_preserves_non_video_files_and_removes_verified_mp4s(self):
        source, mirror = self.add_pair()
        source_png = source.parent / "frames" / "frame_0001.png"
        mirror_png = mirror.parent / "frames" / "frame_0001.png"
        source_png.parent.mkdir()
        mirror_png.parent.mkdir()
        source_png.write_bytes(b"png")
        mirror_png.write_bytes(b"png")

        result = migrate_videos(self.source, self.mirror, self.destination, self.manifest, self.report)

        self.assertEqual(result["migrated"], 1)
        self.assertFalse(source.exists())
        self.assertFalse(mirror.exists())
        self.assertTrue(source_png.exists())
        self.assertTrue(mirror_png.exists())
        self.assertEqual((self.destination / "1-1/c05/c05-s1.mp4").read_bytes(), b"video")
        manifest = json.loads(self.manifest.read_text())
        self.assertEqual(len(manifest["videos"]), 1)
        self.assertIn("status: complete", self.report.read_text())

    def test_preexisting_matching_destination_is_safe_to_rerun(self):
        self.add_pair()
        existing = self.destination / "1-1/c05/c05-s1.mp4"
        existing.parent.mkdir(parents=True)
        existing.write_bytes(b"video")
        result = migrate_videos(self.source, self.mirror, self.destination, self.manifest, self.report)
        self.assertEqual(result["migrated"], 1)

    def test_preexisting_different_destination_is_rejected(self):
        self.add_pair()
        existing = self.destination / "1-1/c05/c05-s1.mp4"
        existing.parent.mkdir(parents=True)
        existing.write_bytes(b"other")
        with self.assertRaisesRegex(AssetError, "destination mismatch"):
            migrate_videos(self.source, self.mirror, self.destination, self.manifest, self.report)

    def test_failed_report_write_prevents_source_deletion(self):
        source, mirror = self.add_pair()
        self.report.mkdir(parents=True)
        with self.assertRaises(AssetError):
            migrate_videos(self.source, self.mirror, self.destination, self.manifest, self.report)
        self.assertTrue(source.exists())
        self.assertTrue(mirror.exists())

    def test_clean_local_gallery_unlinks_only_validated_files(self):
        main = self.root / "main"
        gallery = self.root / "gallery"
        local = main / "docs/door-gallery"
        local.mkdir(parents=True)
        gallery.mkdir()
        (local / "door-gallery.html").write_text("same")
        (gallery / "index.html").write_text("same")
        (local / "doors.json").write_text("stale")
        (gallery / "doors.json").write_text("current")
        report = main / "docs/gallery-migration-verification.md"
        with patch("scripts.gallery_assets.gallery_consistency", return_value={"doors": 113}):
            result = clean_local_gallery(main, gallery, report)
        self.assertEqual(result["files"], 2)
        self.assertEqual(result["stale"], ["doors.json"])
        self.assertFalse(local.exists())
        self.assertIn("status: complete", report.read_text())

    def test_clean_local_gallery_aborts_on_unexplained_mismatch(self):
        main = self.root / "main"
        gallery = self.root / "gallery"
        local = main / "docs/door-gallery"
        local.mkdir(parents=True)
        gallery.mkdir()
        source = local / "stills/example.jpg"
        target = gallery / "stills/example.jpg"
        source.parent.mkdir()
        target.parent.mkdir()
        source.write_bytes(b"old")
        target.write_bytes(b"new")
        with patch("scripts.gallery_assets.gallery_consistency", return_value={"doors": 113}):
            with self.assertRaisesRegex(AssetError, "unexplained"):
                clean_local_gallery(main, gallery, main / "docs/report.md")
        self.assertTrue(source.exists())

    def test_frame_inventory_uses_ascii_set_directories_without_collisions(self):
        for root in (self.source, self.mirror):
            first = root / "1-1 1996 Biohazard/c01階梯/c01-s4防滑階梯1_frames/frame_0001.png"
            second = root / "1-1 1996 Biohazard/c01階梯/c01-s4防滑階梯2_frames/frame_0001.png"
            first.parent.mkdir(parents=True)
            second.parent.mkdir(parents=True)
            first.write_bytes(b"same-frame")
            second.write_bytes(b"same-frame")
        entries = build_frame_inventory(self.source, self.mirror)
        self.assertEqual(len(entries), 2)
        self.assertEqual(
            [entry["destination"] for entry in entries],
            ["1-1/c01/set-001/frame_0001.png", "1-1/c01/set-002/frame_0001.png"],
        )

    def test_frame_migration_copies_before_removing_both_source_sets(self):
        for root in (self.source, self.mirror):
            frame = root / "1-2 1998 Biohazard 2/a05單門/05-s1通風鐵門_frames/frame_0001.png"
            frame.parent.mkdir(parents=True)
            frame.write_bytes(b"png-frame")
        destination = self.root / "gallery/materials/frame-extracts"
        manifest = self.root / "docs/gallery-frame-manifest.json"
        result = migrate_frames(self.source, self.mirror, destination, manifest, self.report)
        self.assertEqual(result["migrated"], 1)
        self.assertEqual(len(list(destination.rglob("*.png"))), 1)
        self.assertEqual(len(list(self.source.rglob("*.png"))), 0)
        self.assertEqual(len(list(self.mirror.rglob("*.png"))), 0)
        self.assertEqual(json.loads(manifest.read_text())["frames"][0]["sha256"],
                         json.loads(manifest.read_text())["frames"][0]["sha256"])


if __name__ == "__main__":
    unittest.main()
