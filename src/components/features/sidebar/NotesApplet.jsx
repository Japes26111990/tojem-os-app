import React, { useState, useEffect } from 'react';

const NotesApplet = () => {
  // Load saved notes from localStorage or default to empty
  const [notes, setNotes] = useState(() => {
    const savedNotes = localStorage.getItem('tojemos-sidebar-notes');
    return savedNotes || '';
  });

  // This useEffect hook saves the notes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('tojemos-sidebar-notes', notes);
  }, [notes]);

  return (
    <div className="p-2">
      <h4 className="font-bold text-gray-300 text-sm mb-2">Scratchpad</h4>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Type your notes here..."
        className="w-full h-48 p-2 bg-gray-900 border border-gray-600 rounded-md text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
    </div>
  );
};

export default NotesApplet;