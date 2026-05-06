/**
 * Attendance Screen
 *
 * Field agents:
 *   - Check In / Check Out (records attendance + GPS location)
 *   - Start Journey / End Journey (separate GPS tracking session)
 *     • Tracks position via watchPosition, posts waypoints every 100 m or 5 min
 *     • Matches webapp's useGpsWatcher threshold exactly (MIN_DISTANCE_M = 100)
 *     • Shows live distance counter while journey is active
 *
 * Manager / Owner:
 *   - Team attendance list for today
 *   - "Show Route" button per agent (only if km >= 5, otherwise shows unavailable)
 *   - Route map modal with GPS polyline
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { attendanceAPI } from '../../services/api';
import { useAuth } from '../../services/authStore';
import { useLocation } from '../../hooks/useLocation';
import { useLocationTracking } from '../../hooks/useLocationTracking';
import Card from '../../components/ui/Card';
import RouteMapModal from '../../components/ui/RouteMapModal';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import MapPreview from '../../components/ui/MapPreview';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';

// ── Role switch — managers/owners see team view, field agents see own view ────
export default function AttendanceScreen() {
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();
  const isManager = role === 'OWNER' || role === 'MANAGER';
  return isManager ? <TeamAttendanceView /> : <FieldAttendanceView />;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM VIEW — Manager / Owner
// ─────────────────────────────────────────────────────────────────────────────

const MIN_KM_FOR_ROUTE = 5; // client-side gate — no API call below this

function TeamAttendanceView() {
  const insets = useSafeAreaInsets();
  const [records, setRecords]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // Route modal state
  const [routeModal, setRouteModal] = useState({
    visible: false,
    attendanceId: null,
    agentName: '',
    km: 0,
    date: '',
  });

  const load = useCallback(async () => {
    try {
      const res = await attendanceAPI.team({ date: selectedDate });
      setRecords(res.data || []);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load team attendance');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => { load(); }, [load]);

  function openRoute(record) {
    setRouteModal({
      visible: true,
      attendanceId: record.id,
      agentName: record.name,
      km: parseFloat(record.km) || 0,
      date: record.date,
    });
  }

  const checkedIn  = records.filter((r) => r.check_in).length;
  const checkedOut = records.filter((r) => r.check_out).length;
  const totalKm    = records.reduce((s, r) => s + (parseFloat(r.km) || 0), 0);

  return (
    <View style={[teamStyles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={teamStyles.header}>
        <Text style={teamStyles.title}>Team Attendance</Text>
        <Text style={teamStyles.date}>
          {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
          })}
        </Text>
      </View>

      {/* Summary chips */}
      <View style={teamStyles.summaryRow}>
        <View style={[teamStyles.chip, { borderColor: Colors.primary }]}>
          <Text style={[teamStyles.chipVal, { color: Colors.primary }]}>{checkedIn}</Text>
          <Text style={teamStyles.chipLbl}>Checked In</Text>
        </View>
        <View style={[teamStyles.chip, { borderColor: Colors.info }]}>
          <Text style={[teamStyles.chipVal, { color: Colors.info }]}>{checkedOut}</Text>
          <Text style={teamStyles.chipLbl}>Checked Out</Text>
        </View>
        <View style={[teamStyles.chip, { borderColor: Colors.warning }]}>
          <Text style={[teamStyles.chipVal, { color: Colors.warning }]}>{totalKm.toFixed(1)}</Text>
          <Text style={teamStyles.chipLbl}>Total KM</Text>
        </View>
      </View>

      {loading ? (
        <View style={teamStyles.loadingCenter}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={teamStyles.loadingText}>Loading…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[teamStyles.list, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          {records.length === 0 ? (
            <View style={teamStyles.empty}>
              <Text style={teamStyles.emptyIcon}>📋</Text>
              <Text style={teamStyles.emptyText}>No attendance records for this date</Text>
            </View>
          ) : (
            records.map((rec) => {
              const km = parseFloat(rec.km) || 0;
              const hasRoute = km >= MIN_KM_FOR_ROUTE;
              const isActive = rec.check_in && !rec.check_out;
              const isDone   = rec.check_in && rec.check_out;

              return (
                <View key={rec.id} style={teamStyles.card}>
                  {/* Agent info */}
                  <View style={teamStyles.cardTop}>
                    <View style={teamStyles.avatar}>
                      <Text style={teamStyles.avatarText}>
                        {rec.name?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={teamStyles.agentInfo}>
                      <Text style={teamStyles.agentName}>{rec.name}</Text>
                      <Text style={teamStyles.agentDept}>{rec.department}</Text>
                    </View>
                    <View style={[
                      teamStyles.statusPill,
                      isActive ? teamStyles.pillActive : isDone ? teamStyles.pillDone : teamStyles.pillPending,
                    ]}>
                      <Text style={teamStyles.statusPillText}>
                        {isActive ? 'Active' : isDone ? 'Done' : 'Not In'}
                      </Text>
                    </View>
                  </View>

                  {/* Times + KM */}
                  <View style={teamStyles.timeRow}>
                    <TimeCell label="Check In"  value={rec.check_in  ? fmtTime(rec.check_in)  : '—'} />
                    <TimeCell label="Check Out" value={rec.check_out ? fmtTime(rec.check_out) : '—'} />
                    <TimeCell label="Distance"  value={km > 0 ? `${km.toFixed(1)} km` : '—'} accent={km >= MIN_KM_FOR_ROUTE} />
                  </View>

                  {/* Show Route button */}
                  {isDone && (
                    <TouchableOpacity
                      style={[teamStyles.routeBtn, !hasRoute && teamStyles.routeBtnDisabled]}
                      onPress={() => hasRoute ? openRoute(rec) : null}
                      activeOpacity={hasRoute ? 0.7 : 1}
                    >
                      <Text style={[teamStyles.routeBtnText, !hasRoute && teamStyles.routeBtnTextDisabled]}>
                        {hasRoute ? '🗺️ Show Route' : `🚫 Route Unavailable (< ${MIN_KM_FOR_ROUTE} km)`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Route map modal */}
      <RouteMapModal
        visible={routeModal.visible}
        onClose={() => setRouteModal((p) => ({ ...p, visible: false }))}
        attendanceId={routeModal.attendanceId}
        agentName={routeModal.agentName}
        km={routeModal.km}
        date={routeModal.date}
      />
    </View>
  );
}

function TimeCell({ label, value, accent }) {
  return (
    <View style={teamStyles.timeCell}>
      <Text style={teamStyles.timeCellLabel}>{label}</Text>
      <Text style={[teamStyles.timeCellValue, accent && { color: Colors.primary }]}>{value}</Text>
    </View>
  );
}

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD AGENT VIEW (renamed from AttendanceScreen)
// ─────────────────────────────────────────────────────────────────────────────
function FieldAttendanceView() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();
  const isFieldAgent = role === 'FIELD';

  const { getLocation, loading: locationLoading, error: locationError } = useLocation();

  // ── Attendance state ───────────────────────────────────────────────────────
  const [today, setToday]       = useState(null);
  const [report, setReport]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing]       = useState(false);

  // ── Journey state ──────────────────────────────────────────────────────────
  const [journeyActive, setJourneyActive] = useState(false);
  const [journeyStartTime, setJourneyStartTime] = useState(null);
  const [journeyElapsed, setJourneyElapsed]     = useState(0); // seconds
  const timerRef = useRef(null);

  // ── GPS tracking (mirrors webapp useGpsWatcher) ────────────────────────────
  const { distanceKm, waypointCount, resetStats } = useLocationTracking({
    attendanceId: today?.id ?? null,
    enabled: journeyActive && !!today?.id,
  });

  // ── Load attendance data ───────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [todayRes, reportRes] = await Promise.all([
        attendanceAPI.getToday(),
        attendanceAPI.report(),
      ]);
      setToday(todayRes.data);
      setReport(reportRes.data);
    } catch (_) {
      // silently handle
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Journey elapsed timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (journeyActive && journeyStartTime) {
      timerRef.current = setInterval(() => {
        setJourneyElapsed(Math.floor((Date.now() - journeyStartTime) / 1000));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [journeyActive, journeyStartTime]);

  // ── Check In ──────────────────────────────────────────────────────────────
  async function handleCheckIn() {
    setActionLoading(true);
    try {
      const coords = await getLocation();
      if (!coords) {
        Alert.alert('Location Required', locationError || 'Enable GPS and try again.');
        return;
      }
      const res = await attendanceAPI.checkIn({ lat: coords.lat, lng: coords.lng, address: coords.address });
      setToday(res.data);
      Alert.alert('Checked In ✅', coords.address || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  }

  // ── Check Out ─────────────────────────────────────────────────────────────
  async function handleCheckOut() {
    // If journey is active, end it first
    if (journeyActive) {
      endJourney(false); // silent end
    }
    setActionLoading(true);
    try {
      const coords = await getLocation();
      if (!coords) {
        Alert.alert('Location Required', locationError || 'Enable GPS and try again.');
        return;
      }
      const res = await attendanceAPI.checkOut({ lat: coords.lat, lng: coords.lng });
      setToday(res.data);
      await load(); // refresh report to update km total
      Alert.alert('Checked Out 👋', 'Have a great day!');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  }

  // ── Start Journey ─────────────────────────────────────────────────────────
  async function handleStartJourney() {
    if (!today?.check_in) {
      Alert.alert('Check In First', 'You need to check in before starting a journey.');
      return;
    }
    if (today?.check_out) {
      Alert.alert('Already Checked Out', 'You have already checked out for today.');
      return;
    }
    resetStats();
    setJourneyStartTime(Date.now());
    setJourneyElapsed(0);
    setJourneyActive(true);
    Alert.alert(
      '🚗 Journey Started',
      'GPS tracking is now active.\nWaypoints are recorded every 100 m or 5 minutes.\nDistance will be calculated when you end the journey.',
    );
  }

  // ── End Journey ───────────────────────────────────────────────────────────
  function endJourney(showAlert = true) {
    setJourneyActive(false);
    setJourneyStartTime(null);
    clearInterval(timerRef.current);

    if (showAlert) {
      const mins = Math.floor(journeyElapsed / 60);
      const secs = journeyElapsed % 60;
      const duration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      Alert.alert(
        '🏁 Journey Ended',
        `Duration: ${duration}\nDistance tracked: ${distanceKm.toFixed(1)} km\nWaypoints recorded: ${waypointCount}\n\nThis distance will be included in your checkout total.`,
      );
    }
  }

  // ── Format elapsed time ───────────────────────────────────────────────────
  function formatElapsed(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
    return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  }

  const isCheckedIn  = !!today?.check_in;
  const isCheckedOut = !!today?.check_out;
  const checkInLat   = today?.check_in_lat  ? parseFloat(today.check_in_lat)  : null;
  const checkInLng   = today?.check_in_lng  ? parseFloat(today.check_in_lng)  : null;

  if (loading) return <LoadingSpinner fullScreen message="Loading attendance…" />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.base, paddingBottom: insets.bottom + 120 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
    >
      {/* Header */}
      <Text style={styles.screenTitle}>Attendance</Text>
      <Text style={styles.screenDate}>
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </Text>

      {/* ── Today's Status Card ── */}
      <Card style={styles.statusCard} elevated>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>Today's Status</Text>
          <View style={[
            styles.statusBadge,
            isCheckedIn && !isCheckedOut ? styles.statusBadgeActive
            : isCheckedOut ? styles.statusBadgeDone
            : styles.statusBadgePending,
          ]}>
            <Text style={styles.statusBadgeText}>
              {isCheckedOut ? 'Completed' : isCheckedIn ? 'Checked In' : 'Not Started'}
            </Text>
          </View>
        </View>

        <View style={styles.timeRow}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>Check In</Text>
            <Text style={styles.timeValue}>
              {today?.check_in
                ? new Date(today.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                : '—'}
            </Text>
          </View>
          <View style={styles.timeDivider} />
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>Check Out</Text>
            <Text style={styles.timeValue}>
              {today?.check_out
                ? new Date(today.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                : '—'}
            </Text>
          </View>
          <View style={styles.timeDivider} />
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>Distance</Text>
            <Text style={styles.timeValue}>
              {journeyActive
                ? `${distanceKm.toFixed(1)} km`
                : today?.km != null
                  ? `${parseFloat(today.km).toFixed(1)} km`
                  : '0 km'}
            </Text>
          </View>
        </View>

        {/* Map preview of check-in location */}
        {isCheckedIn && checkInLat && checkInLng && (
          <View style={styles.mapContainer}>
            <Text style={styles.mapLabel}>📍 Check-in Location</Text>
            <MapPreview lat={checkInLat} lng={checkInLng} title="Check-in" height={150} />
          </View>
        )}

        {/* Check In / Check Out buttons */}
        {!isCheckedIn && (
          <Button
            title={actionLoading || locationLoading ? 'Getting Location…' : 'Check In'}
            onPress={handleCheckIn}
            loading={actionLoading || locationLoading}
            fullWidth size="lg" style={styles.actionBtn}
          />
        )}
        {isCheckedIn && !isCheckedOut && (
          <Button
            title={actionLoading || locationLoading ? 'Getting Location…' : 'Check Out'}
            onPress={handleCheckOut}
            loading={actionLoading || locationLoading}
            fullWidth size="lg" variant="outline" style={styles.actionBtn}
          />
        )}
        {isCheckedOut && (
          <View style={styles.completedMsg}>
            <Text style={styles.completedText}>✅ Attendance completed for today</Text>
          </View>
        )}
      </Card>

      {/* ── Journey Tracking Card (Field agents only, while checked in) ── */}
      {isFieldAgent && isCheckedIn && !isCheckedOut && (
        <Card style={[styles.journeyCard, journeyActive && styles.journeyCardActive]} elevated>
          <View style={styles.journeyHeader}>
            <Text style={styles.journeyTitle}>
              {journeyActive ? '🚗 Journey Active' : '🗺️ Start Journey'}
            </Text>
            {journeyActive && (
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>

          {journeyActive ? (
            <>
              {/* Live stats */}
              <View style={styles.journeyStats}>
                <View style={styles.journeyStat}>
                  <Text style={styles.journeyStatValue}>{formatElapsed(journeyElapsed)}</Text>
                  <Text style={styles.journeyStatLabel}>Duration</Text>
                </View>
                <View style={styles.journeyStatDivider} />
                <View style={styles.journeyStat}>
                  <Text style={[styles.journeyStatValue, { color: Colors.primary }]}>
                    {distanceKm.toFixed(1)} km
                  </Text>
                  <Text style={styles.journeyStatLabel}>Distance</Text>
                </View>
                <View style={styles.journeyStatDivider} />
                <View style={styles.journeyStat}>
                  <Text style={styles.journeyStatValue}>{waypointCount}</Text>
                  <Text style={styles.journeyStatLabel}>Waypoints</Text>
                </View>
              </View>

              <Text style={styles.journeyHint}>
                📡 Tracking every {'>'}100 m or 5 min · {waypointCount} point{waypointCount !== 1 ? 's' : ''} recorded
              </Text>

              <Button
                title="🏁 End Journey"
                onPress={() => endJourney(true)}
                fullWidth size="lg" variant="outline"
                style={styles.journeyBtn}
              />
            </>
          ) : (
            <>
              <Text style={styles.journeyDesc}>
                Start a journey to track your GPS route and calculate distance travelled.
                Waypoints are recorded every 100 m or 5 minutes — same as the web app.
              </Text>
              <Button
                title="🚗 Start Journey"
                onPress={handleStartJourney}
                fullWidth size="lg"
                style={styles.journeyBtn}
              />
            </>
          )}
        </Card>
      )}

      {/* ── Monthly Summary ── */}
      {report && (
        <>
          <Text style={styles.sectionTitle}>This Month</Text>
          <View style={styles.summaryRow}>
            <SummaryCard label="Present"    value={report.present}    color={Colors.primary} />
            <SummaryCard label="Total Days" value={report.total}      color={Colors.info} />
            <SummaryCard label="KM Total"   value={`${report.km_total}`} color={Colors.warning} />
          </View>

          {report.calendar_days?.length > 0 && (
            <Card style={styles.calendarCard}>
              <Text style={styles.calendarTitle}>Attendance Calendar</Text>
              <View style={styles.calendarGrid}>
                {report.calendar_days.map((day) => (
                  <View key={day.date} style={styles.calendarDay}>
                    <View style={[styles.calendarDot, day.check_in ? styles.calendarDotPresent : styles.calendarDotAbsent]} />
                    <Text style={styles.calendarDayNum}>{new Date(day.date).getDate()}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <View style={[summaryStyles.card, { borderTopColor: color }]}>
      <Text style={[summaryStyles.value, { color }]}>{value}</Text>
      <Text style={summaryStyles.label}>{label}</Text>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  card: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', borderTopWidth: 3, borderWidth: 1, borderColor: Colors.border },
  value: { fontSize: Typography.xl, fontWeight: Typography.bold },
  label: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.base },
  screenTitle: { fontSize: Typography.xxl, fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: 4 },
  screenDate: { fontSize: Typography.sm, color: Colors.textMuted, marginBottom: Spacing.base },
  // Status card
  statusCard: { marginBottom: Spacing.base },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.base },
  statusTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  statusBadge: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Radius.full },
  statusBadgePending: { backgroundColor: Colors.warningMuted },
  statusBadgeActive:  { backgroundColor: Colors.successMuted },
  statusBadgeDone:    { backgroundColor: Colors.infoMuted },
  statusBadgeText: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary },
  timeRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.base },
  timeBlock: { alignItems: 'center', flex: 1 },
  timeDivider: { width: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  timeLabel: { fontSize: Typography.xs, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  timeValue: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  mapContainer: { marginBottom: Spacing.md },
  mapLabel: { fontSize: Typography.xs, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.xs },
  actionBtn: { marginTop: Spacing.sm },
  completedMsg: { alignItems: 'center', paddingVertical: Spacing.md },
  completedText: { fontSize: Typography.sm, color: Colors.primary, fontWeight: Typography.medium },
  // Journey card
  journeyCard: { marginBottom: Spacing.base, borderWidth: 1, borderColor: Colors.border },
  journeyCardActive: { borderColor: Colors.primary, borderWidth: 2 },
  journeyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  journeyTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  livePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34,197,94,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  liveText: { fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 1 },
  journeyStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.md, backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.md },
  journeyStat: { alignItems: 'center', flex: 1 },
  journeyStatDivider: { width: 1, backgroundColor: Colors.border },
  journeyStatValue: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  journeyStatLabel: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  journeyHint: { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center', marginBottom: Spacing.md },
  journeyDesc: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.md },
  journeyBtn: { marginTop: Spacing.xs },
  // Monthly summary
  sectionTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: Spacing.md, marginTop: Spacing.sm },
  summaryRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.base },
  calendarCard: { marginBottom: Spacing.base },
  calendarTitle: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textSecondary, marginBottom: Spacing.md },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  calendarDay: { alignItems: 'center', width: 32 },
  calendarDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 3 },
  calendarDotPresent: { backgroundColor: Colors.primary },
  calendarDotAbsent:  { backgroundColor: Colors.secondary },
  calendarDayNum: { fontSize: 10, color: Colors.textMuted },
});

// ── Team view styles ──────────────────────────────────────────────────────────
const teamStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  date: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  summaryRow: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border },
  chip: { flex: 1, alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1.5 },
  chipVal: { fontSize: Typography.xl, fontWeight: Typography.bold },
  chipLbl: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingTop: 80 },
  loadingText: { fontSize: Typography.sm, color: Colors.textMuted },
  list: { padding: Spacing.base, gap: Spacing.md },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 40, opacity: 0.4, marginBottom: Spacing.md },
  emptyText: { fontSize: Typography.sm, color: Colors.textMuted },
  // Agent card
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base, borderWidth: 1, borderColor: Colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  avatarText: { fontSize: Typography.base, fontWeight: '700', color: Colors.primary },
  agentInfo: { flex: 1 },
  agentName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  agentDept: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  pillActive:  { backgroundColor: 'rgba(34,197,94,0.15)' },
  pillDone:    { backgroundColor: 'rgba(59,130,246,0.15)' },
  pillPending: { backgroundColor: 'rgba(148,163,184,0.12)' },
  statusPillText: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  // Time row
  timeRow: { flexDirection: 'row', marginBottom: Spacing.md, backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.md },
  timeCell: { flex: 1, alignItems: 'center' },
  timeCellLabel: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  timeCellValue: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },
  // Route button
  routeBtn: { backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.primary },
  routeBtnDisabled: { backgroundColor: Colors.surface, borderColor: Colors.border },
  routeBtnText: { fontSize: Typography.sm, fontWeight: '700', color: Colors.primary },
  routeBtnTextDisabled: { color: Colors.textMuted, fontWeight: '500' },
});
