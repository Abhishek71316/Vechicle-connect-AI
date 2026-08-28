import { useEffect, useState } from "react";

const initialData = {
  device_id: "RG-001",
  accel_x: 0,
  accel_y: 0,
  accel_z: 1.0,
  total_g: 1.0,
  impact: false,
  alert_active: false,
  timestamp: null,
  hasData: false
};

export default function useESP32Telemetry() {
  const [data, setData] = useState(initialData);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let timer = null;

    async function fetchTelemetry() {
      const hostname = window.location.hostname || "localhost";
      const targetUrls = [
        `http://${hostname}:5000/api/esp32?t=${Date.now()}`,
        `/api/esp32?t=${Date.now()}`,
        `http://${hostname}:8000/api/esp32?t=${Date.now()}`
      ];

      let success = false;

      for (const targetUrl of targetUrls) {
        if (!isMounted) return;

        try {
          const response = await fetch(targetUrl, {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" }
          });

          if (!response.ok) {
            continue;
          }

          const result = await response.json();
          if (!isMounted) return;

          const raw = result.data || result;

          if (raw && (raw.hasData !== false || raw.accel_x !== undefined || raw.ax !== undefined)) {
            const accel_x = Number(raw.accel_x ?? raw.ax ?? raw.x ?? 0);
            const accel_y = Number(raw.accel_y ?? raw.ay ?? raw.y ?? 0);
            const accel_z = Number(raw.accel_z ?? raw.az ?? raw.z ?? 1.0);
            const total_g = Number(raw.total_g ?? raw.totalG ?? raw.total ?? Math.sqrt(accel_x*accel_x + accel_y*accel_y + accel_z*accel_z));
            const impact = Boolean(raw.impact);
            const alert_active = Boolean(raw.alert_active !== undefined ? raw.alert_active : raw.emergency);

            const normalizedData = {
              device_id: raw.device_id || "RG-001",
              accel_x: accel_x,
              accel_y: accel_y,
              accel_z: accel_z,
              total_g: total_g,
              impact: impact,
              alert_active: alert_active,
              timestamp: raw.timestamp || raw.lastUpdate || new Date().toISOString(),
              hasData: true
            };

            setData(normalizedData);
            setConnected(true);
            setError(null);
            success = true;
            break;
          }
        } catch (err) {
          // Continue to next URL
        }
      }

      if (!success && isMounted) {
        setConnected(false);
        setError("Connection unavailable");
      }

      if (isMounted) {
        timer = setTimeout(fetchTelemetry, 500);
      }
    }

    fetchTelemetry();

    return () => {
      isMounted = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  return {
    data,
    connected,
    error
  };
}
