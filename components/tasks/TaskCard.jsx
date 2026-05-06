import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';

/**
 * Task list card — shows title, status badge, assignee, progress, deadline
 */
export default function TaskCard({ task, onPress }) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress(task);
    } else {
      router.push(`/tasks/${task.id}`);
    }
  };

  const progress =
    task.repeat_count > 0
      ? Math.min(1, (task.record_count || 0) / task.repeat_count)
      : 0;

  const progressPct = Math.round(progress * 100);
  const isOverdue =
    task.deadline &&
    new Date(task.deadline) < new Date() &&
    task.status !== 'completed';

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Card style={styles.card}>
        {/* Header row */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {task.title}
            </Text>
          </View>
          <Badge status={task.status} />
        </View>

        {/* Meta row */}
        <View style={styles.meta}>
          {task.dept && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{task.dept}</Text>
            </View>
          )}
          {task.activity_type && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{task.activity_type}</Text>
            </View>
          )}
          {task.assignment_type === 'group' && (
            <View style={[styles.chip, styles.chipGroup]}>
              <Text style={[styles.chipText, styles.chipGroupText]}>Group</Text>
            </View>
          )}
        </View>

        {/* Assignee */}
        {task.assigned_to_name && (
          <View style={styles.assigneeRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {task.assigned_to_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.assigneeName} numberOfLines={1}>
              {task.assigned_to_name}
            </Text>
          </View>
        )}

        {/* Progress bar */}
        {task.repeat_count > 1 && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressValue}>
                {task.record_count || 0}/{task.repeat_count}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPct}%` },
                  progressPct === 100 && styles.progressComplete,
                ]}
              />
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {task.deadline && (
            <Text style={[styles.deadline, isOverdue && styles.deadlineOverdue]}>
              {isOverdue ? '⚠ ' : '📅 '}
              {new Date(task.deadline).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              })}
            </Text>
          )}
          {task.unit && task.target && (
            <Text style={styles.target}>
              Target: {task.target} {task.unit}
            </Text>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  titleRow: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  chip: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  chipText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  chipGroup: {
    backgroundColor: Colors.infoMuted,
  },
  chipGroupText: {
    color: Colors.info,
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: Typography.bold,
    color: Colors.primary,
  },
  assigneeName: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  progressSection: {
    marginBottom: Spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
  progressValue: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.secondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.info,
    borderRadius: 2,
  },
  progressComplete: {
    backgroundColor: Colors.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  deadline: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
  deadlineOverdue: {
    color: Colors.warning,
  },
  target: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
});
