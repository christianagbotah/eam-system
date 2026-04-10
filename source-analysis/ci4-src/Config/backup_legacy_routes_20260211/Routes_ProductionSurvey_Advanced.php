<?php
// Phase 1: Digital Signatures
$routes->post('production-surveys/(:num)/signatures', 'ProductionSurvey::addSignature/$1');
$routes->get('production-surveys/(:num)/signatures', 'ProductionSurvey::getSignatures/$1');
$routes->post('production-surveys/(:num)/signatures/validate', 'ProductionSurvey::validateSignatures/$1');

// Phase 1: Templates
$routes->get('production-surveys/templates', 'ProductionSurvey::getTemplates');
$routes->post('production-surveys/templates', 'ProductionSurvey::createTemplate');
$routes->get('production-surveys/templates/(:num)', 'ProductionSurvey::getTemplate/$1');
$routes->put('production-surveys/templates/(:num)', 'ProductionSurvey::updateTemplate/$1');
$routes->post('production-surveys/templates/(:num)/apply', 'ProductionSurvey::applyTemplate/$1');

// Phase 1: Workflow
$routes->get('production-surveys/workflow/rules', 'ProductionSurvey::getWorkflowRules');
$routes->post('production-surveys/workflow/rules', 'ProductionSurvey::createWorkflowRule');
$routes->get('production-surveys/(:num)/workflow/history', 'ProductionSurvey::getWorkflowHistory/$1');

// Phase 1: Audit Trail
$routes->get('production-surveys/(:num)/audit-trail', 'ProductionSurvey::getAuditTrail/$1');

// Phase 2: CAPA
$routes->get('production-surveys/(:num)/capa', 'ProductionSurvey::getCAPAs/$1');
$routes->post('production-surveys/(:num)/capa', 'ProductionSurvey::createCAPA/$1');
$routes->put('production-surveys/capa/(:num)', 'ProductionSurvey::updateCAPA/$1');
$routes->get('production-surveys/capa', 'ProductionSurvey::getAllCAPAs');

// Phase 2: Scheduling
$routes->get('production-surveys/schedules', 'ProductionSurvey::getSchedules');
$routes->post('production-surveys/schedules', 'ProductionSurvey::createSchedule');
$routes->put('production-surveys/schedules/(:num)', 'ProductionSurvey::updateSchedule/$1');
$routes->post('production-surveys/schedules/generate', 'ProductionSurvey::generateScheduledSurveys');

// Phase 2: Batch Operations
$routes->post('production-surveys/batch', 'ProductionSurvey::batchOperation');
$routes->get('production-surveys/batch/(:num)', 'ProductionSurvey::getBatchStatus/$1');

// Phase 2: Analytics
$routes->get('production-surveys/analytics/trends', 'ProductionSurvey::getAnalyticsTrends');
$routes->get('production-surveys/(:num)/anomalies', 'ProductionSurvey::getAnomalies/$1');
$routes->post('production-surveys/(:num)/anomalies/detect', 'ProductionSurvey::detectAnomalies/$1');

// Phase 3: Comparison
$routes->post('production-surveys/compare', 'ProductionSurvey::compareSurveys');
$routes->get('production-surveys/comparisons', 'ProductionSurvey::getComparisons');
