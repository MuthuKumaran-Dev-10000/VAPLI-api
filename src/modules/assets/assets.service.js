const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

// Memory fallbacks in case DB pool fails
const memoryNodes = new Map();
const memoryTanks = new Map();
const memoryTemplates = new Map();

class AssetsService {
  async cleanupDuplicateNodes() {
    if (!db.pool) {
      const tankNodeMap = new Map();
      for (const node of memoryNodes.values()) {
        if (node.type === 'leaf' && node.tank_id) {
          if (!tankNodeMap.has(node.tank_id)) tankNodeMap.set(node.tank_id, []);
          tankNodeMap.get(node.tank_id).push(node);
        }
      }
      for (const [tankId, nodes] of tankNodeMap.entries()) {
        const nonRoot = nodes.find(n => n.parent_id !== null && n.parent_id !== undefined && n.parent_id !== '' && n.parent_id !== 'null');
        if (nonRoot) {
          for (const node of nodes) {
            if (!node.parent_id || node.parent_id === 'null') {
              memoryNodes.delete(node.id);
            }
          }
        }
      }
      return;
    }

    try {
      await db.query(`
        DELETE n1 FROM tank_nodes n1
        INNER JOIN tank_nodes n2 ON n1.tank_id = n2.tank_id
        WHERE n1.type = 'leaf'
          AND (n1.parent_id IS NULL OR n1.parent_id = 'null' OR n1.parent_id = '')
          AND n2.parent_id IS NOT NULL 
          AND n2.parent_id != 'null' 
          AND n2.parent_id != ''
      `);
    } catch (e) {
      console.error('[AssetsService] cleanupDuplicateNodes error:', e);
    }
  }

  // ── NODES ──
  async getNodes(parentId = null) {
    await this.cleanupDuplicateNodes();

    if (!db.pool) {
      const all = Array.from(memoryNodes.values());
      if (parentId === null) {
        return all.filter(n => !n.parent_id).sort((a, b) => (a.order || 0) - (b.order || 0));
      }
      return all.filter(n => n.parent_id === parentId).sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    if (parentId === null) {
      const rows = await db.query(
        'SELECT * FROM tank_nodes WHERE parent_id IS NULL ORDER BY `order` ASC'
      );
      return rows;
    } else {
      const rows = await db.query(
        'SELECT * FROM tank_nodes WHERE parent_id = ? ORDER BY `order` ASC',
        [parentId]
      );
      return rows;
    }
  }

  async getAllNodes() {
    await this.cleanupDuplicateNodes();

    if (!db.pool) {
      return Array.from(memoryNodes.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    const rows = await db.query('SELECT * FROM tank_nodes ORDER BY `order` ASC');
    return rows;
  }

  async createNode(data) {
    const node = {
      id: data.id || uuidv4(),
      type: data.type || 'folder',
      name: data.name || '',
      description: data.description || null,
      zone: data.zone || null,
      parent_id: data.parent_id || null,
      path: data.path || data.name || '',
      order: parseInt(data.order) || 0,
      tank_id: data.tank_id || null,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!db.pool) {
      memoryNodes.set(node.id, node);
      return node;
    }

    await db.query(
      `INSERT INTO tank_nodes (id, type, name, description, zone, parent_id, path, \`order\`, tank_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       type=VALUES(type), name=VALUES(name), description=VALUES(description), zone=VALUES(zone),
       parent_id=VALUES(parent_id), path=VALUES(path), \`order\`=VALUES(\`order\`), tank_id=VALUES(tank_id), updated_at=VALUES(updated_at)`,
      [
        node.id, node.type, node.name, node.description, node.zone,
        node.parent_id, node.path, node.order, node.tank_id, node.created_at, node.updated_at
      ]
    );

    return node;
  }

  async updateNode(id, data) {
    if (!db.pool) {
      const existing = memoryNodes.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data, updated_at: new Date().toISOString() };
      memoryNodes.set(id, updated);
      return updated;
    }

    const fields = [];
    const values = [];

    const allowed = ['name', 'description', 'zone', 'parent_id', 'path', 'order', 'tank_id', 'type'];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        if (key === 'order') {
          fields.push('`order` = ?');
        } else {
          fields.push(`${key} = ?`);
        }
        values.push(data[key]);
      }
    }

    if (fields.length === 0) return await this.getNodeById(id);

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await db.query(`UPDATE tank_nodes SET ${fields.join(', ')} WHERE id = ?`, values);
    return await this.getNodeById(id);
  }

