#!/usr/bin/env python3
"""
Local monitoring agent.

Features:
- Runs the user's OpenCV + YOLO detection loop (face/eye/object)
- Streams an MJPEG endpoint at /stream on port 8081 so the frontend can display the monitor feed
- POSTs structured monitoring events to the Node backend at /api/monitoring-event

Usage:
  python scripts/monitoring_agent.py --session-id <SESSION_ID> [--node-host HOST] [--node-port PORT]

Notes:
- This agent is intended to run on the candidate's machine alongside the browser. The frontend can display the monitor stream
  by pointing an <img> tag at http://localhost:8081/stream (or set NEXT_PUBLIC_MONITOR_STREAM_URL accordingly).
"""
import argparse
import threading
import time
import io
import json
import requests
from http import server
from socketserver import ThreadingMixIn

import os
import logging
from logging.handlers import RotatingFileHandler
import cv2
import numpy as np
try:
    from ultralytics import YOLO
except Exception:
    YOLO = None

# Optional socket.io client so the agent can wait for a start signal
try:
    import socketio
except Exception:
    socketio = None

# -------------------------------
# Configuration
# -------------------------------
DEFAULT_NODE_HOST = 'localhost'
DEFAULT_NODE_PORT = 5000
STREAM_PORT = 8001

# Globals for MJPEG stream
latest_frame = None
frame_lock = threading.Lock()

# Setup module-level logger (file + stdout)
LOG_PATH = os.path.join(os.path.dirname(__file__), 'monitoring_agent.log')
logger = logging.getLogger('monitoring_agent')
if not logger.handlers:
    logger.setLevel(logging.DEBUG)
    fh = RotatingFileHandler(LOG_PATH, maxBytes=1024 * 1024, backupCount=3, encoding='utf-8')
    fh.setLevel(logging.DEBUG)
    fmt = logging.Formatter('%(asctime)s %(levelname)s [%(threadName)s] %(message)s')
    fh.setFormatter(fmt)
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    ch.setFormatter(logging.Formatter('%(levelname)s: %(message)s'))
    logger.addHandler(fh)
    logger.addHandler(ch)


def post_event(node_host, node_port, session_id, event_type, details=None, timestamp=None, max_attempts=5):
    """Post an event with simple retry/backoff and deduplication.

    To reduce noise we dedupe identical events for a short window.
    """
    url = f'http://{node_host}:{node_port}/api/monitoring-event'
    payload = {
        'sessionId': session_id,
        'eventType': event_type,
        'details': details or {},
        'timestamp': timestamp or time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }

    # Dedupe key
    dedupe_key = f"{event_type}:{json.dumps(payload['details'], sort_keys=True)}"
    now_ts = time.time()
    dedupe_window = 10.0  # seconds

    # in-memory dedupe map (module-scoped)
    if not hasattr(post_event, '_last_sent'):
        post_event._last_sent = {}

    last = post_event._last_sent.get(dedupe_key)
    if last and (now_ts - last) < dedupe_window:
        # Skip sending duplicate event within dedupe window
        # print(f"[DEDUPE] Skipping duplicate event {event_type}")
        return

    attempt = 0
    backoff = 0.5
    while attempt < max_attempts:
        try:
            resp = requests.post(url, json=payload, timeout=5)
            if resp.status_code == 200:
                post_event._last_sent[dedupe_key] = now_ts
                return
            else:
                logger.warning("Failed to post event %s: %s %s", event_type, resp.status_code, resp.text)
        except Exception as e:
            logger.debug("Could not post event (attempt %d): %s", attempt + 1, e, exc_info=False)

        attempt += 1
        time.sleep(backoff)
        backoff = min(backoff * 2, 8)

    # If all attempts failed, optionally store to local queue or disk (not implemented)
    logger.error("Giving up posting event %s after %d attempts", event_type, max_attempts)


