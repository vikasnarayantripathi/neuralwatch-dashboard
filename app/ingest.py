import asyncio
import subprocess
import os
import tempfile
import uuid
from datetime import datetime, timezone
from app.storage import upload_segment, upload_playlist
from app.database import get_db

SEGMENT_DURATION = 10  # seconds per HLS segment

async def start_stream_ingest(camera_id: str, rtsp_url: str, tenant_id: str):
    """
    Pull RTSP stream from camera, segment into HLS chunks,
    upload each segment to Cloudflare R2.
    Runs as a background async task.
    """
    db = get_db()
    tmp_dir = tempfile.mkdtemp(prefix=f"nw_{camera_id}_")
    segment_index = 0

    print(f"[INGEST] Starting stream for camera {camera_id}: {rtsp_url}")

    # Update camera status to online
    try:
        db.table("cameras").update(
            {"status": "online", "last_seen": datetime.now(timezone.utc).isoformat()}
        ).eq("id", camera_id).execute()
    except Exception as e:
        print(f"[INGEST] Failed to update camera status: {e}")

    try:
        while True:
            segment_filename = f"seg_{segment_index:06d}.ts"
            segment_path = os.path.join(tmp_dir, segment_filename)

            # FFmpeg command: pull RTSP, write one 10-second segment
            cmd = [
                "ffmpeg",
                "-y",
                "-rtsp_transport", "tcp",
                "-i", rtsp_url,
                "-t", str(SEGMENT_DURATION),
                "-c:v", "copy",
                "-c:a", "copy",
                "-f", "mpegts",
                segment_path
            ]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=SEGMENT_DURATION + 30
            )

            if process.returncode != 0:
                print(f"[INGEST] FFmpeg error for camera {camera_id}: {stderr.decode()}")
                await asyncio.sleep(5)
                continue

            if not os.path.exists(segment_path):
                print(f"[INGEST] Segment file not created for camera {camera_id}")
                await asyncio.sleep(5)
                continue

            # Upload segment to R2
            now = datetime.now(timezone.utc)
            date_str = now.strftime("%Y-%m-%d")
            r2_key = f"cameras/{camera_id}/{date_str}/{segment_filename}"

            upload_ok = upload_segment(segment_path, r2_key)

            if upload_ok:
                # Save segment record to Supabase
                try:
                    segment_size = os.path.getsize(segment_path)
                    start_ts = now.isoformat()

                    db.table("recording_segments").insert({
                        "id": str(uuid.uuid4()),
                        "camera_id": camera_id,
                        "tenant_id": tenant_id,
                        "r2_key": r2_key,
                        "segment_index": segment_index,
                        "duration_seconds": SEGMENT_DURATION,
                        "size_bytes": segment_size,
                        "started_at": start_ts,
                        "created_at": start_ts
                    }).execute()

                    print(f"[INGEST] Segment {segment_index} saved: {r2_key}")
                except Exception as e:
                    print(f"[INGEST] DB insert error: {e}")

                # Update camera last_seen
                try:
                    db.table("cameras").update({
                        "status": "online",
                        "last_seen": now.isoformat()
                    }).eq("id", camera_id).execute()
                except Exception as e:
                    print(f"[INGEST] Camera update error: {e}")

            # Clean up local segment file
            try:
                os.remove(segment_path)
            except Exception:
                pass

            segment_index += 1

    except asyncio.CancelledError:
        print(f"[INGEST] Stream cancelled for camera {camera_id}")
    except Exception as e:
        print(f"[INGEST] Unexpected error for camera {camera_id}: {e}")
    finally:
        # Mark camera offline
        try:
            db.table("cameras").update({
                "status": "offline"
            }).eq("id", camera_id).execute()
        except Exception:
            pass

        # Cleanup temp dir
        try:
            import shutil
            shutil.rmtree(tmp_dir, ignore_errors=True)
        except Exception:
            pass

        print(f"[INGEST] Stream ended for camera {camera_id}")


# ── Stream manager — tracks all running ingest tasks ──────
_active_streams: dict[str, asyncio.Task] = {}

async def start_camera_stream(camera_id: str, rtsp_url: str, tenant_id: str):
    if camera_id in _active_streams:
        task = _active_streams[camera_id]
        if not task.done():
            print(f"[INGEST] Stream already running for camera {camera_id}")
            return
    task = asyncio.create_task(
        start_stream_ingest(camera_id, rtsp_url, tenant_id)
    )
    _active_streams[camera_id] = task
    print(f"[INGEST] Stream task created for camera {camera_id}")

async def stop_camera_stream(camera_id: str):
    if camera_id in _active_streams:
        task = _active_streams[camera_id]
        if not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        del _active_streams[camera_id]
        print(f"[INGEST] Stream stopped for camera {camera_id}")

def get_active_streams() -> list:
    return [
        cam_id for cam_id, task in _active_streams.items()
        if not task.done()
    ]
