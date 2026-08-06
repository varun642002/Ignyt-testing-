"""
Adds a Swift file in the app target to ios/App/App.xcodeproj.

WHY THIS EXISTS. There is no Mac and no Xcode here, and dropping a .swift file into
ios/App/App/ does NOT put it in the build. Xcode's project file needs four separate entries
for one file, and a file missing any of them is not a compile error - it is simply absent.
The build goes green and the class does not exist at runtime, which is the same class of
silent failure that hid the HealthConnect registration bug for days.

The four entries, all of which this writes:
  PBXFileReference     the file exists in the project
  PBXGroup             where it appears in the navigator
  PBXBuildFile         it is a thing that can be built
  PBXSourcesBuildPhase it is actually compiled into the target   <- the one that gets missed

Idempotent: running it again for a file already present changes nothing. Anchors off a file
known to be correctly wired rather than hunting for section headers by name, because the
anchor proves at run time that the shape being matched is the shape actually in use.

    python tools/ios-add-source.py NotifyPlugin.swift
"""

import re
import sys
import hashlib
from pathlib import Path

PBXPROJ = Path("ios/App/App.xcodeproj/project.pbxproj")
ANCHOR = "HealthKitManager.swift"   # known-good: present in all four sections


def uid(seed: str) -> str:
    """Xcode ids are 24 uppercase hex characters. Derived from the filename so a re-run
    without changes produces an identical file rather than a spurious diff."""
    return hashlib.sha1(seed.encode()).hexdigest()[:24].upper()


def main(filename: str) -> int:
    if not PBXPROJ.exists():
        print(f"error: {PBXPROJ} not found")
        return 1

    src = PBXPROJ.read_text(encoding="utf-8")

    if f"/* {filename} */" in src:
        print(f"[ios-add-source] {filename} is already in the project")
        return 0

    if not Path("ios/App/App") .joinpath(filename).exists():
        print(f"error: ios/App/App/{filename} does not exist on disk")
        return 1

    build_id = uid(filename + ":build")
    file_id = uid(filename + ":file")

    # Each anchor line is matched exactly as it appears, then the new line is inserted after
    # it with the same indentation. Four insertions, and every one is verified below.
    patterns = [
        # PBXBuildFile
        (re.compile(r"^(\t*)([0-9A-F]{24}) /\* " + re.escape(ANCHOR) + r" in Sources \*/ = \{isa = PBXBuildFile;.*$",
                    re.M),
         lambda m: m.group(0) + "\n" + m.group(1) +
         f"{build_id} /* {filename} in Sources */ = {{isa = PBXBuildFile; fileRef = {file_id} /* {filename} */; }};"),

        # PBXFileReference
        (re.compile(r"^(\t*)([0-9A-F]{24}) /\* " + re.escape(ANCHOR) + r" \*/ = \{isa = PBXFileReference;.*$", re.M),
         lambda m: m.group(0) + "\n" + m.group(1) +
         f"{file_id} /* {filename} */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = {filename}; sourceTree = \"<group>\"; }};"),

        # PBXGroup membership
        (re.compile(r"^(\t*)([0-9A-F]{24}) /\* " + re.escape(ANCHOR) + r" \*/,$", re.M),
         lambda m: m.group(0) + "\n" + m.group(1) + f"{file_id} /* {filename} */,"),

        # PBXSourcesBuildPhase - the one that decides whether it is compiled at all
        (re.compile(r"^(\t*)([0-9A-F]{24}) /\* " + re.escape(ANCHOR) + r" in Sources \*/,$", re.M),
         lambda m: m.group(0) + "\n" + m.group(1) + f"{build_id} /* {filename} in Sources */,"),
    ]

    for i, (pat, repl) in enumerate(patterns, 1):
        src, n = pat.subn(repl, src, count=1)
        if n != 1:
            print(f"error: anchor {i} for {ANCHOR} did not match - project layout has changed, "
                  f"nothing written")
            return 1

    PBXPROJ.write_text(src, encoding="utf-8")

    # Verify by reading back, rather than trusting the writes.
    check = PBXPROJ.read_text(encoding="utf-8")
    required = [
        f"{build_id} /* {filename} in Sources */ = {{isa = PBXBuildFile;",
        f"{file_id} /* {filename} */ = {{isa = PBXFileReference;",
        f"{file_id} /* {filename} */,",
        f"{build_id} /* {filename} in Sources */,",
    ]
    missing = [r for r in required if r not in check]
    if missing:
        print("error: wrote the file but verification failed:")
        for m in missing:
            print("   missing:", m)
        return 1

    print(f"[ios-add-source] added {filename} to the project and the Sources build phase")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
