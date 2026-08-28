// Smart Vehicles connect AI - Firebase Service
// Handles real-time location tracking and emergency data

import { ref, set, onValue, push, update } from 'firebase/database';
import { database } from '../firebase';

class FirebaseService {
  constructor() {
    this.trackerId = localStorage.getItem('trackerId') || this.generateTrackerId();
    localStorage.setItem('trackerId', this.trackerId);
    this.locationUnsubscribe = null;
    this.emergencyUnsubscribe = null;
  }

  generateTrackerId() {
    return 'tracker_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getTrackerId() {
    return this.trackerId;
  }

  // Upload live location to Firebase
  async uploadLocation(locationData) {
    try {
      const locationRef = ref(database, `locations/${this.trackerId}`);
      await set(locationRef, {
        ...locationData,
        trackerId: this.trackerId,
        timestamp: Date.now(),
        lastUpdate: new Date().toISOString()
      });
      console.log('Location uploaded to Firebase');
      return true;
    } catch (error) {
      console.error('Firebase location upload error:', error);
      return false;
    }
  }

  // Listen to live location updates
  onLocationUpdate(callback) {
    const locationRef = ref(database, `locations/${this.trackerId}`);
    this.locationUnsubscribe = onValue(locationRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback(data);
      }
    });
  }

  // Stop listening to location updates
  stopLocationUpdates() {
    if (this.locationUnsubscribe) {
      this.locationUnsubscribe();
      this.locationUnsubscribe = null;
    }
  }

  // Create emergency record
  async createEmergency(emergencyData) {
    try {
      const emergenciesRef = ref(database, 'emergencies');
      const newEmergencyRef = push(emergenciesRef);
      const emergencyId = newEmergencyRef.key;
      
      await set(newEmergencyRef, {
        ...emergencyData,
        emergencyId,
        trackerId: this.trackerId,
        timestamp: Date.now(),
        createdAt: new Date().toISOString(),
        status: 'active'
      });
      
      console.log('Emergency record created:', emergencyId);
      return emergencyId;
    } catch (error) {
      console.error('Firebase emergency creation error:', error);
      throw error;
    }
  }

  // Update emergency status
  async updateEmergencyStatus(emergencyId, status) {
    try {
      const emergencyRef = ref(database, `emergencies/${emergencyId}`);
      await update(emergencyRef, {
        status,
        updatedAt: new Date().toISOString()
      });
      console.log('Emergency status updated:', status);
      return true;
    } catch (error) {
      console.error('Firebase emergency update error:', error);
      return false;
    }
  }

  // Listen to all active emergencies
  onEmergencies(callback) {
    const emergenciesRef = ref(database, 'emergencies');
    this.emergencyUnsubscribe = onValue(emergenciesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const emergencies = Object.entries(data).map(([key, value]) => ({
          emergencyId: key,
          ...value
        }));
        // Filter for active emergencies
        const activeEmergencies = emergencies.filter(e => e.status === 'active');
        callback(activeEmergencies);
      } else {
        callback([]);
      }
    });
  }

  // Stop listening to emergencies
  stopEmergencyUpdates() {
    if (this.emergencyUnsubscribe) {
      this.emergencyUnsubscribe();
      this.emergencyUnsubscribe = null;
    }
  }

  // Upload sensor data
  async uploadSensorData(sensorData) {
    try {
      const sensorRef = ref(database, `sensors/${this.trackerId}`);
      await set(sensorRef, {
        ...sensorData,
        trackerId: this.trackerId,
        timestamp: Date.now(),
        lastUpdate: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Firebase sensor upload error:', error);
      return false;
    }
  }

  // Upload driver status
  async uploadDriverStatus(driverStatus) {
    try {
      const statusRef = ref(database, `driverStatus/${this.trackerId}`);
      await set(statusRef, {
        ...driverStatus,
        trackerId: this.trackerId,
        timestamp: Date.now(),
        lastUpdate: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Firebase driver status upload error:', error);
      return false;
    }
  }
}

const firebaseService = new FirebaseService();
export default firebaseService;
