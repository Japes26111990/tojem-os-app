import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const CalendarApplet = () => {
  const [date, setDate] = useState(new Date());

  return (
    <div className="p-2 text-white">
        {/* This style block helps the calendar theme match our dark mode app */}
        <style>{`
            .react-calendar { background: transparent; border: none; }
            .react-calendar__tile:enabled:hover, .react-calendar__tile:enabled:focus { background-color: #374151; }
            .react-calendar__tile--now { background-color: #3b82f6 !important; color: white !important; }
            .react-calendar__tile--active { background-color: #1d4ed8 !important; color: white !important; }
            .react-calendar__month-view__days__day--neighboringMonth { color: #6b7280 !important; }
        `}</style>
        <Calendar 
            onChange={setDate} 
            value={date} 
            className="bg-transparent border-none"
        />
    </div>
  );
};

export default CalendarApplet;