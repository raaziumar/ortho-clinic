import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const clinicDateId = body.clinicDateId;
    const templateName = body.templateName || 'appointment_reminder';
    const oldDateVariable = body.oldDateVariable || 'your scheduled date';
    const newDateVariable = body.newDateVariable || 'a later date';

    if (!clinicDateId) {
      return NextResponse.json({ error: 'Missing clinicDateId' }, { status: 400 });
    }

    const { data: assignments, error } = await supabase
      .from('date_assignments')
      .select(`patient_id, patients (full_name, phone_number)`)
      .eq('clinic_date_id', clinicDateId);

    if (error) throw error;
    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ success: true, results: [], message: 'No patients assigned to this slot' });
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!phoneNumberId || !accessToken) return NextResponse.json({ error: 'WhatsApp credentials missing' }, { status: 500 });

    const results = [];
    for (const assignment of assignments as any[]) {
      const patient = assignment.patients;
      if (!patient || !patient.phone_number) continue;
      
      const formattedPhone = patient.phone_number.replace(/\D/g, ''); 

      let parameters: any[] = [{ type: 'text', text: patient.full_name }];

      if (templateName === 'appointment_reminder') {
        parameters.push({ type: 'text', text: oldDateVariable }); 
      } else if (templateName === 'date_change') {
        parameters.push({ type: 'text', text: oldDateVariable }); 
        parameters.push({ type: 'text', text: newDateVariable }); 
      }

      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp', to: formattedPhone, type: 'template',
          template: { 
            name: templateName, 
            language: { code: 'en_US' }, 
            components: [{ type: 'body', parameters: parameters }] 
          }
        })
      });

      const result = await response.json();
      results.push({ patient: patient.full_name, success: response.ok, metaResponse: result });
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('WhatsApp API Error:', error);
    return NextResponse.json({ error: 'Failed to send messages', details: error.message }, { status: 500 });
  }
}