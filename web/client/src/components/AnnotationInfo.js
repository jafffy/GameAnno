import React from 'react';
import { Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
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
        </Box>
      )}
    </StyledPaper>
  );
};

export default AnnotationInfo; 