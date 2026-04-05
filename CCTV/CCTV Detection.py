import os
os.environ["ORT_PROVIDERS"] = "cpuExecutionProvider"

import streamlit as st
from ultralytics import YOLO
import cv2

# Load model
model = YOLO("best.onnx", task="detect")

IMG_SIZE = 640  # updated

# Class ID → Name (must match training order)
CLASS_NAMES = {
    0: "fire",
    1: "intruder", 
    2: "weapon"
}

# Optimized thresholds based on processed dataset
CLASS_THRESHOLDS = {
    0: 0.35,  # fire
    1: 0.30,  # intruder
    2: 0.45   # weapon
}

st.title("Real-Time Fire, Intruder & Weapon Detection (YOLO ONNX)")

cap = cv2.VideoCapture(0)

if not cap.isOpened():
    st.error("Could not open video stream.")
else:
    stframe = st.empty()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        results = model.predict(
            source=frame,
            imgsz=IMG_SIZE,
            conf=0.25,   # global minimum confidence
            iou=0.45,
            verbose=False
        )

        annotated = frame.copy()
        result = results[0]

        if result.boxes is not None:
            for box in result.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])

                if cls_id not in CLASS_NAMES:
                    continue

                if conf < CLASS_THRESHOLDS[cls_id]:
                    continue

                cls_name = CLASS_NAMES[cls_id]
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                label = f"{cls_name} {conf:.2f}"

                cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(
                    annotated,
                    label,
                    (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 255, 0),
                    2
                )

        annotated_rgb = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)
        stframe.image(annotated_rgb, channels="RGB", width=800)

    cap.release()
    cv2.destroyAllWindows()
