const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function runImporter() {
  const args = process.argv.slice(2);
  let filePath = args.find(a => !a.startsWith('--'));
  if (!filePath) {
    // Default fallback to Backup-26-06-2026.json if present
    const defaultPath = path.join(__dirname, '../../vapli/Backup-26-06-2026.json');
    if (fs.existsSync(defaultPath)) {
      filePath = defaultPath;
    } else {
      console.error('Usage: node scripts/import-firebase-json.js <path-to-db.json> [--dry-run] [--tenant <db_key>]');
      process.exit(1);
    }
  }

  const isDryRun = args.includes('--dry-run');
  const tenantFilterIdx = args.indexOf('--tenant');
  const tenantFilter = tenantFilterIdx !== -1 ? args[tenantFilterIdx + 1] : null;

  console.log(`Starting Firebase JSON Import from: ${filePath}`);
  console.log(`Dry Run: ${isDryRun ? 'YES' : 'NO'}`);
  if (tenantFilter) console.log(`Tenant Filter: ${tenantFilter}`);

  const rawData = fs.readFileSync(filePath, 'utf8');
  const dbJson = JSON.parse(rawData);

  const dbPool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'DhruvDev001',
    database: process.env.DB_NAME || 'vapli_db',
    waitForConnections: true,
    connectionLimit: 10,
    timezone: '+00:00'
  });

  const runId = 'run_' + Date.now();
  const startTime = new Date();

  let counts = {
    clients: 0,
    users: 0,
    user_clients: 0,
    tanks: 0,
    tank_tree_nodes: 0,
    parameters: 0,
    constraints: 0,
    readings: 0,
    reading_values: 0,
    alerts: 0,
    violations: 0,
    completed_tasks: 0,
    audit_logs: 0,
    errors: 0
  };

  try {
    if (!isDryRun) {
      await dbPool.query(
        `INSERT INTO migration_runs (id, source_filename, started_at, status, dry_run) VALUES (?, ?, ?, 'RUNNING', ?)`,
        [runId, path.basename(filePath), startTime, isDryRun ? 1 : 0]
      );
    }

    // 1. Process Clients
    const clientDbKeyToId = {};
    const clientsData = dbJson.clients || {};
    for (const key of Object.keys(clientsData)) {
      const c = clientsData[key];
      const clientId = c.id || key;
      const dbKey = c.db_key || key;
      clientDbKeyToId[dbKey] = clientId;
      clientDbKeyToId[clientId] = clientId;

      if (tenantFilter && dbKey !== tenantFilter && clientId !== tenantFilter) {
        continue;
      }

      counts.clients++;
      if (!isDryRun) {
        await dbPool.query(
          `INSERT INTO clients (id, db_key, name, description, is_active, created_at, updated_at, legacy_firebase_key, extra_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), is_active=VALUES(is_active)`,
          [
            clientId,
            dbKey,
            c.name || dbKey,
            c.description || null,
            c.is_active === false ? 0 : 1,
            c.created_at ? new Date(c.created_at) : new Date(),
            c.updated_at ? new Date(c.updated_at) : new Date(),
            key,
            JSON.stringify(c)
          ]
        );
      }
    }

    // 2. Process Users (Global)
    const userIdMap = {};
    const usernameToIdMap = {};
    const usersData = dbJson.users || {};
    for (const key of Object.keys(usersData)) {
      const u = usersData[key];
      const userId = u.id || key;
      const username = u.username || u.name || userId;
      userIdMap[userId] = true;
      if (username) usernameToIdMap[username.toLowerCase()] = userId;
      counts.users++;

      if (!isDryRun) {
        await dbPool.query(
          `INSERT INTO users (id, username, password_hash, display_name, email, phone, role, is_active, privileges_json, extra_json, created_at, legacy_firebase_key)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE display_name=VALUES(display_name), role=VALUES(role), is_active=VALUES(is_active)`,
          [
            userId,
            u.username || u.name || userId,
            u.password || u.password_hash || null,
            u.display_name || u.name || u.username || null,
            u.email || null,
            u.phone || null,
            u.role || 'user',
            u.is_active === false ? 0 : 1,
            JSON.stringify(u.privileges || {}),
            JSON.stringify(u),
            u.created_at ? new Date(u.created_at) : new Date(),
            key
          ]
        );

        // Client relationships for user
        const userClientIds = u.client_ids || u.clients || [];
        if (Array.isArray(userClientIds)) {
          for (const cId of userClientIds) {
            const mappedId = clientDbKeyToId[cId] || cId;
            try {
              await dbPool.query(
                `INSERT INTO user_clients (user_id, client_id, is_active) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE is_active=1`,
                [userId, mappedId]
              );
              counts.user_clients++;
            } catch (err) {
              // client might not exist in db
            }
          }
        }
      }
    }

    // 3. Process Tenant Nodes (e.g., dummy_client_id, vsy_papers)
    for (const topKey of Object.keys(dbJson)) {
      if (['clients', 'users', 'admin_audit_logs_master', 'testDB'].includes(topKey)) continue;

      const tenantObj = dbJson[topKey];
      if (typeof tenantObj !== 'object' || tenantObj === null) continue;

      const clientId = clientDbKeyToId[topKey] || topKey;
      if (tenantFilter && topKey !== tenantFilter && clientId !== tenantFilter) {
        continue;
      }

      // Ensure client record exists
      if (!isDryRun) {
        await dbPool.query(
          `INSERT INTO clients (id, db_key, name, is_active, created_at) VALUES (?, ?, ?, 1, NOW())
           ON DUPLICATE KEY UPDATE db_key=VALUES(db_key)`,
          [clientId, topKey, topKey]
        );
      }

      // 3a. Tenant Meta
      if (tenantObj.meta) {
        for (const mKey of Object.keys(tenantObj.meta)) {
          if (!isDryRun) {
            await dbPool.query(
              `INSERT INTO client_meta (client_id, meta_key, meta_value_json) VALUES (?, ?, ?)
               ON DUPLICATE KEY UPDATE meta_value_json=VALUES(meta_value_json)`,
              [clientId, mKey, JSON.stringify(tenantObj.meta[mKey])]
            );
          }
        }
      }

      // 3b. Tenant Settings
      if (tenantObj.settings) {
        for (const sKey of Object.keys(tenantObj.settings)) {
          if (!isDryRun) {
            await dbPool.query(
              `INSERT INTO client_settings (client_id, key_name, json_value, updated_at) VALUES (?, ?, ?, NOW())
               ON DUPLICATE KEY UPDATE json_value=VALUES(json_value), updated_at=NOW()`,
              [clientId, sKey, JSON.stringify(tenantObj.settings[sKey])]
            );
          }
        }
      }

      // 3c. Tenant System Settings
      if (tenantObj.system_settings) {
        for (const ssKey of Object.keys(tenantObj.system_settings)) {
          if (!isDryRun) {
            await dbPool.query(
              `INSERT INTO system_settings (client_id, key_name, json_value, updated_at) VALUES (?, ?, ?, NOW())
               ON DUPLICATE KEY UPDATE json_value=VALUES(json_value), updated_at=NOW()`,
              [clientId, ssKey, JSON.stringify(tenantObj.system_settings[ssKey])]
            );
          }
        }
      }

      // 3d. Tank Tree
      if (tenantObj.tank_tree) {
        const treeData = tenantObj.tank_tree;
        for (const treeKey of Object.keys(treeData)) {
          const node = treeData[treeKey];
          const nodeId = node.id || treeKey;
          counts.tank_tree_nodes++;
          if (!isDryRun) {
            await dbPool.query(
              `INSERT INTO tank_tree_nodes (id, client_id, parent_id, tank_id, node_type, name, zone, path, sort_order, is_active, legacy_firebase_key, extra_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE name=VALUES(name), parent_id=VALUES(parent_id), is_active=VALUES(is_active)`,
              [
                nodeId,
                clientId,
                node.parent_id || node.parentId || null,
                node.tank_id || node.tankId || null,
                node.node_type || node.type || (node.tank_id || node.tankId ? 'tank' : 'folder'),
                node.name || 'Folder',
                node.zone || null,
                node.path || null,
                parseInt(node.sort_order || node.sortOrder || 0, 10),
                node.is_active === false ? 0 : 1,
                treeKey,
                JSON.stringify(node)
              ]
            );
          }
        }
      }

      // Helper to auto-create stub tank if missing
      const tankIdMap = {};
      const ensureTankExists = async (tId, tCode, tName) => {
        if (!tId) return;
        if (tankIdMap[tId]) return;
        tankIdMap[tId] = true;
        if (!isDryRun) {
          await dbPool.query(
            `INSERT INTO tanks (id, client_id, tank_code, tank_name, is_active, created_at)
             VALUES (?, ?, ?, ?, 0, NOW())
             ON DUPLICATE KEY UPDATE id=id`,
            [tId, clientId, tCode || tId, tName || 'Historical Tank (' + tId + ')']
          );
        }
      };

      // Populate tankIdMap from existing tanks
      if (tenantObj.tanks) {
        for (const tKey of Object.keys(tenantObj.tanks)) {
          const t = tenantObj.tanks[tKey];
          tankIdMap[t.id || tKey] = true;
        }
      }

      // 3e. Tanks & Parameters & Constraints
      if (tenantObj.tanks) {
        const tanksData = tenantObj.tanks;
        for (const tankKey of Object.keys(tanksData)) {
          const t = tanksData[tankKey];
          const tankId = t.id || tankKey;
          counts.tanks++;

          if (!isDryRun) {
            await dbPool.query(
              `INSERT INTO tanks (id, client_id, tank_code, tank_name, location, is_active, inspection_frequency_type, inspection_frequency_days, scale_min, scale_max, scale_side, qr_image_url, qr_json, inspection_properties_json, created_at, legacy_firebase_key, extra_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE tank_name=VALUES(tank_name), tank_code=VALUES(tank_code), is_active=VALUES(is_active), inspection_properties_json=VALUES(inspection_properties_json)`,
              [
                tankId,
                clientId,
                t.tank_code || t.tankCode || tankId,
                t.tank_name || t.tankName || 'Tank ' + tankId,
                t.location || null,
                t.is_active === false ? 0 : 1,
                t.inspection_frequency_type || null,
                t.inspection_frequency_days ? parseInt(t.inspection_frequency_days, 10) : null,
                t.scale_min != null ? parseFloat(t.scale_min) : null,
                t.scale_max != null ? parseFloat(t.scale_max) : null,
                t.scale_side || null,
                t.qr_image_url || null,
                JSON.stringify(t.qr || {}),
                JSON.stringify(t.inspection_properties || t.inspectionProperties || []),
                t.created_at ? new Date(t.created_at) : new Date(),
                tankKey,
                JSON.stringify(t)
              ]
            );

            // Import parameters if specified in tank structure
            const params = t.inspection_properties || t.parameters || [];
            if (Array.isArray(params)) {
              for (let i = 0; i < params.length; i++) {
                const p = params[i];
                const paramId = p.id || `${tankId}_param_${i}`;
                counts.parameters++;
                await dbPool.query(
                  `INSERT INTO tank_parameters (id, client_id, tank_id, parent_parameter_id, label, parameter_type, required, autofill, capture_image, keep_previous_capture, hint, display_order, options_json, extra_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON DUPLICATE KEY UPDATE label=VALUES(label), parameter_type=VALUES(parameter_type), display_order=VALUES(display_order)`,
                  [
                    paramId,
                    clientId,
                    tankId,
                    p.parent_parameter_id || null,
                    p.label || p.name || 'Param ' + i,
                    p.parameter_type || p.type || 'text',
                    p.required ? 1 : 0,
                    p.autofill ? 1 : 0,
                    p.capture_image ? 1 : 0,
                    p.keep_previous_capture ? 1 : 0,
                    p.hint || null,
                    p.display_order != null ? p.display_order : i,
                    JSON.stringify(p.options || []),
                    JSON.stringify(p)
                  ]
                );

                // Constraints for parameter
                if (p.constraints && Array.isArray(p.constraints)) {
                  for (let cIdx = 0; cIdx < p.constraints.length; cIdx++) {
                    const c = p.constraints[cIdx];
                    const constId = c.id || `${paramId}_const_${cIdx}`;
                    counts.constraints++;
                    await dbPool.query(
                      `INSERT INTO parameter_constraints (id, client_id, tank_id, parameter_id, op, compare_value_json, alert_title, message, severity, block_submission, capture_image_on_violation, play_sound_on_violation, show_dashboard_alert, then_workflow_enabled, then_properties_json, extra_json)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                       ON DUPLICATE KEY UPDATE message=VALUES(message), severity=VALUES(severity)`,
                      [
                        constId,
                        clientId,
                        tankId,
                        paramId,
                        c.op || c.operator || '==',
                        JSON.stringify(c.value != null ? c.value : null),
                        c.alert_title || null,
                        c.message || null,
                        c.severity || 'warning',
                        c.block_submission ? 1 : 0,
                        c.capture_image_on_violation ? 1 : 0,
                        c.play_sound_on_violation ? 1 : 0,
                        c.show_dashboard_alert ? 1 : 0,
                        c.then_workflow_enabled ? 1 : 0,
                        JSON.stringify(c.then_properties || []),
                        JSON.stringify(c)
                      ]
                    );
                  }
                }
              }
            }
          }
        }
      }

      // 3f. Readings
      if (tenantObj.readings) {
        const readingsData = tenantObj.readings;
        for (const rKey of Object.keys(readingsData)) {
          const r = readingsData[rKey];
          const readingId = r.id || rKey;
          const tankId = r.tank_id || r.tankId || 'unknown_tank';
          await ensureTankExists(tankId, null, r.tank_snapshot_name);
          counts.readings++;

          let capturedUserId = r.captured_by || r.capturedBy || null;
          let capturedUserName = r.captured_by_name || r.capturedByName || null;
          if (capturedUserId && !userIdMap[capturedUserId]) {
            if (usernameToIdMap[capturedUserId.toLowerCase()]) {
              capturedUserId = usernameToIdMap[capturedUserId.toLowerCase()];
            } else {
              capturedUserName = capturedUserName || capturedUserId;
              capturedUserId = null;
            }
          }

          if (!isDryRun) {
            await dbPool.query(
              `INSERT INTO readings (id, client_id, tank_id, captured_by, captured_by_name, captured_at, final_level, source, image_url, inspection_values_json, legacy_firebase_key, extra_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE captured_at=VALUES(captured_at), final_level=VALUES(final_level)`,
              [
                readingId,
                clientId,
                r.tank_id || r.tankId || 'unknown_tank',
                capturedUserId,
                capturedUserName,
                r.captured_at ? new Date(r.captured_at) : new Date(),
                r.final_level != null ? parseFloat(r.final_level) : null,
                r.source || 'app',
                r.image_url || null,
                JSON.stringify(r.inspection_values || r.inspectionValues || {}),
                rKey,
                JSON.stringify(r)
              ]
            );

            // reading values normalization
            const vals = r.inspection_values || r.inspectionValues || {};
            for (const pId of Object.keys(vals)) {
              const valObj = vals[pId];
              counts.reading_values++;
              let numVal = null;
              let txtVal = null;
              if (typeof valObj === 'number') numVal = valObj;
              else if (typeof valObj === 'string') {
                txtVal = valObj;
                const parsed = parseFloat(valObj);
                if (!isNaN(parsed)) numVal = parsed;
              } else if (valObj && typeof valObj === 'object') {
                txtVal = JSON.stringify(valObj);
              }

              await dbPool.query(
                `INSERT INTO reading_values (client_id, reading_id, tank_id, parameter_id, captured_at, text_value, numeric_value, raw_value_json)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE text_value=VALUES(text_value), numeric_value=VALUES(numeric_value)`,
                [
                  clientId,
                  readingId,
                  r.tank_id || r.tankId || 'unknown_tank',
                  pId,
                  r.captured_at ? new Date(r.captured_at) : new Date(),
                  txtVal,
                  numVal,
                  JSON.stringify(valObj)
                ]
              );
            }
          }
        }
      }

      // 3g. Alerts & Violations
      if (tenantObj.alerts) {
        for (const aKey of Object.keys(tenantObj.alerts)) {
          const a = tenantObj.alerts[aKey];
          const alertId = a.id || aKey;
          const aTankId = a.tank_id || a.tankId || null;
          if (aTankId) await ensureTankExists(aTankId, a.tank_code, a.tank_name);
          counts.alerts++;
          if (!isDryRun) {
            await dbPool.query(
              `INSERT INTO alerts (id, client_id, tank_id, tank_code, tank_name, status, message, severity, acknowledged, live, timestamp, legacy_firebase_key, extra_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE status=VALUES(status), message=VALUES(message)`,
              [
                alertId,
                clientId,
                aTankId,
                a.tank_code || null,
                a.tank_name || null,
                a.status || 'active',
                a.message || null,
                a.severity || 'warning',
                a.acknowledged ? 1 : 0,
                a.live ? 1 : 0,
                a.timestamp ? new Date(a.timestamp) : new Date(),
                aKey,
                JSON.stringify(a)
              ]
            );
          }
        }
      }

      if (tenantObj.violations) {
        for (const vKey of Object.keys(tenantObj.violations)) {
          const v = tenantObj.violations[vKey];
          const vId = v.id || vKey;
          const vTankId = v.tank_id || v.tankId || null;
          if (vTankId) await ensureTankExists(vTankId, v.tank_code, v.tank_name);
          counts.violations++;
          if (!isDryRun) {
            await dbPool.query(
              `INSERT INTO violations (id, client_id, tank_id, tank_code, tank_name, status, message, severity, timestamp, legacy_firebase_key, extra_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE status=VALUES(status)`,
              [
                vId,
                clientId,
                v.tank_id || v.tankId || null,
                v.tank_code || null,
                v.tank_name || null,
                v.status || 'active',
                v.message || null,
                v.severity || 'high',
                v.timestamp ? new Date(v.timestamp) : new Date(),
                vKey,
                JSON.stringify(v)
              ]
            );
          }
        }
      }

      // 3h. Completed Tasks
      if (tenantObj.completed_tasks) {
        for (const ctKey of Object.keys(tenantObj.completed_tasks)) {
          const ct = tenantObj.completed_tasks[ctKey];
          const ctId = ct.id || ctKey;
          counts.completed_tasks++;
            // Resolve completed_by user ID
            let completedUserId = ct.completed_by || ct.completedBy || null;
            let completedUserName = ct.completed_by_name || ct.completedByName || null;
            if (completedUserId && !userIdMap[completedUserId]) {
              if (usernameToIdMap[completedUserId]) {
                completedUserId = usernameToIdMap[completedUserId];
              } else {
                completedUserName = completedUserName || completedUserId;
                completedUserId = null;
              }
            }

            if (!isDryRun) {
              await dbPool.query(
                `INSERT INTO completed_tasks (id, client_id, alert_id, completed_at, completed_by, completed_by_name, description, photo_urls_json, legacy_firebase_key)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE description=VALUES(description)`,
                [
                  ctId,
                  clientId,
                  ct.alert_id || ct.alertId || null,
                  ct.completed_at ? new Date(ct.completed_at) : new Date(),
                  completedUserId,
                  completedUserName,
                  ct.description || null,
                  JSON.stringify(ct.photo_urls || []),
                  ctKey
                ]
              );
            }
        }
      }

      // 3i. Tenant Audit Logs
      if (tenantObj.admin_audit_logs) {
        for (const alKey of Object.keys(tenantObj.admin_audit_logs)) {
          const al = tenantObj.admin_audit_logs[alKey];
          const logId = al.id || alKey;
          counts.audit_logs++;
          let actorId = al.actor_id || al.actorId || null;
          let actorName = al.actor_name || al.actorName || null;
          if (actorId && !userIdMap[actorId]) {
            if (usernameToIdMap[actorId.toLowerCase()]) {
              actorId = usernameToIdMap[actorId.toLowerCase()];
            } else {
              actorName = actorName || actorId;
              actorId = null;
            }
          }
          if (!isDryRun) {
            await dbPool.query(
              `INSERT INTO admin_audit_logs (id, client_id, actor_id, actor_name, actor_role, operation, outcome, summary, details_json, timestamp, legacy_firebase_key)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE outcome=VALUES(outcome)`,
              [
                logId,
                clientId,
                actorId,
                actorName,
                al.actor_role || al.actorRole || null,
                al.operation || 'ACTION',
                al.outcome || 'SUCCESS',
                al.summary || null,
                JSON.stringify(al.details || {}),
                al.timestamp ? new Date(al.timestamp) : new Date(),
                alKey
              ]
            );
          }
        }
      }
    }

    // 4. Master Audit Logs
    if (dbJson.admin_audit_logs_master) {
      const masterLogs = dbJson.admin_audit_logs_master;
      for (const mKey of Object.keys(masterLogs)) {
        const ml = masterLogs[mKey];
        const logId = ml.id || mKey;
        counts.audit_logs++;
        let actorId = ml.actor_id || ml.actorId || null;
        let actorName = ml.actor_name || ml.actorName || null;
        if (actorId && !userIdMap[actorId]) {
          if (usernameToIdMap[actorId.toLowerCase()]) {
            actorId = usernameToIdMap[actorId.toLowerCase()];
          } else {
            actorName = actorName || actorId;
            actorId = null;
          }
        }
        if (!isDryRun) {
          await dbPool.query(
            `INSERT INTO admin_audit_logs_master (id, client_id, actor_id, actor_name, actor_role, operation, outcome, summary, details_json, timestamp, legacy_firebase_key)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE outcome=VALUES(outcome)`,
            [
              logId,
              ml.client_id || ml.clientId || null,
              actorId,
              actorName,
              ml.actor_role || ml.actorRole || null,
              ml.operation || 'ACTION',
              ml.outcome || 'SUCCESS',
              ml.summary || null,
              JSON.stringify(ml.details || {}),
              ml.timestamp ? new Date(ml.timestamp) : new Date(),
              mKey
            ]
          );
        }
      }
    }

    if (!isDryRun) {
      await dbPool.query(
        `UPDATE migration_runs SET status='COMPLETED', finished_at=NOW(), rows_processed=? WHERE id=?`,
        [Object.values(counts).reduce((a, b) => a + b, 0), runId]
      );
    }

    console.log('\n=============================================');
    console.log('      FIREBASE JSON MIGRATION SUMMARY        ');
    console.log('=============================================');
    for (const [k, v] of Object.entries(counts)) {
      console.log(`${k.padEnd(20)}: ${v}`);
    }
    console.log('=============================================\n');

  } catch (error) {
    console.error('Migration failed:', error);
    if (!isDryRun) {
      await dbPool.query(
        `UPDATE migration_runs SET status='FAILED', finished_at=NOW(), error_json=? WHERE id=?`,
        [JSON.stringify({ message: error.message, stack: error.stack }), runId]
      );
    }
    process.exit(1);
  } finally {
    await dbPool.end();
  }
}

runImporter();
