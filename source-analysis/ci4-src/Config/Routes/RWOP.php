<?php

/**
 * RWOP Module Routes
 * Standard Pattern: jwt → moduleactive
 */

$routes->group('api/v1/eam', ['namespace' => 'App\Controllers\Api\V1\Modules\RWOP', 'filter' => ['jwtauth', 'moduleactive']], function($routes) {
    
    // Work Orders
    $routes->get('work-orders', 'WorkOrdersController::index');
    $routes->get('maintenance/work-orders', 'WorkOrdersController::index');
    $routes->post('work-orders', 'WorkOrdersController::create');
    $routes->get('work-orders/(:segment)', 'WorkOrdersController::show/$1');
    $routes->put('work-orders/(:segment)', 'WorkOrdersController::update/$1');
    $routes->delete('work-orders/(:segment)', 'WorkOrdersController::delete/$1');
    $routes->post('work-orders/(:segment)/assign', 'WorkOrdersController::assign/$1');
    $routes->post('work-orders/(:segment)/start', 'WorkOrdersController::start/$1');
    $routes->post('work-orders/(:segment)/complete', 'WorkOrdersController::complete/$1');
    
    // Work Order Materials
    $routes->get('work-orders/(:segment)/materials', 'WorkOrderMaterialsController::index/$1');
    $routes->post('work-orders/(:segment)/materials', 'WorkOrderMaterialsController::create/$1');
    $routes->put('work-orders/(:segment)/materials/(:segment)', 'WorkOrderMaterialsController::update/$1/$2');
    $routes->delete('work-orders/(:segment)/materials/(:segment)', 'WorkOrderMaterialsController::delete/$2');
    
    // Work Order Attachments
    $routes->post('work-orders/(:segment)/attachments', 'WorkOrderAttachmentsController::upload/$1');
    $routes->get('work-orders/(:segment)/attachments', 'WorkOrderAttachmentsController::index/$1');
    $routes->delete('attachments/(:segment)', 'WorkOrderAttachmentsController::delete/$1');
    
    // Work Order Team
    $routes->get('work-orders/(:segment)/team', 'WorkOrderTeamController::getTeamMembers/$1');
    $routes->post('work-orders/(:segment)/team', 'WorkOrderTeamController::addTeamMember/$1');
    $routes->delete('work-orders/(:segment)/team/(:segment)', 'WorkOrderTeamController::removeTeamMember/$1/$2');
    
    // Work Order Time Logs
    $routes->get('work-orders/(:segment)/time-logs', 'WorkOrderCompletionController::getTimeLogs/$1');
    $routes->post('work-orders/(:segment)/time-logs', 'WorkOrderCompletionController::createTimeLog/$1');
    $routes->post('work-orders/(:segment)/time-logs/start', 'WorkOrderCompletionController::startTimeLog/$1');
    $routes->post('work-orders/(:segment)/time-logs/stop', 'WorkOrderCompletionController::stopTimeLog/$1');
    $routes->post('work-orders/(:segment)/time-logs/manual', 'WorkOrderCompletionController::createManualTimeLog/$1');
    
    // Maintenance Work Orders Time Logs (alias)
    $routes->get('maintenance/work-orders/(:segment)/time-logs', 'WorkOrderCompletionController::getTimeLogs/$1');
    $routes->get('maintenance/work-orders/(:segment)/time-logs/summary', 'WorkOrderCompletionController::getTimeLogsSummary/$1');
    $routes->post('maintenance/work-orders/(:segment)/time-logs/start', 'WorkOrderCompletionController::startTimeLog/$1');
    $routes->post('maintenance/work-orders/(:segment)/time-logs/stop', 'WorkOrderCompletionController::stopTimeLog/$1');
    $routes->post('maintenance/work-orders/(:segment)/time-logs/pause', 'WorkOrderCompletionController::pauseTimeLog/$1');
    $routes->post('maintenance/work-orders/(:segment)/time-logs/resume', 'WorkOrderCompletionController::resumeTimeLog/$1');
    $routes->post('maintenance/work-orders/(:segment)/time-logs/manual', 'WorkOrderCompletionController::createManualTimeLog/$1');
    
    // Work Order Completion
    $routes->get('work-orders/(:segment)/completion-report', 'WorkOrderCompletionController::getCompletionReport/$1');
    $routes->post('work-orders/(:segment)/completion-report', 'WorkOrderCompletionController::saveCompletionReport/$1');
    $routes->post('work-orders/(:segment)/completion-report/submit', 'WorkOrderCompletionController::submitCompletionReport/$1');
    $routes->post('work-orders/(:segment)/attachments/upload', 'WorkOrderCompletionController::uploadAttachment/$1');
    $routes->get('work-orders/(:segment)/attachments', 'WorkOrderCompletionController::getAttachments/$1');
    $routes->delete('work-orders/attachments/(:segment)', 'WorkOrderCompletionController::deleteAttachment/$1');
    
    // Work Order Materials Used
    $routes->get('work-orders/(:segment)/materials-used', 'WorkOrderCompletionController::getMaterialsUsed/$1');
    $routes->post('work-orders/(:segment)/materials-used', 'WorkOrderCompletionController::addMaterialUsed/$1');
    $routes->get('work-orders/(:segment)/planned-materials', 'WorkOrderCompletionController::getPlannedMaterials/$1');
    
    // Maintenance Work Orders Materials Used (alias)
    $routes->get('maintenance/work-orders/(:segment)/materials-used', 'WorkOrderCompletionController::getMaterialsUsed/$1');
    $routes->post('maintenance/work-orders/(:segment)/materials-used', 'WorkOrderCompletionController::addMaterialUsed/$1');
    $routes->get('maintenance/work-orders/(:segment)/planned-materials', 'WorkOrderCompletionController::getPlannedMaterials/$1');
    
    // Maintenance Work Orders Completion Report (alias)
    $routes->get('maintenance/work-orders/(:segment)/completion-report', 'WorkOrderCompletionController::getCompletionReport/$1');
    $routes->post('maintenance/work-orders/(:segment)/completion-report', 'WorkOrderCompletionController::saveCompletionReport/$1');
    $routes->get('maintenance/work-orders/(:segment)/attachments', 'WorkOrderCompletionController::getAttachments/$1');
    $routes->post('maintenance/work-orders/(:segment)/attachments', 'WorkOrderCompletionController::uploadAttachment/$1');
    $routes->delete('maintenance/work-orders/attachments/(:segment)', 'WorkOrderCompletionController::deleteAttachment/$1');
    
    // Maintenance Requests
    $routes->get('maintenance-requests', 'MaintenanceRequestController::index');
    $routes->get('maintenance-requests/my-queue', 'MaintenanceRequestController::myQueue');
    $routes->post('maintenance-requests', 'MaintenanceRequestController::create');
    $routes->get('maintenance-requests/(:segment)', 'MaintenanceRequestController::show/$1');
    $routes->put('maintenance-requests/(:segment)', 'MaintenanceRequestController::update/$1');
    $routes->delete('maintenance-requests/(:segment)', 'MaintenanceRequestController::delete/$1');
    $routes->post('maintenance-requests/(:segment)/approve', 'MaintenanceRequestController::approve/$1');
    $routes->post('maintenance-requests/(:segment)/reject', 'MaintenanceRequestController::reject/$1');
    $routes->post('maintenance-requests/(:segment)/assign-planner', 'MaintenanceRequestController::assignToPlanner/$1');
    $routes->post('maintenance-requests/(:segment)/create-work-order', 'MaintenanceRequestController::createWorkOrder/$1');
    
    // Maintenance Requests Aliases (with slash)
    $routes->get('maintenance/requests', 'MaintenanceRequestController::index');
    $routes->post('maintenance/requests', 'MaintenanceRequestController::create');
    $routes->get('maintenance/requests/(:segment)', 'MaintenanceRequestController::show/$1');
    $routes->put('maintenance/requests/(:segment)', 'MaintenanceRequestController::update/$1');
    $routes->delete('maintenance/requests/(:segment)', 'MaintenanceRequestController::delete/$1');
    $routes->post('maintenance/requests/(:segment)/approve', 'MaintenanceRequestController::approve/$1');
    $routes->post('maintenance/requests/(:segment)/reject', 'MaintenanceRequestController::reject/$1');
    $routes->post('maintenance/requests/(:segment)/assign-planner', 'MaintenanceRequestController::assignToPlanner/$1');
    $routes->post('maintenance/requests/(:segment)/create-work-order', 'MaintenanceRequestController::createWorkOrder/$1');
    
    // Assistance Requests
    $routes->get('assistance-requests', 'AssistanceRequestController::index');
    $routes->post('assistance-requests', 'AssistanceRequestController::create');
    $routes->put('assistance-requests/(:segment)/approve', 'AssistanceRequestController::approve/$1');
    $routes->put('assistance-requests/(:segment)/reject', 'AssistanceRequestController::reject/$1');
    
    // Analytics
    $routes->get('analytics/dashboard', 'WorkOrderAnalyticsController::dashboard');
    $routes->get('analytics/completion', 'CompletionAnalyticsController::index');
    
    // Ghana-specific Features
    $routes->get('shift-handovers', 'ShiftHandoverController::index');
    $routes->post('shift-handovers', 'ShiftHandoverController::create');
    $routes->post('shift-handovers/(:segment)/sign-off', 'ShiftHandoverController::signOff/$1');
    
    // Failure Analysis
    $routes->get('failure-codes', 'FailureCodeController::index');
    $routes->post('failure-codes', 'FailureCodeController::create');
    $routes->get('rca/(:segment)', 'RCAController::show/$1');
    $routes->post('rca', 'RCAController::create');
    
    // ========================================================================
    // RWOP ENTERPRISE ROUTES
    // ========================================================================
    
    // Maintenance Requests - Enterprise
    $routes->post('maintenance-requests/(:segment)/triage', 'MaintenanceRequestController::triage/$1');
    $routes->post('maintenance-requests/(:segment)/approve', 'MaintenanceRequestController::approve/$1');
    $routes->post('maintenance-requests/(:segment)/convert', 'MaintenanceRequestController::createWorkOrder/$1');
    
    // Work Orders - Enterprise
    $routes->post('work-orders/(:segment)/assign-supervisor', 'WorkOrderController::assignToSupervisor/$1');
    $routes->post('work-orders/(:segment)/assign-technician', 'WorkOrderController::assignToTechnician/$1');
    $routes->post('work-orders/(:segment)/verify', 'WorkOrderController::verify/$1');
    $routes->post('work-orders/(:segment)/reopen', 'WorkOrderController::reopen/$1');
    $routes->post('work-orders/(:segment)/close', 'WorkOrderController::close/$1');
    $routes->post('work-orders/(:segment)/adjust-cost', 'WorkOrderController::adjustCost/$1');
    $routes->post('work-orders/(:segment)/failure-analysis', 'WorkOrderController::addFailureAnalysis/$1');
    
    // Approvals
    $routes->get('approvals/pending', 'ApprovalsController::pending');
    $routes->post('approvals/(:segment)/approve', 'ApprovalsController::approve/$1');
    $routes->post('approvals/(:segment)/reject', 'ApprovalsController::reject/$1');
    
    // Verifications
    $routes->get('verifications/pending', 'VerificationsController::pending');
    $routes->get('work-orders/(:segment)/verification-checklist', 'VerificationsController::getChecklist/$1');
    
    // ========================================================================
    // TOOL REQUEST & ISSUANCE WORKFLOW
    // ========================================================================
    
    // Tool Requests
    $routes->get('tool-requests', 'ToolRequestController::index');
    $routes->post('tool-requests', 'ToolRequestController::create');
    $routes->get('work-orders/(:segment)/tool-requests', 'ToolRequestController::getByWorkOrder/$1');
    $routes->get('work-orders/(:segment)/can-close', 'ToolRequestController::checkWorkOrderClosure/$1');
    
    // Supervisor Actions
    $routes->get('tool-requests/pending-approvals', 'ToolRequestController::getPendingApprovals');
    $routes->post('tool-requests/(:segment)/approve', 'ToolRequestController::approve/$1');
    $routes->post('tool-requests/(:segment)/reject', 'ToolRequestController::reject/$1');
    
    // Store/Tool Crib Actions
    $routes->get('tool-requests/approved', 'ToolRequestController::getApprovedRequests');
    $routes->post('tool-requests/(:segment)/issue', 'ToolRequestController::issue/$1');
    $routes->post('tool-requests/(:segment)/reverse', 'ToolRequestController::reverse/$1');
    $routes->post('tool-requests/(:segment)/return', 'ToolRequestController::returnTools/$1');
    $routes->get('tool-requests/pending-returns', 'ToolRequestController::getPendingReturns');
    $routes->post('tool-requests/(:segment)/verify-return', 'ToolRequestController::verifyReturn/$1');
    
    // Technician Actions
    $routes->post('tool-requests/(:segment)/mark-return', 'ToolRequestController::markReturn/$1');
    $routes->post('tool-requests/(:segment)/cancel', 'ToolRequestController::cancel/$1');
    
    // Tool Reports
    $routes->get('tool-reports/utilization', 'ToolReportsController::utilization');
    $routes->get('tool-reports/overdue-returns', 'ToolReportsController::overdueReturns');
    $routes->get('tool-reports/damage-report', 'ToolReportsController::damageReport');
    $routes->get('tool-reports/lifecycle-cost', 'ToolReportsController::lifecycleCost');
    $routes->get('tool-reports/calibration-compliance', 'ToolReportsController::calibrationCompliance');
    
    // Tools Master Data
    $routes->get('tools', 'ToolRequestController::getTools');
    
    // ========================================================================
    // TOOLS USED TRACKING
    // ========================================================================
    
    // Tools Used
    $routes->get('work-orders/(:segment)/tools-used', 'ToolsUsedController::getByWorkOrder/$1');
    $routes->get('work-orders/(:segment)/tools-used/suggestions', 'ToolsUsedController::getSuggestions/$1');
    $routes->post('work-orders/(:segment)/tools-used', 'ToolsUsedController::record/$1');
    $routes->delete('tools-used/(:segment)', 'ToolsUsedController::delete/$1');
    
    // ========================================================================
    // TOOL TRANSFER WORKFLOW (Technician-to-Technician)
    // ========================================================================
    
    // Tool Transfers
    $routes->get('tool-transfers', 'ToolTransferController::index');
    $routes->post('tool-transfers', 'ToolTransferController::create');
    $routes->get('tool-transfers/my-tools', 'ToolTransferController::myTools');
    $routes->post('tool-transfers/(:segment)/approve', 'ToolTransferController::approve/$1');
    $routes->post('tool-transfers/(:segment)/reject', 'ToolTransferController::reject/$1');
    $routes->post('tool-transfers/(:segment)/complete', 'ToolTransferController::complete/$1');
    
    // Tool Statistics
    $routes->get('tool-statistics/overview', 'ToolStatisticsController::overview');
    $routes->get('tool-statistics/utilization-by-category', 'ToolStatisticsController::utilizationByCategory');
    $routes->get('tool-statistics/most-requested', 'ToolStatisticsController::mostRequested');
    $routes->get('tool-statistics/request-trends', 'ToolStatisticsController::requestTrends');
    
    // Tool Maintenance
    $routes->get('tool-maintenance/schedules', 'ToolMaintenanceController::schedules');
    $routes->post('tool-maintenance/schedules', 'ToolMaintenanceController::createSchedule');
    $routes->post('tool-maintenance/records', 'ToolMaintenanceController::recordMaintenance');
    $routes->get('tool-maintenance/overdue', 'ToolMaintenanceController::overdue');
    $routes->get('tool-maintenance/history/(:segment)', 'ToolMaintenanceController::history/$1');
    
    // Tool Calendar
    $routes->get('tool-calendar/availability', 'ToolCalendarController::availability');
    $routes->get('tool-calendar/events', 'ToolCalendarController::events');
    $routes->post('tool-calendar/book', 'ToolCalendarController::book');
    
    // Tool Performance Analytics
    $routes->get('tool-performance/usage-patterns', 'ToolPerformanceController::usagePatterns');
    $routes->get('tool-performance/efficiency', 'ToolPerformanceController::efficiency');
    $routes->get('tool-performance/trends', 'ToolPerformanceController::trends');
    $routes->get('tool-performance/optimization', 'ToolPerformanceController::optimization');
    
    // Tool QR Code System
    $routes->get('tool-qr/generate/(:segment)', 'ToolQRController::generate/$1');
    $routes->post('tool-qr/scan', 'ToolQRController::scan');
    $routes->post('tool-qr/quick-checkout', 'ToolQRController::quickCheckout');
    $routes->post('tool-qr/quick-checkin', 'ToolQRController::quickCheckin');
    
    // Tool Location Tracking
    $routes->get('tool-location/current', 'ToolLocationController::current');
    $routes->post('tool-location/update', 'ToolLocationController::updateLocation');
    $routes->get('tool-location/history/(:segment)', 'ToolLocationController::history/$1');
    $routes->get('tool-location/zones', 'ToolLocationController::zones');
    $routes->post('tool-location/zones', 'ToolLocationController::createZone');
    $routes->get('tool-location/nearby', 'ToolLocationController::nearby');
    
    // Tool Audit & Compliance
    $routes->get('tool-audit/logs', 'ToolAuditController::logs');
    $routes->post('tool-audit/log', 'ToolAuditController::createLog');
    $routes->get('tool-audit/compliance', 'ToolAuditController::compliance');
    $routes->post('tool-audit/compliance-check', 'ToolAuditController::complianceCheck');
    $routes->get('tool-audit/requirements', 'ToolAuditController::requirements');
    $routes->post('tool-audit/generate-report', 'ToolAuditController::generateReport');
});
