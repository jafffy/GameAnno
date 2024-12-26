# GameAnno Web

A web-based version of GameAnno - Video Game Annotation Tool. This version provides similar functionality to the desktop version but runs in a web browser.

## Features

- Upload and annotate game screenshots or images
- Draw bounding boxes around interactive elements
- Categorize elements with predefined categories
- Add interaction types and notes
- Export annotations in JSON format
- Responsive design that works on various screen sizes

## Tech Stack

- **Frontend**: React.js with Material-UI and react-konva for canvas manipulation
- **Backend**: Node.js with Express
- **Image Processing**: Sharp for image resizing and optimization

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd gameanno-web
   ```

2. Install dependencies:
   ```bash
   npm run install-all
   ```

   This will install dependencies for:
   - Root project
   - Backend server
   - Frontend client

## Development

1. Start both frontend and backend in development mode:
   ```bash
   npm start
   ```

   This will start:
   - Backend server on port 5000
   - Frontend development server on port 3000

2. Open your browser and navigate to `http://localhost:3000`

## Building for Production

1. Build the frontend:
   ```bash
   cd client
   npm run build
   ```

2. The built files will be in the `client/build` directory

## Project Structure

```
web/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── constants.js   # Shared constants
│   │   ├── App.js         # Main application component
│   │   └── index.js       # Application entry point
│   └── package.json
├── server/                 # Backend Node.js server
│   ├── src/
│   │   └── index.js       # Server entry point
│   └── package.json
└── package.json           # Root package.json for running both services
```

## Usage

1. Launch the application
2. Click "Upload Image" or drag and drop an image file
3. Draw bounding boxes around interactive elements by clicking and dragging
4. Fill in the annotation details in the dialog:
   - Select categories
   - Mark as interactive if applicable
   - Choose interaction types
   - Add notes
5. Click "Export" to save annotations

## Export Format

Annotations are exported in the following format:
```json
{
  "scene_id": "scene_001",
  "timestamp": "20231226_141544",
  "image_size": {
    "width": 1280,
    "height": 720
  },
  "annotations": [
    {
      "bounding_box_id": "box_1",
      "coordinates": [x1, y1, x2, y2],
      "categories": ["Category 1", "Category 2"],
      "is_interactive": true,
      "interaction_type": ["Type 1", "Type 2"],
      "notes": "Additional information"
    }
  ]
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 