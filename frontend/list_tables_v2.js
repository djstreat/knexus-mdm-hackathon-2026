import { getDb } from "./src/db/connection.js";

try {
	const db = getDb();
	// Using the standard sqlite_master table to find all tables
	const tables = db
		.prepare("SELECT name FROM sqlite_master WHERE type='table'")
		.all();
	console.log("Tables in database:", tables);
} catch (e) {
	console.error("Error:", e);
}
