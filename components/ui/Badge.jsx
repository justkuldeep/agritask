import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Radius, Spacing, Typography } from '../../constants/theme';
import { TASK_STATUS } from '../../constants';

/**
 * Status badge for tasks and other entities
 */
export default function Badge({ status, label, color, bg, size = 'md' }) {
  const statusConfig = TASK_STATUS[status?.toLowerCase()] || {};
  const badgeColor = color || statusConfig.color || '#94a3b8';
  const badgeBg = bg || statusConfig.bg || 'rgba(148, 163, 184, 0.15)';
  const badgeLabel = label || statusConfig.label || status || '';

  return (
    <View style={[styles.badge, { backgroundColor: badgeBg }, size === 'sm' && styles.sm]}>
      <View style={[styles.dot, { backgroundColor: badgeColor }]} />
      <Text style={[styles.text, { color: badgeColor }, size === 'sm' && styles.textSm]}>
        {badgeLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  sm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  text: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    letterSpacing: 0.3,
    textTransform: 'capitalize',
  },
  textSm: {
    fontSize: 10,
  },
});
