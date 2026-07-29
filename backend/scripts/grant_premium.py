"""
Grant (or revoke) premium for a local dev user.

    python scripts/grant_premium.py <uid> [--revoke]

AI scanning is premium-only by design, and there is no billing route yet, so on a dev machine
the flag has to be set directly. This exists so that is one documented command instead of an
ad-hoc SQL string pasted from chat history.

Local only. It talks to whatever DATABASE_URL points at, so do not aim it at production —
entitlement there is billing's job, not a script's.
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__)
        sys.exit(1)
    uid = args[0]
    value = 0 if "--revoke" in sys.argv else 1

    url = get_settings().database_url
    if "sqlite" not in url:
        print(f"This helper only handles local SQLite. DATABASE_URL is: {url}")
        sys.exit(1)
    path = url.split("///")[-1]

    con = sqlite3.connect(path)
    cur = con.cursor()

    cur.execute("SELECT id, is_premium FROM users WHERE firebase_uid = ?", (uid,))
    row = cur.fetchone()
    if row is None:
        # The user row is created on first authenticated request, so this is the usual
        # mistake: granting premium before ever calling the API as that uid.
        print(f"No user with uid {uid!r}.")
        print("Call an authenticated route first so the row is provisioned, e.g.:")
        print(f'  curl -H "X-Ignyt-Uid: {uid}" http://127.0.0.1:8001/v1/me')
        sys.exit(1)

    cur.execute("UPDATE users SET is_premium = ? WHERE firebase_uid = ?", (value, uid))
    con.commit()
    print(f"{uid}: is_premium {bool(row[1])} -> {bool(value)}")
    con.close()


if __name__ == "__main__":
    main()
