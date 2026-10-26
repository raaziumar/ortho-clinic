import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { monthsAhead = 3 } = await req.json(); // Default to 3 months ahead
    
    // Fetch all active schedule rules
    const { data: rules, error: rulesError } = await supabase
      .from('schedule_rules')
      .select('*');
      
    if (rulesError) throw rulesError;
    if (!rules || rules.length === 0) {
      return NextResponse.json({ success: true, generated: 0, message: 'No rules found' });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + monthsAhead);

    let generatedCount = 0;

    for (const rule of rules) {
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const metaDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert to 1-7 format
        
        if (metaDayOfWeek === rule.day_of_week) {
          // Check if this is the correct week occurrence
          const weekOfMonth = getWeekOfMonth(currentDate);
          
          if (weekOfMonth === rule.week_occurrence || 
              (rule.week_occurrence === 5 && weekOfMonth >= 4)) { // "Last week" = 4th or later
            
            const dateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
            
            // Check if this date already exists for this rule
            const { data: existing } = await supabase
              .from('daily_logs')
              .select('id')
              .eq('log_date', dateStr)
              .eq('rule_id', rule.id)
              .single();
            
            if (!existing) {
              // Insert new daily log entry
              const { error: insertError } = await supabase
                .from('daily_logs')
                .insert([
                  { 
                    log_date: dateStr, 
                    rule_id: rule.id 
                  }
                ]);
              
              if (!insertError) {
                generatedCount++;
                
                // Also create log_entries for patients assigned to this rule
                const { data: assignments } = await supabase
                  .from('patient_assignments')
                  .select('patient_id')
                  .eq('rule_id', rule.id);
                  
                if (assignments) {
                  for (const assignment of assignments) {
                    await supabase.from('log_entries').insert([
                      {
                        log_id: null, // We'll update this after getting the log_id
                        patient_id: assignment.patient_id,
                        status: 'Scheduled',
                        is_manual_add: false
                      }
                    ]);
                  }
                }
              }
            }
          }
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return NextResponse.json({ 
      success: true, 
      generated: generatedCount,
      message: `Generated ${generatedCount} clinic days for the next ${monthsAhead} months` 
    });
    
  } catch (error: any) {
    console.error('Date Generation Error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate dates', 
      details: error.message 
    }, { status: 500 });
  }
}

// Helper function to calculate which week of the month a date falls in
function getWeekOfMonth(date: Date): number {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  
  // Calculate offset for the first week
  const firstDayWeekday = firstDayOfMonth.getDay();
  const offset = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1; // Adjust for Monday start
  
  return Math.ceil((dayOfMonth + offset) / 7);
}