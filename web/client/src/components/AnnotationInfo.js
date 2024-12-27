import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)({
  height: '100%',
  overflow: 'auto',
  padding: '16px',
});

const AnnotationInfo = ({ selectedAnnotation }) => {
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
          
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            Interaction Type:
          </Typography>
          <Typography paragraph>
            {selectedAnnotation.interactionType || 'Not specified'}
          </Typography>
          
          <Typography variant="subtitle2" gutterBottom>
            Category:
          </Typography>
          <Typography paragraph>
            {selectedAnnotation.category || 'Not specified'}
          </Typography>
        </Box>
      )}
    </StyledPaper>
  );
};

export default AnnotationInfo; 