import React from 'react';
import { Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel, TextField } from '@mui/material';
import { styled } from '@mui/material/styles';
import { INTERACTION_TYPES, INTERACTION_CATEGORIES } from '../constants';

const StyledPaper = styled(Paper)({
  height: '100%',
  overflow: 'auto',
  padding: '16px',
});

const AnnotationInfo = ({ selectedAnnotation, onAnnotationUpdate }) => {
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
          <Typography variant="subtitle1" gutterBottom>
            Bounding Box ID: {selectedAnnotation.bounding_box_id}
          </Typography>
          
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
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Interaction Types</InputLabel>
            <Select
              multiple
              value={selectedAnnotation.interactionTypes || []}
              onChange={handleInteractionTypesChange}
              label="Interaction Types"
            >
              {INTERACTION_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Categories</InputLabel>
            <Select
              multiple
              value={selectedAnnotation.categories || []}
              onChange={handleCategoriesChange}
              label="Categories"
            >
              {INTERACTION_CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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