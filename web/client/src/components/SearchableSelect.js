import React, { useState } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  InputAdornment,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import { saveCustomTag } from '../constants';

const SearchableSelect = ({
  label,
  options,
  value,
  onChange,
  multiple = false,
  tagType,
  onCustomTagAdded
}) => {
  const [searchText, setSearchText] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTag, setNewTag] = useState('');

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleAddNewTag = async () => {
    try {
      await saveCustomTag(tagType, newTag);
      onCustomTagAdded(newTag);
      setDialogOpen(false);
      setNewTag('');
    } catch (error) {
      console.error('Error saving custom tag:', error);
      alert('Failed to save custom tag. Please try again.');
    }
  };

  return (
    <>
      <FormControl fullWidth margin="normal">
        <InputLabel>{label}</InputLabel>
        <Select
          multiple={multiple}
          value={value}
          onChange={onChange}
          label={label}
          MenuProps={{
            PaperProps: {
              style: {
                maxHeight: 300
              }
            }
          }}
        >
          <Box sx={{ p: 1, position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDialogOpen(true);
                      }}
                    >
                      <AddIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </Box>
          {filteredOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
          {filteredOptions.length === 0 && (
            <MenuItem disabled>
              No options found
            </MenuItem>
          )}
        </Select>
      </FormControl>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Add New {label}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={`New ${label}`}
            fullWidth
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddNewTag} disabled={!newTag.trim()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SearchableSelect; 