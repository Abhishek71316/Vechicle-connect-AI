import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom React hook for retrieving real-time phone GPS location using HTML5 Geolocation API.
 * Uses high accuracy watchPosition and instant getCurrentPosition mode.
 */
export const usePhoneGPS = (autoStart = true) => {
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    speed: null,
    heading: null,
    timestamp: null
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState('prompt'); // 'prompt', 'granted', 'denied'
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef(null);

  const handlePositionSuccess = useCallback((position) => {
    if (!position || !position.coords) return;
    const { latitude, longitude, accuracy, speed, heading } = position.coords;
    const timestamp = position.timestamp ? new Date(position.timestamp).toISOString() : new Date().toISOString();

    setLocation({
      latitude: latitude != null ? Number(latitude.toFixed(6)) : null,
      longitude: longitude != null ? Number(longitude.toFixed(6)) : null,
      accuracy: accuracy != null ? Number(accuracy.toFixed(1)) : null,
      speed: speed != null && speed > 0 ? Number((speed * 3.6).toFixed(1)) : 0, // convert m/s to km/h
      heading: heading != null ? Number(heading.toFixed(1)) : 0,
      timestamp
    });
    setPermissionStatus('granted');
    setError(null);
    setLoading(false);
  }, []);

  const handlePositionError = useCallback((err) => {
    let msg = 'Unknown Geolocation Error';
    if (err) {
      switch (err.code) {
        case err.PERMISSION_DENIED:
          msg = 'Location permission denied. Please allow location access in your browser settings.';
          setPermissionStatus('denied');
          break;
        case err.POSITION_UNAVAILABLE:
          msg = 'Location information is unavailable on this device.';
          break;
        case err.TIMEOUT:
          msg = 'Location request timed out.';
          break;
        default:
          msg = err.message || msg;
      }
    }
    setError(msg);
    setLoading(false);
  }, []);

  const startTracking = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation API is not supported by your browser.');
      setLoading(false);
      return;
    }

    if (watchIdRef.current !== null) {
      return; // Already watching
    }

    setLoading(true);
    setError(null);

    // Get immediate single position lock first
    try {
      navigator.geolocation.getCurrentPosition(
        handlePositionSuccess,
        handlePositionError,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } catch (e) {}

    // Start continuous high accuracy watch position
    try {
      const watchId = navigator.geolocation.watchPosition(
        handlePositionSuccess,
        handlePositionError,
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        }
      );
      watchIdRef.current = watchId;
      setIsTracking(true);
    } catch (e) {
      setError('Failed to initialize location watch.');
      setLoading(false);
    }
  }, [handlePositionSuccess, handlePositionError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsTracking(false);
    }
  }, []);

  useEffect(() => {
    if (autoStart) {
      startTracking();
    } else {
      setLoading(false);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [autoStart, startTracking]);

  return {
    location,
    error,
    loading,
    permissionStatus,
    isTracking,
    startTracking,
    stopTracking
  };
};

export default usePhoneGPS;