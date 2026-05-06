import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Spacing, Typography, Shadows } from '../../constants/theme';

/**
 * KPI metric card for the dashboard
 */
export default function KPICard({ label, value, subtitle, color, gradient, icon }) {
  const cardColor = color || Colors.primary;

  if (gradient) {
    return (
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.content}>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={styles.value}>{value ?? '—'}</Text>
          <Text style={styles.label}>{label}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.card, { borderLeftColor: cardColor, borderLeftWidth: 3 }]}>
      <View style={styles.content}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text style={[styles.value, { color: cardColor }]}>{value ?? '—'}</Text>
        <Text style={styles.label}>{label}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Shadows.sm,
  },
  content: {
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 22,
    marginBottom: Spacing.xs,
  },
  value: {
    fontSize: Typography.xxl,
    fontWeight: Typography.extrabold,
    color: Colors.textPrimary,
    lineHeight: 32,
  },
  label: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
