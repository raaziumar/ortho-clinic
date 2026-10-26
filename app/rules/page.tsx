'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function RulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState('');
  // Form states
  const [ruleName, setRuleName] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('5'); // Default to Friday (5)
  const [weekOccurrence, setWeekOccurrence] = useState('2'); // Default to 2nd week

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    try {
      const { data, error } = await supabase.from('schedule_rules').select('*').order('id', { ascending: true });
      if (error) throw error;
      setRules(data || []);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddRule(e: React.FormEvent) {
    e.preventDefault();
    if (!ruleName) return alert("Rule name is required!");

    try {
      const { error } = await supabase.from('schedule_rules').insert([
        { 
          rule_name: ruleName, 
          day_of_week: parseInt(dayOfWeek), 
          week_occurrence: parseInt(weekOccurrence) 
        }
      ]);

      if (error) throw error;
      
      // Clear form and reload list
      setRuleName('');
      loadRules();
      alert("Rule added successfully!");
    } catch (err) {
      console.error(err);
      alert("Error adding rule.");
    }
  }

  async function handleDeleteRule(id: number) {
    if (!confirm("Are you sure? This will not delete patients assigned to this rule.")) return;
    
    try {
      const { error } = await supabase.from('schedule_rules').delete().eq('id', id);
      if (error) throw error;
      loadRules();
      alert("Rule deleted!");
    } catch (err) {
      console.error(err);
      alert("Error deleting rule.");
    }
  }
  async function handleGenerateDates() {
  setGenerating(true);
  setGenerateMessage('');
  
  try {
    const response = await fetch('/api/generate-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthsAhead: 3 })
    });
    
    const data = await response.json();
    if (data.success) {
      setGenerateMessage(data.message);
    } else {
      alert('Failed to generate dates: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error(err);
    alert('Error generating dates.');
  } finally {
    setGenerating(false);
  }
}
  // Helper to convert day number to name
  const getDayName = (dayNum: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum - 1] || 'Unknown';
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Schedule Rules</h1>
            <p className="text-gray-600 mt-1">Define recurring clinic days (e.g., 2nd Friday)</p>
          </div>
          <Link href="/" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors">
            ← Back to Dashboard
          </Link>
        </header>

        {/* Add Rule Form */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Rule</h2>
          <form onSubmit={handleAddRule} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
              <input 
                type="text" placeholder="e.g., 2nd Friday Clinic" value={ruleName} onChange={(e) => setRuleName(e.target.value)}
                className="p-2 border rounded-lg w-full" required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
              <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} className="p-2 border rounded-lg w-full">
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
                <option value="7">Sunday</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Week Occurrence</label>
              <select value={weekOccurrence} onChange={(e) => setWeekOccurrence(e.target.value)} className="p-2 border rounded-lg w-full">
                <option value="1">1st Week</option>
                <option value="2">2nd Week</option>
                <option value="3">3rd Week</option>
                <option value="4">4th Week</option>
                <option value="5">Last Week</option>
              </select>
            </div>
            <button type="submit" className="md:col-span-4 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium mt-2">
              Save Schedule Rule
            </button>
          </form>
        </section>

        {/* Rules List */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Existing Rules</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : rules.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No rules defined yet.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {rules.map((rule) => (
                <li key={rule.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{rule.rule_name}</p>
                    <p className="text-sm text-gray-500">{getDayName(rule.day_of_week)} • {rule.week_occurrence === 5 ? 'Last' : rule.week_occurrence + getOrdinal(rule.week_occurrence)} week</p>
                  </div>
                  <button 
                    onClick={() => handleDeleteRule(rule.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
  <h2 className="text-xl font-bold text-gray-900 mb-2">Generate Future Clinic Dates</h2>
  <p className="text-gray-600 mb-4 text-sm">Automatically create calendar entries based on your rules for the next 3 months.</p>
  <button 
    onClick={handleGenerateDates}
    disabled={generating}
    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
  >
    {generating ? 'Generating...' : '🗓️ Generate Dates'}
  </button>
  {generateMessage && (
    <p className="mt-3 text-green-600 text-sm font-medium">{generateMessage}</p>
  )}
</section>
      </div>
    </main>
  );
}

// Helper for ordinal numbers (1st, 2nd, 3rd, etc.)
function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}