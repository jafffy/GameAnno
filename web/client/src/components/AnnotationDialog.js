import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Box
} from '@mui/material';
import { INTERACTION_CATEGORIES, INTERACTION_TYPES } from '../constants';

const AnnotationDialog = ({ open, onClose, onSave }) => {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [isInteractive, setIsInteractive] = useState(false);
  const [notes, setNotes] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const handleSave = () => {
    onSave({
      categories: selectedCategories,
      is_interactive: isInteractive,
      interaction_type: selectedTypes,
      notes: notes
    });
    resetForm();
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setSelectedCategories([]);
    setSelectedTypes([]);
    setIsInteractive(false);
    setNotes('');
    setCategoryFilter('');
    setTypeFilter('');
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleType = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const filteredCategories = INTERACTION_CATEGORIES.filter(category =>
    category.toLowerCase().includes(categoryFilter.toLowerCase())
  );

  const filteredTypes = INTERACTION_TYPES.filter(type =>
    type.toLowerCase().includes(typeFilter.toLowerCase())
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Annotation Details</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Categories Section */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Categories
            </Typography>
            <TextField
              fullWidth
              placeholder="Search categories..."
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              margin="dense"
            />
            <List sx={{ maxHeight: 200, overflow: 'auto' }}>
              {filteredCategories.map((category) => (
                <ListItem
                  key={category}
                  dense
                  button
                  onClick={() => toggleCategory(category)}
                >
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={selectedCategories.includes(category)}
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemText primary={category} />
                </ListItem>
              ))}
            </List>
          </Box>

          {/* Interactive Checkbox */}
          <FormControlLabel
            control={
              <Checkbox
                checked={isInteractive}
                onChange={(e) => setIsInteractive(e.target.checked)}
              />
            }
            label="Is Interactive?"
          />

          {/* Interaction Types Section */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Interaction Types
            </Typography>
            <TextField
              fullWidth
              placeholder="Search interaction types..."
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              margin="dense"
            />
            <List sx={{ maxHeight: 200, overflow: 'auto' }}>
              {filteredTypes.map((type) => (
                <ListItem
                  key={type}
                  dense
                  button
                  onClick={() => toggleType(type)}
                >
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={selectedTypes.includes(type)}
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemText primary={type} />
                </ListItem>
              ))}
            </List>
          </Box>

          {/* Notes Section */}
          <TextField
            fullWidth
            label="Notes"
            multiline
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={selectedCategories.length === 0}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AnnotationDialog; 