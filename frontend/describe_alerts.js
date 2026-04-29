import { getDb } from "./src/db/connection.js";

try {
	const db = getDb();
	const columns = db.prepare("PRAGMA table_info(system_alerts)").all();
	console.log("Columns in system_alerts:", columns);
} catch (e) {
	console.error("Error:", e);
}
