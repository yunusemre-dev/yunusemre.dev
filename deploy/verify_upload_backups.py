import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import (
    R2_BUCKET,
    UPLOAD_DIR,
    db,
    file_sha256,
    placeholder_filename,
    photo_backup_key,
    r2_client,
    thumbnail_filename,
)


def main() -> None:
    client = r2_client()
    if client is None:
        raise SystemExit("R2 backups are not configured.")

    with db() as connection:
        filenames = [
            row["filename"]
            for row in connection.execute("SELECT filename FROM photos")
        ]

    expected = []
    for filename in filenames:
        expected.extend(
            (filename, placeholder_filename(filename), thumbnail_filename(filename))
        )

    missing_local = [name for name in expected if not (UPLOAD_DIR / name).is_file()]
    if missing_local:
        raise SystemExit(f"Missing {len(missing_local)} local upload files.")

    missing_remote = []
    for filename in expected:
        try:
            client.head_object(Bucket=R2_BUCKET, Key=photo_backup_key(filename))
        except Exception:
            missing_remote.append(filename)
    if missing_remote:
        raise SystemExit(f"Missing {len(missing_remote)} R2 upload files.")

    if expected:
        first_filename = expected[0]
        first_local = UPLOAD_DIR / first_filename
        with tempfile.NamedTemporaryFile() as restored:
            client.download_file(
                R2_BUCKET,
                photo_backup_key(first_filename),
                restored.name,
            )
            restored_path = Path(restored.name)
            if file_sha256(restored_path) != file_sha256(first_local):
                raise SystemExit("R2 download verification failed.")

    print(
        f"Verified {len(filenames)} photos, {len(expected)} local/R2 upload files, "
        f"and {1 if expected else 0} downloaded object checksum."
    )


if __name__ == "__main__":
    main()
