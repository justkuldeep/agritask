import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing, Shadows } from '../../constants/theme';

/**
 * Base card container with consistent styling
 */
export default function Card({ children, style, elevated = false, noPadding = false }) {
  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        noPadding && styles.noPadding,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Shadows.sm,
  },
  elevated: {
    ...Shadows.md,
    borderColor: Colors.secondaryLight,
  },
  noPadding: {
    padding: 0,
  },
});