class MJPEGHandler(server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != '/stream':
            self.send_response(404)
            self.end_headers()
            return

        self.send_response(200)
        self.send_header('Age', '0')
        self.send_header('Cache-Control', 'no-cache, private')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=FRAME')
        self.end_headers()

        try:
            while True:
                with frame_lock:
                    if latest_frame is None:
                        # send a tiny heartbeat image or wait
                        time.sleep(0.1)
                        continue
                    _, jpeg = cv2.imencode('.jpg', latest_frame)
                    frame_bytes = jpeg.tobytes()

                self.wfile.write(b'--FRAME\r\n')
                self.send_header('Content-Type', 'image/jpeg')
                self.send_header('Content-Length', str(len(frame_bytes)))
                self.end_headers()
                self.wfile.write(frame_bytes)
                self.wfile.write(b'\r\n')
                time.sleep(0.05)
        except BrokenPipeError:
            return
        except Exception as e:
            logger.exception("MJPEG stream error: %s", e)


class ThreadedHTTPServer(ThreadingMixIn, server.HTTPServer):
    allow_reuse_address = True


def start_mjpeg_server(port=STREAM_PORT):
    srv = ThreadedHTTPServer(('0.0.0.0', port), MJPEGHandler)
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    logger.info("Started MJPEG stream on http://localhost:%d/stream", port)
    return srv


def detection_loop(node_host, node_port, session_id, start_event=None):
    global latest_frame

    # Load models (graceful if ultralytics not installed or model missing)
    model = None
    objects_of_interest = ['cell phone', 'book']
    # default model path in scripts/
    default_model_path = os.path.join(os.path.dirname(__file__), 'yolov8n.pt')
    model_path = getattr(detection_loop, '_model_path', default_model_path)
    if YOLO is None:
        print('[MODEL] ultralytics not installed; object detection disabled')
    else:
        try:
            if os.path.exists(model_path):
                model = YOLO(model_path)
                print(f"[MODEL] Loaded YOLO model from: {model_path}")
            else:
                print(f"[MODEL] Model file not found at {model_path}; object detection disabled")
        except Exception as e:
            print(f"[MODEL] Failed to load YOLO model: {e}; object detection disabled")

    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

    # Wait until a start signal is received before opening the camera (if a start_event is provided)
    if start_event is not None:
        logger.info('Waiting for start signal to open camera...')
        start_event.wait()  # block until event set

    # Keep trying to open the camera indefinitely (don't exit the agent if camera is busy)
    cap = None
    while True:
        try:
            cap = cv2.VideoCapture(0)
            if cap is not None and cap.isOpened():
                break
            logger.warning('Camera device 0 not opened immediately; retrying in 1s...')
            try:
                if cap is not None:
                    cap.release()
            except Exception:
                pass
            time.sleep(1.0)
        except Exception as e:
            logger.exception('Exception while attempting to open camera: %s', e)
            time.sleep(1.0)

    no_eye_contact_start = None
    violation_count = 0
    VIOLATION_THRESHOLD = 5  # seconds

    try:
        while True:
            if cap is None:
                # try to reopen camera
                try:
                    cap = cv2.VideoCapture(0)
                    if not cap.isOpened():
                        logger.debug('Reopen attempt failed; sleeping...')
                        time.sleep(1.0)
                        continue
                except Exception as e:
                    logger.exception('Error reopening camera: %s', e)
                    time.sleep(1.0)
                    continue

            ret, frame = cap.read()
            if not ret:
                time.sleep(0.1)
                continue

            frame = cv2.flip(frame, 1)
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            faces = face_cascade.detectMultiScale(gray, 1.3, 5)
            eyes_detected = False

            for (x, y, w, h) in faces:
                roi_gray = gray[y:y + h, x:x + w]
                roi_color = frame[y:y + h, x:x + w]
                eyes = eye_cascade.detectMultiScale(roi_gray)
                for (ex, ey, ew, eh) in eyes:
                    eyes_detected = True

            current_time = time.time()
            if not eyes_detected:
                if no_eye_contact_start is None:
                    no_eye_contact_start = current_time
                elif current_time - no_eye_contact_start > VIOLATION_THRESHOLD:
                    violation_count += 1
                    logger.info('No eye contact for %ds (Total: %d)', VIOLATION_THRESHOLD, violation_count)
                    try:
                        post_event(node_host, node_port, session_id, 'no_eye_contact', {'duration_seconds': VIOLATION_THRESHOLD})
                    except Exception:
                        logger.debug('post_event failed for no_eye_contact (continuing)')
                    no_eye_contact_start = current_time
            else:
                no_eye_contact_start = None

            if len(faces) > 1:
                logger.warning('Multiple people detected! (%d faces on screen)', len(faces))
                try:
                    post_event(node_host, node_port, session_id, 'multiple_people', {'count': len(faces)})
                except Exception:
                    logger.debug('post_event failed for multiple_people (continuing)')

            # Object detection ignoring face regions
            mask = np.ones(frame.shape[:2], dtype=np.uint8) * 255
            for (x, y, w, h) in faces:
                mask[y:y + h, x:x + w] = 0
            frame_for_detection = cv2.bitwise_and(frame, frame, mask=mask)

            objects_found = []
            if model is not None:
                try:
                    results = model.predict(frame_for_detection, verbose=False)
                    for r in results:
                        for box in r.boxes:
                            cls_id = int(box.cls[0])
                            conf = float(box.conf[0])
                            label = model.names[cls_id]
                            if label in objects_of_interest and conf > 0.5:
                                x1, y1, x2, y2 = map(int, box.xyxy[0])
                                w_box, h_box = x2 - x1, y2 - y1
                                if w_box * h_box < 2000:
                                    continue
                                overlap = False
                                for (fx, fy, fw, fh) in faces:
                                    if x1 < fx + fw and x2 > fx and y1 < fy + fh and y2 > fy:
                                        overlap = True
                                        break
                                if overlap:
                                    continue
                                objects_found.append({'label': label, 'confidence': conf, 'bbox': [x1, y1, x2, y2]})
                except Exception as e:
                    print(f"[MODEL] Detection error: {e}")

            if objects_found:
                logger.info('Objects detected: %s', objects_found)
                try:
                    post_event(node_host, node_port, session_id, 'object_detected', {'objects': objects_found})
                except Exception:
                    logger.debug('post_event failed for object_detected (continuing)')

            # Also periodically post a low-cost heartbeat/frame summary (throttled)
            try:
                if not hasattr(detection_loop, '_last_frame_post'):
                    detection_loop._last_frame_post = 0
                if time.time() - detection_loop._last_frame_post > 2.0:  # every 2s
                    # Prepare a very small thumbnail base64 to reduce payload if desired
                    with frame_lock:
                        small = cv2.resize(frame, (320, 180))
                        _, jpg = cv2.imencode('.jpg', small, [int(cv2.IMWRITE_JPEG_QUALITY), 50])
                        b64 = jpg.tobytes().hex()
                    # post lightweight frame (hex) to server for optional analysis
                    try:
                        url = f'http://{node_host}:{node_port}/api/monitoring-frame'
                        requests.post(url, json={
                            'sessionId': session_id,
                            'image_base64': b64,
                            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                        }, timeout=3)
                    except Exception as e:
                        logger.debug('Failed to post monitoring-frame: %s', e)
                    detection_loop._last_frame_post = time.time()
            except Exception:
                pass

            # Update latest frame for MJPEG
            with frame_lock:
                latest_frame = frame.copy()

            # small sleep to limit CPU usage
            time.sleep(0.03)

    except KeyboardInterrupt:
        logger.info('Stopping monitoring agent (KeyboardInterrupt)')
    except Exception as e:
        logger.exception('Unexpected error in detection loop: %s', e)
    finally:
        try:
            if cap is not None:
                cap.release()
        except Exception:
            pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--session-id', required=True, help='Session ID to attach events to')
    parser.add_argument('--node-host', default=DEFAULT_NODE_HOST, help='Node backend host')
    parser.add_argument('--node-port', default=DEFAULT_NODE_PORT, type=int, help='Node backend port')
    parser.add_argument('--stream-port', default=STREAM_PORT, type=int, help='Local MJPEG stream port')
    parser.add_argument('--model-path', default=os.path.join(os.path.dirname(__file__), 'yolov8n.pt'), help='Path to YOLO model file (.pt)')
    args = parser.parse_args()

    start_mjpeg_server(port=args.stream_port)
    # attach model_path to function so detection_loop can see it
    detection_loop._model_path = args.model_path

    # Create an event that will be set when the server tells us to start monitoring
    start_event = threading.Event()

    # If socketio is available, connect and join the session room to wait for start signal
    if socketio is not None:
        def _socket_thread():
            sio = socketio.Client(reconnection=True)

            @sio.event
            def connect():
                print('[SOCKET] Connected to Node backend via Socket.IO')
                try:
                    # join the session room so server can emit to this agent
                    sio.emit('join-session', args.session_id)
                except Exception as e:
                    print(f"[SOCKET] Failed to join session room: {e}")

            @sio.on('start-monitoring')
            def on_start_monitoring(data):
                try:
                    sid = data.get('sessionId') if isinstance(data, dict) else None
                    print(f"[SOCKET] Received start-monitoring event: {data}")
                    # If session matches (or server doesn't supply one), set event
                    if sid is None or sid == args.session_id:
                        start_event.set()
                except Exception as e:
                    print(f"[SOCKET] Error handling start-monitoring: {e}")

            try:
                sio.connect(f'http://{args.node_host}:{args.node_port}', namespaces=['/'])
                sio.wait()
            except Exception as e:
                print(f"[SOCKET] Socket.IO connection error: {e}. Proceeding without remote start and starting immediately.")
                try:
                    # If connection fails, ensure the agent doesn't block waiting for start
                    start_event.set()
                except Exception:
                    pass

        st = threading.Thread(target=_socket_thread, daemon=True)
        st.start()
    else:
        print('[SOCKET] python-socketio not installed; agent will start immediately. To enable remote start, install python-socketio in the venv.')
        # In absence of socketio support, start immediately
        start_event.set()

    # Run detection loop in a background thread so MJPEG server remains active
    t = threading.Thread(target=detection_loop, args=(args.node_host, args.node_port, args.session_id, start_event), daemon=True)
    t.start()

    try:
        # Keep main thread alive while background threads run
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info('Stopping monitoring agent...')
        try:
            # give background thread a moment to cleanup
            t.join(timeout=1)
        except Exception:
            pass
    except Exception as e:
        logger.exception('Uncaught exception in main: %s', e)


if __name__ == '__main__':
    main()
