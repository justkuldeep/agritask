/**
 * RouteMapModal
 * Shows a field agent's GPS route on a Google Map for a completed journey.
 *
 * Rules:
 *  - If km < 5 → show "Journey Unavailable" without making any API call
 *  - If km >= 5 → fetch waypoints and draw polyline on the map
 *  - Start marker = green, End marker = red, intermediate = small blue dots
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { attendanceAPI } from '../../services/api';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';

// ── Threshold — do NOT call API if distance is below this ────────────────────
const MIN_KM_FOR_ROUTE = 5;

export default function RouteMapModal({ visible, onClose, attendanceId, agentName, km, date }) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);

  const [waypoints, setWaypoints] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const kmNum = parseFloat(km) || 0;
  const hasEnoughDistance = kmNum >= MIN_KM_FOR_ROUTE;

  // ── Fetch waypoints when modal opens ──────────────────────────────────────
  useEffect(() => {
    if (!visible || !attendanceId) return;

    // Client-side gate — skip API call if distance < 5 km
    if (!hasEnoughDistance) return;

    setLoading(true);
    setError(null);
    setWaypoints([]);

    attendanceAPI.getWaypoints(attendanceId)
      .then((res) => {
        const pts = (res.data || [])
          .filter((w) => parseFloat(w.lat) !== 0 && parseFloat(w.lng) !== 0)
          .map((w) => ({ lat: parseFloat(w.lat), lng: parseFloat(w.lng), type: w.type }));
        setWaypoints(pts);
      })
      .catch((err) => setError(err.message || 'Failed to load route'))
      .finally(() => setLoading(false));
  }, [visible, attendanceId, hasEnoughDistance]);

  // ── Fit map to waypoints once loaded ──────────────────────────────────────
  useEffect(() => {
    if (waypoints.length > 1 && mapRef.current) {
      mapRef.current.fitToCoordinates(
        waypoints.map((w) => ({ latitude: w.lat, longitude: w.lng })),
        { edgePadding: { top: 60, right: 40, bottom: 60, left: 40 }, animated: true },
      );
    }
  }, [waypoints]);

  // ── Reset on close ────────────────────────────────────────────────────────
  function handleClose() {
    setWaypoints([]);
    setError(null);
    onClose();
  }

  const coords = waypoints.map((w) => ({ latitude: w.lat, longitude: w.lng }));
  const startPt = waypoints[0];
  const endPt   = waypoints[waypoints.length - 1];

  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {agentName}'s Route
            </Text>
            <Text style={styles.headerSub}>
              {formattedDate}  ·  {kmNum.toFixed(1)} km
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* ── Content ── */}
        {!hasEnoughDistance ? (
          // Under 5 km — no API call, show unavailable message
          <View style={styles.unavailable}>
            <Text style={styles.unavailableIcon}>🗺️</Text>
            <Text style={styles.unavailableTitle}>Route Unavailable</Text>
            <Text style={styles.unavailableDesc}>
              Route map is only available for journeys of {MIN_KM_FOR_ROUTE} km or more.
            </Text>
            <View style={styles.unavailableStats}>
              <Text style={styles.unavailableStat}>
                Distance recorded: <Text style={{ color: Colors.warning, fontWeight: '700' }}>{kmNum.toFixed(1)} km</Text>
              </Text>
              <Text style={styles.unavailableStat}>
                Minimum required: <Text style={{ color: Colors.primary, fontWeight: '700' }}>{MIN_KM_FOR_ROUTE} km</Text>
              </Text>
            </View>
          </View>

        ) : loading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading route…</Text>
          </View>

        ) : error ? (
          <View style={styles.unavailable}>
            <Text style={styles.unavailableIcon}>⚠️</Text>
            <Text style={styles.unavailableTitle}>Failed to Load Route</Text>
            <Text style={styles.unavailableDesc}>{error}</Text>
          </View>

        ) : waypoints.length < 2 ? (
          <View style={styles.unavailable}>
            <Text style={styles.unavailableIcon}>📍</Text>
            <Text style={styles.unavailableTitle}>Insufficient GPS Data</Text>
            <Text style={styles.unavailableDesc}>
              Not enough waypoints were recorded to draw a route.
              The agent may have had GPS disabled during the journey.
            </Text>
          </View>

        ) : (
          // ── Route map ──
          <>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              showsUserLocation={false}
              showsMyLocationButton={false}
              showsCompass
              toolbarEnabled={false}
            >
              {/* Route polyline */}
              <Polyline
                coordinates={coords}
                strokeColor={Colors.primary}
                strokeWidth={4}
                lineDashPattern={undefined}
              />

              {/* Intermediate waypoints — small dots */}
              {waypoints.slice(1, -1).map((w, idx) => (
                <Marker
                  key={`wp-${idx}`}
                  coordinate={{ latitude: w.lat, longitude: w.lng }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={false}
                >
                  <View style={styles.dotMarker} />
                </Marker>
              ))}

              {/* Start marker — green */}
              {startPt && (
                <Marker
                  coordinate={{ latitude: startPt.lat, longitude: startPt.lng }}
                  title="Start"
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={[styles.endpointMarker, styles.startMarker]}>
                    <Text style={styles.endpointText}>S</Text>
                  </View>
                </Marker>
              )}

              {/* End marker — red */}
              {endPt && endPt !== startPt && (
                <Marker
                  coordinate={{ latitude: endPt.lat, longitude: endPt.lng }}
                  title="End"
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={[styles.endpointMarker, styles.endMarker]}>
                    <Text style={styles.endpointText}>E</Text>
                  </View>
                </Marker>
              )}
            </MapView>

            {/* Stats bar */}
            <View style={[styles.statsBar, { paddingBottom: insets.bottom + Spacing.md }]}>
              <StatChip label="Distance" value={`${kmNum.toFixed(1)} km`} color={Colors.primary} />
              <StatChip label="Waypoints" value={String(waypoints.length)} color={Colors.info} />
              <StatChip
                label="Start"
                value={startPt ? `${startPt.lat.toFixed(3)}, ${startPt.lng.toFixed(3)}` : '—'}
                color={Colors.primary}
              />
              <StatChip
                label="End"
                value={endPt ? `${endPt.lat.toFixed(3)}, ${endPt.lng.toFixed(3)}` : '—'}
                color={Colors.error}
              />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

function StatChip({ label, value, color }) {
  return (
    <View style={chipStyles.chip}>
      <Text style={chipStyles.label}>{label}</Text>
      <Text style={[chipStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: { alignItems: 'center', flex: 1 },
  label: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: Typography.sm, fontWeight: '700', marginTop: 2 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  closeIcon: { fontSize: 14, color: Colors.textSecondary },
  headerInfo: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  headerSub: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  // Loading / unavailable
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadingText: { fontSize: Typography.sm, color: Colors.textMuted },
  unavailable: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xxl, gap: Spacing.md,
  },
  unavailableIcon: { fontSize: 52, opacity: 0.5 },
  unavailableTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary, textAlign: 'center' },
  unavailableDesc: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  unavailableStats: { marginTop: Spacing.md, gap: Spacing.sm, alignItems: 'center' },
  unavailableStat: { fontSize: Typography.sm, color: Colors.textMuted },
  // Map
  map: { flex: 1 },
  // Markers
  dotMarker: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.info,
    borderWidth: 1.5, borderColor: '#fff',
  },
  endpointMarker: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 3, elevation: 4,
  },
  startMarker: { backgroundColor: '#16a34a' },
  endMarker:   { backgroundColor: Colors.error },
  endpointText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  // Stats bar
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});
