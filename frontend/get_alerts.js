import { getDb } from "./src/db/connection.js";

try {
	const db = getDb();
	const alerts = db.prepare("SELECT * FROM system_alerts").all();
	console.log("Alerts in database:", JSON.stringify(alerts, null, 2));
} catch (e) {
	console.error("Error:", e);
}
