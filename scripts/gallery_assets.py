#!/usr/bin/env python3
"""Migrate and verify local-only assets shared with the door gallery repository."""

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
    """Raised when an asset operation cannot complete without risking data loss."""

    pass


VIDEO_SUFFIXES = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v"}
EXPECTED_VIDEO_COUNT = 318
EXPECTED_FRAME_COUNT = 12_332
EXPECTED_FRAME_UNIQUE_HASHES = 10_982
FIELDS = (
    "game", "code", "name", "variants", "form", "material",
    "animation", "accessory", "csv", "verdict", "note",
)
CANONICAL_EVALUATION_DOCS = (
    "door-classifications.md",
    "door-classification-report.md",
    "Doors-Difficulity-Estimation.xlsm.csv",
)


def sha256_file(path):
    """Return the SHA-256 digest for a file using bounded-memory reads."""
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_no_symlinks(root):
    """Reject missing roots and any symlink found below the supplied root."""
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
    """Return sorted regular MP4 files after validating the complete tree."""
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
    """Map a legacy video path to its ASCII game/code destination path."""
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
    """Index validated MP4 files by source-relative path."""
    root = Path(root)
    return {path.relative_to(root): path for path in discover_mp4(root)}


def build_inventory(source_root, mirror_root):
    """Build a collision-free video inventory after mirror hash validation."""
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
    """Return sorted regular PNG files after validating the complete tree."""
    root = Path(root)
    validate_no_symlinks(root)
    return sorted(
        path for path in root.rglob("*")
        if path.is_file() and not path.is_symlink() and path.suffix.lower() == ".png"
    )


def build_frame_inventory(source_root, mirror_root):
    """Build an ASCII frame inventory while preserving logical repeated frames."""
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
    """Ensure a destination is contained by a regular, symlink-free root."""
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
    """Create regular destination parents without following symlinks."""
    root = Path(root).resolve(strict=False)
    destination = Path(destination).resolve(strict=False)
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
    """Atomically create or verify a destination without overwriting content."""
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
        except FileExistsError as exc:
            if destination.is_symlink() or not destination.is_file() or sha256_file(destination) != expected_hash:
                raise AssetError(f"destination changed during copy: {destination}") from exc
    finally:
        temp_path.unlink(missing_ok=True)


def _write_atomic(path, content):
    """Atomically replace a UTF-8 text file after flushing it to disk."""
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


def _report_text(status, entries, source_root, mirror_root, destination_root, main_repo):
    """Render the video migration evidence recorded before and after deletion."""
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
        f"- canonical source: `{_report_relative(source_root, main_repo)}`",
        f"- mirror source: `{_report_relative(mirror_root, main_repo)}`",
        f"- destination: `{_report_relative(destination_root, main_repo)}`",
        f"- manifest entries: {len(entries)}",
        f"- unique SHA-256 values: {len({entry['sha256'] for entry in entries})}",
        f"- canonical/mirror SHA-256 verification: passed ({len(entries)} files)",
        f"- canonical/destination SHA-256 verification: passed ({len(entries)} files)",
        f"- canonical MP4 count: {source_mp4}",
        f"- mirror MP4 count: {mirror_mp4}",
        f"- destination MP4 count: {destination_mp4}",
        f"- canonical PNG count: {source_png}",
        f"- mirror PNG count: {mirror_png}",
        "- canonical repository materials boundary: passed (ignored; 0 tracked files)",
        "- gallery repository materials boundary: passed (ignored; 0 tracked files)",
        "",
    ])


def _report_relative(path, main_repo):
    """Render a stable path relative to the main repository checkout."""
    return Path(os.path.relpath(Path(path).resolve(), Path(main_repo).resolve())).as_posix()


def _verified_unlink(path, expected_hash):
    """Unlink only when identity metadata and a fresh digest still match."""
    path = Path(path)
    if path.is_symlink() or not path.is_file():
        raise AssetError(f"source changed before unlink: {path}")
    with path.open("rb") as handle:
        before = os.fstat(handle.fileno())
        digest = hashlib.sha256()
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    after = path.lstat()
    identity = (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns)
    current = (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns)
    if identity != current or digest.hexdigest() != expected_hash:
        raise AssetError(f"source changed before unlink: {path}")
    path.unlink()


