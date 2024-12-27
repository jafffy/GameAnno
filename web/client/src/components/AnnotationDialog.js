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
  Switch,
  FormControlLabel,
  TextField,
} from '@mui/material';
import { INTERACTION_TYPES, INTERACTION_CATEGORIES } from '../constants';

const AnnotationDialog = ({ open, onClose, onSave }) => {
  const [interactionTypes, setInteractionTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isInteractive, setIsInteractive] = useState(false);
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    onSave({
      interactionTypes,
      categories,
      is_interactive: isInteractive,
      notes
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
    setIsInteractive(false);
    setNotes('');
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Annotation</DialogTitle>
      <DialogContent>
        <FormControlLabel
          control={
            <Switch
              checked={isInteractive}
              onChange={(e) => setIsInteractive(e.target.checked)}
            />
          }
          label="Is Interactive"
          sx={{ mb: 2, mt: 1 }}
        />

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

        <TextField
          fullWidth
          margin="normal"
          label="Notes"
          multiline
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleSave}
          disabled={categories.length === 0 || (interactionTypes.length === 0 && isInteractive)}
          variant="contained"
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AnnotationDialog; 