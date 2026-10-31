'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ThemeToggle } from '@/app/components/ThemeToggle';

export default function ManageDatesPage() {
  const [dates, setDates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDateName, setNewDateName] = useState(''); 
  const [newNote, setNewNote] = useState('');
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<any>(null);
  const [dateSearchQuery, setDateSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('appointment_reminder'); 
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [addPatientSearch, setAddPatientSearch] = useState('');
  
  // Edit States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => { loadDates(); loadAllPatients(); }, []);

  async function loadDates() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('clinic_dates').select(`id, clinic_date, date_name, note, date_assignments (id, patients (id, full_name, phone_number, op_id, total_amount, remaining_amount))`).order('created_at', { ascending: false });
      if (error) throw error;
      setDates(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  async function loadAllPatients() {
    try {
      const { data, error } = await supabase.from('patients').select('*').order('full_name');
      if (!error) setAllPatients(data || []);
    } catch (err) { console.error(err); }
  }

  async function handleAddDate(e: React.FormEvent) {
    e.preventDefault();
    if (!newDateName) return alert("Please enter a Slot Name.");
    try {
      await supabase.from('clinic_dates').insert([{ date_name: newDateName, note: newNote, clinic_date: null }]);
      setNewDateName(''); setNewNote(''); loadDates();
    } catch (err) { console.error(err); }
  }

  async function handleDeleteDate(id: number) {
    if (!confirm("Delete this slot?")) return;
    await supabase.from('clinic_dates').delete().eq('id', id);
    loadDates();
  }

  async function handleAssignPatient(patientId: number) {
    if (!selectedDate) return;
    await supabase.from('date_assignments').insert([{ clinic_date_id: selectedDate.id, patient_id: patientId }]);
    loadDates(); setIsAddPatientModalOpen(false); setAddPatientSearch('');
  }

  async function handleUnassignPatient(assignmentId: number) {
    if (!confirm("Remove patient from this slot?")) return;
    await supabase.from('date_assignments').delete().eq('id', assignmentId);
    loadDates();
  }

  async function handleDeletePatientFromSlot(patientId: number, name: string) {
    if (!confirm(`PERMANENTLY DELETE ${name} from the entire system?`)) return;
    await supabase.from('patients').delete().eq('id', patientId);
    setIsPatientModalOpen(false);
    loadDates(); loadAllPatients();
  }

  async function handleAddPayment() {
    if (!selectedPatient || !paymentAmount) return alert("Enter amount.");
    const amount = parseFloat(paymentAmount);
    if (amount <= 0) return alert("Amount must be > 0.");
    try {
      await supabase.from('payment_history').insert([{ patient_id: selectedPatient.id, amount_paid: amount, notes: paymentNote }]);
      const newRemaining = selectedPatient.remaining_amount - amount;
      await supabase.from('patients').update({ remaining_amount: newRemaining }).eq('id', selectedPatient.id);
      setPaymentAmount(''); setPaymentNote('');
      loadDates(); loadAllPatients();
      const { data: history } = await supabase.from('payment_history').select('*').eq('patient_id', selectedPatient.id).order('created_at', { ascending: false });
      setSelectedPatient({ ...selectedPatient, remaining_amount: newRemaining, payment_history: history });
    } catch (err) { console.error(err); }
  }

  function openEditModal() {
    setEditForm({ ...selectedPatient });
    setIsEditOpen(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    let cleanPhone = editForm.phone_number.replace(/\D/g, '');
    if (!cleanPhone.startsWith('91')) cleanPhone = '91' + cleanPhone;

    await supabase.from('patients').update({
      full_name: editForm.full_name, op_id: editForm.op_id, age: parseInt(editForm.age) || 0,
      phone_number: cleanPhone, total_amount: parseFloat(editForm.total_amount) || 0
    }).eq('id', editForm.id);
    
    setIsEditOpen(false);
    loadDates(); loadAllPatients();
    // Update currently selected patient view
    setSelectedPatient({ ...selectedPatient, ...editForm, phone_number: cleanPhone });
  }

  async function handleSendReminders() {
    if (!selectedDate) return;
    let oldDateVar = '', newDateVar = '';
    if (selectedTemplate === 'date_change') {
      const i1 = prompt('Original date:', ''); if (i1 === null) return; oldDateVar = i1;
      const i2 = prompt('New date:', ''); if (i2 === null) return; newDateVar = i2;
    } else if (selectedTemplate === 'appointment_reminder') {
      const i = prompt('Appointment date:', ''); if (i === null) return; oldDateVar = i || 'upcoming';
    }
    if (!confirm(`Send reminders?`)) return;
    try {
      const res = await fetch('/api/send-whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clinicDateId: selectedDate.id, templateName: selectedTemplate, oldDateVariable: oldDateVar, newDateVariable: newDateVar }) });
      const data = await res.json();
      if (data.success) alert(`Sent to ${data.results.length} patients!`);
    } catch (err) { console.error(err); }
  }

  const filteredDatePatients = selectedDate?.date_assignments?.filter((a: any) => a.patients.full_name.toLowerCase().includes(dateSearchQuery.toLowerCase()) || a.patients.phone_number.includes(dateSearchQuery) || (a.patients.op_id && a.patients.op_id.toLowerCase().includes(dateSearchQuery.toLowerCase()))) || [];
  const filteredAllPatients = allPatients.filter(p => p.full_name.toLowerCase().includes(addPatientSearch.toLowerCase()) || p.phone_number.includes(addPatientSearch) || (p.op_id && p.op_id.toLowerCase().includes(addPatientSearch.toLowerCase())));

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-purple-600/20">32</div>
              <div><h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight transition-colors">Manage Slots</h1><p className="text-xs text-slate-500 dark:text-slate-400 leading-tight transition-colors">Dr. Shaji's Dashboard</p></div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/" className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold transition-colors">← Dashboard</Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 mb-8 transition-colors duration-300">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 transition-colors">Create New Slot</h2>
          <form onSubmit={handleAddDate} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors">Slot Name</label><input type="text" placeholder="2nd Friday" value={newDateName} onChange={(e) => setNewDateName(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all" required /></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors">Note</label><input type="text" placeholder="Optional" value={newNote} onChange={(e) => setNewNote(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all" /></div>
            <button type="submit" className="md:col-span-2 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-medium transition-colors shadow-lg shadow-purple-600/20 mt-2">Save Slot</button>
          </form>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-300">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 transition-colors"><h2 className="text-lg font-bold text-slate-900 dark:text-white transition-colors">Active Slots</h2></div>
          {loading ? (<div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading...</div>) : dates.length === 0 ? (<div className="p-8 text-center text-slate-500 dark:text-slate-400">No slots.</div>) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
              {dates.map((dateItem) => (
                <li key={dateItem.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="cursor-pointer flex-1" onClick={() => { setSelectedDate(dateItem); setIsDateModalOpen(true); setDateSearchQuery(''); setSelectedTemplate('appointment_reminder'); }}>
                    <p className="font-bold text-slate-900 dark:text-white text-lg transition-colors">{dateItem.date_name}</p>
                    {dateItem.note && <p className="text-sm text-slate-500 dark:text-slate-400 italic">📝 {dateItem.note}</p>}
                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mt-1">{dateItem.date_assignments?.length || 0} patients</p>
                  </div>
                  <button onClick={() => handleDeleteDate(dateItem.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Delete Slot</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Slot Details Modal */}
      {isDateModalOpen && selectedDate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 transition-colors duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10 transition-colors">
              <div className="flex justify-between items-start">
                <div><h3 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">{selectedDate.date_name}</h3>{selectedDate.note && <p className="text-slate-500 dark:text-slate-400 italic mt-1">📝 {selectedDate.note}</p>}</div>
                <button onClick={() => setIsDateModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl">&times;</button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="flex-1 p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"><option value="appointment_reminder">📅 Appointment Reminder</option><option value="date_change">⚠️ Date Change</option><option value="payment_due">💰 Payment Due</option></select>
                <button onClick={handleSendReminders} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm">Send</button>
                <button onClick={() => setIsAddPatientModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm">+ Add Patient</button>
              </div>
            </div>
            <div className="p-6">
              <input type="text" placeholder="Search..." value={dateSearchQuery} onChange={(e) => setDateSearchQuery(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm mb-4 outline-none" />
              {filteredDatePatients.length === 0 ? (<p className="text-center text-slate-500 dark:text-slate-400 py-8">No patients.</p>) : (
                <ul className="space-y-2">
                  {filteredDatePatients.map((assignment: any) => (
                    <li key={assignment.id} className="flex justify-between items-center p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="cursor-pointer flex-1" onClick={() => { setSelectedPatient(assignment.patients); setIsPatientModalOpen(true); }}>
                        <p className="font-medium text-slate-900 dark:text-white">{assignment.patients.full_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{assignment.patients.phone_number} {assignment.patients.op_id && `• OP: ${assignment.patients.op_id}`} • Due: ₹{assignment.patients.remaining_amount}</p>
                      </div>
                      <button onClick={() => handleUnassignPatient(assignment.id)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm ml-4">Unlink</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Patient Modal */}
      {isAddPatientModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center"><h3 className="font-bold text-slate-900 dark:text-white">Assign to {selectedDate.date_name}</h3><button onClick={() => setIsAddPatientModalOpen(false)} className="text-slate-400 text-xl">&times;</button></div>
            <div className="p-4">
              <input type="text" placeholder="Search..." value={addPatientSearch} onChange={(e) => setAddPatientSearch(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm mb-4 outline-none" autoFocus />
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredAllPatients.map(patient => (
                  <button key={patient.id} onClick={() => handleAssignPatient(patient.id)} className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex justify-between items-center">
                    <div><p className="font-medium text-slate-900 dark:text-white">{patient.full_name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{patient.phone_number} {patient.op_id && `• OP: ${patient.op_id}`}</p></div>
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg">Assign</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient Profile Modal */}
      {isPatientModalOpen && selectedPatient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 transition-colors duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">{selectedPatient.full_name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <p className="text-slate-500 dark:text-slate-400 transition-colors">{selectedPatient.phone_number}</p>
                    {selectedPatient.op_id && (<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 transition-colors">OP ID: {selectedPatient.op_id}</span>)}
                  </div>
                </div>
                <button onClick={() => setIsPatientModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl">&times;</button>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl"><p className="text-xs text-slate-500 dark:text-slate-400">Total Amount</p><p className="font-bold text-slate-900 dark:text-white">₹{selectedPatient.total_amount}</p></div>
                <div className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl"><p className="text-xs text-rose-600 dark:text-rose-400">Remaining</p><p className="font-bold text-rose-700 dark:text-rose-400">₹{selectedPatient.remaining_amount}</p></div>
              </div>
              {/* NEW: Action Buttons */}
              <div className="flex gap-2 mt-4">
                <button onClick={openEditModal} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-sm transition-colors">Edit Details</button>
                <button onClick={() => handleDeletePatientFromSlot(selectedPatient.id, selectedPatient.full_name)} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium text-sm transition-colors">Delete Patient</button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Record Payment</h4>
                <div className="flex gap-2">
                  <input type="number" placeholder="Amount" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg outline-none" />
                  <button onClick={handleAddPayment} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium">Add</button>
                </div>
                <input type="text" placeholder="Note" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg mt-2 outline-none" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Payment History</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedPatient.payment_history?.length > 0 ? selectedPatient.payment_history.map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm">
                      <div><p className="font-medium text-slate-900 dark:text-white">₹{p.amount_paid}</p><p className="text-xs text-slate-500 dark:text-slate-400">{new Date(p.payment_date).toLocaleDateString()} {p.notes && `• ${p.notes}`}</p></div>
                    </div>
                  )) : <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-2">No payments yet.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800"><h3 className="font-bold text-slate-900 dark:text-white">Edit Patient</h3></div>
            <form onSubmit={handleSaveEdit} className="p-4 space-y-3">
              <input type="text" value={editForm.full_name || ''} onChange={(e) => setEditForm({...editForm, full_name: e.target.value})} placeholder="Name" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl" required />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={editForm.op_id || ''} onChange={(e) => setEditForm({...editForm, op_id: e.target.value})} placeholder="OP ID" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl" />
                <input type="number" value={editForm.age || ''} onChange={(e) => setEditForm({...editForm, age: e.target.value})} placeholder="Age" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl" />
              </div>
              <input type="tel" value={editForm.phone_number || ''} onChange={(e) => setEditForm({...editForm, phone_number: e.target.value})} placeholder="Phone" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl" required />
              <input type="number" value={editForm.total_amount || ''} onChange={(e) => setEditForm({...editForm, total_amount: e.target.value})} placeholder="Total Amount" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl" />
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 py-3 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}