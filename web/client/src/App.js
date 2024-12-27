import React, { useState, useEffect } from 'react';
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
  const [lastSaved, setLastSaved] = useState(null);

  // Autosave effect
  useEffect(() => {
    let autosaveTimer;

    const saveAnnotations = async () => {
      if (!image || !hasUnsavedChanges) return;

      try {
        console.log('Autosaving annotations:', annotations);
        await axios.post(`${API_URL}/api/annotations/${image.filename}`, {
          annotations
        });

        setHasUnsavedChanges(false);
        setLastSaved(new Date().toLocaleTimeString());
        console.log('Autosaved annotations successfully');
      } catch (error) {
        console.error('Error in autosave:', error);
      }
    };

    if (hasUnsavedChanges) {
      console.log('Scheduling autosave...');
      autosaveTimer = setTimeout(saveAnnotations, 2000);
    }

    return () => {
      if (autosaveTimer) {
        clearTimeout(autosaveTimer);
      }
    };
  }, [annotations, hasUnsavedChanges, image]);

  const handleImageUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      const imageData = {
        url: `${API_URL}/uploads/${response.data.filename}`,
        width: response.data.width,
        height: response.data.height,
        filename: response.data.filename
      };
      
      // Try to load existing annotations
      try {
        console.log('Loading annotations for uploaded image:', response.data.filename);
        const annotationsResponse = await axios.get(`${API_URL}/api/annotations/${response.data.filename}`);
        console.log('Loaded annotations response:', annotationsResponse.data);
        
        if (annotationsResponse.data && annotationsResponse.data.annotations) {
          console.log('Setting annotations:', annotationsResponse.data.annotations);
          if (Array.isArray(annotationsResponse.data.annotations)) {
            setAnnotations(annotationsResponse.data.annotations);
            console.log('Successfully set annotations');
          } else {
            console.log('Received annotations is not an array:', annotationsResponse.data.annotations);
            setAnnotations([]);
          }
        } else {
          console.log('No annotations found in response');
          setAnnotations([]);
        }
      } catch (error) {
        console.log('Error loading annotations:', error);
        setAnnotations([]);
      }

      setImage(imageData);
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

    console.log('Creating new annotation with:', { metadata, currentBox });

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

    console.log('New annotation created:', newAnnotation);
    setAnnotations(prev => {
      const updated = [...prev, newAnnotation];
      console.log('Updated annotations array:', updated);
      return updated;
    });
    setDialogOpen(false);
    setCurrentBox(null);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!image) return;

    try {
      console.log('Saving annotations:', annotations);
      await axios.post(`${API_URL}/api/annotations/${image.filename}`, {
        annotations
      });

      setHasUnsavedChanges(false);
      setLastSaved(new Date().toLocaleTimeString());
      console.log('Manually saved annotations');
    } catch (error) {
      console.error('Error saving annotations:', error);
      alert('Failed to save annotations. Please try again.');
    }
  };

  return (
    <RootContainer>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            GameAnno Web
          </Typography>
          {lastSaved && (
            <Typography variant="body2" color="inherit" sx={{ mr: 2 }}>
              Last saved: {lastSaved}
            </Typography>
          )}
          <Button 
            color="inherit" 
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            sx={{ mr: 1 }}
          >
            Save
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