# Firebase Setup Guide for Smart Vehicles connect AI

This guide will help you set up Firebase Realtime Database for live GPS tracking and emergency alerts.

## Prerequisites
- A Google account
- Firebase Console access

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name: `SmartVehiclesConnectAI` (or your preferred name)
4. Disable Google Analytics for this project (not required)
5. Click "Create project"
6. Wait for project creation to complete
7. Click "Continue"

## Step 2: Enable Realtime Database

1. In Firebase Console, go to your project
2. Click "Build" in the left sidebar
3. Click "Realtime Database"
4. Click "Create Database"
5. Select a location (choose closest to your users)
6. For testing, select "Start in test mode"
   - **Important**: Test mode allows anyone to read/write your database. Change to production rules before deployment.
7. Click "Enable"

## Step 3: Add Web App to Firebase

1. In Firebase Console, click the gear icon (Project Settings)
2. Scroll down to "Your apps" section
3. Click the web icon (</>) to add a web app
4. Enter app name: `SmartVehiclesConnectAI Web`
5. **Do not** check "Also set up Firebase Hosting for this app"
6. Click "Register app"
7. Firebase will provide configuration code like this:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

8. Copy this configuration

## Step 4: Update Firebase Configuration

1. Open `frontend/src/firebase.js`
2. Replace the placeholder values with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 5: Set Database Security Rules

For development (test mode), Firebase provides default rules. For production, update rules in Firebase Console:

1. Go to Realtime Database → Rules
2. Replace with production rules:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "locations": {
      "$trackerId": {
        ".read": "auth != null && auth.uid == $trackerId",
        ".write": "auth != null && auth.uid == $trackerId"
      }
    },
    "emergencies": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "sensors": {
      "$trackerId": {
        ".read": "auth != null && auth.uid == $trackerId",
        ".write": "auth != null && auth.uid == $trackerId"
      }
    },
    "driverStatus": {
      "$trackerId": {
        ".read": "auth != null && auth.uid == $trackerId",
        ".write": "auth != null && auth.uid == $trackerId"
      }
    }
  }
}
```

## Step 6: Test GPS Tracking

1. Start the frontend: `npm run dev`
2. Open the application in your browser
3. Navigate to Dashboard
4. Click "Start Tracking" button
5. Grant GPS permission when prompted
6. Check Firebase Console → Realtime Database → Data
7. You should see location data appearing under `locations/tracker_xxx`

## Step 7: Test SOS Button

1. Ensure GPS tracking is active
2. Click the "SOS" button on Dashboard
3. Check Firebase Console → Realtime Database → Data
4. You should see emergency data under `emergencies`

## Database Structure

The system uses this Firebase Realtime Database structure:

```
roadguardianai/
├── locations/
│   └── tracker_xxx/
│       ├── latitude
│       ├── longitude
│       ├── accuracy
│       ├── speed
│       ├── heading
│       ├── timestamp
│       └── trackerId
├── emergencies/
│   └── emergency_xxx/
│       ├── emergencyId
│       ├── latitude
│       ├── longitude
│       ├── accuracy
│       ├── speed
│       ├── severity
│       ├── description
│       ├── trackerId
│       ├── timestamp
│       ├── createdAt
│       └── status
├── sensors/
│   └── tracker_xxx/
│       ├── accelerometer
│       ├── gyroscope
│       ├── impact
│       ├── sudden_braking
│       ├── sudden_acceleration
│       ├── abnormal_rotation
│       └── timestamp
└── driverStatus/
    └── tracker_xxx/
        ├── drowsiness_level
        ├── eye_state
        ├── blink_rate
        ├── yawning
        ├── head_pose
        ├── fatigue_score
        ├── distraction
        └── timestamp
```

## Important Notes

### HTTPS Requirement
- Geolocation API requires HTTPS in production
- For local development, `localhost` works without HTTPS
- For deployment, use Vercel, Firebase Hosting, or any HTTPS-enabled platform

### GPS Permission
- Users must explicitly grant location permission
- Browser will prompt for permission on first use
- Users can revoke permission at any time

### Privacy Considerations
- Location data is stored in Firebase
- Implement proper authentication before production deployment
- Use Firebase Security Rules to control access
- Never expose private keys in frontend code

### Testing on Mobile
- Open the deployed HTTPS URL on your phone
- Chrome/Edge on Android support geolocation
- Safari on iOS supports geolocation
- Ensure location services are enabled on device

## Troubleshooting

### Location not updating in Firebase
- Check browser console for errors
- Verify Firebase configuration is correct
- Ensure GPS permission is granted
- Check if tracking is enabled (green indicator)

### Firebase connection errors
- Verify API key is correct
- Check if Realtime Database is enabled
- Ensure database URL is correct
- Check network connectivity

### GPS permission denied
- User may have denied permission
- Check browser settings → Location permissions
- Try requesting permission again
- Some browsers require HTTPS for geolocation

## Next Steps

After completing Firebase setup:
1. Implement Firebase Authentication (optional but recommended)
2. Create emergency dashboard page for monitoring
3. Add real-time map updates from Firebase
4. Deploy to Vercel or Firebase Hosting with HTTPS
