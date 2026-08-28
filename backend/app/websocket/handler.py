# Smart Vehicles connect AI - WebSocket Handler
# WebSocket endpoint for real-time communication

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from .manager import manager
from ..risk_engine.calculator import RiskEngine

router = APIRouter()
risk_engine = RiskEngine()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    client_id = None
    try:
        # Accept connection
        await manager.connect(websocket, client_id)
        
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            
            # Handle different message types
            message_type = data.get('type')
            
            if message_type == 'sensor_data':
                # ESP32 sensor data
                print(f"Received sensor data from ESP32: {data}")
                # Broadcast to all frontend clients
                await manager.broadcast({
                    'type': 'sensor_update',
                    'data': data
                })
                
                # Check for impact and trigger warning
                if data.get('impact'):
                    await send_warning('accident')
                
            elif message_type == 'driver_status':
                # Driver monitoring data
                print(f"Received driver status: {data}")
                await manager.broadcast({
                    'type': 'driver_update',
                    'data': data
                })
                
                # Check for drowsiness and trigger warning
                if data.get('drowsiness_level') in ['HIGH', 'CRITICAL']:
                    await send_warning('drowsiness')
                elif data.get('distraction'):
                    await send_warning('distraction')
                
            elif message_type == 'risk_assessment':
                # Risk assessment from risk engine
                print(f"Received risk assessment: {data}")
                await manager.broadcast({
                    'type': 'risk_update',
                    'data': data
                })
                
                # Trigger warning based on risk level
                risk_level = data.get('risk_level')
                if risk_level in ['HIGH RISK', 'CRITICAL']:
                    await send_warning('high_risk')
                
            elif message_type == 'alert':
                # Alert notification
                print(f"Received alert: {data}")
                await manager.broadcast({
                    'type': 'alert',
                    'data': data
                })
                
            elif message_type == 'accident':
                # Accident detection
                print(f"Received accident: {data}")
                await manager.broadcast({
                    'type': 'accident',
                    'data': data
                })
                await send_warning('accident')
                
            elif message_type == 'warning':
                # Warning command to ESP32
                print(f"Sending warning to ESP32: {data}")
                # Broadcast to ESP32 clients
                await manager.broadcast({
                    'type': 'warning',
                    'data': data
                })
                
            elif message_type == 'stop_warning':
                # Stop warning command
                print(f"Stopping warning")
                await manager.broadcast({
                    'type': 'stop_warning',
                    'data': {}
                })
                
            elif message_type == 'button_response':
                # Button response from ESP32
                print(f"Button response: {data}")
                await manager.broadcast({
                    'type': 'button_response',
                    'data': data
                })
                
            else:
                # Echo back for testing
                await websocket.send_json({
                    'type': 'echo',
                    'data': data
                })
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)
        print("WebSocket disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket, client_id)

async def send_warning(warning_type: str):
    """Send warning command to ESP32"""
    warning_messages = {
        'drowsiness': 'Driver fatigue detected. Please take a break.',
        'distraction': 'Please keep your eyes on the road.',
        'high_risk': 'Warning. Driving risk is high.',
        'accident': 'Warning. Sudden impact risk detected.'
    }
    
    await manager.broadcast({
        'type': 'warning',
        'data': {
            'type': warning_type,
            'message': warning_messages.get(warning_type, 'Warning'),
            'timestamp': None
        }
    })

