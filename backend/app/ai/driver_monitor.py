# Smart Vehicles connect AI - Driver Monitoring System
# Upgraded with dlib 68-landmark predictor & Driver Drowsiness Detection model

import os
import cv2
import dlib
import numpy as np
import base64
from imutils import face_utils
from typing import Dict, Optional
from datetime import datetime

class DriverMonitor:
    def __init__(self):
        # Resolve path to shape_predictor_68_face_landmarks.dat
        base_dir = os.path.dirname(__file__)
        candidate_paths = [
            os.path.join(base_dir, "models", "shape_predictor_68_face_landmarks.dat"),
            os.path.join(base_dir, "shape_predictor_68_face_landmarks.dat"),
            r"c:\Users\ashok\Downloads\shape_predictor_68_face_landmarks.dat\shape_predictor_68_face_landmarks.dat",
            r"c:\Users\ashok\Downloads\shape_predictor_68_face_landmarks.dat",
            "shape_predictor_68_face_landmarks.dat"
        ]
        
        self.predictor_path = None
        for path in candidate_paths:
            if os.path.exists(path):
                self.predictor_path = path
                break
        
        if self.predictor_path:
            print(f"[DriverMonitor] Loading 68-landmark model from: {self.predictor_path}")
            self.detector = dlib.get_frontal_face_detector()
            self.predictor = dlib.shape_predictor(self.predictor_path)
            self.haar_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        else:
            print("[DriverMonitor WARNING] shape_predictor_68_face_landmarks.dat not found!")
            self.detector = None
            self.predictor = None
            self.haar_cascade = None
            
        # State tracking based on driver_drowsiness model
        self.sleep = 0
        self.drowsy = 0
        self.active = 0
        self.status = "Active :)"
        self.color = (0, 255, 0)
        self.blink_count = 0
        self.yawn_frames = 0
        self.head_turn_frames = 0
        
        # Last state metrics
        self.last_eye_state = "OPEN"
        self.last_head_pose = "FORWARD"
        
    def compute_distance(self, ptA, ptB):
        """Compute Euclidean distance between two points"""
        return float(np.linalg.norm(ptA - ptB))
    
    def blinked(self, a, b, c, d, e, f):
        """
        Calculate eye aspect ratio from landmark points.
        a: outer corner, f: inner corner
        b, c: upper lid points
        d, e: lower lid points
        """
        up = self.compute_distance(b, d) + self.compute_distance(c, e)
        down = self.compute_distance(a, f)
        if down == 0:
            return 2
        ratio = up / (2.0 * down)

        # Classify eye state ratio
        if ratio > 0.25:
            return 2  # Eye wide open / active
        elif 0.21 < ratio <= 0.25:
            return 1  # Slightly closed / drowsy
        else:
            return 0  # Fully closed / blinked

    def detect_yawn_68(self, landmarks):
        """Detect yawning using inner mouth landmarks 60-67"""
        # Upper inner lip (62) and lower inner lip (66)
        # Left inner corner (60) and right inner corner (64)
        lip_dist = self.compute_distance(landmarks[62], landmarks[66])
        mouth_width = self.compute_distance(landmarks[60], landmarks[64]) + 1e-6
        mar = lip_dist / mouth_width
        return mar > 0.55 or lip_dist > 25.0

    def detect_head_pose_68(self, landmarks, face_box):
        """Estimate head pose using nose tip (30) and face bounding box"""
        x1, y1, x2, y2 = face_box
        face_center_x = (x1 + x2) / 2.0
        face_width = max(1, x2 - x1)
        
        nose_x = landmarks[30][0]
        offset_x = (nose_x - face_center_x) / face_width

        # Determine horizontal head direction
        if offset_x > 0.15:
            return "RIGHT"
        elif offset_x < -0.15:
            return "LEFT"

        # Check vertical pitch using nose (30) vs chin (8) and eyes (36, 45)
        eye_y = (landmarks[36][1] + landmarks[45][1]) / 2.0
        chin_y = landmarks[8][1]
        face_height = max(1, chin_y - eye_y)
        nose_y = landmarks[30][1]
        rel_nose_y = (nose_y - eye_y) / face_height

        if rel_nose_y > 0.55:
            return "DOWN"
        elif rel_nose_y < 0.25:
            return "UP"
        
        return "FORWARD"

    def analyze_frame(self, frame: np.ndarray) -> Dict:
        """Analyze frame using dlib face detector & 68 landmarks predictor"""
        if frame is None or self.detector is None or self.predictor is None:
            return self.get_default_state()
        
        try:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.detector(gray)
            
            if len(faces) == 0:
                if self.haar_cascade is not None:
                    haar_faces = self.haar_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(50, 50))
                    if len(haar_faces) > 0:
                        hx, hy, hw, hh = haar_faces[0]
                        face = dlib.rectangle(int(hx), int(hy), int(hx + hw), int(hy + hh))
                    else:
                        return self.get_default_state()
                else:
                    return self.get_default_state()
            else:
                face = faces[0]
            x1, y1, x2, y2 = face.left(), face.top(), face.right(), face.bottom()
            
            # Bounding box sanity check
            h, w = frame.shape[:2]
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)
            
            face_frame = frame.copy()
            cv2.rectangle(face_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

            # Get 68 face landmarks
            raw_landmarks = self.predictor(gray, face)
            landmarks = face_utils.shape_to_np(raw_landmarks)
            
            # Calculate blink status using 68 landmarks
            # Left eye: landmarks 36 to 41
            left_blink = self.blinked(
                landmarks[36], landmarks[37], landmarks[38],
                landmarks[41], landmarks[40], landmarks[39]
            )
            # Right eye: landmarks 42 to 47
            right_blink = self.blinked(
                landmarks[42], landmarks[43], landmarks[44],
                landmarks[47], landmarks[46], landmarks[45]
            )
            
            # Determine eye closure state & accumulation counters
            if left_blink == 0 or right_blink == 0:
                self.sleep += 1
                self.drowsy = 0
                self.active = 0
                if self.sleep >= 2:
                    self.status = "SLEEPING !!!"
                    self.color = (0, 0, 255)  # BGR Red
                    self.last_eye_state = "CLOSED"
                else:
                    self.status = "Drowsy !"
                    self.color = (0, 165, 255)
                    self.last_eye_state = "DROWSY"
            elif left_blink == 1 or right_blink == 1:
                self.sleep = 0
                self.active = 0
                self.drowsy += 1
                if self.drowsy >= 2:
                    self.status = "Drowsy !"
                    self.color = (0, 165, 255)  # BGR Orange
                    self.last_eye_state = "DROWSY"
            else:
                if self.sleep > 0:
                    self.blink_count += 1
                self.drowsy = 0
                self.sleep = 0
                self.active += 1
                if self.active >= 2:
                    self.status = "Active :)"
                    self.color = (0, 255, 0)  # BGR Green
                    self.last_eye_state = "OPEN"

            # Detect Yawning using 68 landmarks
            is_yawning = self.detect_yawn_68(landmarks)
            if is_yawning:
                self.yawn_frames += 1
            else:
                self.yawn_frames = max(0, self.yawn_frames - 1)

            # Detect Head Pose
            head_pose = self.detect_head_pose_68(landmarks, (x1, y1, x2, y2))
            self.last_head_pose = head_pose
            is_distracted = head_pose in ["LEFT", "RIGHT", "UP", "DOWN"]
            if is_distracted:
                self.head_turn_frames += 1
            else:
                self.head_turn_frames = max(0, self.head_turn_frames - 1)

            # Calculate Fatigue Score (0-100)
            fatigue_score = self.calculate_fatigue_score(
                self.sleep, self.drowsy, self.yawn_frames, self.head_turn_frames
            )
            drowsiness_level = self.determine_drowsiness_level(self.status, fatigue_score)

            # Draw status text and facial landmark points on annotated frame
            cv2.putText(face_frame, self.status, (x1, max(30, y1 - 10)),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, self.color, 3)

            # Draw 68 landmarks points
            for n in range(0, 68):
                (x, y) = landmarks[n]
                # Eye landmarks in cyan, mouth in yellow, others white
                if 36 <= n <= 47:
                    pt_color = (255, 255, 0)
                elif 48 <= n <= 67:
                    pt_color = (0, 255, 255)
                else:
                    pt_color = (255, 255, 255)
                cv2.circle(face_frame, (x, y), 2, pt_color, -1)

            # Encode annotated face frame to base64
            _, buffer = cv2.imencode('.jpg', face_frame)
            annotated_base64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

            return {
                "drowsiness_level": drowsiness_level,
                "status_text": self.status,
                "eye_state": self.last_eye_state,
                "blink_rate": self.blink_count,
                "yawning": self.yawn_frames > 5,
                "head_pose": head_pose,
                "fatigue_score": fatigue_score,
                "distraction": self.head_turn_frames > 15,
                "annotated_frame": annotated_base64,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            print(f"[DriverMonitor Exception] {str(e)}")
            return self.get_default_state()

    def calculate_fatigue_score(self, sleep_cnt: int, drowsy_cnt: int, yawn_cnt: int, turn_cnt: int) -> int:
        """Calculate overall driver fatigue score (0-100)"""
        score = 0
        score += min(sleep_cnt * 10, 50)
        score += min(drowsy_cnt * 5, 30)
        score += min(yawn_cnt * 4, 30)
        score += min(turn_cnt * 2, 20)
        return min(score, 100)

    def determine_drowsiness_level(self, status: str, fatigue_score: int) -> str:
        """Determine severity level"""
        if status == "SLEEPING !!!" or fatigue_score >= 70:
            return "CRITICAL"
        elif status == "Drowsy !" or fatigue_score >= 40:
            return "HIGH"
        elif fatigue_score >= 20:
            return "MEDIUM"
        else:
            return "LOW"

    def get_default_state(self) -> Dict:
        """Return default state when no face is detected"""
        return {
            "drowsiness_level": "UNKNOWN",
            "status_text": "No Face Detected",
            "eye_state": "UNKNOWN",
            "blink_rate": self.blink_count,
            "yawning": False,
            "head_pose": "UNKNOWN",
            "fatigue_score": 0,
            "distraction": False,
            "annotated_frame": None,
            "timestamp": datetime.now().isoformat()
        }

    def reset_state(self):
        """Reset state tracking counters"""
        self.sleep = 0
        self.drowsy = 0
        self.active = 0
        self.status = "Active :)"
        self.color = (0, 255, 0)
        self.blink_count = 0
        self.yawn_frames = 0
        self.head_turn_frames = 0
        self.last_eye_state = "OPEN"
        self.last_head_pose = "FORWARD"
