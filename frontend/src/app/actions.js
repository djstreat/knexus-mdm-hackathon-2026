"use server";

import { getDb } from "@/db/connection";

export async function getRepairInfo(srNumber) {
	const sql = getDb().createTagStore();

	try {
		// Fetch header info
		const headerRow = sql.get`SELECT PROBLEM_SUMMARY, SERVICE_REQUEST_TYPE, DEADLINED_DATE, JOB_STATUS_DATE FROM sr_header WHERE SR_NUMBER = ${srNumber} LIMIT 1`;

		if (!headerRow) {
			throw new Error("Repair not found");
		}

		// Fetch parts info (just the first part for simplicity in demo)
		const partRow = sql.get`SELECT RNSN, SERVICE_ACTIVITY FROM sr_parts WHERE SR_NUMBER = ${srNumber} LIMIT 1`;

		return {
			sr_number: srNumber,
			problem_summary: headerRow.PROBLEM_SUMMARY,
			service_request_type: headerRow.SERVICE_REQUEST_TYPE,
			job_status_date: headerRow.JOB_STATUS_DATE,
			part_number: partRow ? partRow.RNSN : "N/A",
			service_activity: partRow ? partRow.SERVICE_ACTIVITY : "N/A",
		};
	} catch (error) {
		console.error("Database error:", error);
		throw new Error(error.message || "Internal Server Error");
	}
}

export async function getReports() {
	const sql = getDb().createTagStore();

	try {
		const reports = sql.all`SELECT * FROM reports ORDER BY created_at DESC`;
		return reports.map((report) => ({ ...report }));
	} catch (error) {
		console.error("Database error:", error);
		throw new Error(error.message || "Internal Server Error");
	}
}
