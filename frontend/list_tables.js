import { getDb } from "./src/db/connection.js";

const sql = getDb().createTagStore();
try {
	const tables = sql.all`SELECT name FROM sqlite_master WHERE type="table"`;
	console.log(tables);
} catch (e) {
	console.error(e);
}
