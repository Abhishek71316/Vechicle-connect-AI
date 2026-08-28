import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncio
import unittest
import httpx
from app.main import app

class TestPhoneGPSAsync(unittest.TestCase):
    def test_all_endpoints(self):
        async def run_async_tests():
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
                # 1. Health check
                r1 = await client.get("/health")
                self.assertEqual(r1.status_code, 200)
                self.assertEqual(r1.json(), {"status": "healthy"})

                # 2. GPS Health check
                r2 = await client.get("/api/health")
                self.assertEqual(r2.status_code, 200)
                self.assertEqual(r2.json()["status"], "healthy")

                # 3. Initial latest location check
                r3 = await client.get("/api/location/latest")
                self.assertEqual(r3.status_code, 200)
                self.assertEqual(r3.json()["status"], "no_data")

                # 4. Post location data
                gps_payload = {
                    "latitude": 12.9716,
                    "longitude": 77.5946,
                    "accuracy": 4.2,
                    "speed": 12.0,
                    "heading": 180.0,
                    "timestamp": "2026-08-21T12:00:00Z",
                    "vehicle_id": "vehicle-test-1"
                }
                r4 = await client.post("/api/location", json=gps_payload)
                self.assertEqual(r4.status_code, 200)
                self.assertEqual(r4.json()["status"], "success")

                # 5. Check latest location after update
                r5 = await client.get("/api/location/latest")
                self.assertEqual(r5.status_code, 200)
                self.assertEqual(r5.json()["latitude"], 12.9716)

                # 6. Post accident data
                acc_payload = {
                    "latitude": 12.9716,
                    "longitude": 77.5946,
                    "impact_magnitude": 5.2,
                    "timestamp": "2026-08-21T12:05:00Z",
                    "vehicle_id": "vehicle-test-1"
                }
                r6 = await client.post("/api/accident", json=acc_payload)
                self.assertEqual(r6.status_code, 200)
                self.assertEqual(r6.json()["status"], "success")

        asyncio.run(run_async_tests())

if __name__ == "__main__":
    unittest.main()
