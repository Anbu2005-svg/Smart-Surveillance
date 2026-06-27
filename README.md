# CCTV Surveillance Frontend

A modern React + TypeScript + Tailwind CSS frontend for real-time CCTV object detection and surveillance monitoring.

## Features

- **Real-time Video Monitoring**: Display live video feeds with object detection
- **Detection Visualization**: Bounding boxes with class labels and confidence scores
- **Stream Management**: Select and manage multiple video streams
- **Detection Panel**: View detailed detection information in a scrollable panel
- **System Status**: Monitor backend health and GPU availability
- **Responsive Design**: Works on desktop and tablet devices
- **Dark Theme**: Professional dark UI optimized for surveillance centers

## Project Structure

```
src/
├── components/          # Reusable React components
│   ├── StatusBar.tsx   # System health status display
│   ├── VideoFeed.tsx   # Video display with bounding boxes
│   └── DetectionPanel.tsx # Detection list and details
├── pages/              # Page components
│   └── Dashboard.tsx   # Main dashboard page
├── services/           # API communication
│   └── api.ts         # Backend API client
├── hooks/             # Custom React hooks
│   └── useApi.ts      # Data fetching hooks
├── types/             # TypeScript type definitions
│   └── index.ts       # Type interfaces
├── utils/             # Utility functions
│   └── helpers.ts     # Formatting and styling helpers
├── styles/            # Global styles
│   └── globals.css    # Tailwind CSS imports
├── App.tsx            # Root component
└── main.tsx           # React entry point
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file for environment variables:
```
VITE_API_URL=http://localhost:5000/api
```

## Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Build

Create a production build:
```bash
npm run build
```

## API Integration

The frontend communicates with a Python Flask/FastAPI backend via REST API:

### Available Endpoints

- `GET /api/streams` - Get list of available video streams
- `GET /api/detections/{streamId}` - Get current detections
- `POST /api/detection/start/{streamId}` - Start detection
- `POST /api/detection/stop/{streamId}` - Stop detection
- `GET /api/health` - Check backend health status
- `GET /api/statistics` - Get detection statistics

## Technologies

- **React 18**: UI framework
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Lightning-fast build tool
- **Axios**: HTTP client for API calls
- **Lucide React**: Beautiful icon library

## Features in Detail

### StatusBar
- Shows backend connection status
- Displays GPU availability
- Real-time health monitoring

### VideoFeed
- Displays streaming video frames
- Renders bounding boxes for detected objects
- Shows confidence scores and class labels
- Color-coded boxes by object class
- Loading state with spinner

### DetectionPanel
- Lists all detections in current frame
- Shows confidence percentage
- Displays bounding box coordinates
- Color-coded borders matching video feed
- Scrollable for many detections

### Dashboard
- Video stream selection grid
- Start/Stop detection buttons
- Real-time detection updates
- Multi-stream support
- Responsive layout

## Configuration

### Vite Config
- Development server on port 3000
- API proxy to backend (localhost:5000)
- React Fast Refresh enabled

### TypeScript Config
- ES2020 target
- Strict mode enabled
- JSX support
- DOM types included

### Tailwind CSS
- Dark theme optimized
- Custom scrollbar styling
- Animation support
- Responsive grid system
