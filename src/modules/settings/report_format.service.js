const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

const memoryReportConfigs = new Map();

class ReportFormatService {
  async getConfigs() {
    if (!db.pool) {
      const result = {};
      for (const [key, val] of memoryReportConfigs.entries()) {
        result[key] = val;
      }
      return result;
    }

    try {
      const rows = await db.query(
        'SELECT * FROM report_format_configs ORDER BY folder_id, is_violation_mode, order_index'
      );

      const configsMap = {};
      for (const row of rows) {
        const folderKey = row.is_violation_mode
          ? `${row.folder_id}_violation`
          : row.folder_id;

        if (!configsMap[folderKey]) {
          configsMap[folderKey] = {
            pdf_strip_text: row.pdf_strip_text || '',
            pdf_threshold_count: row.pdf_threshold_count || 5,
            excel_threshold_count: row.excel_threshold_count || 10,
            params: [],
          };
        }

        let options = [];
        if (row.param_options) {
          try {
            options = typeof row.param_options === 'string'
              ? JSON.parse(row.param_options)
              : row.param_options;
          } catch (_) {
            options = [];
          }
        }

        configsMap[folderKey].params.push({
          key: row.param_key,
          name: row.param_name || row.param_key,
          type: row.param_type || 'text',
          options,
          selected: Boolean(row.selected),
          order: row.order_index || 0,
          abbreviation: row.abbreviation || '',
        });
      }
      return configsMap;
    } catch (e) {
      console.error('[ReportFormatService] getConfigs error:', e);
      return {};
    }
  }

  async saveConfigs(configsData) {
    if (!configsData || typeof configsData !== 'object') return false;

    if (!db.pool) {
      for (const [key, val] of Object.entries(configsData)) {
        memoryReportConfigs.set(key, val);
      }
      return true;
    }

    try {
      for (const [folderKey, folderConfig] of Object.entries(configsData)) {
        let folderId = folderKey;
        let isViolationMode = false;

        if (folderKey.endsWith('_violation')) {
          folderId = folderKey.replace('_violation', '');
          isViolationMode = true;
        }

        const pdfStripText = folderConfig.pdf_strip_text || '';
        const pdfThresholdCount = parseInt(folderConfig.pdf_threshold_count) || 5;
        const excelThresholdCount = parseInt(folderConfig.excel_threshold_count) || 10;
        const params = Array.isArray(folderConfig.params) ? folderConfig.params : [];

        for (let i = 0; i < params.length; i++) {
          const p = params[i];
          const paramKey = p.key || p.name || `param_${i}`;
          const paramName = p.name || paramKey;
          const paramType = p.type || 'text';
          const paramOptions = JSON.stringify(p.options || []);
          const selected = p.selected !== undefined ? Boolean(p.selected) : true;
          const abbreviation = p.abbreviation || '';
          const orderIndex = p.order !== undefined ? parseInt(p.order) : i;

          const id = `${folderId}_${isViolationMode ? 'v' : 'nv'}_${paramKey}`;

          await db.query(
            `INSERT INTO report_format_configs
              (id, folder_id, is_violation_mode, pdf_strip_text, pdf_threshold_count, excel_threshold_count,
               param_key, param_name, param_type, param_options, selected, abbreviation, order_index, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
               pdf_strip_text = VALUES(pdf_strip_text),
               pdf_threshold_count = VALUES(pdf_threshold_count),
               excel_threshold_count = VALUES(excel_threshold_count),
               param_name = VALUES(param_name),
               param_type = VALUES(param_type),
               param_options = VALUES(param_options),
               selected = VALUES(selected),
               abbreviation = VALUES(abbreviation),
               order_index = VALUES(order_index),
               updated_at = NOW()`,
            [
              id, folderId, isViolationMode ? 1 : 0, pdfStripText, pdfThresholdCount, excelThresholdCount,
              paramKey, paramName, paramType, paramOptions, selected ? 1 : 0, abbreviation, orderIndex
            ]
          );
        }
      }
      return true;
    } catch (e) {
      console.error('[ReportFormatService] saveConfigs error:', e);
      return false;
    }
  }
}

module.exports = new ReportFormatService();
