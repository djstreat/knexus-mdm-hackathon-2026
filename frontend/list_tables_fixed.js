import { getDb } from "./src/db/connection.js";

try {
	const db = getDb();
	const tables = db.all`SELECT name FROM sqlite_master WHERE type='table'`;
	console.log(tables);
} catch (e) {
	console.error(e);
}
