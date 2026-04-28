"use server";

import { NextResponse } from 'next/server';
import { getDb } from '@/db/connection';

export async function GET(
  request,
  { params }
) {
  const { sr_number } = await params;
  const sql = getDb().createTagStore();

  try {
    // Fetch header info
    const headerRow = sql.get`SELECT PROBLEM_SUMMARY, SERVICE_REQUEST_TYPE, DEADLINED_DATE, JOB_STATUS_DATE FROM sr_header WHERE SR_NUMBER = ${sr_number} LIMIT 1`

    if (!headerRow) {
      return NextResponse.json({ error: 'Repair not found' }, { status: 404 });
    }

    // Fetch parts info (just the first part for simplicity in demo)
    const partRow = sql.get`SELECT RNSN, SERVICE_ACTIVITY FROM sr_parts WHERE SR_NUMBER = ${sr_number} LIMIT 1`;

    return NextResponse.json({
      sr_number,
      problem_summary: headerRow.PROBLEM_SUMMARY,
      service_request_type: headerRow.SERVICE_REQUEST_TYPE,
      job_status_code: headerRow.JOB_STATUS_CODE,
      part_number: partRow ? partRow.RNSN : 'N/A',
      service_activity: partRow ? partRow.SERVICE_ACTIVITY : 'N/A'
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
