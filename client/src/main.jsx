import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import HabitCalendar from './HabitCalendar.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HabitCalendar />
  </StrictMode>
);
