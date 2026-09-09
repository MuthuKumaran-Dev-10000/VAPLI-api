const db = require('../../config/database');

async function getAllClients() {
  const sql = `SELECT * FROM clients WHERE is_active = 1 ORDER BY name ASC`;
  const rows = await db.query(sql);
  return rows;
}

async function getClientById(id) {
  const sql = `SELECT * FROM clients WHERE id = ? LIMIT 1`;
  const rows = await db.query(sql, [id]);
  return rows[0] || null;
}

async function findClientByDbKey(dbKey) {
  const sql = `SELECT * FROM clients WHERE db_key = ? LIMIT 1`;
  const rows = await db.query(sql, [dbKey]);
  return rows[0] || null;
}

async function createClient(clientData) {
  const { id, name, dbKey, description, rootFolderId, createdAt, updatedAt } = clientData;
  const sql = `
    INSERT INTO clients (id, name, db_key, description, root_folder_id, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `;
  await db.query(sql, [id, name, dbKey, description || '', rootFolderId || null, createdAt, updatedAt]);
  return getClientById(id);
}

async function updateClient(id, updates) {
  const fields = [];
  const params = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    params.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    params.push(updates.description);
  }
  if (updates.rootFolderId !== undefined) {
    fields.push('root_folder_id = ?');
    params.push(updates.rootFolderId);
  }
  if (updates.isActive !== undefined) {
    fields.push('is_active = ?');
    params.push(updates.isActive ? 1 : 0);
  }

  if (fields.length === 0) return getClientById(id);

  fields.push('updated_at = ?');
  params.push(new Date().toISOString());

  params.push(id);
  const sql = `UPDATE clients SET ${fields.join(', ')} WHERE id = ?`;
  await db.query(sql, params);

  return getClientById(id);
}

async function deleteClient(id) {
  const sql = `DELETE FROM clients WHERE id = ?`;
  await db.query(sql, [id]);
}

module.exports = {
  getAllClients,
  getClientById,
  findClientByDbKey,
  createClient,
  updateClient,
  deleteClient
};