  async getNodeById(id) {
    if (!db.pool) return memoryNodes.get(id) || null;
    const rows = await db.query('SELECT * FROM tank_nodes WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async deleteNode(id) {
    // Delete subtree recursively
    const all = await this.getAllNodes();
    const toDelete = new Set([id]);
    
    let added = true;
    while (added) {
      added = false;
      for (const node of all) {
        if (node.parent_id && toDelete.has(node.parent_id) && !toDelete.has(node.id)) {
          toDelete.add(node.id);
          added = true;
        }
      }
    }

    for (const nodeId of toDelete) {
      if (!db.pool) {
        memoryNodes.delete(nodeId);
      } else {
        await db.query('DELETE FROM tank_nodes WHERE id = ?', [nodeId]);
      }
    }

    return true;
  }

  // ── TANKS ──
  async getAllTanks() {
    if (!db.pool) {
      return Array.from(memoryTanks.values()).filter(t => t.is_active !== false);
    }
    const rows = await db.query('SELECT * FROM tanks WHERE is_active = TRUE OR is_active IS NULL');
    return rows.map(r => this._parseTankRow(r));
  }

  async getTankById(id) {
    if (!db.pool) {
      const tank = memoryTanks.get(id);
      return tank || null;
    }
    const rows = await db.query('SELECT * FROM tanks WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    return this._parseTankRow(rows[0]);
  }

  async createTank(data) {
    const now = new Date().toISOString();
    const tank = {
      id: data.id || uuidv4(),
      tank_code: data.tank_code || '',
      tank_name: data.tank_name || '',
      location: data.location || null,
      qr_json: data.qr_json || null,
      qr_image_url: data.qr_image_url || null,
      inspection_properties: typeof data.inspection_properties === 'string' 
        ? data.inspection_properties 
        : JSON.stringify(data.inspection_properties || []),
      scale_min: data.scale_min !== undefined ? parseFloat(data.scale_min) : 0,
      scale_max: data.scale_max !== undefined ? parseFloat(data.scale_max) : 100,
      scale_side: data.scale_side || null,
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
      created_by: data.created_by || 'system',
      created_at: data.created_at || now,
      updated_at: now,
      inspection_frequency_type: data.inspection_frequency_type || 'daily',
      inspection_frequency_days: parseInt(data.inspection_frequency_days) || 1,
      groups: typeof data.groups === 'string' ? data.groups : JSON.stringify(data.groups || {})
    };

    if (!db.pool) {
      memoryTanks.set(tank.id, this._parseTankRow(tank));
      return this._parseTankRow(tank);
    }

    await db.query(
      `INSERT INTO tanks (id, tank_code, tank_name, location, qr_json, qr_image_url, inspection_properties,
                          scale_min, scale_max, scale_side, is_active, created_by, created_at, updated_at,
                          inspection_frequency_type, inspection_frequency_days, groups)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       tank_code=VALUES(tank_code), tank_name=VALUES(tank_name), location=VALUES(location),
       qr_json=VALUES(qr_json), qr_image_url=VALUES(qr_image_url), inspection_properties=VALUES(inspection_properties),
       scale_min=VALUES(scale_min), scale_max=VALUES(scale_max), scale_side=VALUES(scale_side),
       is_active=VALUES(is_active), updated_at=VALUES(updated_at),
       inspection_frequency_type=VALUES(inspection_frequency_type),
       inspection_frequency_days=VALUES(inspection_frequency_days), groups=VALUES(groups)`,
      [
        tank.id, tank.tank_code, tank.tank_name, tank.location, tank.qr_json, tank.qr_image_url,
        tank.inspection_properties, tank.scale_min, tank.scale_max, tank.scale_side,
        tank.is_active ? 1 : 0, tank.created_by, tank.created_at, tank.updated_at,
        tank.inspection_frequency_type, tank.inspection_frequency_days, tank.groups
      ]
    );

    return await this.getTankById(tank.id);
  }

  async updateTank(id, data) {
    const existing = await this.getTankById(id);
    if (!existing) {
      return await this.createTank({ id, ...data });
    }

    const merged = { ...existing, ...data, updated_at: new Date().toISOString() };
    return await this.createTank(merged);
  }

  async deleteTank(id) {
    if (!db.pool) {
      memoryTanks.delete(id);
      return true;
    }
    await db.query('UPDATE tanks SET is_active = FALSE WHERE id = ?', [id]);
    return true;
  }

  // Helper parser
  _parseTankRow(row) {
    if (!row) return null;
    const r = { ...row };
    if (typeof r.inspection_properties === 'string') {
      try { r.inspection_properties = JSON.parse(r.inspection_properties); } catch (_) { r.inspection_properties = []; }
    }
    if (typeof r.groups === 'string') {
      try { r.groups = JSON.parse(r.groups); } catch (_) { r.groups = {}; }
    }
    r.is_active = Boolean(r.is_active);
    return r;
  }

  // ── TEMPLATES ──
  async getTemplates() {
    if (!db.pool) {
      return Array.from(memoryTemplates.values());
    }
    const rows = await db.query('SELECT * FROM parameter_templates ORDER BY created_at DESC');
    return rows.map(r => {
      if (typeof r.properties === 'string') {
        try { r.properties = JSON.parse(r.properties); } catch (_) { r.properties = []; }
      }
      return r;
    });
  }

  async createTemplate(data) {
    const template = {
      id: data.id || uuidv4(),
      name: data.name || '',
      description: data.description || null,
      properties: typeof data.properties === 'string' ? data.properties : JSON.stringify(data.properties || []),
      created_by: data.created_by || 'system',
      created_at: new Date().toISOString()
    };

    if (!db.pool) {
      memoryTemplates.set(template.id, template);
      return template;
    }

    await db.query(
      `INSERT INTO parameter_templates (id, name, description, properties, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       name=VALUES(name), description=VALUES(description), properties=VALUES(properties)`,
      [template.id, template.name, template.description, template.properties, template.created_by, template.created_at]
    );

    return {
      ...template,
      properties: typeof template.properties === 'string' ? JSON.parse(template.properties) : template.properties
    };
  }

  async deleteTemplate(id) {
    if (!db.pool) {
      memoryTemplates.delete(id);
      return true;
    }
    await db.query('DELETE FROM parameter_templates WHERE id = ?', [id]);
    return true;
  }
}

module.exports = new AssetsService();
