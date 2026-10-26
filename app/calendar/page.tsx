'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ThemeToggle } from '@/app/components/ThemeToggle';

export default function CalendarPage() {
  // 1. Start with a safe, static date to prevent the crash
const [currentDate, setCurrentDate] = useState(new Date('2024-01-01')); 

// 2. Update it to the real date once the page loads in the browser
useEffect(() => {
  setCurrentDate(new Date());
}, []);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadNotes(); }, [currentDate]);

  async function loadNotes() {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
      const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('calendar_notes')
        .select('*')
        .gte('note_date', firstDay)
        .lte('note_date', lastDay);

      if (error) throw error;
      setNotes(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  const handleDayClick = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDateStr(dateStr);
    const existingNote = notes.find(n => n.note_date === dateStr);
    setNoteText(existingNote?.note || '');
    setIsModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!selectedDateStr) return;
    setSaving(true);
    try {
      if (noteText.trim() === '') {
        await supabase.from('calendar_notes').delete().eq('note_date', selectedDateStr);
      } else {
        await supabase.from('calendar_notes').upsert([
          { note_date: selectedDateStr, note: noteText }
        ], { onConflict: 'note_date' });
      }
      await loadNotes();
      setIsModalOpen(false);
    } catch (err) { console.error(err); alert('Error saving note.'); } finally { setSaving(false); }
  };

  const getDaysInMonth = () => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = () => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const getNoteForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const noteObj = notes.find(n => n.note_date === dateStr);
    return noteObj?.note || null;
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Modern Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-600/20">
                32
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight transition-colors">Clinic Calendar</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight transition-colors">Dr. Shaji's Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/" className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold transition-colors">
                ← Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Month Navigation */}
        <div className="flex justify-between items-center mb-6 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
          <button onClick={prevMonth} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors">← Previous</button>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white transition-colors">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
          <button onClick={nextMonth} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors">Next →</button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400 transition-colors">Loading calendar...</div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-300">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 transition-colors">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-3 text-center text-sm font-semibold text-slate-600 dark:text-slate-400 transition-colors">{day}</div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {Array.from({ length: getFirstDayOfMonth() }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 transition-colors"></div>
              ))}
              {Array.from({ length: getDaysInMonth() }).map((_, i) => {
                const day = i + 1;
                const note = getNoteForDay(day);
                return (
                  <div 
                    key={day} 
                    onClick={() => handleDayClick(day)}
                    className={`min-h-[100px] border-b border-r border-slate-100 dark:border-slate-800 p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${note ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}
                  >
                    <div className="font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors">{day}</div>
                    {note && (
                      <div className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 p-1.5 rounded-lg truncate transition-colors" title={note}>
                         {note}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Note Modal */}
      {isModalOpen && selectedDateStr && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 transition-colors duration-300">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center transition-colors">
              <h3 className="font-bold text-slate-900 dark:text-white transition-colors">Note for {selectedDateStr}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl transition-colors">&times;</button>
            </div>
            <div className="p-4">
              <textarea 
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="e.g., Holiday, Late start, Equipment maintenance..."
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl h-32 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all placeholder:text-slate-400"
                autoFocus
              />
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2 rounded-b-2xl transition-colors">
              <button onClick={() => setIsModalOpen(false)} className="text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white font-medium px-4 py-2 transition-colors">Cancel</button>
              <button onClick={handleSaveNote} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-600/20">
                {saving ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}