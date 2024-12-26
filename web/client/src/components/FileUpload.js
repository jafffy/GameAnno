import React, { useCallback, useRef } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const UploadContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  padding: theme.spacing(3),
  backgroundColor: theme.palette.grey[100],
  borderRadius: theme.shape.borderRadius,
  border: `2px dashed ${theme.palette.grey[400]}`,
  '&:hover': {
    backgroundColor: theme.palette.grey[200],
    cursor: 'pointer'
  }
}));

const HiddenInput = styled('input')({
  display: 'none'
});

const FileUpload = ({ onUpload }) => {
  const fileInputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer?.files || e.target.files;
    if (files?.length) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onUpload(file);
      } else {
        alert('Please upload an image file');
      }
    }
  }, [onUpload]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleButtonClick = (e) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  return (
    <UploadContainer
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => fileInputRef.current?.click()}
    >
      <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        Upload Image
      </Typography>
      <Typography variant="body2" color="textSecondary" align="center">
        Drag and drop an image here, or click to select a file
      </Typography>
      <Button
        variant="contained"
        component="span"
        sx={{ mt: 2 }}
        onClick={handleButtonClick}
      >
        Choose File
      </Button>
      <HiddenInput
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleDrop}
      />
    </UploadContainer>
  );
};

export default FileUpload; 