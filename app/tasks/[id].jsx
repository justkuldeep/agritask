/**
 * Task Detail Screen
 * - Fetches task by ID using getById endpoint
 * - Field agents: Submit Record form with farmer details
 * - Manager/Owner: Status controls (Mark Active / Complete) + Delete
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tasksAPI } from '../../services/api';
import { useAuth } from '../../services/authStore';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';

// DB status values
const STATUS = {
  ASSIGNED: 'assigned',
  RUNNING: 'running',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // Submit record modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    farmer_name: '',
    farmer_contact: '',
    village: '',
    tehsil: '',
    district: '',
    land_acres: '',
  });
  const [submitLoading, setSubmitLoading] = useState(false);

  const role = user?.role?.toUpperCase();
  const isManager = role === 'OWNER' || role === 'MANAGER';
  const isFieldAgent = role === 'FIELD';

  // ── Load task ──────────────────────────────────────────────────────────────
  const loadTask = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [taskRes, recordsRes] = await Promise.all([
        tasksAPI.getById(id),
        tasksAPI.getRecords(id),
      ]);
      setTask(taskRes.data);
      setRecords(recordsRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  // ── Status update (manager/owner) ──────────────────────────────────────────
  async function handleStatusUpdate(newStatus) {
    const label = newStatus === STATUS.RUNNING ? 'Active' : 'Completed';
    Alert.alert(
      'Update Status',
      `Mark this task as "${label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await tasksAPI.update(id, { status: newStatus });
              setTask(res.data);
            } catch (err) {
              Alert.alert('Error', err.message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }

  // ── Delete (manager/owner) ─────────────────────────────────────────────────
  async function handleDelete() {
    Alert.alert(
      'Delete Task',
      'This cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await tasksAPI.delete(id);
              router.back();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ],
    );
  }

  // ── Submit record (field agent) ────────────────────────────────────────────
  function openSubmitModal() {
    setSubmitForm({ farmer_name: '', farmer_contact: '', village: '', tehsil: '', district: '', land_acres: '' });
    setShowSubmitModal(true);
  }

  async function handleSubmitRecord() {
    if (!submitForm.farmer_name.trim()) {
      Alert.alert('Required', 'Please enter the farmer name.');
      return;
    }
    setSubmitLoading(true);
    try {
      const payload = {
        farmer_name: submitForm.farmer_name.trim(),
        farmer_contact: submitForm.farmer_contact.trim() || undefined,
        village: submitForm.village.trim() || undefined,
        tehsil: submitForm.tehsil.trim() || undefined,
        district: submitForm.district.trim() || undefined,
        land_acres: submitForm.land_acres ? parseFloat(submitForm.land_acres) : undefined,
      };
      await tasksAPI.submitRecord(id, payload);
      setShowSubmitModal(false);
      await loadTask();
      Alert.alert('✅ Submitted', 'Record submitted successfully!');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitLoading(false);
    }
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const canSubmit = isFieldAgent &&
    task?.status !== STATUS.COMPLETED &&
    task?.status !== STATUS.CANCELLED &&
    (task?.my_record_count ?? 0) < (task?.repeat_count ?? 1);

  const progress = task?.repeat_count > 0
    ? Math.min(1, (task.record_count || 0) / task.repeat_count)
    : 0;

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading task…</Text>
      </View>
    );
  }

  if (error || !task) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error || 'Task not found'}</Text>
        <Button title="Go Back" onPress={() => router.back()} variant="outline" style={{ marginTop: Spacing.base }} />
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Task Detail</Text>
          {isManager && (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
              <Text style={styles.deleteIcon}>🗑</Text>
            </TouchableOpacity>
          )}
          {!isManager && <View style={{ width: 36 }} />}
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Title & Status */}
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{task.title}</Text>
              <Badge status={task.status} />
            </View>
            {task.description ? (
              <Text style={styles.description}>{task.description}</Text>
            ) : null}
          </View>

          {/* My progress (field agent) */}
          {isFieldAgent && task.repeat_count > 1 && (
            <Card style={styles.myProgressCard}>
              <Text style={styles.cardLabel}>My Progress</Text>
              <View style={styles.progressHeader}>
                <Text style={styles.progressValue}>
                  {task.my_record_count || 0} / {task.repeat_count} {task.unit}
                </Text>
                <Text style={[styles.progressPct, canSubmit ? { color: Colors.primary } : { color: Colors.textMuted }]}>
                  {canSubmit ? `${task.repeat_count - (task.my_record_count || 0)} remaining` : 'Done ✓'}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round(((task.my_record_count || 0) / task.repeat_count) * 100)}%` },
                    !canSubmit && styles.progressComplete,
                  ]}
                />
              </View>
            </Card>
          )}

          {/* Overall progress */}
          {task.repeat_count > 0 && (
            <Card style={styles.progressCard}>
              <Text style={styles.cardLabel}>Overall Progress</Text>
              <View style={styles.progressHeader}>
                <Text style={styles.progressValue}>
                  {task.record_count || 0} / {task.repeat_count} {task.unit}
                </Text>
                <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round(progress * 100)}%` },
                    progress >= 1 && styles.progressComplete,
                  ]}
                />
              </View>
            </Card>
          )}

          {/* Details */}
          <Card style={styles.detailsCard}>
            <Text style={styles.cardLabel}>Details</Text>
            <DetailRow label="Department" value={task.dept} />
            <DetailRow label="Season" value={task.season} />
            <DetailRow label="Activity" value={task.activity_type} />
            <DetailRow label="State" value={task.state} />
            <DetailRow label="Territory" value={task.territory} />
            <DetailRow label="Location" value={task.location} />
            <DetailRow label="Crop" value={task.crop} />
            <DetailRow label="Product" value={task.product} />
            <DetailRow label="Target" value={task.target ? `${task.target} ${task.unit}` : null} />
            <DetailRow
              label="Deadline"
              value={task.deadline
                ? new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                : null}
            />
            <DetailRow
              label="Assignment"
              value={task.assignment_type === 'group'
                ? `Group (${task.member_names?.join(', ') || '—'})`
                : task.assigned_to_name || '—'}
            />
            <DetailRow
              label="Created"
              value={new Date(task.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            />
          </Card>

          {/* Submissions list */}
          {records.length > 0 && (
            <Card style={styles.recordsCard}>
              <Text style={styles.cardLabel}>Submissions ({records.length})</Text>
              {records.map((rec) => (
                <View key={rec.id} style={styles.recordItem}>
                  <View style={styles.recordDot} />
                  <View style={styles.recordContent}>
                    <Text style={styles.recordName}>
                      {rec.farmer_name || rec.submitted_by_name || 'Record'}
                    </Text>
                    {rec.village ? (
                      <Text style={styles.recordMeta}>
                        {rec.village}{rec.district ? `, ${rec.district}` : ''}
                      </Text>
                    ) : null}
                    {rec.land_acres ? (
                      <Text style={styles.recordMeta}>{rec.land_acres} acres</Text>
                    ) : null}
                    <Text style={styles.recordDate}>
                      {new Date(rec.submitted_at).toLocaleDateString('en-IN')}
                      {rec.submitted_by_name ? ` · ${rec.submitted_by_name}` : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          )}
        </ScrollView>

        {/* ── Action bar ── */}
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + Spacing.md }]}>
          {/* Field agent: Submit Record */}
          {isFieldAgent && (
            canSubmit ? (
              <Button
                title="📝 Submit Record"
                onPress={openSubmitModal}
                fullWidth
                size="lg"
              />
            ) : (
              <View style={styles.doneMsg}>
                <Text style={styles.doneMsgText}>
                  {task.status === STATUS.COMPLETED
                    ? '✅ Task completed'
                    : `✅ You've submitted all ${task.repeat_count} record(s)`}
                </Text>
              </View>
            )
          )}

          {/* Manager/Owner: status controls */}
          {isManager && task.status === STATUS.ASSIGNED && (
            <View style={styles.actionRow}>
              <Button
                title="Mark Active"
                onPress={() => handleStatusUpdate(STATUS.RUNNING)}
                variant="outline"
                style={styles.actionBtn}
                loading={actionLoading}
              />
              <Button
                title="Complete"
                onPress={() => handleStatusUpdate(STATUS.COMPLETED)}
                style={styles.actionBtn}
                loading={actionLoading}
              />
            </View>
          )}
          {isManager && task.status === STATUS.RUNNING && (
            <Button
              title="Mark Completed"
              onPress={() => handleStatusUpdate(STATUS.COMPLETED)}
              fullWidth
              size="lg"
              loading={actionLoading}
            />
          )}
        </View>
      </View>

      {/* ── Submit Record Modal ── */}
      <Modal
        visible={showSubmitModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSubmitModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalScreen}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Modal header */}
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.sm }]}>
            <TouchableOpacity onPress={() => setShowSubmitModal(false)} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Submit Record</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 100 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.modalSubtitle}>
              Task: <Text style={{ color: Colors.primary }}>{task.title}</Text>
            </Text>

            <FormField
              label="Farmer Name *"
              value={submitForm.farmer_name}
              onChangeText={(v) => setSubmitForm((p) => ({ ...p, farmer_name: v }))}
              placeholder="Enter farmer's full name"
              autoCapitalize="words"
            />
            <FormField
              label="Farmer Contact"
              value={submitForm.farmer_contact}
              onChangeText={(v) => setSubmitForm((p) => ({ ...p, farmer_contact: v }))}
              placeholder="Mobile number"
              keyboardType="phone-pad"
            />
            <FormField
              label="Village"
              value={submitForm.village}
              onChangeText={(v) => setSubmitForm((p) => ({ ...p, village: v }))}
              placeholder="Village name"
              autoCapitalize="words"
            />
            <FormField
              label="Tehsil"
              value={submitForm.tehsil}
              onChangeText={(v) => setSubmitForm((p) => ({ ...p, tehsil: v }))}
              placeholder="Tehsil / Block"
              autoCapitalize="words"
            />
            <FormField
              label="District"
              value={submitForm.district}
              onChangeText={(v) => setSubmitForm((p) => ({ ...p, district: v }))}
              placeholder="District"
              autoCapitalize="words"
            />
            <FormField
              label="Land (Acres)"
              value={submitForm.land_acres}
              onChangeText={(v) => setSubmitForm((p) => ({ ...p, land_acres: v }))}
              placeholder="e.g. 2.5"
              keyboardType="decimal-pad"
            />
          </ScrollView>

          <View style={[styles.modalFooter, { paddingBottom: insets.bottom + Spacing.md }]}>
            <Button
              title={submitLoading ? 'Submitting…' : 'Submit Record'}
              onPress={handleSubmitRecord}
              loading={submitLoading}
              fullWidth
              size="lg"
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ── Small components ──────────────────────────────────────────────────────────

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={detailStyles.row}>
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={detailStyles.value}>{value}</Text>
    </View>
  );
}

