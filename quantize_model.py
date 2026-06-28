#!/usr/bin/env python3
"""Create a dynamic INT8 ONNX model for low-memory CPU deployments."""

import os
from pathlib import Path

from onnxruntime.quantization import QuantType, quantize_dynamic


def main() -> None:
    source = Path(os.getenv("QUANTIZE_SOURCE_MODEL", "CCTV/best.onnx"))
    target = Path(os.getenv("QUANTIZE_TARGET_MODEL", "CCTV/best-int8.onnx"))

    if not source.exists():
        raise FileNotFoundError(f"Source model not found: {source}")

    target.parent.mkdir(parents=True, exist_ok=True)
    quantize_dynamic(
        model_input=str(source),
        model_output=str(target),
        weight_type=QuantType.QInt8,
    )
    print(f"Quantized model written to {target}")


if __name__ == "__main__":
    main()