def migrate_videos(source_root, mirror_root, destination_root, manifest_path, report_path):
    """Copy, verify, inventory, and then remove duplicated source videos."""
    source_root = Path(source_root)
    mirror_root = Path(mirror_root)
    destination_root = Path(destination_root)
    manifest_path = Path(manifest_path)
    report_path = Path(report_path)

    migration_state = _resume_entries(
        manifest_path, "videos", source_root, mirror_root, destination_root,
    )
    if migration_state is None:
        entries = build_inventory(source_root, mirror_root)
    else:
        entries, status = migration_state
        if status == "complete":
            return {"migrated": len(entries), "unique_hashes": len(entries)}
    _validate_destination_path(destination_root)
    for entry in entries:
        source = _manifest_path(source_root, entry["source_relative"], "source")
        destination = _manifest_path(destination_root, entry["destination"], "destination")
        _copy_exclusive(source, destination, entry["sha256"], destination_root)

    for entry in entries:
        destination = _manifest_path(destination_root, entry["destination"], "destination")
        if destination.is_symlink() or not destination.is_file() or sha256_file(destination) != entry["sha256"]:
            raise AssetError(f"destination verification failed: {destination}")

    ready_manifest = _manifest_payload("videos", entries, "ready-to-delete")
    _write_atomic(manifest_path, json.dumps(ready_manifest, ensure_ascii=False, indent=2) + "\n")
    _validate_manifest(manifest_path, "videos", entries, "ready-to-delete")
    main_repo, _ = _validate_repository_boundaries(source_root, mirror_root, destination_root)
    _write_atomic(
        report_path,
        _report_text("ready-to-delete", entries, source_root, mirror_root, destination_root, main_repo),
    )

    for entry in entries:
        for root in (source_root, mirror_root):
            source = _manifest_path(root, entry["source_relative"], "source")
            if source.exists() or source.is_symlink():
                _verified_unlink(source, entry["sha256"])

    _write_atomic(
        report_path,
        _report_text("complete", entries, source_root, mirror_root, destination_root, main_repo),
    )
    complete_manifest = _manifest_payload("videos", entries, "complete")
    _write_atomic(manifest_path, json.dumps(complete_manifest, ensure_ascii=False, indent=2) + "\n")
    _validate_manifest(manifest_path, "videos", entries, "complete")
    return {"migrated": len(entries), "unique_hashes": len(entries)}


def migrate_frames(source_root, mirror_root, destination_root, manifest_path, report_path):
    """Copy and verify all logical frames before removing both source copies."""
    source_root = Path(source_root)
    mirror_root = Path(mirror_root)
    destination_root = Path(destination_root)
    migration_state = _resume_entries(
        manifest_path, "frames", source_root, mirror_root, destination_root,
    )
    if migration_state is None:
        entries = build_frame_inventory(source_root, mirror_root)
    else:
        entries, status = migration_state
        if status == "complete":
            return {
                "migrated": len(entries),
                "unique_hashes": len({entry["sha256"] for entry in entries}),
            }
    _validate_destination_path(destination_root)
    for entry in entries:
        _copy_exclusive(
            _manifest_path(source_root, entry["source_relative"], "source"),
            _manifest_path(destination_root, entry["destination"], "destination"),
            entry["sha256"],
            destination_root,
        )
    for entry in entries:
        destination = _manifest_path(destination_root, entry["destination"], "destination")
        if destination.is_symlink() or not destination.is_file() or sha256_file(destination) != entry["sha256"]:
            raise AssetError(f"frame destination verification failed: {destination}")

    ready_manifest = _manifest_payload("frames", entries, "ready-to-delete")
    _write_atomic(manifest_path, json.dumps(ready_manifest, ensure_ascii=False, indent=2) + "\n")
    _validate_manifest(manifest_path, "frames", entries, "ready-to-delete")
    _validate_repository_boundaries(source_root, mirror_root, destination_root)
    report = Path(report_path).read_text(encoding="utf-8") if Path(report_path).exists() else "# Gallery Migration Verification\n"
    unique_hashes = len({entry["sha256"] for entry in entries})
    pre_section = "\n".join([
        "", "## Frame Migration", "", "- status: ready-to-delete",
        f"- manifest entries: {len(entries)}", f"- unique SHA-256 values: {unique_hashes}",
        f"- duplicate logical frames preserved: {len(entries) - unique_hashes}", "",
        f"- canonical/mirror SHA-256 verification: passed ({len(entries)} files)",
        f"- canonical/destination SHA-256 verification: passed ({len(entries)} files)", "",
        "- canonical repository materials boundary: passed (ignored; 0 tracked files)",
        "- gallery repository materials boundary: passed (ignored; 0 tracked files)", "",
    ])
    _write_atomic(report_path, report.rstrip() + "\n" + pre_section)

    for entry in entries:
        for root in (source_root, mirror_root):
            source = _manifest_path(root, entry["source_relative"], "source")
            if source.exists() or source.is_symlink():
                _verified_unlink(source, entry["sha256"])

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
    complete_manifest = _manifest_payload("frames", entries, "complete")
    _write_atomic(manifest_path, json.dumps(complete_manifest, ensure_ascii=False, indent=2) + "\n")
    _validate_manifest(manifest_path, "frames", entries, "complete")
    return {"migrated": len(entries), "unique_hashes": unique_hashes}


