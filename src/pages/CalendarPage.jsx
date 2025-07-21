// src/pages/CalendarPage.jsx (Updated with Dispatch Tab)

import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { listenToJobCards, updateDocument, getEmployees, getAllInventoryItems, getTools, getToolAccessories } from '../api/firestore';
import JobDetailsModal from '../components/features/tracking/JobDetailsModal';
import Button from '../components/ui/Button';
import SchedulingAssistantModal from '../components/features/calendar/SchedulingAssistantModal';
import DispatchQueue from '../components/features/dispatch/DispatchQueue';
import { Bot, Calendar as CalendarIcon, ListOrdered } from 'lucide-react';
import toast from 'react-hot-toast';

const localizer = momentLocalizer(moment);

const TabButton = ({ id, label, icon, activeTab, setActiveTab }) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`px-5 py-2 text-sm font-semibold rounded-t-lg border-b-2 flex items-center gap-2 transition-colors ${
          isActive ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-200'
        }`}
      >
        {icon}
        {label}
      </button>
    );
};

const CalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [activeTab, setActiveTab] = useState('calendar');
  
  const [employeeHourlyRates, setEmployeeHourlyRates] = useState({});
  const [allEmployees, setAllEmployees] = useState([]);
  const [allInventoryItems, setAllInventoryItems] = useState([]);
  const [allTools, setAllTools] = useState([]);
  const [allToolAccessories, setAllToolAccessories] = useState([]);
  
  const [isAssistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    let unsubscribeJobs;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [fetchedEmployees, fetchedInventory, fetchedTools, fetchedToolAccessories] = await Promise.all([
          getEmployees(),
          getAllInventoryItems(),
          getTools(),
          getToolAccessories(),
        ]);
        setAllEmployees(fetchedEmployees);
        setAllInventoryItems(fetchedInventory);
        setAllTools(fetchedTools);
        setAllToolAccessories(fetchedToolAccessories);

        const rates = fetchedEmployees.reduce((acc, emp) => {
          acc[emp.id] = emp.hourlyRate || 0;
          return acc;
        }, {});
        setEmployeeHourlyRates(rates);

        unsubscribeJobs = listenToJobCards((fetchedJobs) => {
          const calendarEvents = fetchedJobs
            .filter(job => job.scheduledDate)
            .map(job => ({
              id: job.id,
              title: `${job.jobId} - ${job.partName}`,
              start: job.scheduledDate.toDate(),
              end: moment(job.scheduledDate.toDate()).add(job.estimatedTime || 60, 'minutes').toDate(),
              allDay: false,
              resource: job
            }));
          setEvents(calendarEvents);
          setLoading(false);
        });
      } catch (err) {
        console.error("Error fetching calendar data:", err);
        setError("Failed to load calendar data.");
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      if (unsubscribeJobs) unsubscribeJobs();
    };
  }, []);

  const handleSelectEvent = (event) => {
    setSelectedJob(event.resource);
  };

  const handleEventDrop = async ({ event, start, end }) => {
    toast((t) => (
        <span>
            Reschedule "{event.title}" to {moment(start).format('LLL')}?
            <Button variant="primary" size="sm" className="ml-2" onClick={async () => {
                toast.dismiss(t.id);
                try {
                    await updateDocument('createdJobCards', event.id, { scheduledDate: start });
                    toast.success('Job rescheduled successfully!');
                } catch (err) {
                    console.error("Error rescheduling job:", err);
                    toast.error('Failed to reschedule job.');
                }
            }}>
                Confirm
            </Button>
            <Button variant="secondary" size="sm" className="ml-2" onClick={() => toast.dismiss(t.id)}>
                Cancel
            </Button>
        </span>
    ));
  };
  
  const handleScheduleComplete = () => {
    setAssistantOpen(false);
    toast.success("Jobs have been scheduled successfully and added to the calendar!");
  };

  if (error) return <p className="text-center text-red-400">{error}</p>;

  return (
    <>
      <style jsx>{`
        .rbc-calendar { font-family: 'Inter', sans-serif; color: #e2e8f0; background-color: #1f2937; border-radius: 0.75rem; border: 1px solid #374151; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); padding: 1.5rem; height: 100%; }
        .rbc-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid #374151; }
        .rbc-toolbar .rbc-toolbar-label { font-size: 1.5rem; font-weight: 700; color: #f9fafb; flex-grow: 1; text-align: center; }
        .rbc-toolbar button { border: none; background-color: #4b5563; color: #f9fafb; padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; transition: background-color 0.2s ease-in-out; cursor: pointer; }
        .rbc-toolbar button:hover { background-color: #6b7280; }
        .rbc-toolbar button.rbc-active { background-color: #2563eb; color: white; }
        .rbc-toolbar .rbc-btn-group { display: flex; gap: 0.5rem; }
        .rbc-header { padding: 0.5rem 0; font-size: 0.875rem; color: #9ca3af; border-bottom: 1px solid #374151; text-align: center; }
        .rbc-header + .rbc-header { border-left: none; }
        .rbc-month-view, .rbc-time-view, .rbc-agenda-view { border: none; }
        .rbc-row-content { border-top: 1px solid #374151; }
        .rbc-day-bg { border-right: 1px solid #374151; }
        .rbc-day-bg:last-child { border-right: none; }
        .rbc-off-range-bg { background-color: #111827; }
        .rbc-current-time-indicator { background-color: #ef4444; }
        .rbc-today { background-color: #3b82f61a; }
        .rbc-event { background-color: #1d4ed8; border: 1px solid #3b82f6; color: white !important; border-radius: 0.375rem; font-size: 0.875rem; padding: 0.25rem 0.5rem; cursor: pointer; transition: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out; }
        .rbc-event:hover { background-color: #3b82f6; border-color: #60a5fa; }
        .rbc-event.rbc-selected { background-color: #6366f1; border-color: #a78bfa; }
        .rbc-event-content { white-space: normal; }
        .rbc-agenda-table { border: 1px solid #374151; border-radius: 0.75rem; }
        .rbc-agenda-table thead th { color: #9ca3af; border-bottom: 1px solid #374151; }
        .rbc-agenda-table tbody td { border-bottom: 1px solid #374151; color: #e2e8f0; }
        .rbc-agenda-time-cell { color: #9ca3af; }
      `}</style>
      <div className="space-y-4 h-full flex flex-col">
        <div className="flex justify-between items-center flex-shrink-0">
            <h2 className="text-3xl font-bold text-white">Workshop Scheduling</h2>
            <Button onClick={() => setAssistantOpen(true)} variant="primary">
                <Bot size={18} className="mr-2"/>
                Scheduling Assistant
            </Button>
        </div>
        
        <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-6">
                <TabButton id="calendar" label="Calendar View" icon={<CalendarIcon size={16}/>} activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton id="dispatch" label="Dispatch Queue" icon={<ListOrdered size={16}/>} activeTab={activeTab} setActiveTab={setActiveTab} />
            </nav>
        </div>

        {loading ? <p className="text-center text-gray-400">Loading...</p> : (
            <div className="flex-grow min-h-0"> 
                {activeTab === 'calendar' && (
                    <Calendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        selectable
                        resizable
                        draggableAccessor={() => true}
                        onEventDrop={handleEventDrop}
                        onSelectEvent={handleSelectEvent}
                        defaultView="week"
                        views={['month', 'week', 'day', 'agenda']}
                    />
                )}
                {activeTab === 'dispatch' && <DispatchQueue />}
            </div>
        )}
      </div>
      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          currentTime={Date.now()}
          employeeHourlyRates={employeeHourlyRates}
          overheadCostPerHour={0} // Overhead cost is calculated on the live tracking page, not needed here
          allEmployees={allEmployees}
          allInventoryItems={allInventoryItems}
          allTools={allTools}
          allToolAccessories={allToolAccessories}
          onUpdateJob={() => {}}
          onDeleteJob={() => {}}
        />
      )}
      {isAssistantOpen && (
        <SchedulingAssistantModal 
            onClose={() => setAssistantOpen(false)}
            onScheduleComplete={handleScheduleComplete}
        />
      )}
    </>
  );
};

export default CalendarPage;
