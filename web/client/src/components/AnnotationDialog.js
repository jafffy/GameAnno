import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Switch,
  FormControlLabel,
  TextField,
} from '@mui/material';
import { getAllTags } from '../constants';
import SearchableSelect from './SearchableSelect';

const AnnotationDialog = ({ open, onClose, onSave }) => {
  const [interactionTypes, setInteractionTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isInteractive, setIsInteractive] = useState(false);
  const [notes, setNotes] = useState('');
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

  const handleCustomTagAdded = async (type) => {
    const tags = await getAllTags();
    setAvailableTags(tags);
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

        <SearchableSelect
          label="Interaction Types"
          options={availableTags.interaction_types}
          value={interactionTypes}
          onChange={(e) => setInteractionTypes(e.target.value)}
          multiple
          tagType="interaction_type"
          onCustomTagAdded={handleCustomTagAdded}
        />

        <SearchableSelect
          label="Categories"
          options={availableTags.categories}
          value={categories}
          onChange={(e) => setCategories(e.target.value)}
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