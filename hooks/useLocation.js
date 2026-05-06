/**
 * useLocation hook
 * Requests foreground location permission and returns current GPS coordinates.
 * Also provides reverse-geocoded address via the backend /maps/geocode endpoint.
 */
import { useState, useCallback } from 'react';
import * as Location from 'expo-location';

export function useLocation() {
  const [location, setLocation] = useState(null); // { lat, lng, address }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. Please enable it in Settings.');
        return null;
      }

      // Get current position (high accuracy)
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude: lat, longitude: lng } = pos.coords;

      // Reverse geocode using expo's built-in (no API key needed for basic address)
      let address = '';
      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (geo) {
          const parts = [geo.name, geo.street, geo.city, geo.region].filter(Boolean);
          address = parts.join(', ');
        }
      } catch (_) {
        // address is optional — don't fail if geocoding fails
      }

      const result = { lat, lng, address };
      setLocation(result);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to get location');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { location, loading, error, getLocation };
}
