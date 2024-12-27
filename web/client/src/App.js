import React, { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import AnnotationCanvas from './components/AnnotationCanvas';
import AnnotationDialog from './components/AnnotationDialog';
import FileUpload from './components/FileUpload';
import ImageBrowser from './components/ImageBrowser';
import AnnotationInfo from './components/AnnotationInfo';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const RootContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
});

const MainContent = styled(Box)({
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
});

const SidePanel = styled(Box)({
  width: '250px',
  height: '100%',
  overflow: 'hidden',
});

const RightPanel = styled(Box)({
  width: '300px',
  height: '100%',
  overflow: 'hidden',
  borderLeft: '1px solid rgba(0, 0, 0, 0.12)',
});

const ContentPanel = styled(Box)({
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
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);

  // Autosave effect
  useEffect(() => {
    let autosaveTimer;

    const saveAnnotations = async () => {
      if (!image || !hasUnsavedChanges) return;

      try {
        const serverAnnotations = annotations.map(convertAnnotationForServer);
        console.log('Autosaving annotations:', serverAnnotations);
        await axios.post(`${API_URL}/api/annotations/${image.filename}`, {
          annotations: serverAnnotations
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

  const migrateAnnotation = (annotation) => {
    return {
      ...annotation,
      interactionTypes: annotation.interaction_type || annotation.interactionTypes || [],
      categories: annotation.categories || [],
      interaction_type: undefined,
      category: undefined
    };
  };

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
      
      try {
        console.log('Loading annotations for uploaded image:', response.data.filename);
        const annotationsResponse = await axios.get(`${API_URL}/api/annotations/${response.data.filename}`);
        console.log('Loaded annotations response:', annotationsResponse.data);
        
        if (annotationsResponse.data && annotationsResponse.data.annotations) {
          console.log('Setting annotations:', annotationsResponse.data.annotations);
          if (Array.isArray(annotationsResponse.data.annotations)) {
            // Migrate existing annotations to new format
            const migratedAnnotations = annotationsResponse.data.annotations.map(migrateAnnotation);
            setAnnotations(migratedAnnotations);
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
      bounding_box_id: `box_${annotations.length + 1}`,
      interactionTypes: metadata.interactionTypes || [],
      categories: metadata.categories || [],
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

  const convertAnnotationForServer = (annotation) => {
    return {
      ...annotation,
      interaction_type: annotation.interactionTypes,
      // Keep categories as is since it's already in the right format
      // Remove frontend-only fields
      interactionTypes: undefined
    };
  };

  const handleSave = async () => {
    if (!image) return;

    try {
      const serverAnnotations = annotations.map(convertAnnotationForServer);
      console.log('Saving annotations:', serverAnnotations);
      await axios.post(`${API_URL}/api/annotations/${image.filename}`, {
        annotations: serverAnnotations
      });

      setHasUnsavedChanges(false);
      setLastSaved(new Date().toLocaleTimeString());
      console.log('Manually saved annotations');
    } catch (error) {
      console.error('Error saving annotations:', error);
      alert('Failed to save annotations. Please try again.');
    }
  };

  const handleImageSelect = async (selectedImage) => {
    if (!selectedImage) {
      setImage(null);
      setAnnotations([]);
      setHasUnsavedChanges(false);
      return;
    }

    try {
      const annotationsResponse = await axios.get(`${API_URL}/api/annotations/${selectedImage.filename}`);
      
      if (annotationsResponse.data && annotationsResponse.data.annotations) {
        if (Array.isArray(annotationsResponse.data.annotations)) {
          // Migrate existing annotations to new format
          const migratedAnnotations = annotationsResponse.data.annotations.map(migrateAnnotation);
          setAnnotations(migratedAnnotations);
        } else {
          setAnnotations([]);
        }
      } else {
        setAnnotations([]);
      }

      setImage(selectedImage);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error loading image:', error);
      alert('Failed to load image. Please try again.');
    }
  };

  const handleAnnotationSelect = (annotation) => {
    setSelectedAnnotation(annotation);
  };

  const handleAnnotationUpdate = (updatedAnnotation) => {
    setAnnotations(prev => prev.map(ann => 
      ann.bounding_box_id === updatedAnnotation.bounding_box_id 
        ? {
            ...updatedAnnotation,
            interactionTypes: updatedAnnotation.interactionTypes || [],
            categories: updatedAnnotation.categories || []
          }
        : ann
    ));
    setHasUnsavedChanges(true);
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
          <Button 
            color="inherit" 
            onClick={() => setImage(null)}
            sx={{ mr: 1 }}
          >
            Load New Image
          </Button>
        </Toolbar>
      </AppBar>

      <MainContent>
        <SidePanel>
          <ImageBrowser onImageSelect={handleImageSelect} currentImage={image} />
        </SidePanel>
        <ContentPanel>
          {!image ? (
            <FileUpload onUpload={handleImageUpload} />
          ) : (
            <AnnotationCanvas
              image={image}
              annotations={annotations}
              onAnnotationComplete={handleAnnotationComplete}
              onAnnotationSelect={handleAnnotationSelect}
              selectedAnnotation={selectedAnnotation}
            />
          )}
        </ContentPanel>
        <RightPanel>
          <AnnotationInfo
            annotations={annotations}
            selectedAnnotation={selectedAnnotation}
            onAnnotationUpdate={handleAnnotationUpdate}
          />
        </RightPanel>
      </MainContent>

      <AnnotationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleAnnotationSave}
      />
    </RootContainer>
  );
}

export default App; 