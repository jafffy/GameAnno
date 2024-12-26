# GameAnno

GameAnno is a tool for annotating interactive elements in video game screenshots. It provides both desktop (Python) and web-based versions with similar functionality.

## Project Structure

```
GameAnno/
├── python/                  # Desktop version (Python/PyQt6)
│   ├── main.py             # Main application file
│   ├── config.py           # Configuration and constants
│   └── requirements.txt    # Python dependencies
│
└── web/                    # Web version (Node.js/React)
    ├── client/             # Frontend React application
    │   ├── src/            # React source code
    │   └── public/         # Static files
    ├── server/             # Backend Node.js server
    │   └── src/            # Server source code
    └── package.json        # Root package.json
```

## Desktop Version (Python)

The desktop version is built with Python and PyQt6, providing a native application experience.

### Features
- Load and annotate game screenshots or images
- Draw bounding boxes around interactive elements
- Categorize elements with predefined categories
- Add interaction types and notes
- Export annotations in JSON format
- Autosave functionality

### Setup
```bash
cd python
pip install -r requirements.txt
python main.py
```

## Web Version (Node.js/React)

The web version provides the same functionality in a browser-based interface.

### Features
- Upload and annotate game screenshots or images
- Interactive bounding box drawing
- Same categorization and annotation system as desktop version
- Responsive design for various screen sizes
- Real-time preview of annotations

### Setup
```bash
cd web
npm run install-all
npm start
```

## Common Features

Both versions share:
- Same annotation format
- Identical categories and interaction types
- Similar export structure
- Image resizing to maintain consistent dimensions
- Support for various image formats

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 