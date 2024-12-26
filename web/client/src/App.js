import React, { useState } from 'react';
import { Box, AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import { styled } from '@mui/material/styles';
import AnnotationCanvas from './components/AnnotationCanvas';
import AnnotationDialog from './components/AnnotationDialog';
import FileUpload from './components/FileUpload';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const RootContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
});

const MainContent = styled(Container)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  padding: '20px',
  overflow: 'hidden',
});

function App() {
  const [image, setImage] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentBox, setCurrentBox] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleImageUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      setImage({
        url: `${API_URL}/uploads/${response.data.filename}`,
        width: response.data.width,
        height: response.data.height,
        filename: response.data.filename
      });
      setAnnotations([]);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    }
  };

  const handleAnnotationComplete = (box) => {
    console.log('Annotation box:', box); // Debug log
    setCurrentBox(box);
    setDialogOpen(true);
  };

  const handleAnnotationSave = (metadata) => {
    if (!currentBox) return;

    console.log('Saving annotation:', { metadata, currentBox }); // Debug log

    const newAnnotation = {
      ...metadata,
      bounding_box_id: `box_${annotations.length + 1}`,
      coordinates: [
        currentBox.x,
        currentBox.y,
        currentBox.x + currentBox.width,
        currentBox.y + currentBox.height
      ]
    };

    setAnnotations(prev => [...prev, newAnnotation]);
    setDialogOpen(false);
    setCurrentBox(null);
    setHasUnsavedChanges(true);
  };

  const handleExport = async () => {
    if (!image || annotations.length === 0) return;

    try {
      await axios.post(`${API_URL}/api/export`, {
        annotations,
        imageData: {
          filename: image.filename,
          width: image.width,
          height: image.height
        },
        sceneId: 'scene_001'
      });

      setHasUnsavedChanges(false);
      alert('Annotations exported successfully!');
    } catch (error) {
      console.error('Error exporting annotations:', error);
      alert('Failed to export annotations. Please try again.');
    }
  };

  return (
    <RootContainer>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            GameAnno Web
          </Typography>
          <Button color="inherit" onClick={handleExport} disabled={!hasUnsavedChanges}>
            Export
          </Button>
        </Toolbar>
      </AppBar>

      <MainContent>
        {!image ? (
          <FileUpload onUpload={handleImageUpload} />
        ) : (
          <AnnotationCanvas
            image={image}
            annotations={annotations}
            onAnnotationComplete={handleAnnotationComplete}
          />
        )}
      </MainContent>

      <AnnotationDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setCurrentBox(null);
        }}
        onSave={handleAnnotationSave}
      />
    </RootContainer>
  );
}

export default App; 