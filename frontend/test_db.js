import { getDb } from "./src/db/connection.js";

async function checkReports() {
	try {
		const db = getDb();
		// Since it's node:sqlite (synchronous), we don't need await for the query itself
		// but the function might be async if it was designed that way.
		// However, getDb().createTagStore() returns an object with tag methods.
		const sql = db.createTagStore();
		const reports = sql.all`SELECT * FROM reports LIMIT 5`;
		console.log("Reports:", reports);
	} catch (error) {
		console.error("Error:", error);
	}
}

checkReports();
