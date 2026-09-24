const db = require('../config/db');

class TankRepository {
  async getTreeNodes(clientId) {
    const [rows] = await db.query(
      `SELECT * FROM tank_tree_nodes WHERE client_id = ? AND is_active = 1 ORDER BY sort_order ASC, name ASC`,
      [clientId]
    );
    return rows;
  }

  async getTanks(clientId) {
    const [rows] = await db.query(
      `SELECT t.*, n.sort_order 
       FROM tanks t 
       LEFT JOIN tank_tree_nodes n ON t.id = n.tank_id AND n.client_id = t.client_id AND n.is_active = 1
       WHERE t.client_id = ? AND t.is_active = 1 
       ORDER BY COALESCE(n.sort_order, 999999) ASC, t.tank_name ASC`,
      [clientId]
    );
    return rows;
  }

  async getTankById(clientId, tankId) {
    const [rows] = await db.query(
      `SELECT * FROM tanks WHERE client_id = ? AND id = ? LIMIT 1`,
      [clientId, tankId]
    );
    return rows[0] || null;
  }

  async getTankParameters(clientId, tankId) {
    const [params] = await db.query(
      `SELECT * FROM tank_parameters WHERE client_id = ? AND tank_id = ? ORDER BY display_order ASC`,
      [clientId, tankId]
    );
    const [constraints] = await db.query(
      `SELECT * FROM parameter_constraints WHERE client_id = ? AND tank_id = ?`,
      [clientId, tankId]
    );

    // Group constraints by parameter_id
    const constMap = {};
    for (const c of constraints) {
      if (!constMap[c.parameter_id]) constMap[c.parameter_id] = [];
      constMap[c.parameter_id].push(c);
    }

    for (const p of params) {
      p.constraints = constMap[p.id] || [];
    }

    return params;
  }

  async createTank(tank) {
    await db.query(
      `INSERT INTO tanks (id, client_id, tank_code, tank_name, location, is_active, inspection_frequency_type, inspection_frequency_days, scale_min, scale_max, scale_side, qr_image_url, inspection_properties_json, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        tank.id,
        tank.client_id,
        tank.tank_code,
        tank.tank_name,
        tank.location || null,
        tank.is_active !== false ? 1 : 0,
        tank.inspection_frequency_type || null,
        tank.inspection_frequency_days || null,
        tank.scale_min != null ? tank.scale_min : null,
        tank.scale_max != null ? tank.scale_max : null,
        tank.scale_side || null,
        tank.qr_image_url || null,
        JSON.stringify(tank.inspection_properties || []),
        tank.created_by || null
      ]
    );
  }

  async updateTank(clientId, tankId, updates) {
    const fields = [];
    const values = [];
    for (const [k, v] of Object.entries(updates)) {
      if (k === 'inspection_properties') {
        fields.push(`inspection_properties_json = ?`);
        values.push(JSON.stringify(v));
      } else {
        fields.push(`${k} = ?`);
        values.push(v);
      }
    }
    if (fields.length === 0) return;
    values.push(clientId, tankId);
    await db.query(`UPDATE tanks SET ${fields.join(', ')} WHERE client_id = ? AND id = ?`, values);
  }

  async deleteTank(clientId, tankId) {
    await db.query(`UPDATE tanks SET is_active = 0 WHERE client_id = ? AND id = ?`, [clientId, tankId]);
    await db.query(`UPDATE tank_tree_nodes SET is_active = 0 WHERE client_id = ? AND tank_id = ?`, [clientId, tankId]);
  }

  async saveTreeNode(node) {
    const [existing] = await db.query(
      `SELECT * FROM tank_tree_nodes WHERE id = ? LIMIT 1`,
      [node.id]
    );

    if (existing[0]) {
      const fields = [];
      const values = [];

      if (node.name !== undefined) { fields.push('name = ?'); values.push(node.name); }
      if (node.parent_id !== undefined) { fields.push('parent_id = ?'); values.push(node.parent_id || null); }
      if (node.tank_id !== undefined) { fields.push('tank_id = ?'); values.push(node.tank_id || null); }
      if (node.node_type || node.type) { fields.push('node_type = ?'); values.push(node.node_type || node.type); }
      if (node.zone !== undefined) { fields.push('zone = ?'); values.push(node.zone || null); }
      if (node.path !== undefined) { fields.push('path = ?'); values.push(node.path || null); }
      if (node.sort_order !== undefined || node.order !== undefined) {
        const orderVal = node.sort_order !== undefined ? node.sort_order : node.order;
        fields.push('sort_order = ?');
        values.push(orderVal);
      }
      if (node.is_active !== undefined) {
        fields.push('is_active = ?');
        values.push(node.is_active ? 1 : 0);
      }

      if (fields.length > 0) {
        values.push(node.id);
        await db.query(`UPDATE tank_tree_nodes SET ${fields.join(', ')} WHERE id = ?`, values);
      }
    } else {
      const nodeType = node.node_type || node.type || (node.tank_id ? 'leaf' : 'folder');
      const sortOrder = node.sort_order !== undefined ? node.sort_order : (node.order || 0);
      await db.query(
        `INSERT INTO tank_tree_nodes (id, client_id, parent_id, tank_id, node_type, name, zone, path, sort_order, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          node.id,
          node.client_id,
          node.parent_id || null,
          node.tank_id || null,
          nodeType,
          node.name || 'Untitled Node',
          node.zone || null,
          node.path || null,
          sortOrder,
          node.is_active !== false ? 1 : 0
        ]
      );
    }
  }

  async deleteTreeNode(clientId, nodeId) {
    await db.query(`UPDATE tank_tree_nodes SET is_active = 0 WHERE client_id = ? AND (id = ? OR parent_id = ?)`, [clientId, nodeId, nodeId]);
  }
}

module.exports = new TankRepository();
