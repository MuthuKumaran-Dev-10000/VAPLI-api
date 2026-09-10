const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

const memoryReadings = new Map();
const memoryReadingValues = new Map();
const memoryReadingImages = new Map();

class ReadingsService {
  async saveReading(data) {
    const reading = {
      id: data.id || uuidv4(),
      tank_id: data.tank_id || data.tankId || '',
      tank_snapshot_name: data.tank_snapshot_name || data.tankSnapshotName || null,
      final_level: data.final_level !== undefined && data.final_level !== null ? parseFloat(data.final_level) : (data.finalLevel !== undefined && data.finalLevel !== null ? parseFloat(data.finalLevel) : null),
      inspection_values: typeof data.inspection_values === 'string'
        ? data.inspection_values
        : JSON.stringify(data.inspection_values || data.values_json || {}),
      image_url: data.image_url || data.imageUrl || null,
      source: data.source || 'manual',
      captured_by: data.captured_by || data.recorded_by_id || '',
      captured_by_name: data.captured_by_name || data.recorded_by_name || '',
      inference_time_ms: data.inference_time_ms || data.inferenceTimeMs || null,
      captured_at_start: data.captured_at_start || data.capturedAtStart || null,
      captured_at: data.captured_at || data.timestamp || new Date().toISOString(),
      node_id: data.node_id || null,
      recorded_by_id: data.recorded_by_id || data.captured_by || '',
      recorded_by_name: data.recorded_by_name || data.captured_by_name || '',
      recorded_by_role: data.recorded_by_role || 'user',
      client_id: data.client_id || null,
      values_json: typeof data.values_json === 'string'
        ? data.values_json
        : JSON.stringify(data.values_json || data.inspection_values || {}),
      timestamp: data.timestamp || data.captured_at || new Date().toISOString()
    };

    // Extract structured parameter lines
    let valuesList = [];
    if (Array.isArray(data.values_list)) {
      valuesList = data.values_list;
    } else if (Array.isArray(data.reading_values)) {
      valuesList = data.reading_values;
    } else {
      // Parse object format inspection_values or values_json
      let parsedObj = {};
      if (typeof data.inspection_values === 'object' && data.inspection_values !== null) {
        parsedObj = data.inspection_values;
      } else if (typeof data.values_json === 'object' && data.values_json !== null) {
        parsedObj = data.values_json;
      } else {
        try {
          parsedObj = JSON.parse(reading.inspection_values || '{}');
        } catch (_) {
          parsedObj = {};
        }
      }

      valuesList = Object.entries(parsedObj).map(([key, val]) => {
        let valStr = '';
        let numVal = null;
        let imgUrl = null;

        if (typeof val === 'object' && val !== null) {
          valStr = JSON.stringify(val);
          imgUrl = val.image_url || val.imageUrl || null;
        } else {
          valStr = String(val ?? '');
          numVal = !isNaN(parseFloat(valStr)) ? parseFloat(valStr) : null;
        }

        return {
          param_id: key,
          param_label: key,
          param_type: typeof val === 'number' ? 'numeric' : 'text',
          val: valStr,
          numeric_val: numVal,
          image_url: imgUrl,
        };
      });
    }

    // Extract images list
    let imagesList = [];
    if (Array.isArray(data.images_list)) {
      imagesList = data.images_list;
    } else if (Array.isArray(data.reading_images)) {
      imagesList = data.reading_images;
    } else {
      // Collect image_url from reading master and parameter lines
      if (reading.image_url) {
        imagesList.push({
          param_id: null,
          category: 'manual_capture_image',
          image_url: reading.image_url,
        });
      }
      for (const item of valuesList) {
        if (item.image_url) {
          imagesList.push({
            param_id: item.param_id,
            category: item.category || 'auto_capture_image',
            image_url: item.image_url,
          });
        }
      }
    }

    if (!db.pool) {
      memoryReadings.set(reading.id, { ...reading, values_list: valuesList, images_list: imagesList });
      return { ...reading, values_list: valuesList, images_list: imagesList };
    }

    // Save Master Reading
    await db.query(
      `INSERT INTO readings (
        id, tank_id, tank_snapshot_name, final_level, inspection_values, image_url, source,
        captured_by, captured_by_name, inference_time_ms, captured_at_start, captured_at,
        node_id, recorded_by_id, recorded_by_name, recorded_by_role, client_id, values_json, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        tank_snapshot_name=VALUES(tank_snapshot_name), final_level=VALUES(final_level),
        inspection_values=VALUES(inspection_values), image_url=VALUES(image_url),
        source=VALUES(source), captured_by=VALUES(captured_by), captured_by_name=VALUES(captured_by_name),
        inference_time_ms=VALUES(inference_time_ms), captured_at_start=VALUES(captured_at_start),
        captured_at=VALUES(captured_at), values_json=VALUES(values_json), timestamp=VALUES(timestamp)`,
      [
        reading.id, reading.tank_id, reading.tank_snapshot_name, reading.final_level, reading.inspection_values,
        reading.image_url, reading.source, reading.captured_by, reading.captured_by_name,
        reading.inference_time_ms, reading.captured_at_start, reading.captured_at,
        reading.node_id, reading.recorded_by_id, reading.recorded_by_name, reading.recorded_by_role,
        reading.client_id, reading.values_json, reading.timestamp
      ]
    );

    // Save Parameter Lines in reading_values
    try {
      await db.query(`DELETE FROM reading_values WHERE reading_id = ?`, [reading.id]);

      const now = new Date().toISOString();
      for (const item of valuesList) {
        const valId = item.id || uuidv4();
        const paramId = item.param_id || item.paramId || 'unknown';
        const paramLabel = item.param_label || item.paramLabel || paramId;
        const paramType = item.param_type || item.paramType || 'text';
        const valStr = item.val !== undefined ? String(item.val) : (item.value !== undefined ? String(item.value) : '');
        const numVal = item.numeric_val !== undefined && item.numeric_val !== null ? parseFloat(item.numeric_val) : (!isNaN(parseFloat(valStr)) ? parseFloat(valStr) : null);
        const unit = item.unit || null;
        const minVal = item.min_val !== undefined && item.min_val !== null ? parseFloat(item.min_val) : null;
        const maxVal = item.max_val !== undefined && item.max_val !== null ? parseFloat(item.max_val) : null;
        const isViolation = item.is_violation ? 1 : 0;
        const violationMsg = item.violation_message || item.violationMessage || null;
        const imgUrl = item.image_url || item.imageUrl || null;

        await db.query(
          `INSERT INTO reading_values (
            id, reading_id, param_id, param_label, param_type, val, numeric_val, unit,
            min_val, max_val, is_violation, violation_message, image_url, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            valId, reading.id, paramId, paramLabel, paramType, valStr, numVal, unit,
            minVal, maxVal, isViolation, violationMsg, imgUrl, now
          ]
        );
      }
    } catch (e) {
      console.error('[READINGS SERVICE] Failed saving reading_values lines:', e);
    }

    // Save Images List in reading_images
    try {
      await db.query(`DELETE FROM reading_images WHERE reading_id = ?`, [reading.id]);

      const now = new Date().toISOString();
      for (const img of imagesList) {
        const imgId = img.id || uuidv4();
        const paramId = img.param_id || img.paramId || null;
        const category = img.category || 'manual_capture_image';
        const imgUrl = img.image_url || img.imageUrl || img.url || '';
        const filePath = img.file_path || img.filePath || null;
        const annotations = typeof img.annotations_json === 'string'
          ? img.annotations_json
          : JSON.stringify(img.annotations_json || img.annotations || null);

        if (imgUrl) {
          await db.query(
            `INSERT INTO reading_images (
              id, reading_id, param_id, category, image_url, file_path, annotations_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [imgId, reading.id, paramId, category, imgUrl, filePath, annotations, now]
          );
        }
      }
    } catch (e) {
      console.error('[READINGS SERVICE] Failed saving reading_images lines:', e);
    }

    return {
      ...reading,
      values_list: valuesList,
      images_list: imagesList
    };
  }