def parse_classifications(path):
    """Parse classification Markdown rows into normalized gallery records."""
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


def _tracked_materials(repo):
    """List every file tracked below a repository's materials directory."""
    git = shutil.which("git")
    if not git:
        raise AssetError("git executable is required for material-boundary checks")
    result = subprocess.run(  # noqa: S603 - executable is resolved; arguments are fixed
        [git, "ls-files", "--", "materials"],
        cwd=repo,
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.splitlines()


def _tracked_paths(repo, *paths):
    """List tracked paths exactly matching the supplied repository-relative names."""
    git = shutil.which("git")
    if not git:
        raise AssetError("git executable is required for tracked-path checks")
    result = subprocess.run(  # noqa: S603 - executable is resolved; arguments are fixed
        [git, "ls-files", "--", *paths],
        cwd=repo,
        capture_output=True,
        text=True,
        check=True,
    )
    return [line for line in result.stdout.splitlines() if line]


def _git_repository_root(path):
    """Resolve the Git worktree containing an asset path."""
    git = shutil.which("git")
    if not git:
        raise AssetError("git executable is required for material-boundary checks")
    candidate = Path(path).absolute()
    while not candidate.exists() and candidate != candidate.parent:
        candidate = candidate.parent
    result = subprocess.run(  # noqa: S603 - executable is resolved; arguments are fixed
        [git, "rev-parse", "--show-toplevel"],
        cwd=candidate,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise AssetError(f"asset path is not inside a Git repository: {path}")
    return Path(result.stdout.strip()).absolute()


def _validate_material_boundary(repo):
    """Require an ignored and entirely untracked repository materials tree."""
    tracked = _tracked_materials(repo)
    if tracked:
        raise AssetError(f"tracked materials in {repo}: {', '.join(tracked)}")
    git = shutil.which("git")
    if not git:
        raise AssetError("git executable is required for material-boundary checks")
    ignore = subprocess.run(  # noqa: S603 - executable is resolved; arguments are fixed
        [git, "check-ignore", "--no-index", "materials/"],
        cwd=repo,
        capture_output=True,
        text=True,
    )
    if ignore.returncode != 0:
        raise AssetError(f"materials directory is not ignored in {repo}")


def _validate_repository_boundaries(source_root, mirror_root, destination_root):
    """Validate both repository boundaries before any source asset deletion."""
    source_repo = _git_repository_root(source_root)
    mirror_repo = _git_repository_root(mirror_root)
    gallery_repo = _git_repository_root(destination_root)
    if source_repo != mirror_repo:
        raise AssetError("canonical and mirror assets must belong to the same repository")
    if source_repo == gallery_repo:
        raise AssetError("gallery destination must belong to a separate repository")
    _validate_material_boundary(source_repo)
    _validate_material_boundary(gallery_repo)
    return source_repo, gallery_repo


def _gallery_docs_root(gallery_root):
    """Return the canonical gallery docs root for evaluation records."""
    return Path(gallery_root) / "docs"


def _validate_canonical_doc_ownership(main_root, gallery_root):
    """Fail closed when ownership of evaluation docs is ambiguous or incomplete."""
    tracked_duplicates = _tracked_paths(
        main_root, *(f"docs/{name}" for name in CANONICAL_EVALUATION_DOCS)
    )
    if tracked_duplicates:
        raise AssetError(
            "tracked canonical evaluation docs exist in the main repository: "
            + ", ".join(tracked_duplicates)
        )
    docs_root = _gallery_docs_root(gallery_root)
    for name in CANONICAL_EVALUATION_DOCS:
        path = docs_root / name
        if path.is_symlink() or not path.is_file():
            raise AssetError(f"gallery canonical doc is missing: {path}")
    return docs_root


def _manifest_relative(value, label):
    """Parse a manifest path while rejecting absolute and traversal values."""
    if not isinstance(value, str) or not value:
        raise AssetError(f"invalid {label} in migration manifest")
    relative = Path(value)
    if relative.is_absolute() or ".." in relative.parts:
        raise AssetError(f"{label} escapes asset root: {value}")
    return relative


def _manifest_path(root, value, label):
    """Resolve a manifest path and prove it remains beneath its asset root."""
    root = Path(root).resolve(strict=False)
    candidate = (root / _manifest_relative(value, label)).resolve(strict=False)
    try:
        candidate.relative_to(root)
    except ValueError as exc:
        raise AssetError(f"{label} escapes asset root: {value}") from exc
    return candidate


def _validate_manifest_entry(entry, index, require_source=True):
    """Validate the durable schema shared by video and frame manifest entries."""
    if not isinstance(entry, dict):
        raise AssetError(f"migration manifest entry {index} is not an object")
    if require_source:
        _manifest_relative(entry.get("source_relative"), "source_relative")
    _manifest_relative(entry.get("destination"), "destination")
    size = entry.get("bytes")
    if isinstance(size, bool) or not isinstance(size, int) or size < 0:
        raise AssetError(f"invalid bytes in migration manifest entry {index}")
    digest = entry.get("sha256")
    if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
        raise AssetError(f"invalid sha256 in migration manifest entry {index}")


def _published_manifest_entries(path, key, destination_root, expected_count, expected_unique):
    """Validate tracked manifest metadata independently of local asset presence."""
    try:
        payload = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise AssetError(f"invalid published manifest: {path}") from exc
    if not isinstance(payload, dict) or payload.get("version") not in (1, 2):
        raise AssetError(f"invalid published manifest schema: {path}")
    version = payload["version"]
    if version == 1 and "migration_status" in payload:
        raise AssetError(f"invalid legacy manifest status: {path}")
    if version == 2 and payload.get("migration_status") != "complete":
        raise AssetError(f"{key[:-1]} manifest migration is incomplete")
    entries = payload.get(key)
    if not isinstance(entries, list):
        raise AssetError(f"published manifest has no {key}: {path}")
    if len(entries) != expected_count:
        raise AssetError(f"expected {expected_count} {key}, found {len(entries)} manifest entries")
    for index, entry in enumerate(entries):
        _validate_manifest_entry(entry, index, require_source=version == 2)
        _manifest_path(destination_root, entry["destination"], "destination")
    hashes = {entry["sha256"] for entry in entries}
    if len(hashes) != expected_unique:
        raise AssetError(f"expected {expected_unique} unique {key} hashes, found {len(hashes)}")
    destinations = {entry["destination"] for entry in entries}
    if len(destinations) != len(entries):
        raise AssetError(f"{key[:-1]} manifest contains duplicate destination paths")
    return entries


def _manifest_payload(key, entries, status):
    """Create a durable manifest payload that can resume partial deletion."""
    return {
        "version": 2,
        "migration_status": status,
        key: [
            {name: entry[name] for name in ("source_relative", "destination", "bytes", "sha256")}
            for entry in entries
        ],
    }


def _validate_manifest(path, key, entries, expected_status):
    """Re-read an atomic manifest and require an exact expected payload."""
    expected = _manifest_payload(key, entries, expected_status)
    try:
        actual = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise AssetError(f"cannot validate migration manifest: {path}") from exc
    if actual != expected:
        raise AssetError(f"migration manifest validation failed: {path}")


def _resume_entries(manifest_path, key, source_root, mirror_root, destination_root):
    """Load and validate a resumable ready or completed migration manifest."""
    manifest_path = Path(manifest_path)
    if not manifest_path.is_file():
        return None
    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise AssetError(f"invalid migration manifest: {manifest_path}") from exc
    if not isinstance(payload, dict) or payload.get("version") not in (1, 2):
        raise AssetError(f"invalid migration manifest schema: {manifest_path}")
    version = payload["version"]
    status = payload.get("migration_status")
    if version == 1:
        if status is not None:
            raise AssetError(f"invalid legacy manifest status: {manifest_path}")
        status = "complete"
    elif status not in ("ready-to-delete", "complete"):
        return None
    entries = payload.get(key)
    if not isinstance(entries, list) or not entries:
        raise AssetError(f"ready manifest has no {key}: {manifest_path}")
    for index, entry in enumerate(entries):
        _validate_manifest_entry(entry, index, require_source=version == 2)
        destination = _manifest_path(destination_root, entry["destination"], "destination")
        if destination.is_symlink() or not destination.is_file() or sha256_file(destination) != entry["sha256"]:
            raise AssetError(f"resume destination mismatch: {destination}")
        if version == 1:
            continue
        for root in (source_root, mirror_root):
            source = _manifest_path(root, entry["source_relative"], "source")
            if source.exists() or source.is_symlink():
                if status == "complete":
                    raise AssetError(f"source reappeared after completed migration: {source}")
                if source.is_symlink() or not source.is_file() or sha256_file(source) != entry["sha256"]:
                    raise AssetError(f"resume source mismatch: {source}")
    return entries, status


def gallery_consistency(main_root, gallery_root, expected_count=113):
    """Validate published records, assets, manifests, and Git boundaries."""
    main_root = Path(main_root)
    gallery_root = Path(gallery_root)
    if not gallery_root.is_dir():
        raise AssetError(f"gallery checkout is missing: {gallery_root}")
    docs_root = _validate_canonical_doc_ownership(main_root, gallery_root)
    rows = parse_classifications(docs_root / "door-classifications.md")
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

    stills = len(list((gallery_root / "stills").glob("*.jpg")))
    gifs = len(list((gallery_root / "gifs").glob("*.gif")))
    if stills != expected_count or gifs != expected_count:
        raise AssetError(f"asset count mismatch: stills={stills}, gifs={gifs}")

    for repo in (main_root, gallery_root):
        _validate_material_boundary(repo)

    manifest_path = main_root / "docs/gallery-video-manifest.json"
    video_root = gallery_root / "materials/door-transitions"
    manifest_count = None
    skipped = []
    videos = None
    if manifest_path.exists():
        videos = _published_manifest_entries(
            manifest_path, "videos", video_root,
            EXPECTED_VIDEO_COUNT, EXPECTED_VIDEO_COUNT,
        )
    if video_root.exists() or video_root.is_symlink():
        if videos is None:
            raise AssetError("video manifest is missing while local videos exist")
        actual_videos = discover_mp4(video_root)
        if len(actual_videos) != len(videos):
            raise AssetError(f"video manifest count mismatch: manifest={len(videos)}, destination={len(actual_videos)}")
        for entry in videos:
            path = _manifest_path(video_root, entry["destination"], "destination")
            if (
                path.is_symlink() or not path.is_file()
                or path.stat().st_size != entry["bytes"]
                or sha256_file(path) != entry["sha256"]
            ):
                raise AssetError(f"manifest video mismatch: {entry['destination']}")
        manifest_count = len(videos)
    else:
        skipped.append("videos: materials/door-transitions absent")
    frame_count = None
    frame_manifest = main_root / "docs/gallery-frame-manifest.json"
    frame_root = gallery_root / "materials/frame-extracts"
    frames = None
    if frame_manifest.exists():
        frames = _published_manifest_entries(
            frame_manifest, "frames", frame_root,
            EXPECTED_FRAME_COUNT, EXPECTED_FRAME_UNIQUE_HASHES,
        )
    if frame_root.exists() or frame_root.is_symlink():
        if frames is None:
            raise AssetError("frame manifest is missing while local frames exist")
        actual_frames = _discover_png(frame_root)
        if len(actual_frames) != len(frames):
            raise AssetError(f"frame manifest count mismatch: manifest={len(frames)}, destination={len(actual_frames)}")
        for entry in frames:
            path = _manifest_path(frame_root, entry["destination"], "destination")
            if (
                path.is_symlink() or not path.is_file()
                or path.stat().st_size != entry["bytes"]
                or sha256_file(path) != entry["sha256"]
            ):
                raise AssetError(f"manifest frame mismatch: {entry['destination']}")
        frame_count = len(frames)
    else:
        skipped.append("frames: materials/frame-extracts absent")
    return {
        "doors": len(doors), "stills": stills, "gifs": gifs,
        "videos": manifest_count, "frames": frame_count, "skipped": skipped,
    }


def clean_local_gallery(main_root, gallery_root, report_path):
    """Remove only locally generated files with validated gallery counterparts."""
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
        stat = source.lstat()
        snapshots.append((source, source_hash, stat.st_dev, stat.st_ino, stat.st_size, stat.st_mtime_ns))

    existing_report = Path(report_path).read_text(encoding="utf-8") if Path(report_path).exists() else "# Gallery Migration Verification\n"
    cleanup_evidence = "\n".join([
        "", "## Local Gallery Cleanup", "",
        "- status: ready-to-delete", f"- inventoried files: {len(files)}",
        f"- byte-identical counterparts: {identical}",
        f"- explained stale files: {', '.join(stale) if stale else 'none'}", "",
        "- counterpart validation: passed (every local file mapped and hashed)",
        "- gallery source-record validation: passed (113 records x 11 fields)",
        "- stale doors.json justification: gallery copy matches all current source records", "",
    ])
    _write_atomic(report_path, existing_report.rstrip() + "\n" + cleanup_evidence)

    for source, expected_hash, dev, ino, size, mtime_ns in snapshots:
        stat = source.lstat()
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
    """Resolve conventional main and sibling-gallery paths with overrides."""
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
    """Run a migration, consistency check, or local cleanup command."""
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
