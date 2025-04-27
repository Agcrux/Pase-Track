
import React, { useState, useEffect } from 'react';
import './App.css';
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
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker, TimePicker } from '@mui/x-date-pickers';
import { format, isSameMonth, subMonths, addMonths, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addHours, setHours, setMinutes, addDays } from 'date-fns';
import { PieChart, Pie as RechartsePie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Chart as ChartJS, ArcElement, Tooltip as ChartJSTooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import emailjs from '@emailjs/browser';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, deleteDoc, enableIndexedDbPersistence, writeBatch } from 'firebase/firestore';

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
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        console.log('Persistence failed: Multiple tabs open');
      } else if (err.code === 'unimplemented') {
        // The current browser doesn't support persistence
        console.log('Persistence not supported by browser');
      }
    });
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

ChartJS.register(
  ArcElement,
  ChartJSTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

// Initialize EmailJS
emailjs.init("YOUR_PUBLIC_KEY");

// Add at the top of the file (after imports)

function App() {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState('month');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    eventType: 'sleep',
    startDate: new Date(),
    endDate: new Date(),
    startTime: new Date(),
    endTime: new Date(),
    description: ''
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartTime, setDragStartTime] = useState(null);
  const [dragEndTime, setDragEndTime] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  const [phone, setPhone] = useState('');
  const [isResendDisabled, setIsResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isTeacher, setIsTeacher] = useState(false);
  const [teacherCode, setTeacherCode] = useState('');
  const [showTeacherLogin, setShowTeacherLogin] = useState(false);
  const [allStudentData, setAllStudentData] = useState({});
  const [adminInitial, setAdminInitial] = useState('');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPasscodes, setAdminPasscodes] = useState(() => {
    const saved = sessionStorage.getItem('adminPasscodes');
    return saved ? JSON.parse(saved) : {
      'C': '',
      'K': '',
      'B': '',
      'V': ''
    };
  });
  const [studentPassword, setStudentPassword] = useState('');
  const [showStudySystem, setShowStudySystem] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: 'Hi! I am your Homework Buddy. How can I help you with your homework or assignments today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const eventTypes = {
    'sleep': { name: 'Sleep', color: '#000000' },
    'school': { name: 'School', color: '#FF69B4' },
    'social_media': { name: 'Social Media', color: '#FF0000' },
    'study': { name: 'Study', color: '#4CAF50' },
    'cooking': { name: 'Cooking/Eating', color: '#FF9800' },
    'work': { name: 'Work', color: '#2196F3' },
    'chores': { name: 'Chores/Hobby', color: '#FFD700' },
    'physical': { name: 'Physical Activity', color: '#9C27B0' }
  };

  useEffect(() => {
    const loadUserData = async () => {
      const savedStudentId = sessionStorage.getItem('studentId');
      const userRole = sessionStorage.getItem('userRole');
      
      if (savedStudentId && userRole === 'student') {
        setStudentId(savedStudentId);
        setIsLoggedIn(true);
        setIsTeacher(false);
        
        try {
          const studentDoc = await getDoc(doc(db, 'students', savedStudentId));
          if (studentDoc.exists()) {
            const studentData = studentDoc.data();
            const loadedEvents = studentData.events.map(event => ({
              ...event,
              startDate: new Date(event.startDate),
              endDate: new Date(event.endDate),
              startTime: new Date(event.startTime),
              endTime: new Date(event.endTime),
              timezoneOffset: event.timezoneOffset || new Date().getTimezoneOffset()
            }));
            const adminInitials = ['C', 'K', 'B', 'V'];
            let allAdminEvents = [];
            for (const initial of adminInitials) {
              const adminRef = doc(db, 'teachers', initial);
              const adminDoc = await getDoc(adminRef);
              if (adminDoc.exists()) {
                const adminData = adminDoc.data();
                const adminEvents = adminData.events || [];
                allAdminEvents.push(...adminEvents);
              }
            }
            const uniqueAdminEvents = allAdminEvents.filter((event, index, self) =>
              index === self.findIndex(e => e.id === event.id)
            );
            const mergedEvents = [...uniqueAdminEvents, ...loadedEvents.filter(event =>
              !uniqueAdminEvents.some(adminEvent => adminEvent.id === event.id)
            )];
            setEvents(mergedEvents);
          }
        } catch (error) {
          console.error('Error loading saved events:', error);
          setEvents([]);
        }
      } else if (userRole === 'teacher') {
        setIsTeacher(true);
        setIsLoggedIn(true);
        await loadAllStudentData();
        
        try {
          const teacherDoc = await getDoc(doc(db, 'teachers', 'teacher'));
          if (teacherDoc.exists()) {
            const teacherData = teacherDoc.data();
            const loadedEvents = teacherData.events?.map(event => ({
              ...event,
              startDate: new Date(event.startDate),
              endDate: new Date(event.endDate),
              startTime: new Date(event.startTime),
              endTime: new Date(event.endTime),
              timezoneOffset: event.timezoneOffset || new Date().getTimezoneOffset()
            })) || [];
            setEvents(loadedEvents);
          } else {
            await setDoc(doc(db, 'teachers', 'teacher'), {
              events: [],
              lastUpdated: new Date().toISOString()
            });
            setEvents([]);
          }
        } catch (error) {
          console.error('Error loading teacher events:', error);
          setEvents([]);
        }
      }
    };

    loadUserData();
  }, []);

  const loadAllStudentData = async () => {
    try {
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const allData = {};
      
      studentsSnapshot.forEach(doc => {
        const studentData = doc.data();
        allData[doc.id] = studentData.events.map(event => ({
          ...event,
          startDate: new Date(event.startDate),
          endDate: new Date(event.endDate),
          startTime: new Date(event.startTime),
          endTime: new Date(event.endTime)
        }));
      });
      
      setAllStudentData(allData);
    } catch (error) {
      console.error('Error loading all student data:', error);
      alert('Error loading student data. Please try again.');
    }
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validDomains = ['.edu', '.org'];
    return emailRegex.test(email) && validDomains.some(domain => email.toLowerCase().endsWith(domain));
  };

  // Add this function for phone validation
  const isValidPhone = (phone) => {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
  };

  // Update the sendVerificationEmail function
  const sendVerificationEmail = async (userEmail, verificationCode) => {
    try {
      const templateParams = {
        to_email: userEmail,
        verification_code: verificationCode,
        message: `Your verification code is: ${verificationCode}`
      };

      await emailjs.send(
        'service_xxxxxxx', // Replace with your EmailJS service ID
        'template_xxxxxxx', // Replace with your EmailJS template ID
        templateParams,
        'public_key_xxxxxxx' // Replace with your EmailJS public key
      );

      startResendTimer();
      alert('Verification code has been sent!');
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send verification code. Please try again.');
      throw error;
    }
  };

  // Add function for sending SMS (you'll need to implement your preferred SMS service)
  const sendVerificationSMS = async (phoneNumber, verificationCode) => {
    try {
      // Implement your SMS service here
      // For now, we'll simulate it
      console.log(`Sending SMS to ${phoneNumber} with code: ${verificationCode}`);
      startResendTimer();
      alert(`Verification code has been sent to ${phoneNumber}!`);
    } catch (error) {
      console.error('Error sending SMS:', error);
      alert('Failed to send verification code. Please try again.');
      throw error;
    }
  };

  // Add resend timer function
  const startResendTimer = () => {
    setIsResendDisabled(true);
    setResendTimer(30);
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleLogin = async () => {
    if (!studentId) {
      alert('Please enter your Student ID');
      return;
    }
    if (!studentPassword) {
      alert('Please enter your password');
      return;
    }
    try {
      // Save student ID to session storage
      sessionStorage.setItem('studentId', studentId);
      sessionStorage.setItem('userRole', 'student');
      setIsTeacher(false);
      
      // Check if student exists in Firebase
      const studentRef = doc(db, 'students', studentId);
      const studentDoc = await getDoc(studentRef);
      
      if (studentDoc.exists()) {
        const studentData = studentDoc.data();
        if (!studentData.password || studentData.password !== studentPassword) {
          alert('Incorrect password.');
          return;
        }
        // Convert ISO strings back to Date objects and ensure timezone offset
        const loadedEvents = studentData.events.map(event => ({
          ...event,
          startDate: new Date(event.startDate),
          endDate: new Date(event.endDate),
          startTime: new Date(event.startTime),
          endTime: new Date(event.endTime),
          timezoneOffset: event.timezoneOffset || new Date().getTimezoneOffset()
        }));
        const adminInitials = ['C', 'K', 'B', 'V'];
        let allAdminEvents = [];
        for (const initial of adminInitials) {
          const adminRef = doc(db, 'teachers', initial);
          const adminDoc = await getDoc(adminRef);
          if (adminDoc.exists()) {
            const adminData = adminDoc.data();
            const adminEvents = adminData.events || [];
            allAdminEvents.push(...adminEvents);
          }
        }
        const uniqueAdminEvents = allAdminEvents.filter((event, index, self) =>
          index === self.findIndex(e => e.id === event.id)
        );
        const mergedEvents = [...uniqueAdminEvents, ...loadedEvents.filter(event =>
          !uniqueAdminEvents.some(adminEvent => adminEvent.id === event.id)
        )];
        setEvents(mergedEvents);
      } else {
        // New student: prompt to set password
        if (!window.confirm('No account found. Create a new account with this Student ID and password?')) return;
        // Get all teacher events first
        const teacherEvents = [];
        const adminInitials = ['C', 'K', 'B', 'V'];
        for (const initial of adminInitials) {
          const adminRef = doc(db, 'teachers', initial);
          const adminDoc = await getDoc(adminRef);
          if (adminDoc.exists()) {
            const adminData = adminDoc.data();
            const adminEvents = adminData.events || [];
            teacherEvents.push(...adminEvents);
          }
        }
        await setDoc(studentRef, {
          events: teacherEvents,
          password: studentPassword,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        });
        // Convert events to Date objects for local state
        const loadedEvents = teacherEvents.map(event => ({
          ...event,
          startDate: new Date(event.startDate),
          endDate: new Date(event.endDate),
          startTime: new Date(event.startTime),
          endTime: new Date(event.endTime),
          timezoneOffset: event.timezoneOffset || new Date().getTimezoneOffset()
        }));
        
        setEvents(loadedEvents);
      }
      
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Error during login:', error);
      alert('There was an error logging in. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      // Save current events before logging out
      if (studentId && events.length > 0) {
        const studentRef = doc(db, 'students', studentId);
        const eventsToSave = events.map(event => ({
          ...event,
          startDate: event.startDate instanceof Date ? event.startDate.toISOString() : event.startDate,
          endDate: event.endDate instanceof Date ? event.endDate.toISOString() : event.endDate,
          startTime: event.startTime instanceof Date ? event.startTime.toISOString() : event.startTime,
          endTime: event.endTime instanceof Date ? event.endTime.toISOString() : event.endTime
        }));

        await updateDoc(studentRef, {
          events: eventsToSave,
          lastUpdated: new Date().toISOString()
        });
      }

      // Clear session storage and state
      sessionStorage.removeItem('studentId');
      sessionStorage.removeItem('userRole');
      setIsLoggedIn(false);
      setIsTeacher(false);
      setStudentId('');
      setEvents([]);
      setAllStudentData({});
    } catch (error) {
      console.error('Error during logout:', error);
      alert('There was an error saving your data. Please try again.');
    }
  };

  const handleAddEvent = async (newEvent) => {
    try {
      // Create new Date objects and ensure they're valid
      const startDate = new Date(newEvent.startDate);
      const endDate = new Date(newEvent.endDate);
      const startTime = new Date(newEvent.startTime);
      const endTime = new Date(newEvent.endTime);

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || 
          isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        alert('Invalid date or time values');
        return;
      }

      // Create combined date-time objects while preserving local timezone
      const eventStartDateTime = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        startTime.getHours(),
        startTime.getMinutes(),
        0,
        0
      );
      
      const eventEndDateTime = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        endTime.getHours(),
        endTime.getMinutes(),
        0,
        0
      );

      // Validate time range
      if (eventEndDateTime <= eventStartDateTime) {
        alert('End time must be after start time');
        return;
      }

      // Generate a unique ID for the event
      const eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Store timezone offset for consistent display
      const timezoneOffset = new Date().getTimezoneOffset();

      // Get admin initial if logged in as admin
      const adminInitial = sessionStorage.getItem('adminInitial');

      // Create the event object with proper date formatting and unique ID
      const eventToSave = {
        id: eventId,
        name: newEvent.name,
        eventType: newEvent.eventType,
        description: newEvent.description || '',
        startDate: eventStartDateTime.toISOString(),
        endDate: eventEndDateTime.toISOString(),
        startTime: eventStartDateTime.toISOString(),
        endTime: eventEndDateTime.toISOString(),
        timezoneOffset: timezoneOffset,
        isTeacherEvent: isTeacher,
        teacherId: isTeacher ? adminInitial || 'teacher' : null,
        adminInitial: adminInitial || null,
        createdAt: new Date().toISOString()
      };

      // Update local state with Date objects
      const eventWithDates = {
        ...eventToSave,
        startDate: eventStartDateTime,
        endDate: eventEndDateTime,
        startTime: eventStartDateTime,
        endTime: eventEndDateTime
      };

      if (isTeacher) {
        // First update teacher's events
        const teacherRef = doc(db, 'teachers', adminInitial || 'teacher');
        const teacherDoc = await getDoc(teacherRef);
        const currentTeacherEvents = teacherDoc.exists() ? teacherDoc.data().events || [] : [];
        const updatedTeacherEvents = [...currentTeacherEvents, eventToSave];
        
        await updateDoc(teacherRef, {
          events: updatedTeacherEvents
        });

        // Then add event to all students using batch
        const studentsSnapshot = await getDocs(collection(db, 'students'));
        const batch = writeBatch(db);
        
        studentsSnapshot.forEach((doc) => {
          const studentData = doc.data();
          const studentEvents = studentData.events || [];
          const updatedStudentEvents = [...studentEvents, eventToSave];
          batch.update(doc.ref, { 
            events: updatedStudentEvents,
            lastUpdated: new Date().toISOString()
          });
        });
        
        await batch.commit();
        
        // Update local state after successful save
        setEvents(prev => [...prev, eventWithDates]);
      } else {
        // For students, first get their current events
        const studentRef = doc(db, 'students', studentId);
        const studentDoc = await getDoc(studentRef);
        const currentStudentEvents = studentDoc.exists() ? studentDoc.data().events || [] : [];
        const updatedStudentEvents = [...currentStudentEvents, eventToSave];
        
        // Update student's events in Firestore
        await updateDoc(studentRef, {
          events: updatedStudentEvents,
          lastUpdated: new Date().toISOString()
        });
        
        // Update local state after successful save
        setEvents(prev => [...prev, eventWithDates]);
      }
      
      // Reset form and close dialog
      setShowForm(false);
      setSelectedEvent(null);
      setFormData({
        name: '',
        eventType: 'sleep',
        startDate: new Date(),
        endDate: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        description: ''
      });
    } catch (error) {
      console.error('Error adding event:', error);
      alert(error.message || 'There was an error adding the event. Please try again.');
    }
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support notifications");
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === "granted";
  };

  const scheduleNotification = async (event) => {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    const eventTime = new Date(event.startTime);
    const now = new Date();
    const timeUntilEvent = eventTime - now;

    if (timeUntilEvent > 0) {
      setTimeout(() => {
        new Notification("Event Reminder", {
          body: `Your event "${event.name}" is starting now!`,
          icon: "/favicon.ico"
        });
      }, timeUntilEvent);
    }
  };

  const handleDeleteEvent = async (eventToDelete) => {
    try {
      if (!isTeacher && eventToDelete.isTeacherEvent) {
        alert('Only teachers can delete this event.');
        return;
      }

      const updatedEvents = events.filter(event => event.id !== eventToDelete.id);
      setEvents(updatedEvents);
      
      if (isTeacher) {
        // Use the correct admin/teacher document
        const adminInitial = sessionStorage.getItem('adminInitial') || 'teacher';
        const teacherRef = doc(db, 'teachers', adminInitial);
        const teacherDoc = await getDoc(teacherRef);
        if (teacherDoc.exists()) {
          const teacherEvents = teacherDoc.data().events || [];
          // Only update if the event actually exists in Firestore
          if (teacherEvents.some(event => event.id === eventToDelete.id)) {
            const filteredTeacherEvents = teacherEvents.filter(event => event.id !== eventToDelete.id);
            await updateDoc(teacherRef, {
              events: filteredTeacherEvents.map(event => ({
                ...event,
                startDate: event.startDate instanceof Date ? event.startDate.toISOString() : event.startDate,
                endDate: event.endDate instanceof Date ? event.endDate.toISOString() : event.endDate,
                startTime: event.startTime instanceof Date ? event.startTime.toISOString() : event.startTime,
                endTime: event.endTime instanceof Date ? event.endTime.toISOString() : event.endTime
              })),
              lastUpdated: new Date().toISOString()
            });
          }
        }
        // Then remove event from all students using batch
        const studentsSnapshot = await getDocs(collection(db, 'students'));
        const batch = writeBatch(db);
        studentsSnapshot.forEach((doc) => {
          const studentData = doc.data();
          const filteredEvents = studentData.events.filter(event => event.id !== eventToDelete.id);
          batch.update(doc.ref, { 
            events: filteredEvents,
            lastUpdated: new Date().toISOString()
          });
        });
        await batch.commit();
      } else {
        // Update current student's events
        await updateDoc(doc(db, 'students', studentId), {
          events: updatedEvents.map(event => ({
            ...event,
            startDate: event.startDate instanceof Date ? event.startDate.toISOString() : event.startDate,
            endDate: event.endDate instanceof Date ? event.endDate.toISOString() : event.endDate,
            startTime: event.startTime instanceof Date ? event.startTime.toISOString() : event.startTime,
            endTime: event.endTime instanceof Date ? event.endTime.toISOString() : event.endTime
          })),
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (error) {
      // Only show error if it's not because the event was already deleted
      if (!/not found|does not exist|No document to update/.test(error.message)) {
        console.error('Error deleting event:', error);
        alert('There was an error deleting the event. Please try again.');
      }
    }
  };

  const handleEditEvent = async (eventToEdit, updatedEvent) => {
    try {
      if (!isTeacher && eventToEdit.isTeacherEvent) {
        alert('Only teachers can edit this event.');
        return;
      }

      // Create new Date objects and ensure they're valid
      const startDate = new Date(updatedEvent.startDate);
      const endDate = new Date(updatedEvent.endDate);
      const startTime = new Date(updatedEvent.startTime);
      const endTime = new Date(updatedEvent.endTime);

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || 
          isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        alert('Invalid date or time values');
        return;
      }

      // Create combined date-time objects in UTC
      const eventStartDateTime = new Date(Date.UTC(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        startTime.getHours(),
        startTime.getMinutes(),
        0,
        0
      ));
      
      const eventEndDateTime = new Date(Date.UTC(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        endTime.getHours(),
        endTime.getMinutes(),
        0,
        0
      ));

      // Validate time range
      if (eventEndDateTime <= eventStartDateTime) {
        alert('End time must be after start time');
        return;
      }

      // Store timezone offset for consistent display
      const timezoneOffset = new Date().getTimezoneOffset();

      const updatedEventData = {
        ...eventToEdit,
        ...updatedEvent,
        startDate: eventStartDateTime.toISOString(),
        endDate: eventEndDateTime.toISOString(),
        startTime: eventStartDateTime.toISOString(),
        endTime: eventEndDateTime.toISOString(),
        timezoneOffset: timezoneOffset
      };

      const updatedEvents = events.map(event => 
        event.id === eventToEdit.id ? {
          ...updatedEventData,
          startDate: eventStartDateTime,
          endDate: eventEndDateTime,
          startTime: eventStartDateTime,
          endTime: eventEndDateTime
        } : event
      );
      
      setEvents(updatedEvents);
      
      if (isTeacher) {
        // Use the correct admin/teacher document
        const adminInitial = sessionStorage.getItem('adminInitial') || 'teacher';
        const teacherRef = doc(db, 'teachers', adminInitial);
        await updateDoc(teacherRef, {
          events: updatedEvents.map(event => ({
            ...event,
            startDate: event.startDate instanceof Date ? event.startDate.toISOString() : event.startDate,
            endDate: event.endDate instanceof Date ? event.endDate.toISOString() : event.endDate,
            startTime: event.startTime instanceof Date ? event.startTime.toISOString() : event.startTime,
            endTime: event.endTime instanceof Date ? event.endTime.toISOString() : event.endTime
          }))
        });

        // Then update event for all students using batch
        const studentsSnapshot = await getDocs(collection(db, 'students'));
        const batch = writeBatch(db);
        
        studentsSnapshot.forEach((doc) => {
          const studentData = doc.data();
          const updatedStudentEvents = studentData.events.map(event => 
            event.id === eventToEdit.id ? updatedEventData : event
          );
          batch.update(doc.ref, { 
            events: updatedStudentEvents,
            lastUpdated: new Date().toISOString()
          });
        });
        
        await batch.commit();
      } else {
        // Update current student's events
        await updateDoc(doc(db, 'students', studentId), {
          events: updatedEvents.map(event => ({
            ...event,
            startDate: event.startDate instanceof Date ? event.startDate.toISOString() : event.startDate,
            endDate: event.endDate instanceof Date ? event.endDate.toISOString() : event.endDate,
            startTime: event.startTime instanceof Date ? event.startTime.toISOString() : event.startTime,
            endTime: event.endTime instanceof Date ? event.endTime.toISOString() : event.endTime
          }))
        });
      }
      
      setShowForm(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error editing event:', error);
      alert('There was an error editing the event. Please try again.');
    }
  };

  const handleDateChange = (date) => {
    setCurrentDate(date);
  };

  const handleViewChange = (type) => {
    setViewType(type);
  };

  const handlePrevMonth = () => {
    setCurrentDate(prevDate => subMonths(prevDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prevDate => addMonths(prevDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (date) => {
    setSelectedDate(date);
    setShowForm(true);
    
    // Create new Date objects for the form
    const startTime = new Date(date);
    startTime.setHours(9, 0, 0, 0);
    
    const endTime = new Date(date);
    endTime.setHours(10, 0, 0, 0);
    
    setFormData({
      name: '',
      eventType: 'sleep',
      startDate: new Date(date),
      endDate: new Date(date),
      startTime: startTime,
      endTime: endTime,
      description: ''
    });
  };

  const handleDragStart = (date, time) => {
    setIsDragging(true);
    setDragStartTime(time);
    setSelectedDate(date);
  };

  const handleDragEnd = (date, time) => {
    if (isDragging) {
      setIsDragging(false);
      setDragEndTime(time);
      setShowForm(true);
      setFormData({
        ...formData,
        date: date,
        startTime: dragStartTime,
        endTime: time
      });
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowForm(true);
    setFormData({
      name: event.name,
      eventType: event.eventType,
      startDate: new Date(event.startTime),
      endDate: new Date(event.endTime),
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      description: event.description || ''
    });
  };

  const adjustForTimezone = (date, timezoneOffset) => {
    if (!date) return new Date(date);
    const localDate = new Date(date);
    
    // If no timezone offset is provided, treat as UTC
    if (typeof timezoneOffset !== 'number') {
      return new Date(localDate.getTime() + new Date().getTimezoneOffset() * 60 * 1000);
    }
    
    // Convert from stored timezone to local timezone
    const currentOffset = new Date().getTimezoneOffset();
    const diffOffset = currentOffset - timezoneOffset;
    return new Date(localDate.getTime() + diffOffset * 60 * 1000);
  };

  const filteredEvents = events.filter(event => {
    const eventDate = adjustForTimezone(event.startDate, event.timezoneOffset);
    if (viewType === 'month') {
      return isSameMonth(eventDate, currentDate);
    }
    return true;
  });

  const calculateDailyStats = () => {
    const today = new Date();
    const todayEvents = events.filter(event => {
      const eventStartDate = adjustForTimezone(event.startDate, event.timezoneOffset);
      return eventStartDate.toDateString() === today.toDateString();
    });
    
    const totalHours = todayEvents.reduce((acc, event) => {
      const eventStart = adjustForTimezone(event.startTime, event.timezoneOffset);
      const eventEnd = adjustForTimezone(event.endTime, event.timezoneOffset);
      const hours = (eventEnd - eventStart) / (1000 * 60 * 60);
      return acc + hours;
    }, 0);
    
    return {
      eventCount: todayEvents.length,
      totalHours: Math.round(totalHours * 10) / 10
    };
  };

  const getEventTypeStats = () => {
    const stats = {};
    let totalHours = 0;

    // Calculate total hours and hours per event type
    events.forEach(event => {
      const eventStart = adjustForTimezone(event.startTime, event.timezoneOffset);
      const eventEnd = adjustForTimezone(event.endTime, event.timezoneOffset);
      // Calculate duration in milliseconds and convert to hours
      const durationHours = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60);
      
      if (!stats[event.eventType]) {
        stats[event.eventType] = 0;
      }
      stats[event.eventType] += durationHours;
      totalHours += durationHours;
    });

    // Convert to percentages and ensure we have entries for all event types
    return Object.keys(eventTypes).map(type => ({
      name: eventTypes[type].name,
      value: totalHours > 0 ? ((stats[type] || 0) / totalHours) * 100 : 0,
      hours: Math.round((stats[type] || 0) * 10) / 10, // Round to 1 decimal place
      color: eventTypes[type].color
    }));
  };

  const getEventStyle = (event) => {
    const eventStart = adjustForTimezone(event.startTime, event.timezoneOffset);
    const eventEnd = adjustForTimezone(event.endTime, event.timezoneOffset);
    const startHour = eventStart.getHours();
    const endHour = eventEnd.getHours();
    const startMinutes = eventStart.getMinutes();
    const endMinutes = eventEnd.getMinutes();
    
    const top = (startHour - 8) * 60 + startMinutes;
    const height = (endHour - startHour) * 60 + (endMinutes - startMinutes);
    
    return {
      top: `${top}px`,
      height: `${height}px`
    };
  };

  const handleTeacherLogin = async () => {
    try {
      if (teacherCode === '!@9584') {
        setIsTeacher(true);
        setIsLoggedIn(true);
        sessionStorage.setItem('userRole', 'teacher');
        
        // Load teacher's events first
        const teacherRef = doc(db, 'teachers', 'teacher');
        const teacherDoc = await getDoc(teacherRef);
        
        if (teacherDoc.exists()) {
          const teacherData = teacherDoc.data();
          const loadedEvents = teacherData.events?.map(event => ({
            ...event,
            startDate: new Date(event.startDate),
            endDate: new Date(event.endDate),
            startTime: new Date(event.startTime),
            endTime: new Date(event.endTime),
            timezoneOffset: event.timezoneOffset || new Date().getTimezoneOffset()
          })) || [];
          setEvents(loadedEvents);
        } else {
          // Create teacher document if it doesn't exist
          await setDoc(teacherRef, {
            events: [],
            lastUpdated: new Date().toISOString()
          });
          setEvents([]);
        }
        
        // Then load all student data for analytics
        await loadAllStudentData();
      } else {
        alert('Invalid teacher code');
      }
    } catch (error) {
      console.error('Error during teacher login:', error);
      alert('There was an error logging in. Please try again.');
    }
  };

  // Add this function to render teacher analytics
  const renderTeacherAnalytics = () => {
    const handleDeleteStudent = async (studentId) => {
      if (!window.confirm(`Are you sure you want to delete student ${studentId}?`)) return;
      try {
        await deleteDoc(doc(db, 'students', studentId));
        setAllStudentData(prev => {
          const newData = { ...prev };
          delete newData[studentId];
          return newData;
        });
      } catch (error) {
        alert('Failed to delete student.');
      }
    };

    const handleClearAllStudents = async () => {
      if (!window.confirm('Are you sure you want to delete ALL student accounts? This cannot be undone.')) return;
      try {
        const studentsSnapshot = await getDocs(collection(db, 'students'));
        const batch = writeBatch(db);
        studentsSnapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
        setAllStudentData({});
      } catch (error) {
        alert('Failed to clear all students.');
      }
    };

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ color: '#FFD700', mb: 4 }}>
          All Students Analytics
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="contained" color="error" onClick={handleClearAllStudents}>
            Clear All Students
          </Button>
        </Box>
        {Object.entries(allStudentData).map(([studentId, studentEvents]) => {
          const stats = getEventTypeStatsForEvents(studentEvents);
          const totalHours = studentEvents.reduce((acc, event) => {
            const duration = (new Date(event.endTime) - new Date(event.startTime)) / (1000 * 60 * 60);
            return acc + duration;
          }, 0);

          return (
            <Paper 
              key={studentId}
              sx={{ 
                mb: 4, 
                p: 3, 
                backgroundColor: 'rgba(45, 74, 50, 0.9)',
                border: '1px solid rgba(255, 215, 0, 0.2)'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" sx={{ color: '#FFD700', mb: 2 }}>
                  Student ID: {studentId}
                </Typography>
                <Button variant="outlined" color="error" size="small" onClick={() => handleDeleteStudent(studentId)}>
                  Delete
                </Button>
              </Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ color: '#FFD700', mb: 2 }}>
                    Activity Distribution
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <Pie 
                      data={{
                        labels: stats.map(stat => stat.name),
                        datasets: [{
                          data: stats.map(stat => stat.value),
                          backgroundColor: stats.map(stat => stat.color)
                        }]
                      }}
                      options={{
                        plugins: {
                          legend: {
                            position: 'right',
                            labels: { color: '#FFD700' }
                          }
                        }
                      }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ color: '#FFD700', mb: 1 }}>
                      Summary
                    </Typography>
                    <Typography sx={{ color: '#FFD700' }}>
                      Total Hours Tracked: {Math.round(totalHours * 10) / 10}
                    </Typography>
                    <Typography sx={{ color: '#FFD700' }}>
                      Total Events: {studentEvents.length}
                    </Typography>
                  </Box>
                  <Box>
                    {stats.map(stat => (
                      <Box key={stat.name} sx={{ mb: 1 }}>
                        <Typography sx={{ color: stat.color }}>
                          {stat.name}: {Math.round(stat.value)}%
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          );
        })}
      </Box>
    );
  };

  // Add this helper function for calculating stats
  const getEventTypeStatsForEvents = (studentEvents) => {
    const stats = {};
    let totalHours = 0;

    studentEvents.forEach(event => {
      const eventStartTime = adjustForTimezone(event.startTime, event.timezoneOffset).getTime();
      const eventEndTime = adjustForTimezone(event.endTime, event.timezoneOffset).getTime();
      const durationHours = (eventEndTime - eventStartTime) / (1000 * 60 * 60);
      
      if (!stats[event.eventType]) {
        stats[event.eventType] = 0;
      }
      stats[event.eventType] += durationHours;
      totalHours += durationHours;
    });

    return Object.keys(eventTypes).map(type => ({
      name: eventTypes[type].name,
      value: totalHours > 0 ? ((stats[type] || 0) / totalHours) * 100 : 0,
      color: eventTypes[type].color
    }));
  };

  const renderCalendarView = () => {
    const stats = calculateDailyStats();
    const daysInMonth = [];
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startingDay = firstDayOfMonth.getDay();

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      daysInMonth.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = events.filter(event => {
        const eventDate = adjustForTimezone(event.startDate, event.timezoneOffset);
        return isSameDay(eventDate, dayDate);
      });

      daysInMonth.push(
        <div 
          key={`day-${day}`} 
          className={`calendar-day ${isSameDay(dayDate, new Date()) ? 'today' : ''}`}
          onClick={() => handleDayClick(dayDate)}
        >
          <div className="day-number">{day}</div>
          <div className="day-events">
            {dayEvents.map(event => (
              <div 
                key={event.id}
                className="event-indicator"
                style={{ backgroundColor: eventTypes[event.eventType].color }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEventClick(event);
                }}
              >
                {format(adjustForTimezone(event.startTime, event.timezoneOffset), 'h:mm a')} - {event.name}
                {event.adminInitial && (
                  <span style={{ marginLeft: '4px', fontSize: '0.8em', opacity: 0.8 }}>
                    ({event.adminInitial})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return (
      <div className="calendar-section">
        <div className="calendar-container">
          <div className="calendar-grid">
            <div className="weekday-header">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
                <div key={day} className="weekday-cell">
                  {day}
                </div>
              ))}
            </div>
            <div className="calendar-body">
              {daysInMonth}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const WeekView = ({ events, currentDate }) => {
    const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8 AM to 6 PM
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - date.getDay() + i);
      return date;
    });

    const formatTime = (hour) => {
      return `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
    };

    const getEventStyle = (event) => {
      const eventStart = adjustForTimezone(event.startTime, event.timezoneOffset);
      const eventEnd = adjustForTimezone(event.endTime, event.timezoneOffset);
      const startHour = eventStart.getHours();
      const endHour = eventEnd.getHours();
      const startMinutes = eventStart.getMinutes();
      const endMinutes = eventEnd.getMinutes();
      
      const top = (startHour - 8) * 60 + startMinutes;
      const height = (endHour - startHour) * 60 + (endMinutes - startMinutes);
      
      return {
        top: `${top}px`,
        height: `${height}px`
      };
    };

    const isToday = (date) => {
      const today = new Date();
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear();
    };

    return (
      <div className="week-view">
        <div className="time-column">
          {hours.map(hour => (
            <div key={hour} className="time-label">
              {formatTime(hour)}
            </div>
          ))}
        </div>
        <div className="week-grid">
          <div className="week-header">
            <div style={{ width: 60 }} /> {/* Spacer for time column */}
            {days.map(date => (
              <div key={date.getTime()} className={`week-day-header ${isToday(date) ? 'today' : ''}`}>
                <div className="week-day-name">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="week-date">{date.getDate()}</div>
              </div>
            ))}
          </div>
          {days.map(date => (
            <div key={date.getTime()} className="week-column">
              {hours.map(hour => (
                <div key={hour} className="time-slot">
                  {events
                    .filter(event => {
                      const eventDate = adjustForTimezone(event.startTime, event.timezoneOffset);
                      return eventDate.getDate() === date.getDate() &&
                             eventDate.getMonth() === date.getMonth();
                    })
                    .map(event => (
                      <div
                        key={event.id}
                        className={`week-event ${event.eventType.toLowerCase()}`}
                        style={getEventStyle(event)}
                      >
                        <div className="event-time">
                          {adjustForTimezone(event.startTime, event.timezoneOffset).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                        <div className="event-title">{event.name}</div>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          ))}
          <CurrentTimeLine />
        </div>
      </div>
    );
  };

  const CurrentTimeLine = () => {
    const [top, setTop] = useState(0);

    useEffect(() => {
      const updateTime = () => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const top = (hours - 8) * 60 + minutes;
        setTop(top);
      };

      updateTime();
      const interval = setInterval(updateTime, 60000); // Update every minute

      return () => clearInterval(interval);
    }, []);

    if (top < 0 || top > 600) return null; // Only show during business hours

    return (
      <div className="current-time-line" style={{ top: `${top}px` }}>
        <div className="current-time-dot" />
      </div>
    );
  };

  const renderTaskOverview = () => {
    const groupedEvents = events.reduce((acc, event) => {
      if (!acc[event.eventType]) {
        acc[event.eventType] = [];
      }
      acc[event.eventType].push(event);
      return acc;
    }, {});

    return (
      <Box sx={{ p: { xs: 1, sm: 3 } }}>
        <Typography variant="h5" sx={{ color: '#FFD700', mb: 3 }}>Task Overview</Typography>
        {Object.entries(groupedEvents).map(([type, typeEvents]) => (
          <Paper 
            key={type} 
            sx={{ 
              mb: 3, 
              p: { xs: 1, sm: 2 }, 
              backgroundColor: 'rgba(45, 74, 50, 0.9)',
              border: '1px solid rgba(255, 215, 0, 0.2)'
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                color: eventTypes[type].color,
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                fontSize: { xs: '1rem', sm: '1.25rem' }
              }}
            >
              {eventTypes[type].name}
              <Typography variant="body2" sx={{ color: '#FFD700' }}>
                ({typeEvents.length} tasks)
              </Typography>
            </Typography>
            
            <Grid container spacing={2}>
              {typeEvents.map(event => (
                <Grid item xs={12} sm={6} lg={4} key={event.id}>
                  <Paper sx={{ 
                    p: { xs: 1, sm: 2 }, 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${eventTypes[type].color}`,
                    height: '100%'
                  }}>
                    <Typography variant="subtitle1" sx={{ color: '#FFD700', mb: 1, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      {event.name}
                      {event.adminInitial && (
                        <span style={{ marginLeft: '4px', fontSize: '0.8em', opacity: 0.8 }}>
                          ({event.adminInitial})
                        </span>
                      )}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#FFD700', opacity: 0.8, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      Date: {format(adjustForTimezone(event.startDate, event.timezoneOffset), 'PPP')}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#FFD700', opacity: 0.8, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      Time: {format(adjustForTimezone(event.startTime, event.timezoneOffset), 'p')} - {format(adjustForTimezone(event.endTime, event.timezoneOffset), 'p')}
                    </Typography>
                    {event.description && (
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#FFD700', 
                          opacity: 0.8,
                          mt: 1,
                          fontStyle: 'italic',
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}
                      >
                        "{event.description}"
                      </Typography>
                    )}
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <IconButton 
                        onClick={() => handleDeleteEvent(event)}
                        sx={{ color: '#FFD700' }}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        ))}
      </Box>
    );
  };

  const renderAnalytics = () => {
    const stats = getEventTypeStats();
    
    const pieChartData = {
      labels: stats.map(stat => stat.name),
      datasets: [
        {
          data: stats.map(stat => stat.value),
          backgroundColor: stats.map(stat => stat.color),
          borderColor: stats.map(stat => stat.color),
          borderWidth: 1,
        },
      ],
    };

    const barChartData = {
      labels: stats.map(stat => stat.name),
      datasets: [
        {
          label: 'Hours Spent',
          data: stats.map(stat => stat.hours), // Use the calculated hours
          backgroundColor: stats.map(stat => stat.color),
          borderColor: stats.map(stat => stat.color),
          borderWidth: 1,
        },
      ],
    };

    const barOptions = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#FFD700'
          }
        },
        title: {
          display: true,
          text: 'Hours Spent per Activity',
          color: '#FFD700'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Hours',
            color: '#FFD700'
          },
          ticks: {
            color: '#FFD700'
          },
          grid: {
            color: 'rgba(255, 215, 0, 0.1)'
          }
        },
        x: {
          ticks: {
            color: '#FFD700'
          },
          grid: {
            color: 'rgba(255, 215, 0, 0.1)'
          }
        }
      }
    };

    const pieOptions = {
      responsive: true,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#FFD700'
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const stat = stats[context.dataIndex];
              return `${stat.name}: ${Math.round(stat.value)}% (${stat.hours} hours)`;
            }
          }
        }
      }
    };

    return (
      <div className="analytics-container">
        <h2>Analytics Overview</h2>
        <div className="charts-container">
          <div className="chart-wrapper">
            <h3>Activity Distribution</h3>
            <Pie data={pieChartData} options={pieOptions} />
          </div>
          <div className="chart-wrapper">
            <h3>Time Spent Analysis</h3>
            <Bar data={barChartData} options={barOptions} />
          </div>
        </div>
      </div>
    );
  };

  const renderMainContent = () => {
    if (isTeacher) {
      switch (viewType) {
        case 'month':
          return renderCalendarView();
        case 'week':
          return <WeekView events={events} currentDate={currentDate} />;
        case 'analytics':
          return renderTeacherAnalytics();
        case 'tasks':
          return renderTaskOverview();
        default:
          return renderCalendarView();
      }
    }

    switch (viewType) {
      case 'month':
        return renderCalendarView();
      case 'week':
        return <WeekView events={events} currentDate={currentDate} />;
      case 'analytics':
        return renderAnalytics();
      case 'tasks':
        return renderTaskOverview();
      default:
        return renderCalendarView();
    }
  };

  // Add this function to handle admin login
  const handleAdminLogin = async () => {
    try {
      if (!['C', 'K', 'B', 'V'].includes(adminInitial.toUpperCase())) {
        alert('Invalid administrator initial. Please use C, K, B, or V.');
        return;
      }

      const initial = adminInitial.toUpperCase();
      
      // If this is the first time logging in, save the passcode
      if (!adminPasscodes[initial]) {
        if (!adminPasscode) {
          alert('Please enter a passcode');
          return;
        }
        const newPasscodes = {
          ...adminPasscodes,
          [initial]: adminPasscode
        };
        setAdminPasscodes(newPasscodes);
        sessionStorage.setItem('adminPasscodes', JSON.stringify(newPasscodes));
      } else if (adminPasscode !== adminPasscodes[initial]) {
        alert('Incorrect passcode');
        return;
      }

      setIsTeacher(true);
      setIsLoggedIn(true);
      sessionStorage.setItem('userRole', 'admin');
      sessionStorage.setItem('adminInitial', initial);
      
      // Load admin's events
      const adminRef = doc(db, 'teachers', initial);
      const adminDoc = await getDoc(adminRef);
      
      if (adminDoc.exists()) {
        const adminData = adminDoc.data();
        const loadedEvents = adminData.events?.map(event => ({
          ...event,
          startDate: new Date(event.startDate),
          endDate: new Date(event.endDate),
          startTime: new Date(event.startTime),
          endTime: new Date(event.endTime),
          timezoneOffset: event.timezoneOffset || new Date().getTimezoneOffset()
        })) || [];
        setEvents(loadedEvents);
      } else {
        // Create admin document if it doesn't exist
        await setDoc(adminRef, {
          events: [],
          lastUpdated: new Date().toISOString()
        });
        setEvents([]);
      }
      
      // Load all student data for analytics
      await loadAllStudentData();
      
      // Reset form
      setAdminInitial('');
      setAdminPasscode('');
      setShowAdminLogin(false);
    } catch (error) {
      console.error('Error during admin login:', error);
      alert('There was an error logging in. Please try again.');
    }
  };

  // Update sendChatMessage to call the backend proxy
  const sendChatMessage = async (message) => {
    setIsChatLoading(true);
    setChatMessages((prev) => [...prev, { sender: 'user', text: message }]);
    setChatInput('');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are Homework Buddy, an AI assistant that helps students with homework and assignments. Be helpful, friendly, and concise.' },
            ...chatMessages.map(msg => ({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text })),
            { role: 'user', content: message }
          ]
        })
      });
      if (!response.ok) throw new Error('Failed to get response from AI');
      const data = await response.json();
      const aiText = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
      setChatMessages((prev) => [...prev, { sender: 'ai', text: aiText }]);
    } catch (error) {
      setChatMessages((prev) => [...prev, { sender: 'ai', text: 'Sorry, there was an error contacting Homework Buddy. Please try again.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <Paper className="login-paper">
          <Typography variant="h4" component="h1" className="login-title">
            C4 P.A.S.E. Daily Tracker
          </Typography>
          
          {!showAdminLogin ? (
            <>
              <Typography variant="subtitle1" className="login-subtitle">
                Please enter your Student ID to continue
              </Typography>
              
              <TextField
                fullWidth
                variant="outlined"
                label="Student ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                sx={{ 
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    '& fieldset': {
                      borderColor: '#2d4a32',
                      borderWidth: '2px',
                    },
                    '&:hover fieldset': {
                      borderColor: '#1a3a1f',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#2d4a32',
                    },
                    '& input': {
                      color: 'green !important',
                      'caretColor': 'green',
                      'fontSize': '1.1rem',
                      'padding': '14px',
                      'WebkitTextFillColor': 'green',
                    },
                    '& input:-webkit-autofill': {
                      WebkitTextFillColor: 'green',
                      transition: 'background-color 5000s ease-in-out 0s',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'green !important',
                    '&.Mui-focused': {
                      color: 'green !important',
                    },
                  },
                }}
              />
              
              <TextField
                fullWidth
                variant="outlined"
                label="Password"
                type="password"
                value={studentPassword}
                onChange={(e) => setStudentPassword(e.target.value)}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    '& fieldset': {
                      borderColor: '#2d4a32',
                      borderWidth: '2px',
                    },
                    '&:hover fieldset': {
                      borderColor: '#1a3a1f',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#2d4a32',
                    },
                    '& input': {
                      color: 'green !important',
                      'caretColor': 'green',
                      'fontSize': '1.1rem',
                      'padding': '14px',
                      'WebkitTextFillColor': 'green',
                    },
                    '& input:-webkit-autofill': {
                      WebkitTextFillColor: 'green',
                      transition: 'background-color 5000s ease-in-out 0s',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'green !important',
                    '&.Mui-focused': {
                      color: 'green !important',
                    },
                  },
                }}
              />
              
              <Button 
                variant="contained" 
                onClick={handleLogin}
                fullWidth
                className="login-button"
                size="large"
                sx={{ mb: 2 }}
              >
                Login as Student
              </Button>

              <Button
                variant="outlined"
                onClick={() => setShowAdminLogin(true)}
                fullWidth
                sx={{
                  borderColor: '#2d4a32',
                  color: 'green !important',
                  backgroundColor: 'white',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#1a3a1f',
                    backgroundColor: 'rgba(45, 74, 50, 0.1)'
                  }
                }}
              >
                ADMINISTRATOR LOGIN
              </Button>
            </>
          ) : (
            <>
              <Typography variant="subtitle1" className="login-subtitle">
                Please enter your administrator initial and passcode
              </Typography>
              
              <TextField
                fullWidth
                variant="outlined"
                label="Administrator Initial (C/K/B/V)"
                value={adminInitial}
                onChange={(e) => setAdminInitial(e.target.value)}
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    '& fieldset': {
                      borderColor: '#2d4a32',
                      borderWidth: '2px',
                    },
                    '&:hover fieldset': {
                      borderColor: '#1a3a1f',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#2d4a32',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'green !important',
                    '&.Mui-focused': {
                      color: 'green !important',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: 'green',
                    fontSize: '1.1rem',
                    padding: '14px',
                  },
                }}
              />

              <TextField
                fullWidth
                variant="outlined"
                label="Passcode"
                type="password"
                value={adminPasscode}
                onChange={(e) => setAdminPasscode(e.target.value)}
                sx={{ 
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    '& fieldset': {
                      borderColor: '#2d4a32',
                      borderWidth: '2px',
                    },
                    '&:hover fieldset': {
                      borderColor: '#1a3a1f',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#2d4a32',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'green !important',
                    '&.Mui-focused': {
                      color: 'green !important',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: 'green',
                    fontSize: '1.1rem',
                    padding: '14px',
                  },
                }}
              />
              
              <Button 
                variant="contained" 
                onClick={handleAdminLogin}
                fullWidth
                className="login-button"
                size="large"
                sx={{ mb: 2 }}
              >
                Login as Administrator
              </Button>

              <Button
                variant="outlined"
                onClick={() => setShowAdminLogin(false)}
                fullWidth
                sx={{
                  borderColor: '#2d4a32',
                  color: 'green',
                  backgroundColor: 'white',
                  '&:hover': {
                    borderColor: '#1a3a1f',
                    backgroundColor: 'rgba(45, 74, 50, 0.1)'
                  }
                }}
              >
                Back to Student Login
              </Button>
            </>
          )}
        </Paper>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Container maxWidth="lg">
        <Paper className="dashboard-header">
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' }, 
            alignItems: { xs: 'stretch', sm: 'center' }, 
            justifyContent: 'space-between',
            gap: 2
          }}>
            <Box>
              <Typography className="dashboard-title" component="h1">
                C4 P.A.S.E Daily Tracker
              </Typography>
              <Typography className="student-id-text">
                <span role="img" aria-label="id-card">🆔</span>
                Student ID: {studentId}
              </Typography>
            </Box>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1,
              width: { xs: '100%', sm: 'auto' }
            }}>
              <Button 
                variant="outlined" 
                onClick={handleLogout}
                fullWidth
                sx={{ 
                  borderColor: '#2d4a32',
                  color: '#2d4a32',
                  '&:hover': {
                    borderColor: '#1a3a1f',
                    backgroundColor: 'rgba(45, 74, 50, 0.1)'
                  }
                }}
              >
                Logout
              </Button>
              <Button
                variant="contained"
                startIcon={<NotificationsIcon />}
                onClick={requestNotificationPermission}
                fullWidth
                sx={{ 
                  backgroundColor: '#2d4a32',
                  color: '#FFD700',
                  '&:hover': { 
                    backgroundColor: '#1a3a1f'
                  }
                }}
              >
                Notifications
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowForm(true)}
                fullWidth
                sx={{ 
                  backgroundColor: '#FFD700',
                  color: '#2d4a32',
                  '&:hover': {
                    backgroundColor: '#FFC107'
                  }
                }}
              >
                Add Event
              </Button>
              <Button
                variant="contained"
                startIcon={<ChatIcon />}
                onClick={() => setShowStudySystem(true)}
                fullWidth
                sx={{ backgroundColor: 'green', color: 'white', '&:hover': { backgroundColor: '#388e3c' } }}
              >
                Start
              </Button>
            </Box>
          </Box>
        </Paper>

        <div className="dashboard-content">
          <Box>
            <Paper sx={{ p: 2, mb: 3, backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2, 
                justifyContent: 'space-between', 
                alignItems: 'stretch'
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 1,
                  width: { xs: '100%', sm: 'auto' }
                }}>
                  <Button
                    variant={viewType === 'month' ? 'contained' : 'outlined'}
                    startIcon={<CalendarIcon />}
                    onClick={() => handleViewChange('month')}
                    fullWidth
                    sx={{ 
                      ...(viewType === 'month' && {
                        backgroundColor: '#FFD700',
                        color: '#2d4a32',
                        '&:hover': { backgroundColor: '#FFC107' }
                      })
                    }}
                  >
                    Month
                  </Button>
                  <Button
                    variant={viewType === 'week' ? 'contained' : 'outlined'}
                    startIcon={<WeekIcon />}
                    onClick={() => handleViewChange('week')}
                    fullWidth
                    sx={{ 
                      ...(viewType === 'week' && {
                        backgroundColor: '#FFD700',
                        color: '#2d4a32',
                        '&:hover': { backgroundColor: '#FFC107' }
                      })
                    }}
                  >
                    Week
                  </Button>
                  <Button
                    variant={viewType === 'analytics' ? 'contained' : 'outlined'}
                    startIcon={<GridIcon />}
                    onClick={() => handleViewChange('analytics')}
                    fullWidth
                    sx={{ 
                      ...(viewType === 'analytics' && {
                        backgroundColor: '#FFD700',
                        color: '#2d4a32',
                        '&:hover': { backgroundColor: '#FFC107' }
                      })
                    }}
                  >
                    Analytics
                  </Button>
                  <Button
                    variant={viewType === 'tasks' ? 'contained' : 'outlined'}
                    startIcon={<ListIcon />}
                    onClick={() => handleViewChange('tasks')}
                    fullWidth
                    sx={{ 
                      ...(viewType === 'tasks' && {
                        backgroundColor: '#FFD700',
                        color: '#2d4a32',
                        '&:hover': { backgroundColor: '#FFC107' }
                      })
                    }}
                  >
                    Tasks
                  </Button>
                </Box>
                {(viewType === 'month' || viewType === 'week') && (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 1,
                    alignItems: 'center',
                    width: { xs: '100%', sm: 'auto' }
                  }}>
                    <Button
                      variant="outlined"
                      startIcon={<ChevronLeft />}
                      onClick={handlePrevMonth}
                      fullWidth
                      sx={{ 
                        borderColor: '#FFD700',
                        color: '#FFD700',
                        '&:hover': {
                          borderColor: '#FFC107',
                          backgroundColor: 'rgba(255, 215, 0, 0.1)'
                        }
                      }}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleToday}
                      fullWidth
                      sx={{ 
                        backgroundColor: '#FFD700',
                        color: '#2d4a32',
                        '&:hover': { backgroundColor: '#FFC107' }
                      }}
                    >
                      Today
                    </Button>
                    <Button
                      variant="outlined"
                      endIcon={<ChevronRight />}
                      onClick={handleNextMonth}
                      fullWidth
                      sx={{ 
                        borderColor: '#FFD700',
                        color: '#FFD700',
                        '&:hover': {
                          borderColor: '#FFC107',
                          backgroundColor: 'rgba(255, 215, 0, 0.1)'
                        }
                      }}
                    >
                      Next
                    </Button>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: '#FFD700',
                        display: { xs: 'none', sm: 'block' },
                        ml: 2 
                      }}
                    >
                      {format(currentDate, 'MMMM yyyy')}
                    </Typography>
                  </Box>
                )}
              </Box>
              {(viewType === 'month' || viewType === 'week') && (
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: '#FFD700',
                    display: { xs: 'block', sm: 'none' },
                    textAlign: 'center',
                    mt: 2
                  }}
                >
                  {format(currentDate, 'MMMM yyyy')}
                </Typography>
              )}
            </Paper>

            <Paper sx={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
              {renderMainContent()}
            </Paper>
          </Box>
        </div>

        <Dialog
          open={showForm}
          onClose={() => setShowForm(false)}
          maxWidth="sm"
          fullWidth
          keepMounted
          disablePortal
          aria-labelledby="event-dialog-title"
          aria-describedby="event-dialog-description"
          sx={{
            '& .MuiDialog-container': {
              '&:focus': {
                outline: 'none'
              }
            }
          }}
        >
          <DialogTitle 
            id="event-dialog-title"
            sx={{ backgroundColor: '#2d4a32', color: '#FFD700' }}
          >
            {selectedEvent ? 'Edit Event' : 'Add New Event'}
            {selectedEvent?.isTeacherEvent && (
              <Typography variant="caption" sx={{ display: 'block', color: '#FFD700', opacity: 0.8 }}>
                Teacher Event
              </Typography>
            )}
          </DialogTitle>
          <DialogContent 
            id="event-dialog-description"
            sx={{ backgroundColor: '#2d4a32', color: '#FFD700', pt: 2 }}
          >
            <Stack spacing={2}>
              <TextField
                label="Event Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                  }
                }}
              />
              <FormControl fullWidth>
                <InputLabel>Event Type</InputLabel>
                <Select
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                  label="Event Type"
                  sx={{
                    backgroundColor: 'white'
                  }}
                >
                  {Object.entries(eventTypes).map(([key, { name }]) => (
                    <MenuItem key={key} value={key}>{name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={formData.startDate}
                  onChange={(newValue) => setFormData({ ...formData, startDate: newValue })}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      sx: {
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                        }
                      }
                    } 
                  }}
                />
                <TimePicker
                  label="Start Time"
                  value={formData.startTime}
                  onChange={(newValue) => setFormData({ ...formData, startTime: newValue })}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      sx: {
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                        }
                      }
                    } 
                  }}
                />
                <DatePicker
                  label="End Date"
                  value={formData.endDate}
                  onChange={(newValue) => setFormData({ ...formData, endDate: newValue })}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      sx: {
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                        }
                      }
                    } 
                  }}
                />
                <TimePicker
                  label="End Time"
                  value={formData.endTime}
                  onChange={(newValue) => setFormData({ ...formData, endTime: newValue })}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      sx: {
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                        }
                      }
                    } 
                  }}
                />
              </LocalizationProvider>
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                fullWidth
                multiline
                rows={4}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                  }
                }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, backgroundColor: '#2d4a32' }}>
            <Button 
              onClick={() => setShowForm(false)}
              sx={{ color: '#FFD700' }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => selectedEvent ? handleEditEvent(selectedEvent, formData) : handleAddEvent(formData)} 
              variant="contained"
              sx={{ 
                backgroundColor: '#FFD700',
                color: '#2d4a32',
                '&:hover': {
                  backgroundColor: '#FFC107'
                }
              }}
            >
              {selectedEvent ? 'Save Changes' : 'Add Event'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Homework Buddy Chat Dialog */}
        <Dialog
          open={showStudySystem}
          onClose={() => setShowStudySystem(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ backgroundColor: 'green', color: 'white' }}>Homework Buddy</DialogTitle>
          <DialogContent sx={{ backgroundColor: '#f5fff5', minHeight: 400 }}>
            <Box sx={{ maxHeight: 300, overflowY: 'auto', mb: 2 }}>
              {chatMessages.map((msg, idx) => (
                <Box key={idx} sx={{ mb: 1, textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
                  <Paper sx={{ display: 'inline-block', p: 1.5, backgroundColor: msg.sender === 'user' ? '#c8e6c9' : '#e8f5e9', color: '#2d4a32' }}>
                    {msg.text}
                  </Paper>
                </Box>
              ))}
              {isChatLoading && <Typography sx={{ color: 'green' }}>Homework Buddy is typing...</Typography>}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && chatInput.trim()) sendChatMessage(chatInput); }}
                placeholder="Type your homework question..."
                sx={{ backgroundColor: 'white' }}
              />
              <Button
                variant="contained"
                color="success"
                disabled={!chatInput.trim() || isChatLoading}
                onClick={() => sendChatMessage(chatInput)}
              >
                Send
              </Button>
            </Box>
          </DialogContent>
          <DialogActions sx={{ backgroundColor: '#e8f5e9' }}>
            <Button onClick={() => setShowStudySystem(false)} sx={{ color: 'green' }}>Close</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </div>
  );
}

export default App; 
