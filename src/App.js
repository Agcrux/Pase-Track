import React, { useState, useEffect } from 'react';
import {
  Container, 
  Typography, 
  Box, 
  Button, 
  Paper,
  Grid,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack
} from '@mui/material';
import {
  Add as AddIcon, 
  Delete as DeleteIcon,
  CalendarMonth as CalendarIcon,
  ViewList as ListIcon,
  ViewModule as GridIcon,
  ChevronLeft,
  ChevronRight,
  CalendarViewWeek as WeekIcon,
  Notifications as NotificationsIcon,
  Chat as ChatIcon
} from '@mui/icons-material';
import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
// import emailjs from '@emailjs/browser';
import './App.css';

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyADKmDZuwtUoxma5DeidQfhQPeFIYNfaOk",
  authDomain: "pase-2d3ae.firebaseapp.com",
  projectId: "pase-2d3ae",
  storageBucket: "pase-2d3ae.firebasestorage.app",
  messagingSenderId: "996781161864",
  appId: "1:996781161864:web:ee6bcccb5ed46463274e3d",
  measurementId: "G-XGFDYC0ZSG"
};

// Initialize Firebase with error handling
let app;
let db;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  
  // Enable offline persistence
  enableIndexedDbPersistence(db)
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.log('Persistence failed: Multiple tabs open');
      } else if (err.code === 'unimplemented') {
        console.log('Persistence not supported by browser');
      }
    });
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

// Initialize EmailJS
// emailjs.init("YOUR_PUBLIC_KEY");

function App() {
  const [showStudySystem, setShowStudySystem] = useState(false);

  return (
    <div className="App">
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            P.A.S.E Daily Tracker
          </Typography>
          
          {/* Homework Buddy Dialog */}
          <Dialog
            open={showStudySystem}
            onClose={() => setShowStudySystem(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle sx={{ backgroundColor: 'green', color: 'white' }}>
              Homework Buddy
            </DialogTitle>
            <DialogContent sx={{ backgroundColor: '#f5fff5', minHeight: 400 }}>
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: '#2d4a32', mb: 2 }}>
                  Coming Soon!
                </Typography>
                <Typography sx={{ color: '#2d4a32' }}>
                  The Homework Buddy feature is currently under development. Please check back later!
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ backgroundColor: '#e8f5e9' }}>
              <Button onClick={() => setShowStudySystem(false)} sx={{ color: 'green' }}>
                Close
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Container>
    </div>
  );
}

export default App; 