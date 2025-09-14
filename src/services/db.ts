import * as SQLite from "expo-sqlite";

export const database = SQLite.openDatabaseSync("pos.db");

export async function initDatabase() {
database.execSync(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS orders(
id TEXT PRIMARY KEY NOT NULL,
tableId TEXT,
status TEXT,
discountPercentage REAL,
serviceChargePercentage REAL,
taxPercentage REAL,
paymentMethod TEXT,
amountPaid REAL,
createdAt INTEGER
);
CREATE TABLE IF NOT EXISTS order_items(
orderId TEXT,
menuItemId TEXT,
name TEXT,
price REAL,
quantity INTEGER,
modifiers TEXT
);
CREATE TABLE IF NOT EXISTS inventory(
id TEXT PRIMARY KEY,
name TEXT,
category TEXT,
price REAL,
stockQuantity INTEGER,
isActive INTEGER
);
CREATE TABLE IF NOT EXISTS customers(
id TEXT PRIMARY KEY,
name TEXT,
phone TEXT,
email TEXT,
loyaltyPoints INTEGER
);
CREATE TABLE IF NOT EXISTS receipts(
id TEXT PRIMARY KEY,
orderId TEXT,
content TEXT,
createdAt INTEGER
);
`);
}

export const Db = {
saveOrder: async (order: any) => {
database.runSync(
`INSERT OR REPLACE INTO orders(id, tableId, status, discountPercentage, serviceChargePercentage, taxPercentage, paymentMethod, amountPaid, createdAt) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?);`,
[
order.id,
order.tableId,
order.status,
order.discountPercentage,
order.serviceChargePercentage,
order.taxPercentage,
order.payment?.method ?? null,
order.payment?.amountPaid ?? null,
order.createdAt,
]
);
database.runSync(`DELETE FROM order_items WHERE orderId = ?;`, [order.id]);
for (const item of order.items) {
database.runSync(
`INSERT INTO order_items(orderId, menuItemId, name, price, quantity, modifiers) VALUES(?, ?, ?, ?, ?, ?);`,
[order.id, item.menuItemId, item.name, item.price, item.quantity, JSON.stringify(item.modifiers ?? [])]
);
}
},
saveInventoryItem: async (item: any) => {
database.runSync(
`INSERT OR REPLACE INTO inventory(id, name, category, price, stockQuantity, isActive) VALUES(?, ?, ?, ?, ?, ?);`,
[item.id, item.name, item.category ?? null, item.price, item.stockQuantity, item.isActive ? 1 : 0]
);
},
saveCustomer: async (customer: any) => {
database.runSync(
`INSERT OR REPLACE INTO customers(id, name, phone, email, loyaltyPoints) VALUES(?, ?, ?, ?, ?);`,
[customer.id, customer.name, customer.phone ?? null, customer.email ?? null, customer.loyaltyPoints ?? 0]
);
},
saveReceipt: async (receipt: any) => {
database.runSync(
`INSERT OR REPLACE INTO receipts(id, orderId, content, createdAt) VALUES(?, ?, ?, ?);`,
[receipt.id, receipt.orderId, receipt.content, receipt.createdAt]
);
},
getOngoingOrders: async () => {
const result = database.getAllSync(`SELECT * FROM orders WHERE status = 'ongoing' ORDER BY createdAt DESC;`);
return result as any[];
},
getCompletedOrders: async () => {
const result = database.getAllSync(`SELECT * FROM orders WHERE status = 'completed' ORDER BY createdAt DESC;`);
return result as any[];
},
};
