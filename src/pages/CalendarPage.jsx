import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css'; // Keep the base CSS
import { listenToJobCards, updateDocument } from '../api/firestore'; // Import necessary Firestore functions
import JobDetailsModal from '../components/features/tracking/JobDetailsModal'; // Reuse existing modal
import { getEmployees, getAllInventoryItems, getTools, getToolAccessories } from '../api/firestore'; // For JobDetailsModal props
import Button from '../components/ui/Button'; // Import your custom Button component for toolbar

const localizer = momentLocalizer(moment);

const CalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null); // For JobDetailsModal
  
  // Data for JobDetailsModal (Employee hourly rates, allEmployees, etc.)
  const [employeeHourlyRates, setEmployeeHourlyRates] = useState({});
  const [allEmployees, setAllEmployees] = useState([]);
  const [allInventoryItems, setAllInventoryItems] = useState([]);
  const [allTools, setAllTools] = useState([]);
  const [allToolAccessories, setAllToolAccessories] = useState([]);


  useEffect(() => {
    let unsubscribeJobs;
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all data required by JobDetailsModal first
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

        // Map employee hourly rates for the modal
        const rates = fetchedEmployees.reduce((acc, emp) => {
          acc[emp.id] = emp.hourlyRate || 0;
          return acc;
        }, {});
        setEmployeeHourlyRates(rates);

        // Listen to job cards for real-time calendar updates
        unsubscribeJobs = listenToJobCards((fetchedJobs) => {
          const calendarEvents = fetchedJobs
            .filter(job => job.scheduledDate) // Only show jobs with a scheduledDate
            .map(job => ({
              id: job.id,
              title: `${job.jobId} - ${job.partName}`,
              start: job.scheduledDate.toDate(), // Convert Firestore Timestamp to Date object
              end: moment(job.scheduledDate.toDate()).add(job.estimatedTime || 60, 'minutes').toDate(), // Estimate end time
              allDay: false, // Jobs typically aren't all-day
              resource: job // Store the full job object for the modal
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
    setSelectedJob(event.resource); // Open the JobDetailsModal with the full job object
  };

  const handleEventDrop = async ({ event, start, end }) => {
    // This is called when an event is dragged and dropped
    // Note: react-big-calendar passes the original event object, so event.id is the job.id
    if (window.confirm(`Are you sure you want to reschedule "${event.title}" to ${moment(start).format('LLL')}?`)) {
      try {
        await updateDocument('createdJobCards', event.id, {
          scheduledDate: start // Update only the scheduledDate
        });
        alert('Job rescheduled successfully!');
        // The listenToJobCards will automatically update the calendar UI
      } catch (err) {
        console.error("Error rescheduling job:", err);
        alert('Failed to reschedule job.');
      }
    }
  };

  if (loading) return <MainLayout><p className="text-center text-gray-400">Loading Calendar...</p></MainLayout>;
  if (error) return <MainLayout><p className="text-center text-red-400">{error}</p></MainLayout>;

  return (
    <MainLayout>
      {/* Custom CSS overrides for react-big-calendar */}
      <style jsx>{`
        /* Main Calendar Container */
        .rbc-calendar {
          font-family: 'Inter', sans-serif;
          color: #e2e8f0; /* gray-200 */
          background-color: #1f2937; /* gray-800, slightly darker than main layout for contrast */
          border-radius: 0.75rem; /* rounded-xl */
          border: 1px solid #374151; /* gray-700 */
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); /* shadow-lg */
          padding: 1.5rem; /* p-6 */
        }

        /* Toolbar */
        .rbc-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #374151; /* gray-700 */
        }
        .rbc-toolbar .rbc-toolbar-label {
          font-size: 1.5rem; /* text-2xl */
          font-weight: 700; /* font-bold */
          color: #f9fafb; /* gray-50 */
          flex-grow: 1;
          text-align: center;
        }
        .rbc-toolbar button {
          border: none;
          background-color: #4b5563; /* gray-600 */
          color: #f9fafb;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem; /* rounded-lg */
          font-weight: 600; /* font-semibold */
          transition: background-color 0.2s ease-in-out;
          cursor: pointer;
        }
        .rbc-toolbar button:hover {
          background-color: #6b7280; /* gray-500 */
        }
        .rbc-toolbar button.rbc-active {
          background-color: #2563eb; /* blue-600 */
          color: white;
        }
        .rbc-toolbar .rbc-btn-group {
          display: flex;
          gap: 0.5rem;
        }

        /* Header (Day names like Sun, Mon) */
        .rbc-header {
          padding: 0.5rem 0;
          font-size: 0.875rem; /* text-sm */
          color: #9ca3af; /* gray-400 */
          border-bottom: 1px solid #374151; /* gray-700 */
          border-left: none; /* remove default vertical borders */
        }
        .rbc-header + .rbc-header { /* remove left border between headers */
          border-left: none;
        }

        /* Day backgrounds and borders */
        .rbc-month-view,
        .rbc-time-view,
        .rbc-agenda-view {
          border: none; /* remove main calendar border */
        }
        .rbc-row-content {
          border-top: 1px solid #374151; /* gray-700 for rows */
        }
        .rbc-day-bg {
          background-color: #1f2937; /* Consistent background */
          border-right: 1px solid #374151; /* gray-700 for columns */
        }
        .rbc-day-bg:last-child {
          border-right: none;
        }
        .rbc-off-range-bg {
          background-color: #111827; /* gray-900 for inactive month days */
        }
        .rbc-current-time-indicator {
            background-color: #ef4444; /* Red-500 */
        }
        .rbc-today {
          background-color: #3b82f61a; /* blue-600 with opacity */
        }

        /* Event Styling */
        .rbc-event {
          background-color: #1d4ed8; /* blue-700 for events */
          border: 1px solid #3b82f6; /* blue-600 border */
          color: white !important;
          border-radius: 0.375rem; /* rounded-md */
          font-size: 0.875rem; /* text-sm */
          padding: 0.25rem 0.5rem; /* px-2 py-1 */
          cursor: pointer;
          transition: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out;
        }
        .rbc-event:hover {
          background-color: #3b82f6; /* blue-600 on hover */
          border-color: #60a5fa; /* blue-400 */
        }
        .rbc-event.rbc-selected {
          background-color: #6366f1; /* indigo-500 */
          border-color: #a78bfa; /* violet-400 */
        }
        .rbc-event-content {
          white-space: normal; /* Allow event text to wrap */
        }

        /* Agenda View */
        .rbc-agenda-table {
          background-color: #1f2937;
          border: 1px solid #374151;
          border-radius: 0.75rem;
        }
        .rbc-agenda-table thead th {
          color: #9ca3af;
          border-bottom: 1px solid #374151;
        }
        .rbc-agenda-table tbody td {
          border-bottom: 1px solid #374151;
          color: #e2e8f0;
        }
        .rbc-agenda-time-cell {
          color: #9ca3af;
        }
      `}</style>
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-white">Workshop Scheduling Calendar</h2>
        {/* Calendar height fixed for demonstration purposes; adjust as needed */}
        <div className="h-[700px]"> 
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
            // Custom toolbar component using your Button component
            components={{
              toolbar: (toolbar) => (
                <div className="rbc-toolbar">
                  <span className="rbc-btn-group">
                    <Button variant="secondary" onClick={() => toolbar.onNavigate('PREV')}>Back</Button>
                    <Button variant="primary" onClick={() => toolbar.onNavigate('TODAY')}>Today</Button>
                    <Button variant="secondary" onClick={() => toolbar.onNavigate('NEXT')}>Next</Button>
                  </span>
                  <span className="rbc-toolbar-label">{toolbar.label}</span>
                  <span className="rbc-btn-group">
                    <Button variant={toolbar.view === 'month' ? 'primary' : 'secondary'} onClick={() => toolbar.onView('month')}>Month</Button>
                    <Button variant={toolbar.view === 'week' ? 'primary' : 'secondary'} onClick={() => toolbar.onView('week')}>Week</Button>
                    <Button variant={toolbar.view === 'day' ? 'primary' : 'secondary'} onClick={() => toolbar.onView('day')}>Day</Button>
                    <Button variant={toolbar.view === 'agenda' ? 'primary' : 'secondary'} onClick={() => toolbar.onView('agenda')}>Agenda</Button>
                  </span>
                </div>
              ),
            }}
          />
        </div>
      </div>
      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          currentTime={Date.now()}
          employeeHourlyRates={employeeHourlyRates}
          allEmployees={allEmployees}
          allInventoryItems={allInventoryItems}
          allTools={allTools}
          allToolAccessories={allToolAccessories}
          onUpdateJob={() => { /* Consider re-fetching events if edits in modal affect calendar data */ }}
          onDeleteJob={() => { /* Consider re-fetching events if deletes in modal affect calendar data */ }}
        />
      )}
    </MainLayout>
  );
};

export default CalendarPage;
