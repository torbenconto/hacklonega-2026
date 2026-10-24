"""Explicitly reset local demo journals and populate synthetic leaderboard catches.

Run: .venv/bin/python scripts/seed_leaderboards.py --reset
Respects DEMO_DB_PATH. Never runs automatically on server startup.
"""
import argparse
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import random
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from database import connect


def seed():
    rng = random.Random(2026)
    catalog = json.loads((Path(__file__).resolve().parents[1] / 'ml/species.json').read_text())
    now = datetime.now(timezone.utc)
    week = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    rows = []
    users = [f'demo_angler_{i:03d}' for i in range(1, 6)]
    for index, name in enumerate(users):
        # Five demo anglers; recent activity varies per angler.
        recent_count = rng.randint(12, 65)
        fish = catalog + rng.choices(catalog, k=rng.randint(20, 160))
        rng.shuffle(fish)
        for number, item in enumerate(fish):
            if number < recent_count:
                caught = week + timedelta(seconds=rng.uniform(0, max(0, (now - week).total_seconds())))
            else:
                caught = week - timedelta(days=rng.uniform(1, 120))
            family = item.get('family', '')
            base = {'Centrarchidae': 13, 'Salmonidae': 17, 'Ictaluridae': 27, 'Moronidae': 23, 'Esocidae': 28}.get(family, 11)
            inches = round(base * rng.uniform(.45, 1.65), 2)
            pounds = round(max(.05, (inches / 12) ** 3 * rng.uniform(.5, 1.15)), 2)
            rows.append((name, item['common_name'], pounds, inches, caught.isoformat(), 'released'))
    with connect() as db:
        db.execute('DELETE FROM catches')
        db.execute('DELETE FROM users')
        db.execute("DELETE FROM sqlite_sequence WHERE name = 'catches'")
        db.executemany('INSERT INTO users(username) VALUES (?)', [(name,) for name in users])
        db.executemany('INSERT INTO catches(username, species, weight_lbs, length_inches, created_at, disposition) VALUES (?, ?, ?, ?, ?, ?)', rows)
    # Reclaim deleted photo blobs from the old journals too.
    with connect() as db:
        db.execute('VACUUM')
    return {'users': len(users), 'catches': len(rows), 'species': len(catalog)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reset', action='store_true', help='Delete all existing users and catches before seeding')
    if not parser.parse_args().reset:
        parser.error('--reset is required; this deletes all saved journals')
    print(json.dumps(seed()))
