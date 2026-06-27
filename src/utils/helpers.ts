export const formatTimestamp = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch {
    return timestamp;
  }
};

export const formatConfidence = (confidence: number): string => {
  return `${(confidence * 100).toFixed(2)}%`;
};

export const getColorByClass = (detectionClass?: string): string => {
  const colors: { [key: string]: string } = {
    person: '#EF4444',
    car: '#3B82F6',
    bike: '#F97316',
    truck: '#8B5CF6',
    bus: '#EC4899',
    dog: '#14B8A6',
    cat: '#06B6D4',
  };
  if (!detectionClass) return '#6366F1';
  return colors[detectionClass.toLowerCase()] || '#6366F1';
};

export const calculateBboxStyle = (
  bbox: { x1: number; y1: number; x2: number; y2: number },
  containerWidth: number,
  containerHeight: number
) => {
  const scaleX = containerWidth / 100;
  const scaleY = containerHeight / 100;

  return {
    left: `${bbox.x1}%`,
    top: `${bbox.y1}%`,
    width: `${bbox.x2 - bbox.x1}%`,
    height: `${bbox.y2 - bbox.y1}%`,
  };
};
