#!/usr/bin/env python3
"""Create a CPU-compatible INT8 ONNX model for low-memory deployments."""

import os
from pathlib import Path

import numpy as np
import onnxruntime as ort
from onnxruntime.quantization import (
    CalibrationDataReader,
    CalibrationMethod,
    QuantFormat,
    QuantType,
    quantize_static,
)


class RandomFrameCalibrationReader(CalibrationDataReader):
    def __init__(self, model_path: Path, sample_count: int, image_size: int):
        session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
        input_meta = session.get_inputs()[0]
        self.input_name = input_meta.name

        shape = []
        for index, dim in enumerate(input_meta.shape):
            if isinstance(dim, int) and dim > 0:
                shape.append(dim)
            elif index == 0:
                shape.append(1)
            elif index in (2, 3):
                shape.append(image_size)
            else:
                shape.append(3)

        self.samples = []
        for _ in range(sample_count):
            frame = np.random.default_rng().uniform(0.0, 1.0, size=shape).astype(np.float32)
            self.samples.append({self.input_name: frame})
        self.index = 0

    def get_next(self):
        if self.index >= len(self.samples):
            return None
        sample = self.samples[self.index]
        self.index += 1
        return sample


def main() -> None:
    source = Path(os.getenv("QUANTIZE_SOURCE_MODEL", "CCTV/best.onnx"))
    target = Path(os.getenv("QUANTIZE_TARGET_MODEL", "CCTV/best-int8.onnx"))
    sample_count = int(os.getenv("QUANTIZE_CALIBRATION_SAMPLES", "8"))
    image_size = int(os.getenv("INFERENCE_IMGSZ", "640"))

    if not source.exists():
        raise FileNotFoundError(f"Source model not found: {source}")

    target.parent.mkdir(parents=True, exist_ok=True)

    # Dynamic quantization can emit ConvInteger nodes that are not implemented
    # by the CPU runtime used on Render. QDQ static quantization keeps the graph
    # compatible with the standard CPUExecutionProvider.
    quantize_static(
        model_input=str(source),
        model_output=str(target),
        calibration_data_reader=RandomFrameCalibrationReader(source, sample_count, image_size),
        quant_format=QuantFormat.QDQ,
        activation_type=QuantType.QUInt8,
        weight_type=QuantType.QInt8,
        calibrate_method=CalibrationMethod.MinMax,
        op_types_to_quantize=["Conv", "MatMul"],
    )
    print(f"Quantized model written to {target}")


if __name__ == "__main__":
    main()
