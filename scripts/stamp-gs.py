#!/usr/bin/env python3
"""Stamp google-apps-script/mailing-list.gs with the time it last changed.

Run this after editing the script and before committing:

    python3 scripts/stamp-gs.py

The point is the "Last updated" line in the file's header, which exists so
anyone about to paste the script into the Apps Script editor can tell whether
what they are holding is newer than what is already in Google.

A hand-typed date does not survive that job. This one sat at 26 August through
several changes and was eventually read, reasonably, as proof the file had not
been updated when it had.

So the stamp is generated, and it is checked. Alongside it goes a fingerprint:
the first eight hex characters of a SHA-256 of everything from the first line
of real code to the end of the file. tests/stamp.test.cjs recomputes that and
fails if it disagrees with the header, which means the body cannot change
without the timestamp changing too. The header comments themselves are not
covered, so rewording this explanation does not force a new stamp.
"""
import hashlib
import io
import re
import sys
from datetime import datetime, timezone

PATH = "google-apps-script/mailing-list.gs"

# Everything from here to the end of the file is what the fingerprint covers.
# The header above it is prose; the first constant is where the script starts.
BODY_MARKER = "const SPREADSHEET_ID"


def fingerprint(text):
    i = text.find(BODY_MARKER)
    if i == -1:
        sys.exit("could not find %r; the file's shape has changed" % BODY_MARKER)
    return hashlib.sha256(text[i:].encode("utf-8")).hexdigest()[:8]


def main():
    text = io.open(PATH, encoding="utf-8").read()
    fp = fingerprint(text)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    before = text
    text, n_date = re.subn(r"^// Last updated: .*$",
                           "// Last updated: " + stamp, text, count=1, flags=re.M)
    if not n_date:
        sys.exit("no '// Last updated:' line in the header")

    text, n_fp = re.subn(r"^// Fingerprint:  .*$",
                         "// Fingerprint:  " + fp, text, count=1, flags=re.M)
    if not n_fp:
        sys.exit("no '// Fingerprint:  ' line in the header")

    # Stamping is not itself a change worth stamping.
    if fingerprint(before) == fp and re.search(r"^// Fingerprint:  " + fp + r"$", before, re.M):
        print("unchanged: body still %s, leaving the stamp alone" % fp)
        return

    io.open(PATH, "w", encoding="utf-8").write(text)
    print("stamped %s  fingerprint %s" % (stamp, fp))


if __name__ == "__main__":
    main()
