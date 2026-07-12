#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import date
from pathlib import Path


class AssetError(RuntimeError):
    pass


VIDEO_SUFFIXES = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v"}
FIELDS = (
    "game", "code", "name", "variants", "form", "material",
    "animation", "accessory", "csv", "verdict", "note",
)


def sha256_file(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_no_symlinks(root):
    root = Path(root)
    if root.is_symlink():
        raise AssetError(f"symlink is not allowed: {root}")
    if not root.is_dir():
        raise AssetError(f"source directory is missing: {root}")
    for directory, dirs, files in os.walk(root, followlinks=False):
        directory = Path(directory)
        for name in dirs + files:
            path = directory / name
            if path.is_symlink():
                raise AssetError(f"symlink is not allowed: {path}")


def discover_mp4(root):
    root = Path(root)
    validate_no_symlinks(root)
    files = []
    for directory, _, names in os.walk(root, followlinks=False):
        for name in names:
            path = Path(directory) / name
            if path.suffix.lower() == ".mp4":
                if not path.is_file() or path.is_symlink():
                    raise AssetError(f"non-regular MP4 is not allowed: {path}")
                files.append(path)
    return sorted(files)


def destination_relative(source_root, source_file):
    source_root = Path(source_root)
    source_file = Path(source_file)
    try:
        relative = source_file.relative_to(source_root)
    except ValueError as exc:
        raise AssetError(f"video is outside source root: {source_file}") from exc
    if len(relative.parts) != 3:
        raise AssetError(f"unexpected source layout: {relative}")
    game_match = re.match(r"^(1-\d)\b", relative.parts[0])
    door_match = re.match(r"^([a-d]\d+)", relative.parts[1], re.IGNORECASE)
    if not game_match or not door_match:
        raise AssetError(f"cannot map source path: {relative}")
    game = game_match.group(1)
    code = door_match.group(1).lower()
    return Path(game) / code / relative.name


def _relative_map(root):
    root = Path(root)
    return {path.relative_to(root): path for path in discover_mp4(root)}


def build_inventory(source_root, mirror_root):
    source_root = Path(source_root)
    mirror_root = Path(mirror_root)
    source_files = _relative_map(source_root)
    mirror_files = _relative_map(mirror_root)
    if source_files.keys() != mirror_files.keys():
        raise AssetError("mirror mismatch: relative MP4 paths differ")

    entries = []
    hashes = {}
    destinations = set()
    for relative in sorted(source_files):
        source = source_files[relative]
        mirror = mirror_files[relative]
        source_size = source.stat().st_size
        mirror_size = mirror.stat().st_size
        source_hash = sha256_file(source)
        if source_size != mirror_size or source_hash != sha256_file(mirror):
            raise AssetError(f"mirror mismatch: {relative}")
        destination = destination_relative(source_root, source).as_posix()
        if destination in destinations:
            raise AssetError(f"destination collision: {destination}")
        destinations.add(destination)
        if source_hash in hashes:
            raise AssetError(f"duplicate SHA-256: {relative} and {hashes[source_hash]}")
        hashes[source_hash] = relative
        entries.append({
            "source_relative": relative.as_posix(),
            "destination": destination,
            "bytes": source_size,
            "sha256": source_hash,
        })
    return entries


def _discover_png(root):
    root = Path(root)
    validate_no_symlinks(root)
    return sorted(
        path for path in root.rglob("*")
        if path.is_file() and not path.is_symlink() and path.suffix.lower() == ".png"
    )


def build_frame_inventory(source_root, mirror_root):
    source_root = Path(source_root)
    mirror_root = Path(mirror_root)
    source_files = {path.relative_to(source_root): path for path in _discover_png(source_root)}
    mirror_files = {path.relative_to(mirror_root): path for path in _discover_png(mirror_root)}
    if source_files.keys() != mirror_files.keys():
        raise AssetError("frame mirror mismatch: relative PNG paths differ")

    groups = {}
    parsed = {}
    for relative in source_files:
        if len(relative.parts) != 4:
            raise AssetError(f"unexpected frame layout: {relative}")
        game_match = re.match(r"^(1-\d)\b", relative.parts[0])
        door_match = re.match(r"^([a-d]\d+)", relative.parts[1], re.IGNORECASE)
        if not game_match or not door_match:
            raise AssetError(f"cannot map frame path: {relative}")
        key = (game_match.group(1), door_match.group(1).lower())
        groups.setdefault(key, set()).add(relative.parts[2])
        parsed[relative] = key
    group_numbers = {
        (key, group): index
        for key, names in groups.items()
        for index, group in enumerate(sorted(names), start=1)
    }

    entries = []
    destinations = set()
    for relative in sorted(source_files):
        source = source_files[relative]
        mirror = mirror_files[relative]
        source_hash = sha256_file(source)
        if source.stat().st_size != mirror.stat().st_size or source_hash != sha256_file(mirror):
            raise AssetError(f"frame mirror mismatch: {relative}")
        game, code = parsed[relative]
        set_number = group_numbers[((game, code), relative.parts[2])]
        destination = Path(game) / code / f"set-{set_number:03d}" / relative.name
        destination_text = destination.as_posix()
        if destination_text in destinations:
            raise AssetError(f"frame destination collision: {destination_text}")
        destinations.add(destination_text)
        entries.append({
            "source_relative": relative.as_posix(),
            "destination": destination_text,
            "bytes": source.stat().st_size,
            "sha256": source_hash,
        })
    return entries


def _validate_destination_path(root, path=None):
    raw_root = Path(root).absolute()
    raw_path = Path(path or raw_root).absolute()
    if raw_root.is_symlink() or raw_path.is_symlink():
        raise AssetError(f"destination symlink is not allowed: {raw_path}")
    root = raw_root.resolve(strict=False)
    path = raw_path.resolve(strict=False)
    try:
        path.relative_to(root)
    except ValueError as exc:
        raise AssetError(f"destination escapes root: {path}") from exc
    if root.exists():
        validate_no_symlinks(root)


def _ensure_destination_parent(root, destination):
    root = Path(root).absolute()
    destination = Path(destination).absolute()
    _validate_destination_path(root, destination)
    current = root
    current.mkdir(parents=True, exist_ok=True)
    for part in destination.relative_to(root).parent.parts:
        current /= part
        if current.exists() or current.is_symlink():
            if current.is_symlink() or not current.is_dir():
                raise AssetError(f"destination symlink/non-directory is not allowed: {current}")
        else:
            current.mkdir()


def _copy_exclusive(source, destination, expected_hash, destination_root):
    destination = Path(destination)
    _ensure_destination_parent(destination_root, destination)
    if destination.exists() or destination.is_symlink():
        if destination.is_symlink() or not destination.is_file():
            raise AssetError(f"destination symlink/non-file is not allowed: {destination}")
        if sha256_file(destination) != expected_hash:
            raise AssetError(f"destination mismatch: {destination}")
        return

    fd, temp_name = tempfile.mkstemp(prefix=f".{destination.name}.", dir=destination.parent)
    temp_path = Path(temp_name)
    try:
        with os.fdopen(fd, "wb") as output, Path(source).open("rb") as input_file:
            shutil.copyfileobj(input_file, output, length=1024 * 1024)
            output.flush()
            os.fsync(output.fileno())
        if sha256_file(temp_path) != expected_hash:
            raise AssetError(f"copied file hash mismatch: {destination}")
        try:
            os.link(temp_path, destination)
        except FileExistsError:
            if destination.is_symlink() or not destination.is_file() or sha256_file(destination) != expected_hash:
                raise AssetError(f"destination changed during copy: {destination}")
    finally:
        temp_path.unlink(missing_ok=True)


def _write_atomic(path, content):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and not path.is_file():
        raise AssetError(f"output path is not a regular file: {path}")
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    temp_path = Path(temp_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as output:
            output.write(content)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temp_path, path)
    except OSError as exc:
        temp_path.unlink(missing_ok=True)
        raise AssetError(f"cannot write {path}: {exc}") from exc


def _report_text(status, entries, source_root, mirror_root, destination_root):
    source_mp4 = len(list(Path(source_root).rglob("*.mp4")))
    mirror_mp4 = len(list(Path(mirror_root).rglob("*.mp4")))
    source_png = len(list(Path(source_root).rglob("*.png")))
    mirror_png = len(list(Path(mirror_root).rglob("*.png")))
    destination_mp4 = len(list(Path(destination_root).rglob("*.mp4"))) if Path(destination_root).exists() else 0
    return "\n".join([
        "# Gallery Migration Verification",
        "",
        f"- date: {date.today().isoformat()}",
        f"- status: {status}",
        f"- canonical source: `{source_root}`",
        f"- mirror source: `{mirror_root}`",
        f"- destination: `{destination_root}`",
        f"- manifest entries: {len(entries)}",
        f"- unique SHA-256 values: {len({entry['sha256'] for entry in entries})}",
        f"- canonical MP4 count: {source_mp4}",
        f"- mirror MP4 count: {mirror_mp4}",
        f"- destination MP4 count: {destination_mp4}",
        f"- canonical PNG count: {source_png}",
        f"- mirror PNG count: {mirror_png}",
        "",
    ])


def _verified_unlink(path, expected_hash):
    path = Path(path)
    if path.is_symlink() or not path.is_file():
        raise AssetError(f"source changed before unlink: {path}")
    with path.open("rb") as handle:
        before = os.fstat(handle.fileno())
        digest = hashlib.sha256()
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    after = path.stat(follow_symlinks=False)
    identity = (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns)
    current = (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns)
    if identity != current or digest.hexdigest() != expected_hash:
        raise AssetError(f"source changed before unlink: {path}")
    path.unlink()


def migrate_videos(source_root, mirror_root, destination_root, manifest_path, report_path):
    source_root = Path(source_root)
    mirror_root = Path(mirror_root)
    destination_root = Path(destination_root)
    manifest_path = Path(manifest_path)
    report_path = Path(report_path)

    entries = build_inventory(source_root, mirror_root)
    _validate_destination_path(destination_root)
    for entry in entries:
        source = source_root / entry["source_relative"]
        destination = destination_root / entry["destination"]
        _copy_exclusive(source, destination, entry["sha256"], destination_root)

    for entry in entries:
        destination = destination_root / entry["destination"]
        if destination.is_symlink() or not destination.is_file() or sha256_file(destination) != entry["sha256"]:
            raise AssetError(f"destination verification failed: {destination}")

    manifest = {"version": 1, "videos": [
        {key: entry[key] for key in ("destination", "bytes", "sha256")}
        for entry in entries
    ]}
    _write_atomic(manifest_path, json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    _write_atomic(report_path, _report_text("ready-to-delete", entries, source_root, mirror_root, destination_root))

    for entry in entries:
        _verified_unlink(source_root / entry["source_relative"], entry["sha256"])
        _verified_unlink(mirror_root / entry["source_relative"], entry["sha256"])

    _write_atomic(report_path, _report_text("complete", entries, source_root, mirror_root, destination_root))
    return {"migrated": len(entries), "unique_hashes": len(entries)}


def migrate_frames(source_root, mirror_root, destination_root, manifest_path, report_path):
    source_root = Path(source_root)
    mirror_root = Path(mirror_root)
    destination_root = Path(destination_root)
    entries = build_frame_inventory(source_root, mirror_root)
    _validate_destination_path(destination_root)
    for entry in entries:
        _copy_exclusive(
            source_root / entry["source_relative"],
            destination_root / entry["destination"],
            entry["sha256"],
            destination_root,
        )
    for entry in entries:
        destination = destination_root / entry["destination"]
        if destination.is_symlink() or not destination.is_file() or sha256_file(destination) != entry["sha256"]:
            raise AssetError(f"frame destination verification failed: {destination}")

    public_entries = [
        {key: entry[key] for key in ("destination", "bytes", "sha256")}
        for entry in entries
    ]
    _write_atomic(manifest_path, json.dumps({"version": 1, "frames": public_entries}, indent=2) + "\n")
    report = Path(report_path).read_text(encoding="utf-8") if Path(report_path).exists() else "# Gallery Migration Verification\n"
    unique_hashes = len({entry["sha256"] for entry in entries})
    pre_section = "\n".join([
        "", "## Frame Migration", "", "- status: ready-to-delete",
        f"- manifest entries: {len(entries)}", f"- unique SHA-256 values: {unique_hashes}",
        f"- duplicate logical frames preserved: {len(entries) - unique_hashes}", "",
    ])
    _write_atomic(report_path, report.rstrip() + "\n" + pre_section)

    for entry in entries:
        _verified_unlink(source_root / entry["source_relative"], entry["sha256"])
        _verified_unlink(mirror_root / entry["source_relative"], entry["sha256"])

    final = Path(report_path).read_text(encoding="utf-8").replace(
        "## Frame Migration\n\n- status: ready-to-delete",
        "## Frame Migration\n\n- status: complete",
    )
    final += "\n".join([
        "", f"- canonical PNG count after migration: {len(_discover_png(source_root))}",
        f"- mirror PNG count after migration: {len(_discover_png(mirror_root))}",
        f"- destination PNG count: {len(_discover_png(destination_root))}", "",
    ])
    _write_atomic(report_path, final)
    return {"migrated": len(entries), "unique_hashes": unique_hashes}


def parse_classifications(path):
    rows = []
    game = None
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        heading = re.match(r"^##\s+(1-\d)\s", line)
        if heading:
            game = heading.group(1)
            continue
        if not game or not re.match(r"^\|\s*[a-d]\d", line):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) < 10:
            continue
        verdict = re.sub(r"^(✅|⚠️|❌)\s*", r"\1 ", cells[8])
        rows.append({
            "game": game, "code": cells[0], "name": cells[1], "variants": cells[2],
            "form": cells[3], "material": cells[4], "animation": cells[5],
            "accessory": cells[6], "csv": cells[7], "verdict": verdict, "note": cells[9],
        })
    return rows


def _tracked_videos(repo):
    result = subprocess.run(
        ["git", "ls-files"], cwd=repo, capture_output=True, text=True, check=True,
    )
    return [name for name in result.stdout.splitlines() if Path(name).suffix.lower() in VIDEO_SUFFIXES]


def gallery_consistency(main_root, gallery_root, expected_count=113):
    main_root = Path(main_root)
    gallery_root = Path(gallery_root)
    if not gallery_root.is_dir():
        raise AssetError(f"gallery checkout is missing: {gallery_root}")
    rows = parse_classifications(main_root / "docs/door-classifications.md")
    doors = json.loads((gallery_root / "doors.json").read_text(encoding="utf-8"))
    if len(rows) != expected_count or len(doors) != expected_count:
        raise AssetError(f"door count mismatch: docs={len(rows)}, gallery={len(doors)}")
    for index, (expected, actual) in enumerate(zip(rows, doors)):
        for field in FIELDS:
            if expected[field] != actual.get(field):
                raise AssetError(f"door mismatch at {index} {field}: {expected[field]!r} != {actual.get(field)!r}")

    html_text = (gallery_root / "index.html").read_text(encoding="utf-8")
    missing_notes = [f"{door['game']} {door['code']}" for door in doors if door["note"] not in html_text]
    if missing_notes:
        raise AssetError(f"notes missing from index.html: {', '.join(missing_notes)}")

    docs = (
        "door-classifications.md", "door-classification-report.md",
        "Doors-Difficulity-Estimation.xlsm.csv",
    )
    for name in docs:
        if sha256_file(main_root / "docs" / name) != sha256_file(gallery_root / "docs" / name):
            raise AssetError(f"published document mismatch: {name}")

    stills = len(list((gallery_root / "stills").glob("*.jpg")))
    gifs = len(list((gallery_root / "gifs").glob("*.gif")))
    if stills != expected_count or gifs != expected_count:
        raise AssetError(f"asset count mismatch: stills={stills}, gifs={gifs}")

    for repo in (main_root, gallery_root):
        tracked = _tracked_videos(repo)
        if tracked:
            raise AssetError(f"tracked videos in {repo}: {', '.join(tracked)}")

    ignore = subprocess.run(
        ["git", "check-ignore", "materials/probe.mp4"], cwd=gallery_root,
        capture_output=True, text=True,
    )
    if ignore.returncode != 0:
        raise AssetError("gallery /materials/ is not ignored")

    manifest_path = main_root / "docs/gallery-video-manifest.json"
    video_root = gallery_root / "materials/door-transitions"
    manifest_count = None
    if manifest_path.exists():
        videos = json.loads(manifest_path.read_text(encoding="utf-8"))["videos"]
        hashes = {entry["sha256"] for entry in videos}
        if len(hashes) != len(videos):
            raise AssetError("manifest contains duplicate SHA-256 values")
        for entry in videos:
            path = video_root / entry["destination"]
            if path.is_symlink() or not path.is_file() or sha256_file(path) != entry["sha256"]:
                raise AssetError(f"manifest video mismatch: {entry['destination']}")
        manifest_count = len(videos)
    frame_count = None
    frame_manifest = main_root / "docs/gallery-frame-manifest.json"
    frame_root = gallery_root / "materials/frame-extracts"
    if frame_manifest.exists():
        frames = json.loads(frame_manifest.read_text(encoding="utf-8"))["frames"]
        for entry in frames:
            path = frame_root / entry["destination"]
            if path.is_symlink() or not path.is_file() or sha256_file(path) != entry["sha256"]:
                raise AssetError(f"manifest frame mismatch: {entry['destination']}")
        frame_count = len(frames)
    return {"doors": len(doors), "stills": stills, "gifs": gifs, "videos": manifest_count, "frames": frame_count}


def clean_local_gallery(main_root, gallery_root, report_path):
    main_root = Path(main_root)
    gallery_root = Path(gallery_root)
    local_root = main_root / "docs/door-gallery"
    validate_no_symlinks(local_root)
    gallery_consistency(main_root, gallery_root)
    files = sorted(path for path in local_root.rglob("*") if path.is_file())
    snapshots = []
    identical = 0
    stale = []
    for source in files:
        relative = source.relative_to(local_root)
        target_relative = Path("index.html") if relative.as_posix() == "door-gallery.html" else relative
        target = gallery_root / target_relative
        if not target.is_file() or target.is_symlink():
            raise AssetError(f"local gallery counterpart missing: {relative}")
        source_hash = sha256_file(source)
        target_hash = sha256_file(target)
        if source_hash == target_hash:
            identical += 1
        elif relative.as_posix() == "doors.json":
            stale.append(relative.as_posix())
        else:
            raise AssetError(f"unexplained local gallery mismatch: {relative}")
        stat = source.stat(follow_symlinks=False)
        snapshots.append((source, source_hash, stat.st_dev, stat.st_ino, stat.st_size, stat.st_mtime_ns))

    existing_report = Path(report_path).read_text(encoding="utf-8") if Path(report_path).exists() else "# Gallery Migration Verification\n"
    cleanup_evidence = "\n".join([
        "", "## Local Gallery Cleanup", "",
        f"- status: ready-to-delete", f"- inventoried files: {len(files)}",
        f"- byte-identical counterparts: {identical}",
        f"- explained stale files: {', '.join(stale) if stale else 'none'}", "",
    ])
    _write_atomic(report_path, existing_report.rstrip() + "\n" + cleanup_evidence)

    for source, expected_hash, dev, ino, size, mtime_ns in snapshots:
        stat = source.stat(follow_symlinks=False)
        if source.is_symlink() or (stat.st_dev, stat.st_ino, stat.st_size, stat.st_mtime_ns) != (dev, ino, size, mtime_ns):
            raise AssetError(f"local gallery changed before unlink: {source}")
        if sha256_file(source) != expected_hash:
            raise AssetError(f"local gallery changed before unlink: {source}")
        source.unlink()
    for directory in sorted((path for path in local_root.rglob("*") if path.is_dir()), reverse=True):
        try:
            directory.rmdir()
        except OSError:
            pass
    try:
        local_root.rmdir()
    except OSError:
        pass

    final = Path(report_path).read_text(encoding="utf-8").replace(
        "## Local Gallery Cleanup\n\n- status: ready-to-delete",
        "## Local Gallery Cleanup\n\n- status: complete",
    )
    _write_atomic(report_path, final)
    return {"files": len(files), "identical": identical, "stale": stale, "removed": not local_root.exists()}


def _default_paths(main_root):
    main_root = Path(main_root).absolute()
    gallery_root = Path(os.environ.get("DOOR_GALLERY_ROOT", main_root.parent / "re-door-gallery")).absolute()
    return {
        "main": main_root,
        "gallery": gallery_root,
        "source": main_root / "materials/1 開門動畫轉場製作",
        "mirror": main_root / "materials/Organized/1 開門動畫轉場製作",
        "destination": gallery_root / "materials/door-transitions",
        "manifest": main_root / "docs/gallery-video-manifest.json",
        "report": main_root / "docs/gallery-migration-verification.md",
        "frame_destination": gallery_root / "materials/frame-extracts",
        "frame_manifest": main_root / "docs/gallery-frame-manifest.json",
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description="Migrate and verify door gallery assets")
    parser.add_argument("command", choices=("migrate", "migrate-frames", "check", "clean-local-gallery"))
    parser.add_argument("--main-root", default=Path(__file__).resolve().parents[1])
    args = parser.parse_args(argv)
    paths = _default_paths(args.main_root)
    if args.command == "migrate":
        result = migrate_videos(paths["source"], paths["mirror"], paths["destination"], paths["manifest"], paths["report"])
        print(json.dumps(result, ensure_ascii=False))
        return 0
    if args.command == "check":
        print(json.dumps(gallery_consistency(paths["main"], paths["gallery"]), ensure_ascii=False))
        return 0
    if args.command == "migrate-frames":
        result = migrate_frames(
            paths["source"], paths["mirror"], paths["frame_destination"],
            paths["frame_manifest"], paths["report"],
        )
        print(json.dumps(result, ensure_ascii=False))
        return 0
    if args.command == "clean-local-gallery":
        result = clean_local_gallery(paths["main"], paths["gallery"], paths["report"])
        print(json.dumps(result, ensure_ascii=False))
        return 0
    raise AssetError(f"unknown command: {args.command}")


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssetError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
