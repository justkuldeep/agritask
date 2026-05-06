/**
 * useLocationTracking — mirrors the webapp's useGpsWatcher exactly.
 *
 * Uses expo-location watchPositionAsync (fires on device movement).
 * Two filters before posting a waypoint:
 *
 *   1. Distance gate  — only post if moved ≥ MIN_DISTANCE_M (100 m) from last post
 *   2. Heartbeat gate — always post if MIN_HEARTBEAT_MS (5 min) has elapsed
 *                       (keeps "last seen" fresh for live tracking — does NOT add distance)
 *
 * Distance is ONLY accumulated when the user genuinely moved ≥ MIN_DISTANCE_M
 * AND the GPS fix has accuracy ≤ MAX_ACCURACY_M. Heartbeat-only fixes never
 * add distance — this prevents GPS drift from inflating the counter while standing still.
 *
 * Active only while `enabled` is true.
 * Silently swallows network errors — a bad connection never alerts the user.
 *
 * Returns: { distanceKm, waypointCount } — live journey stats for the UI.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { attendanceAPI } from '../services/api';

// ── Constants ─────────────────────────────────────────────────────────────────
const MIN_DISTANCE_M   = 100;          // post waypoint if moved ≥ 100 m
const MIN_HEARTBEAT_MS = 5 * 60_000;  // also post every 5 min (heartbeat only — no distance)
const MAX_ACCURACY_M   = 50;          // reject fixes worse than 50 m accuracy (filters indoor drift)

// ── Haversine distance in metres ─────────────────────────────────────────────
function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6_371_000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * @param {object} params
 * @param {number|null}  params.attendanceId  — today's Attendance row id
 * @param {boolean}      params.enabled       — true while journey is active
 */
export function useLocationTracking({ attendanceId, enabled = false }) {
  const lastPostRef    = useRef(null);   // { lat, lng, ts } — last successfully posted position
  const subscriberRef  = useRef(null);   // Location.LocationSubscription
  const totalDistRef   = useRef(0);      // accumulated metres (genuine movement only)
  const lastGoodPosRef = useRef(null);   // { lat, lng } — last position that passed accuracy gate

  const [distanceKm, setDistanceKm]       = useState(0);
  const [waypointCount, setWaypointCount] = useState(0);

  const handlePosition = useCallback(async (location) => {
    const { latitude: lat, longitude: lng, accuracy } = location.coords;

    // ── Hard rejects ──────────────────────────────────────────────────────────
    if (lat === 0 && lng === 0) return;

    // Reject low-accuracy fixes — this is the primary drift filter.
    // MAX_ACCURACY_M = 50 m: real outdoor GPS is 3-15 m; WiFi ~20-50 m; cell ~100-2000 m.
    // Fixes worse than 50 m are almost certainly indoor/cell-tower estimates — skip them.
    if (accuracy != null && accuracy > MAX_ACCURACY_M) return;

    const now      = Date.now();
    const last     = lastPostRef.current;     // last posted position (movement OR heartbeat)
    const lastGood = lastGoodPosRef.current;  // last genuine-movement position

    // Always measure movement from the last *good* position, not the last *posted* position.
    // If a heartbeat fired at position B (40 m from A), using lastPostRef would require
    // 100 m from B (= 140 m from A) before the next stop counts — silently eating distance.
    // Using lastGoodPosRef keeps the gate anchored to the last real movement point.
    const movedEnough = lastGood
      ? haversineM(lastGood.lat, lastGood.lng, lat, lng) >= MIN_DISTANCE_M
      : true;  // first fix — always post

    const heartbeatOnly = !movedEnough && last
      ? now - last.ts >= MIN_HEARTBEAT_MS
      : false;

    // Neither condition met — skip entirely
    if (!movedEnough && !heartbeatOnly) return;

    // ── Accumulate distance ONLY for genuine movement, never for heartbeat ────
    if (movedEnough && lastGoodPosRef.current) {
      const legM = haversineM(lastGoodPosRef.current.lat, lastGoodPosRef.current.lng, lat, lng);
      // Double-check the leg is real movement (not a single bad fix slipping through)
      if (legM >= MIN_DISTANCE_M) {
        totalDistRef.current += legM;
        setDistanceKm(Math.round(totalDistRef.current / 100) / 10); // 1 decimal km
      }
    }

    // Update last-good-position only on genuine movement (not heartbeat)
    if (movedEnough) {
      lastGoodPosRef.current = { lat, lng };
    }

    // ── Post waypoint to backend ──────────────────────────────────────────────
    const prevLast = lastPostRef.current;
    lastPostRef.current = { lat, lng, ts: now };

    try {
      await attendanceAPI.addWaypoint({
        attendance_id: attendanceId,
        lat,
        lng,
        timestamp: new Date(now).toISOString(),
        type: heartbeatOnly ? 'heartbeat' : 'stop',
      });
      setWaypointCount((c) => c + 1);
    } catch (_) {
      // Network failure — revert so next fix retries
      lastPostRef.current = prevLast;
    }
  }, [attendanceId]);

  useEffect(() => {
    if (!enabled || !attendanceId) return;

    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;

      subscriberRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation, // highest accuracy mode
          distanceInterval: 20,   // fire every 20 m OS-level (our gate is 100 m — this just keeps fixes fresh)
          timeInterval: 10_000,   // also fire every 10 s so heartbeat can trigger
        },
        handlePosition,
      );
    })();

    return () => {
      cancelled = true;
      subscriberRef.current?.remove();
      subscriberRef.current = null;
      lastPostRef.current   = null;
      lastGoodPosRef.current = null;
    };
  }, [enabled, attendanceId, handlePosition]);

  const resetStats = useCallback(() => {
    totalDistRef.current   = 0;
    lastGoodPosRef.current = null;
    lastPostRef.current    = null;
    setDistanceKm(0);
    setWaypointCount(0);
  }, []);

  return { distanceKm, waypointCount, resetStats };
}
