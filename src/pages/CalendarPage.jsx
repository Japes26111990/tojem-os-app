// src/pages/CalendarPage.jsx

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

        // --- FIX: Destructure the 'jobs' array from the object ---
        unsubscribeJobs = listenToJobCards(({ jobs: fetchedJobs }) => {
          if (!Array.isArray(fetchedJobs)) {
              console.error("Received non-array data for jobs:", fetchedJobs);
              setEvents([]); // Set to empty array to prevent crash
              return;
          }
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
          overheadCostPerHour={0}
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