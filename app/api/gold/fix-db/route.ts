import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const db = createServiceClient()
    
    // Fetch all gold_material rows
    const { data, error } = await db.from('gold_material').select('*')
    if (error) throw error
    
    const updates = []
    
    for (const row of data || []) {
      let kp = row.karat_prices
      let changed = false
      let attempts = 0
      
      // Keep unwrapping double/triple stringified JSON
      while (typeof kp === 'string' && attempts < 5) {
        try { 
          kp = JSON.parse(kp) 
          changed = true 
        } catch { 
          break 
        }
        attempts++
      }
      
      // If we unwrapped it and it's a valid object, update the database
      if (changed && typeof kp === 'object' && kp !== null) {
        const { error: updErr } = await db.from('gold_material')
          .update({ karat_prices: kp })
          .eq('price_date', row.price_date)
          
        updates.push({ 
          date: row.price_date, 
          status: updErr ? 'failed' : 'success', 
          error: updErr?.message 
        })
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Checked ${data?.length || 0} rows. Updated ${updates.length} corrupted rows.`,
      details: updates 
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
