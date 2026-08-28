import { useState, useEffect, useCallback } from 'react';
import firebaseService from '../services/firebaseService';

const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState('unknown');
  const [isAllowed, setIsAllowed] = useState(false);
  const [isDenied, setIsDenied] = useState(false);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [watchId, setWatchId] = useState(null);

  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp
        };
        setLocation(newLocation);
        setPermission('granted');
        setIsAllowed(true);
        setIsDenied(false);
        setLoading(false);
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location services.';
            setPermission('denied');
            setIsDenied(true);
            setIsAllowed(false);
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
          default:
            errorMessage = 'An unknown error occurred.';
        }
        setError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: false, // Changed to false for better compatibility
        timeout: 15000, // Increased timeout
        maximumAge: 60000 // Allow cached positions up to 1 minute
      }
    );
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    if (trackingEnabled) return;

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp
        };
        setLocation(newLocation);
        setPermission('granted');
        setIsAllowed(true);
        setIsDenied(false);
        setLoading(false);
        
        // Upload to Firebase
        firebaseService.uploadLocation(newLocation);
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000
      }
    );

    setWatchId(id);
    setTrackingEnabled(true);
  }, [trackingEnabled]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setTrackingEnabled(false);
    }
  }, [watchId]);

  useEffect(() => {
    // Don't automatically request permission on mount
    // Let user manually request it to avoid automatic blocking
    setLoading(false);
  }, []);

  return {
    location,
    error,
    loading,
    permission,
    isAllowed,
    isDenied,
    requestPermission,
    startTracking,
    stopTracking,
    trackingEnabled
  };
};

export default useGeolocation;