  async getReadings(query = {}) {
    if (!db.pool) {
      return Array.from(memoryReadings.values());
    }

    let sql = 'SELECT * FROM readings WHERE 1=1';
    const params = [];

    if (query.tank_id) {
      sql += ' AND tank_id = ?';
      params.push(query.tank_id);
    }
    if (query.captured_by || query.recorded_by_id) {
      sql += ' AND (captured_by = ? OR recorded_by_id = ?)';
      params.push(query.captured_by || query.recorded_by_id, query.captured_by || query.recorded_by_id);
    }

    sql += ' ORDER BY captured_at DESC, timestamp DESC';
    const rows = await db.query(sql, params);

    for (const r of rows) {
      if (typeof r.inspection_values === 'string') {
        try { r.inspection_values = JSON.parse(r.inspection_values); } catch (_) { r.inspection_values = {}; }
      }
      if (typeof r.values_json === 'string') {
        try { r.values_json = JSON.parse(r.values_json); } catch (_) { r.values_json = {}; }
      }

      // Fetch parameter lines from reading_values
      try {
        const valueLines = await db.query(`SELECT * FROM reading_values WHERE reading_id = ?`, [r.id]);
        r.values_list = valueLines.map(v => ({
          id: v.id,
          param_id: v.param_id,
          param_label: v.param_label,
          param_type: v.param_type,
          val: v.val,
          numeric_val: v.numeric_val,
          unit: v.unit,
          min_val: v.min_val,
          max_val: v.max_val,
          is_violation: Boolean(v.is_violation),
          violation_message: v.violation_message,
          image_url: v.image_url,
          created_at: v.created_at
        }));
      } catch (_) {
        r.values_list = [];
      }

      // Fetch image lines from reading_images
      try {
        const imageLines = await db.query(`SELECT * FROM reading_images WHERE reading_id = ?`, [r.id]);
        r.images_list = imageLines.map(i => ({
          id: i.id,
          param_id: i.param_id,
          category: i.category,
          image_url: i.image_url,
          file_path: i.file_path,
          annotations_json: i.annotations_json,
          created_at: i.created_at
        }));
      } catch (_) {
        r.images_list = [];
      }
    }

    return rows;
  }
}

module.exports = new ReadingsService();
