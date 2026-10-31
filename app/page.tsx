'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ThemeToggle } from '@/app/components/ThemeToggle';

export default function Home() {
  const [patients, setPatients] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form states
  const [name, setName] = useState('');
  const [opId, setOpId] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');

  // Edit Modal States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editOpId, setEditOpId] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTotal, setEditTotal] = useState('');

  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => { loadPatients(); loadSlots(); }, []);

  async function loadPatients() {
    try {
      const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setPatients(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  async function loadSlots() {
    try {
      const { data, error } = await supabase.from('clinic_dates').select('id, date_name').order('date_name');
      if (error) throw error;
      setSlots(data || []);
    } catch (err) { console.error(err); }
  }

  // Helper to clean and add 91
  function formatPhone(p: string) {
    let clean = p.replace(/\D/g, '');
    if (!clean.startsWith('91')) clean = '91' + clean;
    return clean;
  }

  async function handleAddPatient(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !phone) return alert("Name and Phone are required!");

    try {
      const total = parseFloat(totalAmount) || 0;
      const finalPhone = formatPhone(phone); // Auto add 91
      
      const { data: patientData, error } = await supabase.from('patients').insert([{ 
        full_name: name, op_id: opId, age: parseInt(age) || 0, 
        phone_number: finalPhone, total_amount: total, remaining_amount: total 
      }]).select().single();

      if (error) throw error;

      if (selectedSlotId && patientData) {
        await supabase.from('date_assignments').insert([{ clinic_date_id: parseInt(selectedSlotId), patient_id: patientData.id }]);
      }
      
      setName(''); setOpId(''); setAge(''); setPhone(''); setTotalAmount(''); setSelectedSlotId('');
      loadPatients();
      alert("Patient added successfully!");
    } catch (err) { console.error(err); alert("Error adding patient."); }
  }

  function openEditModal(p: any) {
    setEditId(p.id);
    setEditName(p.full_name);
    setEditOpId(p.op_id || '');
    setEditAge(p.age.toString());
    setEditPhone(p.phone_number);
    setEditTotal(p.total_amount.toString());
    setIsEditOpen(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    try {
      const finalPhone = formatPhone(editPhone);
      await supabase.from('patients').update({
        full_name: editName, op_id: editOpId, age: parseInt(editAge) || 0,
        phone_number: finalPhone, total_amount: parseFloat(editTotal) || 0
      }).eq('id', editId);
      
      setIsEditOpen(false);
      loadPatients();
      alert("Patient updated!");
    } catch (err) { console.error(err); alert("Error updating."); }
  }

  async function handleDeletePatient(id: number, name: string) {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE ${name}? This will remove them from all slots.`)) return;
    try {
      await supabase.from('patients').delete().eq('id', id);
      loadPatients();
      alert("Patient deleted.");
    } catch (err) { console.error(err); }
  }

  const filteredPatients = patients.filter(p => 
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.phone_number.includes(searchQuery) ||
    (p.op_id && p.op_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-600/20">32</div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight transition-colors">32 Pearls Ortho</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight transition-colors">Dr. Shaji's Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/manage-dates" className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-semibold transition-colors">Manage Slots</Link>
              <Link href="/calendar" className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-semibold transition-colors">Calendar</Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 transition-colors">Total Patients</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white transition-colors">{patients.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 transition-colors">Today's Date</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400 transition-colors">{todayDate}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 sticky top-24 transition-colors duration-300">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 transition-colors">
                <span className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center text-sm transition-colors">+</span>
                Add New Patient
              </h2>
              <form onSubmit={handleAddPatient} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" required />
                  <input type="text" placeholder="OP ID" value={opId} onChange={(e) => setOpId(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder="Age" value={age} onChange={(e) => setAge(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" />
                  <input type="number" placeholder="Total Amount" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" />
                </div>
                <input type="tel" placeholder="Phone (91 optional)" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" required />
                <select value={selectedSlotId} onChange={(e) => setSelectedSlotId(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all">
                  <option value="">Assign to Slot (Optional)</option>
                  {slots.map((slot) => (<option key={slot.id} value={slot.id}>{slot.date_name}</option>))}
                </select>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors shadow-lg shadow-blue-600/20 mt-2">Save Patient</button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-300">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white transition-colors">Patient Roster</h2>
                <input type="text" placeholder="Search name, phone, or OP ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full sm:w-64 pl-4 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" />
              </div>
              
              {loading ? (<div className="p-12 text-center text-slate-500 dark:text-slate-400 transition-colors">Loading...</div>) : filteredPatients.length === 0 ? (<div className="p-12 text-center text-slate-500 dark:text-slate-400 transition-colors">No patients found.</div>) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
                  {filteredPatients.map((patient) => (
                    <li key={patient.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors">{patient.full_name.charAt(0).toUpperCase()}</div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white transition-colors">{patient.full_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 transition-colors">{patient.phone_number} • Age: {patient.age}{patient.op_id && ` • OP: ${patient.op_id}`}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => openEditModal(patient)} className="flex-1 sm:flex-none text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">Edit</button>
                        <button onClick={() => handleDeletePatient(patient.id, patient.full_name)} className="flex-1 sm:flex-none text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">Delete</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Patient Details</h3>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-3">
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl" required />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={editOpId} onChange={(e) => setEditOpId(e.target.value)} placeholder="OP ID" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl" />
                <input type="number" value={editAge} onChange={(e) => setEditAge(e.target.value)} placeholder="Age" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl" />
              </div>
              <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl" required />
              <input type="number" value={editTotal} onChange={(e) => setEditTotal(e.target.value)} placeholder="Total Amount" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl" />
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 py-3 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}