import asyncio
import subprocess
import os
import tempfile
import uuid
from datetime import datetime, timezone
from app.database import get_db

# Motion sensitivity — lower = more sensitive
MOTION_THRESHOLD = 0.02  # 2% of pixels changed = motion detected

async def detect_motion_in_segment(
    segment_path: str,
    camera_id: str,
    tenant_id: str
) -> bool:
    """
    Run pixel-difference motion detection on an HLS segment.
    Uses FFmpeg's scene detection filter — no GPU needed.
    Returns True if motion detected.
    """
    try:
        cmd = [
            "ffmpeg",
            "-i", segment_path,
            "-vf", f"select='gt(scene,{MOTION_THRESHOLD})',metadata=print:file=-",
            "-f", "null",
            "-"
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=30
        )

        output = stderr.decode()
        motion_detected = "pts_time" in output or "scene_score" in output

        if motion_detected:
            await create_motion_event(camera_id, tenant_id, segment_path)

        return motion_detected

    except asyncio.TimeoutError:
        print(f"[MOTION] Timeout on segment: {segment_path}")
        return False
    except Exception as e:
        print(f"[MOTION] Detection error: {e}")
        return False


async def create_motion_event(
    camera_id: str,
    tenant_id: str,
    segment_path: str = None
):
    """
    Create a motion event in Supabase and trigger an alert.
    """
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    event_id = str(uuid.uuid4())

    try:
        # Insert motion event
        db.table("motion_events").insert({
            "id": event_id,
            "camera_id": camera_id,
            "tenant_id": tenant_id,
            "detected_at": now,
            "confidence": 0.85,
            "created_at": now
        }).execute()

        print(f"[MOTION] Event created for camera {camera_id}")

        # Create alert
        await create_alert(
            camera_id=camera_id,
            tenant_id=tenant_id,
            alert_type="motion_detected",
            severity="medium",
            message=f"Motion detected on camera",
            event_id=event_id
        )

    except Exception as e:
        print(f"[MOTION] Failed to create motion event: {e}")


async def create_alert(
    camera_id: str,
    tenant_id: str,
    alert_type: str,
    severity: str,
    message: str,
    event_id: str = None
):
    """
    Create an alert in Supabase.
    This shows up in the Alerts page on the dashboard.
    """
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()

    try:
        db.table("alerts").insert({
            "id": str(uuid.uuid4()),
            "camera_id": camera_id,
            "tenant_id": tenant_id,
            "type": alert_type,
            "severity": severity,
            "message": message,
            "motion_event_id": event_id,
            "created_at": now
        }).execute()

        print(f"[MOTION] Alert created: {alert_type} for camera {camera_id}")

    except Exception as e:
        print(f"[MOTION] Failed to create alert: {e}")


async def create_offline_alert(camera_id: str, tenant_id: str):
    """
    Create an alert when a camera goes offline.
    Called by ingest engine when stream fails.
    """
    await create_alert(
        camera_id=camera_id,
        tenant_id=tenant_id,
        alert_type="offline",
        severity="high",
        message="Camera went offline — stream disconnected",
    )
