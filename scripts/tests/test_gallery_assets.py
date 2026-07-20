import hashlib
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import scripts.gallery_assets as gallery_assets
from scripts.gallery_assets import (
    AssetError,
    build_inventory,
    build_frame_inventory,
    clean_local_gallery,
    destination_relative,
    migrate_videos,
    migrate_frames,
    _tracked_materials,
    validate_no_symlinks,
)


class GalleryAssetTests(unittest.TestCase):
    """Verify fail-closed gallery asset migration and consistency behavior."""

    def setUp(self):
        """Create isolated source, mirror, destination, and Git repositories."""
        self.git = shutil.which("git")
        if self.git is None:
            self.skipTest("git executable is required")
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.source = self.root / "materials" / "1 開門動畫轉場製作"
        self.mirror = self.root / "materials" / "Organized" / "1 開門動畫轉場製作"
        self.destination = self.root / "gallery" / "materials" / "door-transitions"
        self.manifest = self.root / "docs" / "gallery-video-manifest.json"
        self.report = self.root / "docs" / "gallery-migration-verification.md"
        self._init_material_repo(self.root)
        self._init_material_repo(self.root / "gallery")

    def tearDown(self):
        """Remove the isolated filesystem fixture."""
        self.tmp.cleanup()

    def _init_material_repo(self, root):
        """Initialize a repository whose materials tree is ignored."""
        root.mkdir(parents=True, exist_ok=True)
        subprocess.run(  # noqa: S603 - executable is resolved; arguments are fixed
            [self.git, "init", "-q"], cwd=root, check=True,
        )
        (root / ".gitignore").write_text("/materials/\n", encoding="utf-8")

    def _consistency_fixture(self):
        """Create a minimal published gallery suitable for consistency checks."""
        main = self.root / "consistency-main"
        gallery = self.root / "consistency-gallery"
        self._init_material_repo(main)
        self._init_material_repo(gallery)
        (main / "docs").mkdir()
        (gallery / "docs").mkdir()
        (gallery / "stills").mkdir()
        (gallery / "gifs").mkdir()
        (gallery / "stills/door.jpg").write_bytes(b"still")
        (gallery / "gifs/door.gif").write_bytes(b"gif")
        door = {
            "game": "1-1",
            "code": "c05",
            "name": "value-name",
            "variants": "value-variants",
            "form": "value-form",
            "material": "value-material",
            "animation": "value-animation",
            "accessory": "value-accessory",
            "csv": "value-csv",
            "verdict": "✅ value-verdict",
            "note": "value-note",
        }
        (gallery / "doors.json").write_text(json.dumps([door]), encoding="utf-8")
        (gallery / "index.html").write_text(door["note"], encoding="utf-8")
        (gallery / "docs/door-classifications.md").write_text(
            "\n".join([
                "# 開門動畫檢查紀錄",
                "",
                "## 1-1 1996 Biohazard",
                "",
                "| 代碼 | 名稱 | 變體數 | 形式 | 材質 | 動畫 | 配件 | CSV | 核對 | 備註 |",
                "|------|------|--------|------|------|------|------|-----|------|------|",
                "| c05 | value-name | value-variants | value-form | value-material | value-animation | value-accessory | value-csv | ✅ value-verdict | value-note |",
                "",
            ]),
            encoding="utf-8",
        )
        for name in (
            "door-classification-report.md",
            "Doors-Difficulity-Estimation.xlsm.csv",
        ):
            (gallery / "docs" / name).write_text(name, encoding="utf-8")
        return main, gallery, door

    def add_pair(self, game="1-1 1996 Biohazard", door="c05中庭電梯", name="c05-s1.mp4", data=b"video"):
        """Create matching canonical and mirror video files."""
        source = self.source / game / door / name
        mirror = self.mirror / game / door / name
        source.parent.mkdir(parents=True, exist_ok=True)
        mirror.parent.mkdir(parents=True, exist_ok=True)
        source.write_bytes(data)
        mirror.write_bytes(data)
        return source, mirror

    def test_destination_uses_ascii_game_and_code_directories(self):
        """Map legacy labels to stable ASCII destination directories."""
        source, _ = self.add_pair()
        self.assertEqual(destination_relative(self.source, source), Path("1-1/c05/c05-s1.mp4"))

    def test_unmapped_directories_are_rejected(self):
        """Reject source layouts without recognizable game and door codes."""
        source, _ = self.add_pair(game="Biohazard", door="elevator")
        with self.assertRaises(AssetError):
            destination_relative(self.source, source)

    def test_duplicate_hashes_are_rejected(self):
        """Reject duplicate video content before destination creation."""
        self.add_pair(door="a01單門", name="one.mp4", data=b"same")
        self.add_pair(door="a02單門", name="two.mp4", data=b"same")
        with self.assertRaisesRegex(AssetError, "duplicate SHA-256"):
            build_inventory(self.source, self.mirror)

    def test_source_mirror_mismatch_is_rejected(self):
        """Reject canonical and mirror content mismatches."""
        _, mirror = self.add_pair()
        mirror.write_bytes(b"different")
        with self.assertRaisesRegex(AssetError, "mirror mismatch"):
            build_inventory(self.source, self.mirror)

    def test_any_source_tree_symlink_is_rejected(self):
        """Reject symlinks anywhere in a source tree."""
        self.add_pair()
        (self.source / "linked-dir").symlink_to(self.source / "1-1 1996 Biohazard", target_is_directory=True)
        with self.assertRaisesRegex(AssetError, "symlink"):
            validate_no_symlinks(self.source)

    def test_destination_symlink_is_rejected(self):
        """Reject a symlinked destination root."""
        self.add_pair()
        self.destination.parent.mkdir(parents=True)
        self.destination.symlink_to(self.source, target_is_directory=True)
        with self.assertRaisesRegex(AssetError, "symlink"):
            migrate_videos(self.source, self.mirror, self.destination, self.manifest, self.report)

    def test_migration_preserves_non_video_files_and_removes_verified_mp4s(self):
        """Remove verified videos while preserving unrelated source files."""
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

    def test_migration_report_uses_repository_relative_paths(self):
        """Keep workstation-specific absolute paths out of tracked evidence."""
        self.add_pair()

        migrate_videos(self.source, self.mirror, self.destination, self.manifest, self.report)

        report = self.report.read_text(encoding="utf-8")
        self.assertNotIn(str(self.root), report)
        self.assertIn("`materials/1 開門動畫轉場製作`", report)
        self.assertIn("`gallery/materials/door-transitions`", report)

    def test_migration_aborts_before_deletion_without_gallery_material_boundary(self):
        """Require the gallery materials ignore boundary before deletion."""
        source, mirror = self.add_pair()
        (self.root / "gallery/.gitignore").unlink()

        with self.assertRaisesRegex(AssetError, "materials.*not ignored"):
            migrate_videos(self.source, self.mirror, self.destination, self.manifest, self.report)

        self.assertTrue(source.exists())
        self.assertTrue(mirror.exists())

    def test_preexisting_matching_destination_is_safe_to_rerun(self):
        """Reuse a pre-existing destination only when its digest matches."""
        self.add_pair()
        existing = self.destination / "1-1/c05/c05-s1.mp4"
        existing.parent.mkdir(parents=True)
        existing.write_bytes(b"video")
        result = migrate_videos(self.source, self.mirror, self.destination, self.manifest, self.report)
        self.assertEqual(result["migrated"], 1)

    def test_completed_migration_rerun_preserves_manifest_inventory(self):
        """Preserve completed inventory evidence on subsequent executions."""
        self.add_pair()
        migrate_videos(self.source, self.mirror, self.destination, self.manifest, self.report)
        expected_manifest = self.manifest.read_text(encoding="utf-8")

        result = migrate_videos(self.source, self.mirror, self.destination, self.manifest, self.report)

        self.assertEqual(result["migrated"], 1)
        self.assertEqual(self.manifest.read_text(encoding="utf-8"), expected_manifest)
        self.assertIn("manifest entries: 1", self.report.read_text(encoding="utf-8"))

    def test_resumed_manifest_rejects_source_path_traversal(self):
        """Reject traversal paths before they can delete files outside a source root."""
        outside = self.source.parent / "outside.mp4"
        outside.parent.mkdir(parents=True, exist_ok=True)
        outside.write_bytes(b"video")
        destination = self.destination / "1-1/c05/door.mp4"
        destination.parent.mkdir(parents=True)
        destination.write_bytes(b"video")
        payload = {
            "version": 2,
            "migration_status": "ready-to-delete",
            "videos": [{
                "source_relative": "../outside.mp4",
                "destination": "1-1/c05/door.mp4",
                "bytes": 5,
                "sha256": hashlib.sha256(b"video").hexdigest(),
            }],
        }
        self.manifest.parent.mkdir(parents=True)
        self.manifest.write_text(json.dumps(payload), encoding="utf-8")

        with self.assertRaisesRegex(AssetError, "source.*escapes asset root"):
            migrate_videos(self.source, self.mirror, self.destination, self.manifest, self.report)

        self.assertTrue(outside.exists())

    def test_resumed_manifest_rejects_absolute_destination(self):
        """Reject absolute manifest destinations outside the gallery asset root."""
        outside = self.root / "outside-destination.mp4"
        outside.write_bytes(b"video")
        payload = {
            "version": 2,
            "migration_status": "ready-to-delete",
            "videos": [{
                "source_relative": "missing.mp4",
                "destination": str(outside),
                "bytes": 5,
                "sha256": hashlib.sha256(b"video").hexdigest(),
            }],
        }
        self.manifest.parent.mkdir(parents=True)
        self.manifest.write_text(json.dumps(payload), encoding="utf-8")

        with self.assertRaisesRegex(AssetError, "destination.*escapes asset root"):
            migrate_videos(self.source, self.mirror, self.destination, self.manifest, self.report)

        self.assertTrue(outside.exists())

    def test_preexisting_different_destination_is_rejected(self):
        """Reject a pre-existing destination with unrelated content."""
        self.add_pair()
        existing = self.destination / "1-1/c05/c05-s1.mp4"
        existing.parent.mkdir(parents=True)
        existing.write_bytes(b"other")
        with self.assertRaisesRegex(AssetError, "destination mismatch"):
            migrate_videos(self.source, self.mirror, self.destination, self.manifest, self.report)

    def test_failed_report_write_prevents_source_deletion(self):
        """Keep sources when pre-deletion evidence cannot be written."""
        source, mirror = self.add_pair()
        self.report.mkdir(parents=True)
        with self.assertRaises(AssetError):
            migrate_videos(self.source, self.mirror, self.destination, self.manifest, self.report)
        self.assertTrue(source.exists())
        self.assertTrue(mirror.exists())

    def test_clean_local_gallery_unlinks_only_validated_files(self):
        """Remove local outputs only after counterpart validation."""
        main = self.root / "main"
        gallery = self.root / "gallery"
        local = main / "docs/door-gallery"
        local.mkdir(parents=True)
        gallery.mkdir(exist_ok=True)
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
        """Keep local outputs when a counterpart digest mismatch is unexplained."""
        main = self.root / "main"
        gallery = self.root / "gallery"
        local = main / "docs/door-gallery"
        local.mkdir(parents=True)
        gallery.mkdir(exist_ok=True)
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
        """Assign distinct ASCII set directories to repeated frame groups."""
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
        """Copy and hash frames before removing canonical and mirror files."""
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
        expected_sha = hashlib.sha256(b"png-frame").hexdigest()
        self.assertEqual(json.loads(manifest.read_text())["frames"][0]["sha256"], expected_sha)

    def test_video_migration_resumes_after_second_unlink_failure(self):
        """Resume safely after canonical deletion but mirror deletion failure."""
        source, mirror = self.add_pair()
        real_unlink = gallery_assets._verified_unlink

        def fail_mirror(path, expected_hash):
            """Simulate a one-sided source deletion failure."""
            if Path(path).resolve() == mirror.resolve():
                raise AssetError("simulated mirror unlink failure")
            return real_unlink(path, expected_hash)

        with patch("scripts.gallery_assets._verified_unlink", side_effect=fail_mirror):
            with self.assertRaisesRegex(AssetError, "simulated"):
                migrate_videos(self.source, self.mirror, self.destination, self.manifest, self.report)

        self.assertFalse(source.exists())
        self.assertTrue(mirror.exists())
        self.assertEqual(json.loads(self.manifest.read_text())["migration_status"], "ready-to-delete")

        result = migrate_videos(self.source, self.mirror, self.destination, self.manifest, self.report)
        self.assertEqual(result["migrated"], 1)
        self.assertFalse(mirror.exists())
        self.assertEqual(json.loads(self.manifest.read_text())["migration_status"], "complete")

    def test_video_migration_recovers_when_final_report_write_fails(self):
        """Recover when final evidence fails after source deletion."""
        source, mirror = self.add_pair()
        real_write = gallery_assets._write_atomic

        def fail_complete_report(path, content):
            """Simulate failure while recording completed evidence."""
            if Path(path) == self.report and "- status: complete" in content:
                raise AssetError("simulated final report failure")
            return real_write(path, content)

        with patch("scripts.gallery_assets._write_atomic", side_effect=fail_complete_report):
            with self.assertRaisesRegex(AssetError, "simulated"):
                migrate_videos(self.source, self.mirror, self.destination, self.manifest, self.report)

        self.assertFalse(source.exists())
        self.assertFalse(mirror.exists())
        self.assertEqual(json.loads(self.manifest.read_text())["migration_status"], "ready-to-delete")

        migrate_videos(self.source, self.mirror, self.destination, self.manifest, self.report)
        self.assertIn("status: complete", self.report.read_text())

    def test_tracked_materials_detects_non_video_assets(self):
        """Detect every tracked material type rather than videos alone."""
        repo = self.root / "repo"
        repo.mkdir()
        subprocess.run(  # noqa: S603 - executable is resolved; arguments are fixed
            [self.git, "init", "-q"], cwd=repo, check=True,
        )
        frame = repo / "materials/frame-extracts/frame.png"
        frame.parent.mkdir(parents=True)
        frame.write_bytes(b"png")
        subprocess.run(  # noqa: S603 - executable is resolved; arguments are fixed
            [self.git, "add", "-f", "materials/frame-extracts/frame.png"],
            cwd=repo,
            check=True,
        )
        self.assertEqual(_tracked_materials(repo), ["materials/frame-extracts/frame.png"])

    def test_consistency_skips_hashing_when_local_material_roots_are_absent(self):
        """Report explicit skips for absent local-only material roots."""
        main, gallery, door = self._consistency_fixture()
        result = gallery_assets.gallery_consistency(main, gallery, expected_count=1)

        self.assertEqual(
            result["skipped"],
            [
                "videos: materials/door-transitions absent",
                "frames: materials/frame-extracts absent",
            ],
        )

    def test_consistency_rejects_truncated_manifest_without_local_materials(self):
        """Validate tracked inventory metadata in an asset-free checkout."""
        main, gallery, door = self._consistency_fixture()
        payload = {
            "version": 2,
            "migration_status": "complete",
            "videos": [{
                "source_relative": "source/door.mp4",
                "destination": "1-1/c05/door.mp4",
                "bytes": 5,
                "sha256": hashlib.sha256(b"video").hexdigest(),
            }],
        }
        (main / "docs/gallery-video-manifest.json").write_text(json.dumps(payload), encoding="utf-8")

        with self.assertRaisesRegex(AssetError, "expected 318 videos"):
            gallery_assets.gallery_consistency(main, gallery, expected_count=1)

    def test_consistency_rejects_truncated_video_manifest(self):
        """Require the complete 318-video inventory when local videos exist."""
        main, gallery, door = self._consistency_fixture()
        video_root = gallery / "materials/door-transitions"
        video = video_root / "1-1/c05/door.mp4"
        video.parent.mkdir(parents=True)
        video.write_bytes(b"video")
        payload = {
            "version": 2,
            "migration_status": "complete",
            "videos": [{
                "source_relative": "source/door.mp4",
                "destination": "1-1/c05/door.mp4",
                "bytes": 5,
                "sha256": hashlib.sha256(b"video").hexdigest(),
            }],
        }
        (main / "docs/gallery-video-manifest.json").write_text(json.dumps(payload), encoding="utf-8")

        with self.assertRaisesRegex(AssetError, "expected 318 videos"):
            gallery_assets.gallery_consistency(main, gallery, expected_count=1)

    def test_consistency_rejects_invalid_frame_inventory_totals(self):
        """Require the complete frame count and hash distribution."""
        main, gallery, door = self._consistency_fixture()
        frame_root = gallery / "materials/frame-extracts"
        frame = frame_root / "1-1/c05/set-001/frame_0001.png"
        frame.parent.mkdir(parents=True)
        frame.write_bytes(b"frame")
        payload = {
            "version": 2,
            "migration_status": "complete",
            "frames": [{
                "source_relative": "source/frame_0001.png",
                "destination": "1-1/c05/set-001/frame_0001.png",
                "bytes": 5,
                "sha256": hashlib.sha256(b"frame").hexdigest(),
            }],
        }
        (main / "docs/gallery-frame-manifest.json").write_text(json.dumps(payload), encoding="utf-8")

        with self.assertRaisesRegex(AssetError, "expected 12332 frames"):
            gallery_assets.gallery_consistency(main, gallery, expected_count=1)

    def test_consistency_rejects_tracked_main_repo_duplicates_of_canonical_docs(self):
        """Fail closed when the main repo reintroduces tracked evaluation copies."""
        main, gallery, _ = self._consistency_fixture()
        duplicate = main / "docs/door-classifications.md"
        duplicate.write_text("duplicate", encoding="utf-8")
        subprocess.run(  # noqa: S603 - executable is resolved; arguments are fixed
            [self.git, "add", "docs/door-classifications.md"],
            cwd=main,
            check=True,
        )

        with self.assertRaisesRegex(AssetError, "tracked canonical evaluation docs"):
            gallery_assets.gallery_consistency(main, gallery, expected_count=1)

    def test_consistency_rejects_missing_gallery_canonical_doc(self):
        """Fail when the gallery checkout is missing a required canonical doc."""
        main, gallery, _ = self._consistency_fixture()
        (gallery / "docs/door-classification-report.md").unlink()

        with self.assertRaisesRegex(AssetError, "gallery canonical doc is missing"):
            gallery_assets.gallery_consistency(main, gallery, expected_count=1)


if __name__ == "__main__":
    unittest.main()
