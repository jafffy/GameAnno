import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Switch, FormControlLabel, TextField, Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { styled } from '@mui/material/styles';
import { getAllTags } from '../constants';
import SearchableSelect from './SearchableSelect';

const StyledPaper = styled(Paper)({
  height: '100%',
  overflow: 'auto',
  padding: '16px',
});

const AnnotationInfo = ({ selectedAnnotation, onAnnotationUpdate, onAnnotationDelete }) => {
  const [availableTags, setAvailableTags] = useState({
    categories: [],
    interaction_types: []
  });

  useEffect(() => {
    const loadTags = async () => {
      const tags = await getAllTags();
      setAvailableTags(tags);
    };
    loadTags();
  }, []);

  const handleInteractionTypesChange = (event) => {
    if (!selectedAnnotation || !onAnnotationUpdate) return;
    onAnnotationUpdate({
      ...selectedAnnotation,
      interactionTypes: event.target.value
    });
  };

  const handleCategoriesChange = (event) => {
    if (!selectedAnnotation || !onAnnotationUpdate) return;
    onAnnotationUpdate({
      ...selectedAnnotation,
      categories: event.target.value
    });
  };

  const handleIsInteractiveChange = (event) => {
    if (!selectedAnnotation || !onAnnotationUpdate) return;
    onAnnotationUpdate({
      ...selectedAnnotation,
      is_interactive: event.target.checked
    });
  };

  const handleNotesChange = (event) => {
    if (!selectedAnnotation || !onAnnotationUpdate) return;
    onAnnotationUpdate({
      ...selectedAnnotation,
      notes: event.target.value
    });
  };

  const handleCustomTagAdded = async (type) => {
    const tags = await getAllTags();
    setAvailableTags(tags);
  };

  return (
    <StyledPaper>
      <Typography variant="h6" gutterBottom>
        Annotation Information
      </Typography>
      
      {!selectedAnnotation ? (
        <Typography color="textSecondary">
          Select an annotation to view details
        </Typography>
      ) : (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1">
              Bounding Box ID: {selectedAnnotation.bounding_box_id}
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => onAnnotationDelete(selectedAnnotation)}
            >
              Delete
            </Button>
          </Box>
          
          <FormControlLabel
            control={
              <Switch
                checked={selectedAnnotation.is_interactive || false}
                onChange={handleIsInteractiveChange}
              />
            }
            label="Is Interactive"
            sx={{ mb: 2, mt: 1 }}
          />
          
          <SearchableSelect
            label="Interaction Types"
            options={availableTags.interaction_types}
            value={selectedAnnotation.interactionTypes || []}
            onChange={handleInteractionTypesChange}
            multiple
            tagType="interaction_type"
            onCustomTagAdded={handleCustomTagAdded}
          />
          
          <SearchableSelect
            label="Categories"
            options={availableTags.categories}
            value={selectedAnnotation.categories || []}
            onChange={handleCategoriesChange}
            multiple
            tagType="category"
            onCustomTagAdded={handleCustomTagAdded}
          />

          <TextField
            fullWidth
            margin="normal"
            label="Notes"
            multiline
            rows={3}
            value={selectedAnnotation.notes || ''}
            onChange={handleNotesChange}
          />
        </Box>
      )}
    </StyledPaper>
  );
};

export default AnnotationInfo; 