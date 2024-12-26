# GameAnno - Video Game Annotation Tool

A Python-based GUI tool for annotating video game footage with bounding boxes and metadata.

## Features

- Load and navigate through video files frame by frame
- Draw bounding boxes around objects of interest
- Add metadata (category, interactivity, interaction types)
- Export annotations in JSON format
- Save both original and annotated frames

## Installation

1. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

1. Run the application:
```bash
python main.py
```

2. Use the interface to:
   - Load a video file
   - Navigate through frames
   - Draw bounding boxes
   - Add annotation metadata
   - Export annotations and frames

## Output Format

The tool exports three files for each annotated frame:
- `scene_XXX_frame_YYY.json`: Annotation metadata
- `scene_XXX_frame_YYY_original.png`: Original frame
- `scene_XXX_frame_YYY_annotated.png`: Frame with annotations overlaid

### JSON Format
```json
{
  "scene_id": "scene_001_frame_030",
  "annotations": [
    {
      "bounding_box_id": "box_1",
      "coordinates": [x_min, y_min, x_max, y_max],
      "category": "Door",
      "is_interactive": true,
      "interaction_type": ["open"],
      "notes": "Optional notes"
    }
  ]
}
``` 