function FormField({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize }) {
  return (
    <View style={formStyles.field}>
      <Text style={formStyles.label}>{label}</Text>
      <TextInput
        style={formStyles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'none'}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  label: { fontSize: Typography.sm, color: Colors.textMuted, flex: 1 },
  value: { fontSize: Typography.sm, color: Colors.textPrimary, fontWeight: Typography.medium, flex: 2, textAlign: 'right' },
});

const formStyles = StyleSheet.create({
  field: { marginBottom: Spacing.base },
  label: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textSecondary, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    height: 52,
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  loadingText: { marginTop: Spacing.md, fontSize: Typography.sm, color: Colors.textSecondary },
  errorIcon: { fontSize: 48, marginBottom: Spacing.md },
  errorText: { fontSize: Typography.base, color: Colors.error, textAlign: 'center' },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { marginRight: Spacing.md, padding: Spacing.xs },
  backIcon: { fontSize: Typography.xl, color: Colors.textPrimary },
  headerTitle: { flex: 1, fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  deleteBtn: { padding: Spacing.xs },
  deleteIcon: { fontSize: 20 },
  // Content
  content: { padding: Spacing.base },
  titleSection: { marginBottom: Spacing.base },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  title: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary, flex: 1, marginRight: Spacing.sm, lineHeight: 28 },
  description: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20 },
  // Progress
  myProgressCard: { marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.primary },
  progressCard: { marginBottom: Spacing.md },
  cardLabel: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.md },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  progressValue: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  progressPct: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.primary },
  progressTrack: { height: 8, backgroundColor: Colors.secondary, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.info, borderRadius: 4 },
  progressComplete: { backgroundColor: Colors.primary },
  // Details & records
  detailsCard: { marginBottom: Spacing.md },
  recordsCard: { marginBottom: Spacing.md },
  recordItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  recordDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 5, marginRight: Spacing.md },
  recordContent: { flex: 1 },
  recordName: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },
  recordMeta: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  recordDate: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
  // Action bar
  actionBar: { padding: Spacing.base, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
  actionRow: { flexDirection: 'row', gap: Spacing.md },
  actionBtn: { flex: 1 },
  doneMsg: { alignItems: 'center', paddingVertical: Spacing.md },
  doneMsgText: { fontSize: Typography.sm, color: Colors.primary, fontWeight: Typography.medium },
  // Modal
  modalScreen: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  closeIcon: { fontSize: 14, color: Colors.textSecondary },
  modalTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  modalContent: { padding: Spacing.base },
  modalSubtitle: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing.xl, lineHeight: 20 },
  modalFooter: { padding: Spacing.base, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
});
