/**
 * MapPreview component
 * Shows a Google Maps tile with a marker at the given coordinates.
 * Used in attendance check-in/out and task location views.
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors, Radius, Typography, Spacing } from '../../constants/theme';

export default function MapPreview({
  lat,
  lng,
  title = 'Location',
  description = '',
  height = 180,
  style,
}) {
  if (!lat || !lng || (lat === 0 && lng === 0)) {
    return (
      <View style={[styles.placeholder, { height }, style]}>
        <Text style={styles.placeholderIcon}>📍</Text>
        <Text style={styles.placeholderText}>Location not available</Text>
      </View>
    );
  }

  const region = {
    latitude: lat,
    longitude: lng,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  return (
    <View style={[styles.container, { height }, style]}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        <Marker
          coordinate={{ latitude: lat, longitude: lng }}
          title={title}
          description={description}
          pinColor={Colors.primary}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  map: {
    flex: 1,
  },
  placeholder: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  placeholderIcon: {
    fontSize: 28,
    opacity: 0.4,
  },
  placeholderText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
});
