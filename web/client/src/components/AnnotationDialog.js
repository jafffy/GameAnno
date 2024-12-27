import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

const interactionTypes = [
  'Click',
  'Hover',
  'Drag',
  'Double Click',
  'Right Click',
  'Press and Hold',
  'Scroll'
];

const categories = [
  'Button',
  'Menu',
  'Dialog',
  'Input',
  'Slider',
  'Toggle',
  'Link',
  'Icon',
  'Image',
  'Text',
  'Other'
];

const AnnotationDialog = ({ open, onClose, onSave }) => {
  const [interactionType, setInteractionType] = useState('');
  const [category, setCategory] = useState('');

  const handleSave = () => {
    onSave({
      interactionType,
      category
    });
    resetForm();
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setInteractionType('');
    setCategory('');
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Annotation</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="normal">
          <InputLabel>Interaction Type</InputLabel>
          <Select
            value={interactionType}
            onChange={(e) => setInteractionType(e.target.value)}
            label="Interaction Type"
          >
            {interactionTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth margin="normal">
          <InputLabel>Category</InputLabel>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            label="Category"
          >
            {categories.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleSave}
          disabled={!interactionType || !category}
          variant="contained"
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AnnotationDialog; 