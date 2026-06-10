import React, { useState ,useCallback, useEffect} from 'react';
import { Navbar } from '../Home/Navbar/Navbar';
import { AppNavBar } from "../Home/Navbar/AppNavBar";
import { RightSidebar } from '../Home/RightSidebar';
import { CalendarLeftside } from './CalendarLeftside';
import { CalendarMainContent } from './CalendarMainContent';
// Import the month-listing API from your api.js
import { listEventsForMonth } from '../../../api/api'; 
import { useLocation } from 'react-router-dom';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]); // Dynamic events from backend
  const [loading, setLoading] = useState(false);
  const [startWeekOn, setStartWeekOn] = useState(() => {
  return sessionStorage.getItem('calendar_start_week') || 'Sunday';
  });
  const [openEventPopup, setOpenEventPopup] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.openCreateEvent) {
      setOpenEventPopup(true);
    }
  }, [location.state]);
  useEffect(() => {
  import('../../../api/api').then(({ getCalendarSettings }) => {
    getCalendarSettings()
      .then(res => {
        const weekVal = res?.data?.start_week_on || 'Sunday';
        setStartWeekOn(weekVal);
        sessionStorage.setItem('calendar_start_week', weekVal);
        const viewVal = (res?.data?.default_view || 'Week').toLowerCase();
        sessionStorage.setItem('calendar_default_view', viewVal);
      })
      .catch(() => {});
      });

  const handler = (e) => {
    setStartWeekOn(e.detail);
    sessionStorage.setItem('calendar_start_week', e.detail);
  };
  window.addEventListener('calendarStartWeekChanged', handler);
  return () => window.removeEventListener('calendarStartWeekChanged', handler);
}, []);
  // --- API Integration: Global Event Fetcher ---
  // Fetching at the parent level ensures consistency across the Sidebar and Main View.
  // We fetch by month as it covers the broadest range needed for both views [cite: 140-143].
  const fetchGlobalEvents = useCallback(async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // Backend expects 1-indexed month [cite: 142]
      
      const response = await listEventsForMonth(year, month);
      
      if (response && response.data) {
        setEvents(response.data); // Update global state [cite: 143]
      }
    } catch (error) {
      console.error("Failed to fetch global calendar events:", error);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  // Re-fetch data whenever the month or year of the currentDate changes
  useEffect(() => {
    fetchGlobalEvents();
  }, [fetchGlobalEvents]);

  /**
   * Note: The previous local addEvent logic is removed. 
   * Child components (NewEvents / NewEvents1) now handle their own POST requests 
   * and will trigger fetchGlobalEvents() via the refresh callback below.
   */

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <AppNavBar />
      <div className="flex flex-row w-full h-full px-[10px] py-[0px] gap-4">
        {/* Sidebar: Uses global events for mini-calendar markers */}
        <CalendarLeftside 
          currentDate={currentDate} 
          setCurrentDate={setCurrentDate} 
          events={events}
        />

        {/* Main Content: Displays and manages grid views */}
        <CalendarMainContent 
          currentDate={currentDate} 
          setCurrentDate={setCurrentDate} 
          events={events} 
          onEventCreated={fetchGlobalEvents} // Refresh trigger for new events
          loading={loading}
          openEventPopup={openEventPopup}
        />

        <RightSidebar />
      </div>
    </div>
  );
};

export default Calendar;