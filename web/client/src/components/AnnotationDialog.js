import React, { useState, useEffect } from 'react';
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
  Box,
  Chip,
  CircularProgress
} from '@mui/material';
import { INTERACTION_CATEGORIES, INTERACTION_TYPES, loadCustomTags, saveCustomTag } from '../constants';

const AnnotationDialog = ({ open, onClose, onSave }) => {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [customTypes, setCustomTypes] = useState([]);
  const [isInteractive, setIsInteractive] = useState(false);
  const [notes, setNotes] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load custom tags when dialog opens
  useEffect(() => {
    if (open) {
      loadPersistedTags();
    }
  }, [open]);

  const loadPersistedTags = async () => {
    setIsLoading(true);
    try {
      const { categories, interaction_types } = await loadCustomTags();
      setCustomCategories(categories);
      setCustomTypes(interaction_types);
    } catch (error) {
      console.error('Error loading custom tags:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleCreateNewType = async () => {
    if (!typeFilter.trim()) return;
    
    // Format: "english (korean)"
    const newType = `${typeFilter.toLowerCase()} (${typeFilter.toLowerCase()})`;
    
    if (!INTERACTION_TYPES.includes(newType) && !customTypes.includes(newType)) {
      try {
        const { interaction_types } = await saveCustomTag('interaction_types', newType);
        setCustomTypes(interaction_types);
        setSelectedTypes(prev => [...prev, newType]);
        setTypeFilter('');
      } catch (error) {
        console.error('Error saving custom type:', error);
      }
    }
  };

  const handleCreateNewCategory = async () => {
    if (!categoryFilter.trim()) return;
    
    // Format: "english (korean)"
    const newCategory = `${categoryFilter.toLowerCase()} (${categoryFilter.toLowerCase()})`;
    
    if (!INTERACTION_CATEGORIES.includes(newCategory) && !customCategories.includes(newCategory)) {
      try {
        const { categories } = await saveCustomTag('categories', newCategory);
        setCustomCategories(categories);
        setSelectedCategories(prev => [...prev, newCategory]);
        setCategoryFilter('');
      } catch (error) {
        console.error('Error saving custom category:', error);
      }
    }
  };

  const allCategories = [...INTERACTION_CATEGORIES, ...customCategories];
  const filteredCategories = allCategories.filter(category =>
    category.toLowerCase().includes(categoryFilter.toLowerCase())
  );

  const allTypes = [...INTERACTION_TYPES, ...customTypes];
  const filteredTypes = allTypes.filter(type =>
    type.toLowerCase().includes(typeFilter.toLowerCase())
  );

  const showCreateNewCategory = categoryFilter.trim() !== '' && 
    !allCategories.some(category => category.toLowerCase().includes(categoryFilter.toLowerCase()));

  const showCreateNewType = typeFilter.trim() !== '' && 
    !allTypes.some(type => type.toLowerCase().includes(typeFilter.toLowerCase()));

  if (!open) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Annotation Details</DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Categories Section */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Categories
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  fullWidth
                  placeholder="Search or create new categories..."
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  margin="dense"
                />
                {showCreateNewCategory && (
                  <Button
                    variant="contained"
                    onClick={handleCreateNewCategory}
                    sx={{ mt: 1 }}
                  >
                    Create New
                  </Button>
                )}
              </Box>
              {customCategories.length > 0 && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="textSecondary">
                    Custom Categories:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {customCategories.map((category) => (
                      <Chip
                        key={category}
                        label={category}
                        size="small"
                        color="primary"
                        variant={selectedCategories.includes(category) ? "filled" : "outlined"}
                        onClick={() => toggleCategory(category)}
                      />
                    ))}
                  </Box>
                </Box>
              )}
              <List sx={{ maxHeight: 200, overflow: 'auto' }}>
                {filteredCategories.filter(category => !customCategories.includes(category)).map((category) => (
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
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  fullWidth
                  placeholder="Search or create new interaction types..."
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  margin="dense"
                />
                {showCreateNewType && (
                  <Button
                    variant="contained"
                    onClick={handleCreateNewType}
                    sx={{ mt: 1 }}
                  >
                    Create New
                  </Button>
                )}
              </Box>
              {customTypes.length > 0 && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="textSecondary">
                    Custom Types:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {customTypes.map((type) => (
                      <Chip
                        key={type}
                        label={type}
                        size="small"
                        color="primary"
                        variant={selectedTypes.includes(type) ? "filled" : "outlined"}
                        onClick={() => toggleType(type)}
                      />
                    ))}
                  </Box>
                </Box>
              )}
              <List sx={{ maxHeight: 200, overflow: 'auto' }}>
                {filteredTypes.filter(type => !customTypes.includes(type)).map((type) => (
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
        )}
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