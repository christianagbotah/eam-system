// War Room Controller (Backend API Implementation)

class WarRoomController {
    
    /**
     * GET /api/v1/rwop/war-room/active-breakdowns
     */
    async getActiveBreakdowns(req, res) {
        try {
            const query = `
                SELECT 
                    wo.id,
                    wo.wo_number as woNumber,
                    COALESCE(a.name, 'Unknown Asset') as assetName,
                    wo.priority,
                    wo.status,
                    COALESCE(TIMESTAMPDIFF(MINUTE, wo.downtime_start, NOW()), 0) as downtimeMinutes,
                    CASE 
                        WHEN wo.sla_response_minutes IS NOT NULL AND wo.assigned_at IS NULL 
                        THEN wo.sla_response_minutes - TIMESTAMPDIFF(MINUTE, wo.created_at, NOW())
                        WHEN wo.sla_repair_hours IS NOT NULL AND wo.actual_start IS NOT NULL AND wo.actual_end IS NULL
                        THEN (wo.sla_repair_hours * 60) - TIMESTAMPDIFF(MINUTE, wo.actual_start, NOW())
                        ELSE 0
                    END as slaMinutesRemaining,
                    wo.escalation_level as escalationLevel,
                    COALESCE(wo.production_loss_ghs, 0) as productionLossGHS,
                    (
                        SELECT GROUP_CONCAT(u.username)
                        FROM work_order_team_members wotm
                        JOIN users u ON wotm.user_id = u.id
                        WHERE wotm.work_order_id = wo.id
                    ) as assignedTechnicians,
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 FROM parts_reservations pr 
                            WHERE pr.work_order_id = wo.id AND pr.status != 'fully_issued'
                        ) THEN 'waiting'
                        ELSE 'available'
                    END as partsStatus
                FROM work_orders wo
                LEFT JOIN assets a ON wo.asset_id = a.id
                WHERE wo.status IN ('assigned', 'in_progress', 'waiting_parts', 'pending_handover')
                AND wo.priority IN ('critical', 'high')
                ORDER BY 
                    FIELD(wo.priority, 'critical', 'high'),
                    wo.created_at ASC
                LIMIT 20
            `;

            const result = await db.query(query);
            
            // Process assigned technicians
            result.forEach(row => {
                row.assignedTechnicians = row.assignedTechnicians 
                    ? row.assignedTechnicians.split(',') 
                    : [];
            });

            res.json({
                status: 'success',
                data: result,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('War Room API Error:', error);
            res.status(500).json({ 
                status: 'error', 
                message: 'Failed to fetch breakdown data' 
            });
        }
    }

    /**
     * GET /api/v1/rwop/war-room/summary-stats
     */
    async getSummaryStats(req, res) {
        try {
            const stats = {};

            // Active breakdowns
            const activeQuery = `
                SELECT COUNT(*) as count FROM work_orders 
                WHERE status IN ('assigned', 'in_progress', 'waiting_parts', 'pending_handover')
            `;
            stats.activeBreakdowns = (await db.query(activeQuery))[0].count;

            // Critical priority count
            const criticalQuery = `
                SELECT COUNT(*) as count FROM work_orders 
                WHERE status IN ('assigned', 'in_progress', 'waiting_parts', 'pending_handover')
                AND priority = 'critical'
            `;
            stats.criticalCount = (await db.query(criticalQuery))[0].count;

            // Overdue count (SLA breached)
            const overdueQuery = `
                SELECT COUNT(*) as count FROM work_orders 
                WHERE status IN ('assigned', 'in_progress', 'waiting_parts', 'pending_handover')
                AND sla_breached_at IS NOT NULL
            `;
            stats.overdueCount = (await db.query(overdueQuery))[0].count;

            // Total production loss
            const lossQuery = `
                SELECT COALESCE(SUM(production_loss_ghs), 0) as total FROM work_orders 
                WHERE status IN ('assigned', 'in_progress', 'waiting_parts', 'pending_handover')
            `;
            stats.totalProductionLoss = (await db.query(lossQuery))[0].total;

            res.json({
                status: 'success',
                data: stats
            });

        } catch (error) {
            console.error('War Room Stats Error:', error);
            res.status(500).json({ 
                status: 'error', 
                message: 'Failed to fetch summary statistics' 
            });
        }
    }
}

// Backlog Risk Controller

class BacklogRiskController {
    
    /**
     * GET /api/v1/analytics/backlog-risk
     */
    async getBacklogRisk(req, res) {
        try {
            const { departmentId, dateFrom, dateTo } = req.query;
            
            // Calculate plant risk index
            const riskQuery = `
                SELECT 
                    AVG(wo.risk_score) as plantRiskIndex,
                    COUNT(*) as totalBacklog,
                    SUM(CASE WHEN wo.priority = 'critical' THEN 1 ELSE 0 END) as criticalCount,
                    SUM(CASE WHEN DATEDIFF(NOW(), wo.created_at) > 7 THEN 1 ELSE 0 END) as overdueCount
                FROM work_orders wo
                WHERE wo.status NOT IN ('completed', 'closed', 'cancelled')
                ${departmentId ? 'AND wo.department_id = ?' : ''}
                ${dateFrom ? 'AND wo.created_at >= ?' : ''}
                ${dateTo ? 'AND wo.created_at <= ?' : ''}
            `;

            const params = [];
            if (departmentId) params.push(departmentId);
            if (dateFrom) params.push(dateFrom);
            if (dateTo) params.push(dateTo);

            const riskResult = await db.query(riskQuery, params);
            
            // Department risks
            const deptQuery = `
                SELECT 
                    d.id as departmentId,
                    d.name as departmentName,
                    AVG(wo.risk_score) as riskScore,
                    COUNT(*) as overdueCount,
                    SUM(CASE WHEN wo.priority = 'critical' THEN 1 ELSE 0 END) as criticalCount
                FROM departments d
                LEFT JOIN work_orders wo ON d.id = wo.department_id 
                    AND wo.status NOT IN ('completed', 'closed', 'cancelled')
                GROUP BY d.id, d.name
                ORDER BY riskScore DESC
            `;

            const departmentRisks = await db.query(deptQuery);

            // Top risky jobs
            const jobsQuery = `
                SELECT 
                    wo.id as workOrderId,
                    wo.wo_number as woNumber,
                    COALESCE(a.name, 'Unknown') as assetName,
                    wo.risk_score as riskScore,
                    DATEDIFF(NOW(), wo.created_at) as ageInDays,
                    wo.priority,
                    COALESCE(wo.production_loss_ghs, 0) as productionImpact
                FROM work_orders wo
                LEFT JOIN assets a ON wo.asset_id = a.id
                WHERE wo.status NOT IN ('completed', 'closed', 'cancelled')
                ORDER BY wo.risk_score DESC, wo.created_at ASC
                LIMIT 10
            `;

            const topRiskyJobs = await db.query(jobsQuery);

            // Trend data (last 30 days)
            const trendQuery = `
                SELECT 
                    DATE(rs.date) as date,
                    rs.plant_risk_index as riskIndex,
                    rs.total_backlog as backlogCount
                FROM risk_snapshots rs
                WHERE rs.date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                ORDER BY rs.date ASC
            `;

            const trendData = await db.query(trendQuery);

            res.json({
                status: 'success',
                data: {
                    plantRiskIndex: riskResult[0].plantRiskIndex || 0,
                    departmentRisks,
                    topRiskyJobs,
                    trendData
                }
            });

        } catch (error) {
            console.error('Backlog Risk Error:', error);
            res.status(500).json({ 
                status: 'error', 
                message: 'Failed to calculate backlog risk' 
            });
        }
    }

    /**
     * POST /api/v1/analytics/risk-snapshots
     */
    async storeSnapshot(req, res) {
        try {
            const {
                date,
                plant_risk_index,
                risk_level,
                total_backlog,
                critical_count,
                overdue_count
            } = req.body;

            const insertQuery = `
                INSERT INTO risk_snapshots 
                (id, date, plant_risk_index, risk_level, total_backlog, critical_count, overdue_count)
                VALUES (UUID(), ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                plant_risk_index = VALUES(plant_risk_index),
                risk_level = VALUES(risk_level),
                total_backlog = VALUES(total_backlog),
                critical_count = VALUES(critical_count),
                overdue_count = VALUES(overdue_count)
            `;

            await db.query(insertQuery, [
                date,
                plant_risk_index,
                risk_level,
                total_backlog,
                critical_count,
                overdue_count
            ]);

            res.json({
                status: 'success',
                message: 'Risk snapshot stored successfully'
            });

        } catch (error) {
            console.error('Risk Snapshot Error:', error);
            res.status(500).json({ 
                status: 'error', 
                message: 'Failed to store risk snapshot' 
            });
        }
    }
}

// Mobile Sync Controller

class MobileController {
    
    /**
     * POST /api/v1/rwop/mobile/sync
     */
    async syncAction(req, res) {
        try {
            const { type, workOrderId, data, userId, deviceInfo } = req.body;

            // Store in sync queue
            const insertQuery = `
                INSERT INTO mobile_sync_queue 
                (id, user_id, action_type, work_order_id, action_data, device_info, queued_at)
                VALUES (UUID(), ?, ?, ?, ?, ?, NOW())
            `;

            await db.query(insertQuery, [
                userId,
                type,
                workOrderId,
                JSON.stringify(data),
                deviceInfo
            ]);

            // Process sync action based on type
            switch (type) {
                case 'STATUS_UPDATE':
                    await this.processStatusUpdate(workOrderId, data, userId);
                    break;
                case 'PHOTO_UPLOAD':
                    await this.processPhotoUpload(workOrderId, data, userId);
                    break;
                // Add other sync types as needed
            }

            res.json({
                status: 'success',
                message: 'Action synced successfully'
            });

        } catch (error) {
            console.error('Mobile Sync Error:', error);
            res.status(500).json({ 
                status: 'error', 
                message: 'Failed to sync action' 
            });
        }
    }

    async processStatusUpdate(workOrderId, data, userId) {
        const updateQuery = `
            UPDATE work_orders 
            SET status = ?, updated_at = NOW()
            WHERE id = ?
        `;
        
        await db.query(updateQuery, [data.status, workOrderId]);

        // Log the change
        const logQuery = `
            INSERT INTO audit_logs 
            (id, module, entity_type, entity_id, user_id, action, metadata, created_at)
            VALUES (UUID(), 'RWOP', 'work_order', ?, ?, 'MOBILE_STATUS_UPDATE', ?, NOW())
        `;

        await db.query(logQuery, [
            workOrderId,
            userId,
            JSON.stringify({ new_status: data.status, source: 'mobile' })
        ]);
    }

    async processPhotoUpload(workOrderId, data, userId) {
        // Store photo attachment
        const insertQuery = `
            INSERT INTO work_order_attachments 
            (id, work_order_id, filename, file_data, uploaded_by, created_at)
            VALUES (UUID(), ?, ?, ?, ?, NOW())
        `;

        await db.query(insertQuery, [
            workOrderId,
            data.filename,
            data.image, // Base64 encoded
            userId
        ]);
    }
}