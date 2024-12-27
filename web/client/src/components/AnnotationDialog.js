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
import { INTERACTION_TYPES, INTERACTION_CATEGORIES } from '../constants';

const AnnotationDialog = ({ open, onClose, onSave }) => {
  const [interactionTypes, setInteractionTypes] = useState([]);
  const [categories, setCategories] = useState([]);

  const handleSave = () => {
    onSave({
      interactionTypes,
      categories
    });
    resetForm();
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setInteractionTypes([]);
    setCategories([]);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Annotation</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="normal">
          <InputLabel>Interaction Types</InputLabel>
          <Select
            multiple
            value={interactionTypes}
            onChange={(e) => setInteractionTypes(e.target.value)}
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
            value={categories}
            onChange={(e) => setCategories(e.target.value)}
            label="Categories"
          >
            {INTERACTION_CATEGORIES.map((cat) => (
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
          disabled={interactionTypes.length === 0 || categories.length === 0}
          variant="contained"
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AnnotationDialog; 