import React, { useState, useEffect, useRef } from 'react';
import { Bell, XCircle, Mail, Clock } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../api/firebase'; // Import your Firestore db instance
import { useAuth } from '../../contexts/AuthContext'; // Corrected: Import useAuth directly
import moment from 'moment'; // Import moment.js
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !user.role) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('targetRole', '==', user.role),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      }));
      setNotifications(fetchedNotifications);
      setUnreadCount(fetchedNotifications.filter(n => !n.read).length);
    }, (error) => {
      console.error("Error listening to notifications:", error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleBellClick = () => {
    setIsOpen(prev => !prev);
  };

  const handleNotificationClick = async (notification) => {
    await handleMarkAsRead(notification.id);

    // Navigate based on notification type, including jobId for deep linking where applicable
    switch (notification.type) {
      case 'qc_awaiting':
        // Navigate to QC page, but if you want to highlight the job, pass jobId.
        // QC page would need to handle the jobId if you want to auto-select/highlight.
        navigate('/qc'); // Current QC page doesn't have deep-linking to specific job
        break;
      case 'job_issue':
        // Navigate to Issues page with jobId to auto-open modal
        navigate(`/issues?jobId=${notification.jobId}`);
        break;
      case 'job_overdue':
        // Navigate to Tracking page with jobId to auto-open modal
        navigate(`/tracking?jobId=${notification.jobId}`);
        break;
      default:
        navigate('/'); // Default to dashboard
        break;
    }
    setIsOpen(false); // Close dropdown after navigation
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-full bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
      >
        <Bell size={24} className="text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-3 border-b border-gray-700 text-white font-semibold flex justify-between items-center">
            Notifications ({unreadCount} unread)
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <XCircle size={20} />
            </button>
          </div>
          {notifications.length === 0 ? (
            <p className="p-4 text-gray-400 text-sm text-center">No new notifications.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notifications.map(notification => (
                <li
                  key={notification.id}
                  className={`p-3 border-b border-gray-700 text-sm cursor-pointer ${
                    notification.read ? 'bg-gray-700 text-gray-400' : 'bg-gray-900 text-white hover:bg-gray-700'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-center space-x-2">
                    <Mail size={16} className="text-blue-400" />
                    <p className="font-medium">{notification.message}</p>
                  </div>
                  <div className="flex items-center text-xs text-gray-500 mt-1 ml-6">
                    {notification.createdAt ? moment(notification.createdAt).fromNow() : 'just now'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
