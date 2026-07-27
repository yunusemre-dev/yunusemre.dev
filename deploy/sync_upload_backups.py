import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import UPLOAD_DIR, backup_photo_files


def main() -> None:
    files = sorted(path for path in UPLOAD_DIR.iterdir() if path.is_file())
    if not files:
        print("No upload files found.")
        return
    if not backup_photo_files(files):
        raise SystemExit("R2 backups are not configured.")
    print(f"Backed up {len(files)} upload files.")


if __name__ == "__main__":
    main()
