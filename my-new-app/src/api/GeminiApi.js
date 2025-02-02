import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert
} from 'react-native'; 

import { GOOGLE_GEMINI_API_KEY } from '../config';
import axios from 'axios';

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${" + GOOGLE_GEMINI_API_KEY + "}";

export async function summarizeText(text) {
  try {
    const response = await axios.post(
      GEMINI_API_URL,
      {
        document: {
          content: text,
          type: 'PLAIN_TEXT',
        },
        options: {
          language: 'en',
          summaryType: 'PEDESTRIAN',
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          //'Authorization': `Bearer ${GOOGLE_GEMINI_API_KEY}`,
        },
      }
    );

    if (response.data && response.data.summary) {
      return response.data.summary;
    } else {
      throw new Error('No summary found in response');
    }
  } catch (error) {
    console.error('Error summarizing text:', error);
    throw error;
  }
}
