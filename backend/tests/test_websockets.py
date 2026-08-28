import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncio
import json
import websockets
import uvicorn
import multiprocessing
import time
from app.main import app

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8999, log_level="error")

async def test_ws_flow():
    server_process = multiprocessing.Process(target=run_server, daemon=True)
    server_process.start()
    time.sleep(1.5)  # Wait for uvicorn to boot up

    try:
        phone_uri = "ws://127.0.0.1:8999/ws/phone"
        dash_uri = "ws://127.0.0.1:8999/ws/dashboard"

        async with websockets.connect(dash_uri) as ws_dash:
            async with websockets.connect(phone_uri) as ws_phone:
                gps_data = {
                    "latitude": 37.7749,
                    "longitude": -122.4194,
                    "accuracy": 3.5,
                    "speed": 22.4,
                    "heading": 90.0,
                    "timestamp": "2026-08-21T12:00:00Z",
                    "vehicle_id": "car-ws-1"
                }
                await ws_phone.send(json.dumps(gps_data))
                ack = await ws_phone.recv()
                ack_json = json.loads(ack)
                assert ack_json["status"] == "received"

                dash_msg = await ws_dash.recv()
                dash_json = json.loads(dash_msg)
                assert dash_json["type"] == "location_update"
                assert dash_json["data"]["latitude"] == 37.7749
                print("WebSocket E2E test passed successfully!")

    finally:
        server_process.terminate()
        server_process.join()

if __name__ == "__main__":
    asyncio.run(test_ws_flow())
