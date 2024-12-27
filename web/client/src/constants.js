import axios from 'axios';
import { DEFAULT_INTERACTION_CATEGORIES, DEFAULT_INTERACTION_TYPES } from './data/defaultTags';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Custom tags management
export const loadCustomTags = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/custom-tags`);
    return response.data;
  } catch (error) {
    console.error('Error loading custom tags:', error);
    return { categories: [], interaction_types: [] };
  }
};

export const saveCustomTag = async (type, tag) => {
  try {
    const response = await axios.post(`${API_URL}/api/custom-tags`, { type, tag });
    return response.data;
  } catch (error) {
    console.error('Error saving custom tag:', error);
    throw error;
  }
};

// Combine default and custom tags
export const getAllTags = async () => {
  const customTags = await loadCustomTags();
  return {
    categories: [...DEFAULT_INTERACTION_CATEGORIES, ...customTags.categories],
    interaction_types: [...DEFAULT_INTERACTION_TYPES, ...customTags.interaction_types]
  };
}; 