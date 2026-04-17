from fastapi import APIRouter, Depends, HTTPException
from app.auth.utils import get_current_tenant
from app.storage import get_presigned_url, list_segments
from app.database import get_db
from datetime import datetime, timezone

router = APIRouter(prefix="/api/playback", tags=["playback"])

@router.get("/{camera_id}/segments")
async def get_segments(
    camera_id: str,
    date: str = None,
    tenant=Depends(get_current_tenant)
):
    """
    List all recorded segments for a camera.
    Optional date filter: YYYY-MM-DD
    """
    db = get_db()

    # Verify camera belongs to this tenant
    cam = db.table("cameras").select("*").eq(
        "id", camera_id
    ).eq("tenant_id", tenant["id"]).execute()

    if not cam.data:
        raise HTTPException(status_code=404, detail="Camera not found")

    # Query segments from DB
    query = db.table("recording_segments").select("*").eq(
        "camera_id", camera_id
    ).order("segment_index", desc=False)

    if date:
        # Filter by date prefix in r2_key
        query = query.like("r2_key", f"%/{date}/%")

    result = query.execute()
    segments = result.data or []

    # Generate presigned URLs for each segment
    segments_with_urls = []
    for seg in segments:
        url = get_presigned_url(seg["r2_key"], expires_in=3600)
        segments_with_urls.append({
            "id": seg["id"],
            "segment_index": seg["segment_index"],
            "started_at": seg["started_at"],
            "duration_seconds": seg["duration_seconds"],
            "size_bytes": seg["size_bytes"],
            "url": url
        })

    return {
        "camera_id": camera_id,
        "date": date,
        "total": len(segments_with_urls),
        "segments": segments_with_urls
    }


@router.get("/{camera_id}/playlist")
async def get_playlist(
    camera_id: str,
    date: str = None,
    tenant=Depends(get_current_tenant)
):
    """
    Generate an HLS m3u8 playlist for a camera's recordings.
    This is what the video player in the dashboard will load.
    """
    db = get_db()

    # Verify camera belongs to this tenant
    cam = db.table("cameras").select("*").eq(
        "id", camera_id
    ).eq("tenant_id", tenant["id"]).execute()

    if not cam.data:
        raise HTTPException(status_code=404, detail="Camera not found")

    # Get today's date if not specified
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Get segments for this date
    result = db.table("recording_segments").select("*").eq(
        "camera_id", camera_id
    ).like("r2_key", f"%/{date}/%").order(
        "segment_index", desc=False
    ).execute()

    segments = result.data or []

    if not segments:
        raise HTTPException(
            status_code=404,
            detail=f"No recordings found for {date}"
        )

    # Build m3u8 playlist
    playlist_lines = [
        "#EXTM3U",
        "#EXT-X-VERSION:3",
        "#EXT-X-TARGETDURATION:10",
        "#EXT-X-MEDIA-SEQUENCE:0",
    ]

    for seg in segments:
        url = get_presigned_url(seg["r2_key"], expires_in=3600)
        playlist_lines.append(f"#EXTINF:{seg['duration_seconds']:.1f},")
        playlist_lines.append(url)

    playlist_lines.append("#EXT-X-ENDLIST")
    playlist_content = "\n".join(playlist_lines)

    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(
        content=playlist_content,
        media_type="application/vnd.apple.mpegurl"
    )


@router.get("/{camera_id}/dates")
async def get_recording_dates(
    camera_id: str,
    tenant=Depends(get_current_tenant)
):
    """
    List all dates that have recordings for a camera.
    Used to populate the date picker in the dashboard.
    """
    db = get_db()

    cam = db.table("cameras").select("*").eq(
        "id", camera_id
    ).eq("tenant_id", tenant["id"]).execute()

    if not cam.data:
        raise HTTPException(status_code=404, detail="Camera not found")

    # List all R2 objects for this camera
    prefix = f"cameras/{camera_id}/"
    keys = list_segments(prefix)

    # Extract unique dates from keys
    # Key format: cameras/{camera_id}/{date}/seg_000000.ts
    dates = set()
    for key in keys:
        parts = key.split("/")
        if len(parts) >= 3:
            dates.add(parts[2])

    return {
        "camera_id": camera_id,
        "dates": sorted(list(dates), reverse=True)
    }
