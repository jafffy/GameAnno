import React, { useState, useEffect } from 'react';
import { Box, List, ListItem, ListItemButton, ListItemText, Typography, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ImageBrowser({ onImageSelect, currentImage }) {
  const [images, setImages] = useState([]);

  const fetchImages = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/images`);
      setImages(response.data);
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleDelete = async (image, event) => {
    event.stopPropagation(); // Prevent triggering the ListItemButton click
    
    if (!window.confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/images/${image.filename}`);
      // Refresh the image list
      fetchImages();
      // If the deleted image was selected, clear it
      if (currentImage?.filename === image.filename) {
        onImageSelect(null);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image. Please try again.');
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%', borderRight: 1, borderColor: 'divider' }}>
      <Typography variant="h6" sx={{ p: 2 }}>
        Images
      </Typography>
      <List sx={{ overflow: 'auto', height: 'calc(100% - 60px)' }}>
        {images.map((image) => (
          <ListItem 
            key={image.filename} 
            disablePadding
            secondaryAction={
              <IconButton 
                edge="end" 
                aria-label="delete"
                onClick={(e) => handleDelete(image, e)}
                sx={{ mr: 1 }}
              >
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemButton 
              selected={currentImage?.filename === image.filename}
              onClick={() => onImageSelect(image)}
            >
              <ListItemText 
                primary={image.filename}
                secondary={`${image.width}x${image.height}`}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

export default ImageBrowser; 