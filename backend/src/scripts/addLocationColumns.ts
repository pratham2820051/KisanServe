/**
 * Run once to add from_location, to_location, distance_km columns to bookings table.
 * Usage: npx ts-node src/scripts/addLocationColumns.ts
 */
import dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../config/supabase';

async function main() {
  const queries = [
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS from_location TEXT`,
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS to_location TEXT`,
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS distance_km NUMERIC`,
  ];

  for (const q of queries) {
    const { error } = await supabase.rpc('exec_sql', { sql: q });
    if (error) console.log('Note:', error.message, '(column may already exist)');
    else console.log('✅', q);
  }
  console.log('Done.');
}

main().catch(console.error);
