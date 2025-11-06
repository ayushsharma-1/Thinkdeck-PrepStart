#!/usr/bin/env python3
"""
Quick local tester to verify webcam access and YOLO model availability.

Usage:
  python scripts/check_camera_and_model.py --model-path ./scripts/yolov8n.pt

What it does:
- Tries to open the default webcam (device 0) and grab a single frame.
- Prints frame dimensions and saves a sample image to ./scripts/sample_frame.jpg
- Checks that the YOLO model file exists at the provided path and attempts to load it with ultralytics.YOLO
"""
import argparse
import os
import sys
import time

try:
    import cv2
except Exception as e:
    print("OpenCV is not installed or failed to import:", e)
    sys.exit(1)

try:
    from ultralytics import YOLO
except Exception:
    YOLO = None


def check_camera(device=0, timeout=5):
    print(f"Checking camera device {device}...")
    cap = cv2.VideoCapture(device)
    start = time.time()
    while time.time() - start < timeout:
        if cap is None or not cap.isOpened():
            time.sleep(0.2)
            cap = cv2.VideoCapture(device)
            continue
        ret, frame = cap.read()
        if not ret:
            print("Failed to read frame from camera; retrying...")
            time.sleep(0.2)
            continue
        h, w = frame.shape[:2]
        print(f"Camera opened. Frame size: {w}x{h}")
        sample_path = os.path.join(os.path.dirname(__file__), 'sample_frame.jpg')
        cv2.imwrite(sample_path, frame)
        print(f"Saved sample frame to: {sample_path}")
        cap.release()
        return True
    print("Could not open/read from camera. Check permissions or whether another app is using the camera.")
    try:
        cap.release()
    except Exception:
        pass
    return False


def check_model(path):
    print(f"Checking model file at: {path}")
    if not os.path.isabs(path):
        path = os.path.abspath(path)
    if not os.path.exists(path):
        print("Model file not found.")
        return False
    print("Model file exists. Attempting to load with ultralytics.YOLO if available...")
    if YOLO is None:
        print("ultralytics not available; skipping model load test. Install via pip install ultralytics")
        return True
    try:
        model = YOLO(path)
        print("Model loaded successfully.")
        return True
    except Exception as e:
        print("Failed to load model:", e)
        return False


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--model-path', default=os.path.join(os.path.dirname(__file__), 'yolov8n.pt'), help='Path to YOLO model file')
    parser.add_argument('--camera-device', type=int, default=0, help='Camera device index')
    args = parser.parse_args()

    cam_ok = check_camera(args.camera_device)
    model_ok = check_model(args.model_path)

    if cam_ok and model_ok:
        print('\nOK: Camera and model are available.')
        sys.exit(0)
    else:
        print('\nERROR: One or more checks failed.')
        sys.exit(2)
