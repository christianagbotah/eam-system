-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Apr 08, 2026 at 04:16 PM
-- Server version: 8.2.0
-- PHP Version: 8.3.0

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `factory_manager`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_log`
--

DROP TABLE IF EXISTS `activity_log`;
CREATE TABLE IF NOT EXISTS `activity_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `entity_id` int NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `analytics_daily_snapshots`
--

DROP TABLE IF EXISTS `analytics_daily_snapshots`;
CREATE TABLE IF NOT EXISTS `analytics_daily_snapshots` (
  `id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `snapshot_date` date NOT NULL,
  `metric_type` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `metric_value` decimal(15,4) DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_daily_metric` (`snapshot_date`,`metric_type`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `anomaly_detections`
--

DROP TABLE IF EXISTS `anomaly_detections`;
CREATE TABLE IF NOT EXISTS `anomaly_detections` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` int UNSIGNED DEFAULT NULL,
  `metric_name` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `expected_value` decimal(10,2) DEFAULT NULL,
  `actual_value` decimal(10,2) DEFAULT NULL,
  `deviation` decimal(10,2) DEFAULT NULL,
  `severity` enum('low','medium','high') COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `detected_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_id` (`asset_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `api_keys`
--

DROP TABLE IF EXISTS `api_keys`;
CREATE TABLE IF NOT EXISTS `api_keys` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `api_key` varchar(64) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `permissions` json DEFAULT NULL,
  `last_used` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `api_key` (`api_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `api_rate_limits`
--

DROP TABLE IF EXISTS `api_rate_limits`;
CREATE TABLE IF NOT EXISTS `api_rate_limits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `identifier` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'IP or User ID',
  `endpoint` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requests_count` int DEFAULT '1',
  `window_start` datetime NOT NULL,
  `window_end` datetime NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_identifier_endpoint` (`identifier`,`endpoint`),
  KEY `idx_window` (`window_start`,`window_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `assemblies`
--

DROP TABLE IF EXISTS `assemblies`;
CREATE TABLE IF NOT EXISTS `assemblies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `equipment_id` int NOT NULL,
  `assembly_name` varchar(255) NOT NULL,
  `assembly_code` varchar(100) DEFAULT NULL,
  `assembly_category` varchar(100) DEFAULT NULL,
  `criticality` enum('low','medium','high') DEFAULT 'medium',
  `status` enum('active','inactive','maintenance') DEFAULT 'active',
  `assembly_image` varchar(255) DEFAULT NULL,
  `description` text,
  `quantity` int DEFAULT '1',
  `unit_cost` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `assembly_components`
--

DROP TABLE IF EXISTS `assembly_components`;
CREATE TABLE IF NOT EXISTS `assembly_components` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `assembly_id` bigint UNSIGNED NOT NULL,
  `component_id` bigint UNSIGNED NOT NULL,
  `component_type` enum('part','subassembly','consumable','tool') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT '1.00',
  `install_sequence` int DEFAULT NULL,
  `removal_sequence` int DEFAULT NULL,
  `torque_spec` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `installation_time_minutes` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_assembly` (`assembly_id`),
  KEY `idx_component` (`component_id`),
  KEY `idx_type` (`component_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `assets_unified`
--

DROP TABLE IF EXISTS `assets_unified`;
CREATE TABLE IF NOT EXISTS `assets_unified` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_name` varchar(255) NOT NULL,
  `asset_code` varchar(100) DEFAULT NULL,
  `asset_type` enum('machine','component','assembly','part','subpart') NOT NULL,
  `parent_id` int DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  `status` enum('active','inactive','maintenance','out_of_service') DEFAULT 'active',
  `criticality` enum('low','medium','high','critical') DEFAULT 'medium',
  `health_score` decimal(5,2) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `facility_id` int DEFAULT NULL,
  `plant_id` int DEFAULT NULL,
  `area_id` int DEFAULT NULL,
  `line_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_assets_facility_status` (`facility_id`,`status`),
  KEY `idx_assets_name_status` (`asset_name`,`status`),
  KEY `idx_assets_type_status` (`asset_type`,`status`),
  KEY `idx_plant_id` (`plant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Triggers `assets_unified`
--
DROP TRIGGER IF EXISTS `trg_asset_status_history`;
DELIMITER $$
CREATE TRIGGER `trg_asset_status_history` AFTER UPDATE ON `assets_unified` FOR EACH ROW BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO asset_status_history (id, asset_id, old_status, new_status, changed_by)
        VALUES (UUID(), NEW.id, OLD.status, NEW.status, 1);
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `asset_3d_models`
--

DROP TABLE IF EXISTS `asset_3d_models`;
CREATE TABLE IF NOT EXISTS `asset_3d_models` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` int UNSIGNED NOT NULL,
  `model_file` varchar(500) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `thumbnail_file` varchar(500) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `file_size_mb` decimal(10,2) DEFAULT NULL,
  `format` enum('gltf','glb','obj','fbx','stl') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `version` varchar(20) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `poly_count` int DEFAULT NULL,
  `hotspots` json DEFAULT NULL COMMENT 'Clickable areas with positions and linked assets',
  `uploaded_by` int UNSIGNED DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `asset_id` (`asset_id`),
  KEY `is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `asset_assignments`
--

DROP TABLE IF EXISTS `asset_assignments`;
CREATE TABLE IF NOT EXISTS `asset_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plant_id` int NOT NULL,
  `asset_id` int NOT NULL,
  `user_id` int NOT NULL,
  `assignment_type` enum('operator','technician','supervisor') NOT NULL,
  `assigned_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_asset` (`asset_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_plant` (`plant_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `asset_closure`
--

DROP TABLE IF EXISTS `asset_closure`;
CREATE TABLE IF NOT EXISTS `asset_closure` (
  `ancestor_id` int NOT NULL,
  `descendant_id` int NOT NULL,
  `depth` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ancestor_id`,`descendant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `asset_criticality`
--

DROP TABLE IF EXISTS `asset_criticality`;
CREATE TABLE IF NOT EXISTS `asset_criticality` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` int UNSIGNED NOT NULL,
  `safety_impact` int DEFAULT '0',
  `production_impact` int DEFAULT '0',
  `quality_impact` int DEFAULT '0',
  `environmental_impact` int DEFAULT '0',
  `cost_impact` int DEFAULT '0',
  `total_score` int DEFAULT '0',
  `criticality_level` enum('low','medium','high','critical') DEFAULT 'medium',
  `assessed_by` int UNSIGNED DEFAULT NULL,
  `assessed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_asset` (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `asset_failure_analysis`
--

DROP TABLE IF EXISTS `asset_failure_analysis`;
CREATE TABLE IF NOT EXISTS `asset_failure_analysis` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` int UNSIGNED NOT NULL,
  `work_order_id` int UNSIGNED NOT NULL,
  `failure_date` datetime NOT NULL,
  `failure_code_id` int UNSIGNED DEFAULT NULL,
  `root_cause` text NOT NULL,
  `contributing_factors` json DEFAULT NULL,
  `corrective_action` text NOT NULL,
  `preventive_recommendation` text,
  `recurrence_risk` enum('low','medium','high') NOT NULL,
  `cost_impact` decimal(15,2) DEFAULT '0.00',
  `downtime_hours` decimal(10,2) DEFAULT '0.00',
  `analyzed_by` int UNSIGNED NOT NULL,
  `analyzed_at` datetime NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_asset` (`asset_id`,`failure_date`),
  KEY `idx_failure_code` (`failure_code_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `asset_failure_history`
--

DROP TABLE IF EXISTS `asset_failure_history`;
CREATE TABLE IF NOT EXISTS `asset_failure_history` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` int UNSIGNED NOT NULL,
  `asset_type` enum('machine','assembly','part') NOT NULL,
  `work_order_id` int UNSIGNED DEFAULT NULL,
  `failure_date` datetime NOT NULL,
  `failure_code_id` int UNSIGNED DEFAULT NULL,
  `failure_description` text,
  `root_cause` text,
  `corrective_action` text,
  `downtime_hours` decimal(10,2) DEFAULT NULL,
  `mtbf_hours` decimal(10,2) DEFAULT NULL COMMENT 'Mean Time Between Failures',
  `mttr_hours` decimal(10,2) DEFAULT NULL COMMENT 'Mean Time To Repair',
  `failure_severity` enum('minor','moderate','major','critical') DEFAULT 'moderate',
  `recurrence_count` int DEFAULT '1',
  `cost_impact` decimal(12,2) DEFAULT NULL,
  `recorded_by` int UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_asset_failures` (`asset_id`,`asset_type`,`failure_date`),
  KEY `idx_failure_code` (`failure_code_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `asset_hierarchy`
--

DROP TABLE IF EXISTS `asset_hierarchy`;
CREATE TABLE IF NOT EXISTS `asset_hierarchy` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` bigint UNSIGNED DEFAULT NULL,
  `asset_id` bigint UNSIGNED NOT NULL,
  `hierarchy_level` int NOT NULL DEFAULT '0',
  `path` varchar(500) COLLATE utf8mb4_unicode_520_ci NOT NULL COMMENT 'Materialized path: /1/5/12/',
  `position` int NOT NULL DEFAULT '0' COMMENT 'Order within parent',
  `lft` int NOT NULL COMMENT 'Nested set left',
  `rgt` int NOT NULL COMMENT 'Nested set right',
  `is_leaf` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int UNSIGNED DEFAULT NULL,
  `updated_by` int UNSIGNED DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_asset` (`asset_id`),
  KEY `idx_path` (`path`(250)),
  KEY `idx_level` (`hierarchy_level`),
  KEY `idx_nested_set` (`lft`,`rgt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `asset_hierarchy_closure`
--

DROP TABLE IF EXISTS `asset_hierarchy_closure`;
CREATE TABLE IF NOT EXISTS `asset_hierarchy_closure` (
  `ancestor_id` int UNSIGNED NOT NULL,
  `descendant_id` int UNSIGNED NOT NULL,
  `depth` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`ancestor_id`,`descendant_id`),
  KEY `descendant_id` (`descendant_id`),
  KEY `depth` (`depth`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `asset_history`
--

DROP TABLE IF EXISTS `asset_history`;
CREATE TABLE IF NOT EXISTS `asset_history` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_type` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `asset_id` int UNSIGNED NOT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `user_id` int UNSIGNED DEFAULT NULL,
  `changes` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_asset` (`asset_type`,`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `asset_hotspots`
--

DROP TABLE IF EXISTS `asset_hotspots`;
CREATE TABLE IF NOT EXISTS `asset_hotspots` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `machine_id` int UNSIGNED NOT NULL,
  `asset_node_id` int UNSIGNED NOT NULL,
  `image_url` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `x_position` decimal(5,2) NOT NULL COMMENT 'Percentage 0-100',
  `y_position` decimal(5,2) NOT NULL COMMENT 'Percentage 0-100',
  `hotspot_label` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `machine_id` (`machine_id`),
  KEY `asset_node_id` (`asset_node_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `asset_inventory_links`
--

DROP TABLE IF EXISTS `asset_inventory_links`;
CREATE TABLE IF NOT EXISTS `asset_inventory_links` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `inventory_item_id` int UNSIGNED DEFAULT NULL,
  `asset_type` enum('machine','assembly','part') DEFAULT 'machine',
  `asset_id` int UNSIGNED DEFAULT NULL,
  `pm_code` varchar(50) DEFAULT NULL,
  `pm_name` varchar(255) DEFAULT NULL,
  `quantity_per_maintenance` decimal(15,2) DEFAULT '1.00',
  `is_critical_spare` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `asset_nodes`
--

DROP TABLE IF EXISTS `asset_nodes`;
CREATE TABLE IF NOT EXISTS `asset_nodes` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `machine_id` int UNSIGNED NOT NULL,
  `parent_id` int UNSIGNED DEFAULT NULL,
  `node_type` enum('machine','assembly','component','sub_component','part','sub_part') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'part',
  `node_code` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `node_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `manufacturer` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `serial_number` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `expected_lifespan` int DEFAULT NULL COMMENT 'In hours or cycles',
  `lifespan_unit` enum('hours','cycles','quantity') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'hours',
  `sort_order` int NOT NULL DEFAULT '0',
  `image_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `technical_specs` json DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `node_code` (`node_code`),
  KEY `machine_id` (`machine_id`),
  KEY `parent_id` (`parent_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `asset_pm_tasks`
--

DROP TABLE IF EXISTS `asset_pm_tasks`;
CREATE TABLE IF NOT EXISTS `asset_pm_tasks` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_node_id` int UNSIGNED NOT NULL,
  `task_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `task_description` text COLLATE utf8mb4_general_ci,
  `frequency_value` int NOT NULL,
  `frequency_unit` enum('days','hours','cycles','quantity') COLLATE utf8mb4_general_ci NOT NULL,
  `last_completed` datetime DEFAULT NULL,
  `next_due` datetime DEFAULT NULL,
  `assigned_group` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('active','inactive','completed') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'active',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_node_id` (`asset_node_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `asset_relationships`
--

DROP TABLE IF EXISTS `asset_relationships`;
CREATE TABLE IF NOT EXISTS `asset_relationships` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `source_asset_id` bigint UNSIGNED NOT NULL,
  `target_asset_id` bigint UNSIGNED NOT NULL,
  `relationship_type` enum('depends_on','feeds_into','powers','controls','monitors') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `strength` int DEFAULT '1' COMMENT '1-10 criticality',
  `notes` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_source` (`source_asset_id`),
  KEY `idx_target` (`target_asset_id`),
  KEY `idx_type` (`relationship_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `asset_spare_parts`
--

DROP TABLE IF EXISTS `asset_spare_parts`;
CREATE TABLE IF NOT EXISTS `asset_spare_parts` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_node_id` int UNSIGNED NOT NULL,
  `inventory_item_id` int UNSIGNED DEFAULT NULL,
  `part_id` int DEFAULT NULL,
  `part_number` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `quantity_required` int NOT NULL DEFAULT '1',
  `criticality` enum('critical','high','medium','low') COLLATE utf8mb4_general_ci DEFAULT 'medium',
  `created_at` datetime DEFAULT NULL,
  `notes` text COLLATE utf8mb4_general_ci,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `asset_node_id` (`asset_node_id`),
  KEY `fk_asp_inventory_id` (`inventory_item_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `asset_status_history`
--

DROP TABLE IF EXISTS `asset_status_history`;
CREATE TABLE IF NOT EXISTS `asset_status_history` (
  `id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `asset_id` int NOT NULL,
  `old_status` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `new_status` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `changed_by` int NOT NULL,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reason` text COLLATE utf8mb4_unicode_520_ci,
  PRIMARY KEY (`id`),
  KEY `idx_asset_status_history_asset` (`asset_id`),
  KEY `idx_asset_status_history_changed_at` (`changed_at`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `asset_usage_entries`
--

DROP TABLE IF EXISTS `asset_usage_entries`;
CREATE TABLE IF NOT EXISTS `asset_usage_entries` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_node_id` int UNSIGNED NOT NULL,
  `usage_type` enum('hours','cycles','quantity') COLLATE utf8mb4_general_ci NOT NULL,
  `usage_value` decimal(15,2) NOT NULL,
  `recorded_at` datetime NOT NULL,
  `recorded_by` int UNSIGNED DEFAULT NULL,
  `notes` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  KEY `asset_node_id` (`asset_node_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `assistance_requests`
--

DROP TABLE IF EXISTS `assistance_requests`;
CREATE TABLE IF NOT EXISTS `assistance_requests` (
  `id` varchar(36) NOT NULL,
  `work_order_id` varchar(36) NOT NULL,
  `requested_by` varchar(36) NOT NULL,
  `reason` text,
  `urgency` enum('low','normal','high','critical') DEFAULT 'normal',
  `status` enum('pending','approved','rejected','completed') DEFAULT 'pending',
  `approved_by` varchar(36) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attachments`
--

DROP TABLE IF EXISTS `attachments`;
CREATE TABLE IF NOT EXISTS `attachments` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `entity_type` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `entity_id` int UNSIGNED NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_general_ci NOT NULL,
  `file_size` int UNSIGNED NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `entity_type_entity_id` (`entity_type`,`entity_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `table_name` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `record_id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `action` enum('create','update','delete','view') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `user_id` int NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_520_ci,
  `session_id` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `previous_checksum` varchar(64) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_log_table_timestamp` (`table_name`,`timestamp`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` int NOT NULL,
  `action` varchar(100) NOT NULL,
  `user_id` int DEFAULT NULL,
  `changes` text,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs_enhanced`
--

DROP TABLE IF EXISTS `audit_logs_enhanced`;
CREATE TABLE IF NOT EXISTS `audit_logs_enhanced` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `plant_id` int DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` int DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `request_id` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `severity` enum('low','medium','high','critical') COLLATE utf8mb4_unicode_ci DEFAULT 'low',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_plant_id` (`plant_id`),
  KEY `idx_entity` (`entity_type`,`entity_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_severity` (`severity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bill_of_materials`
--

DROP TABLE IF EXISTS `bill_of_materials`;
CREATE TABLE IF NOT EXISTS `bill_of_materials` (
  `bom_id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_part_id` int UNSIGNED NOT NULL,
  `child_part_id` int UNSIGNED NOT NULL,
  `qty` decimal(10,2) NOT NULL DEFAULT '1.00',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`bom_id`),
  KEY `bill_of_materials_parent_part_id_foreign` (`parent_part_id`),
  KEY `bill_of_materials_child_part_id_foreign` (`child_part_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bom`
--

DROP TABLE IF EXISTS `bom`;
CREATE TABLE IF NOT EXISTS `bom` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parent_asset_id` int NOT NULL,
  `child_asset_id` int NOT NULL,
  `quantity` int DEFAULT '1',
  `unit_cost` decimal(10,2) DEFAULT '0.00',
  `total_cost` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bom_entries`
--

DROP TABLE IF EXISTS `bom_entries`;
CREATE TABLE IF NOT EXISTS `bom_entries` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `machine_id` int UNSIGNED NOT NULL,
  `assembly_id` int UNSIGNED DEFAULT NULL,
  `part_id` int UNSIGNED DEFAULT NULL,
  `qty` decimal(10,2) NOT NULL,
  `unit` varchar(20) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `reference_location` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_machine` (`machine_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `calibration_schedules`
--

DROP TABLE IF EXISTS `calibration_schedules`;
CREATE TABLE IF NOT EXISTS `calibration_schedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `machine_id` int NOT NULL,
  `frequency_days` int NOT NULL,
  `next_due_date` date NOT NULL,
  `status` enum('scheduled','completed','overdue') DEFAULT 'scheduled',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `capa_actions`
--

DROP TABLE IF EXISTS `capa_actions`;
CREATE TABLE IF NOT EXISTS `capa_actions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nc_id` int NOT NULL,
  `action_type` enum('corrective','preventive') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `responsible_person` int NOT NULL,
  `due_date` date NOT NULL,
  `status` enum('planned','in_progress','completed','verified') COLLATE utf8mb4_unicode_520_ci DEFAULT 'planned',
  `completion_date` date DEFAULT NULL,
  `effectiveness_verified` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `nc_id` (`nc_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `checklist_templates`
--

DROP TABLE IF EXISTS `checklist_templates`;
CREATE TABLE IF NOT EXISTS `checklist_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_code` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci,
  `machine_type` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `items` json NOT NULL,
  `pass_threshold` int DEFAULT '80',
  `frequency` enum('Daily','PerShift','Weekly','Monthly') COLLATE utf8mb4_unicode_520_ci DEFAULT 'Daily',
  `is_active` tinyint(1) DEFAULT '1',
  `version` int DEFAULT '1',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `template_code` (`template_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ci_sessions`
--

DROP TABLE IF EXISTS `ci_sessions`;
CREATE TABLE IF NOT EXISTS `ci_sessions` (
  `id` varchar(128) COLLATE utf8mb4_general_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_general_ci NOT NULL,
  `timestamp` int UNSIGNED NOT NULL DEFAULT '0',
  `data` blob NOT NULL,
  PRIMARY KEY (`id`,`ip_address`),
  KEY `ci_sessions_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `comments`
--

DROP TABLE IF EXISTS `comments`;
CREATE TABLE IF NOT EXISTS `comments` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `entity_type` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `entity_id` int UNSIGNED NOT NULL,
  `comment` text COLLATE utf8mb4_general_ci NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `entity_type_entity_id` (`entity_type`,`entity_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `components`
--

DROP TABLE IF EXISTS `components`;
CREATE TABLE IF NOT EXISTS `components` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `assembly_id` int UNSIGNED NOT NULL,
  `component_code` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `component_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'active',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `assembly_id` (`assembly_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `condition_alerts`
--

DROP TABLE IF EXISTS `condition_alerts`;
CREATE TABLE IF NOT EXISTS `condition_alerts` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `reading_id` int UNSIGNED NOT NULL,
  `asset_id` int UNSIGNED NOT NULL,
  `alert_type` varchar(50) NOT NULL,
  `severity` enum('low','medium','high','critical') NOT NULL,
  `message` text NOT NULL,
  `acknowledged` tinyint(1) DEFAULT '0',
  `acknowledged_by` int UNSIGNED DEFAULT NULL,
  `acknowledged_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_asset` (`asset_id`),
  KEY `idx_severity` (`severity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `condition_readings`
--

DROP TABLE IF EXISTS `condition_readings`;
CREATE TABLE IF NOT EXISTS `condition_readings` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` int UNSIGNED NOT NULL,
  `reading_type` enum('vibration','temperature','oil','ultrasonic','thermography') NOT NULL,
  `value` decimal(10,2) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `threshold_min` decimal(10,2) DEFAULT NULL,
  `threshold_max` decimal(10,2) DEFAULT NULL,
  `status` enum('normal','warning','critical') DEFAULT 'normal',
  `notes` text,
  `recorded_by` int UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_asset` (`asset_id`),
  KEY `idx_type` (`reading_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `contractor_services`
--

DROP TABLE IF EXISTS `contractor_services`;
CREATE TABLE IF NOT EXISTS `contractor_services` (
  `id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `work_order_id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `contractor_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `service_description` text COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `service_cost` decimal(15,2) NOT NULL,
  `currency_code` char(3) COLLATE utf8mb4_unicode_520_ci DEFAULT 'GHS',
  `invoice_number` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `service_date` date NOT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_contractor_services_wo` (`work_order_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `corrective_actions`
--

DROP TABLE IF EXISTS `corrective_actions`;
CREATE TABLE IF NOT EXISTS `corrective_actions` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `failure_report_id` int UNSIGNED DEFAULT NULL,
  `action_type` enum('Corrective','Preventive') COLLATE utf8mb4_unicode_520_ci DEFAULT 'Corrective',
  `action_description` text COLLATE utf8mb4_unicode_520_ci,
  `action_category` enum('Repair','Replace','Modify','Training','Procedure Change','Design Change','Other') COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `assigned_to` int UNSIGNED DEFAULT NULL,
  `priority` enum('Critical','High','Medium','Low') COLLATE utf8mb4_unicode_520_ci DEFAULT 'Medium',
  `due_date` date DEFAULT NULL,
  `completion_date` date DEFAULT NULL,
  `status` enum('Planned','In Progress','Completed','Verified','Cancelled') COLLATE utf8mb4_unicode_520_ci DEFAULT 'Planned',
  `cost_estimate` decimal(15,2) DEFAULT '0.00',
  `actual_cost` decimal(15,2) DEFAULT NULL,
  `effectiveness_rating` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `failure_report_id` (`failure_report_id`),
  KEY `assigned_to` (`assigned_to`),
  KEY `status` (`status`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cost_centers`
--

DROP TABLE IF EXISTS `cost_centers`;
CREATE TABLE IF NOT EXISTS `cost_centers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `department` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `budget_annual` decimal(15,2) DEFAULT '0.00',
  `currency_code` char(3) COLLATE utf8mb4_unicode_520_ci DEFAULT 'GHS',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cost_history`
--

DROP TABLE IF EXISTS `cost_history`;
CREATE TABLE IF NOT EXISTS `cost_history` (
  `id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `work_order_id` int NOT NULL,
  `cost_type` enum('labor','parts','contractor','downtime') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `old_amount` decimal(15,2) DEFAULT NULL,
  `new_amount` decimal(15,2) DEFAULT NULL,
  `changed_by` int NOT NULL,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `approval_required` tinyint(1) DEFAULT '0',
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cost_history_work_order` (`work_order_id`),
  KEY `idx_cost_history_changed_at` (`changed_at`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `custom_reports`
--

DROP TABLE IF EXISTS `custom_reports`;
CREATE TABLE IF NOT EXISTS `custom_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci,
  `query_config` json NOT NULL,
  `created_by` int NOT NULL,
  `is_public` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `daily_maintenance_summary`
--

DROP TABLE IF EXISTS `daily_maintenance_summary`;
CREATE TABLE IF NOT EXISTS `daily_maintenance_summary` (
  `id` int NOT NULL AUTO_INCREMENT,
  `summary_date` date NOT NULL,
  `total_work_orders` int DEFAULT '0',
  `completed_work_orders` int DEFAULT '0',
  `total_maintenance_cost` decimal(15,2) DEFAULT '0.00',
  `total_downtime_minutes` int DEFAULT '0',
  `sla_compliance_pct` decimal(5,2) DEFAULT '0.00',
  `plant_risk_index` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `summary_date` (`summary_date`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `daily_production_surveys`
--

DROP TABLE IF EXISTS `daily_production_surveys`;
CREATE TABLE IF NOT EXISTS `daily_production_surveys` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_center_id` int UNSIGNED NOT NULL,
  `survey_date` date NOT NULL,
  `shift` enum('morning','afternoon','night') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `operator_id` int UNSIGNED NOT NULL,
  `total_time_available` int DEFAULT '0',
  `break_mins` int DEFAULT '0',
  `repair_maint_mins` int DEFAULT '0',
  `input_delivery_mins` int DEFAULT '0',
  `change_over_mins` int DEFAULT '0',
  `startup_cleaning_mins` int DEFAULT '0',
  `others_mins` int DEFAULT '0',
  `preventive_maint_mins` int DEFAULT '0',
  `total_downtime` int DEFAULT '0',
  `productive_time` int DEFAULT '0',
  `production_yards` decimal(12,2) DEFAULT '0.00',
  `target_yards` decimal(12,2) DEFAULT '0.00',
  `actual_speed` decimal(10,2) DEFAULT '0.00',
  `standard_speed` decimal(10,2) DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `work_center_id` (`work_center_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dashboard_metrics_cache`
--

DROP TABLE IF EXISTS `dashboard_metrics_cache`;
CREATE TABLE IF NOT EXISTS `dashboard_metrics_cache` (
  `id` int NOT NULL AUTO_INCREMENT,
  `metric_name` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `metric_value` decimal(15,2) DEFAULT NULL,
  `metric_count` int DEFAULT NULL,
  `facility_id` int DEFAULT NULL,
  `calculated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_metrics_name_facility` (`metric_name`,`facility_id`),
  KEY `idx_metrics_expires` (`expires_at`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dashboard_widgets`
--

DROP TABLE IF EXISTS `dashboard_widgets`;
CREATE TABLE IF NOT EXISTS `dashboard_widgets` (
  `id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `widget_code` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `widget_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `dashboard_type` enum('maintenance_command','financial_intelligence','executive') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `widget_type` enum('kpi','chart','table','gauge') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `data_source_query` longtext COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `refresh_interval_minutes` int DEFAULT '5',
  `chart_config` json DEFAULT NULL,
  `position_x` int DEFAULT '0',
  `position_y` int DEFAULT '0',
  `width` int DEFAULT '4',
  `height` int DEFAULT '3',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `widget_code` (`widget_code`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
CREATE TABLE IF NOT EXISTS `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parent_id` int DEFAULT NULL,
  `level` tinyint DEFAULT '1' COMMENT '1=Main Department, 2=Sub-Department',
  `department_code` varchar(50) NOT NULL,
  `department_name` varchar(255) NOT NULL,
  `description` varchar(225) NOT NULL,
  `facility_id` int DEFAULT NULL,
  `supervisor_id` int DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `staff_id_format` varchar(50) DEFAULT 'DEPT-{XXXX}',
  `staff_id_counter` int DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `department_code` (`department_code`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_supervisor_id` (`supervisor_id`),
  KEY `idx_level` (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `digital_signatures`
--

DROP TABLE IF EXISTS `digital_signatures`;
CREATE TABLE IF NOT EXISTS `digital_signatures` (
  `id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `work_order_id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `sign_off_role` enum('team_leader','supervisor','production','engineering') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `user_id` int NOT NULL,
  `signed_at` timestamp NOT NULL,
  `shift_id` varchar(36) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `device_info` text COLLATE utf8mb4_unicode_520_ci,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `signature_image` longtext COLLATE utf8mb4_unicode_520_ci,
  `comments` text COLLATE utf8mb4_unicode_520_ci,
  `sequence_order` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
CREATE TABLE IF NOT EXISTS `documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `document_number` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `category` enum('Manual','SOP','Drawing','Certificate','Report','Policy') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `version` varchar(20) COLLATE utf8mb4_unicode_520_ci DEFAULT '1.0',
  `status` enum('draft','pending_approval','approved','archived') COLLATE utf8mb4_unicode_520_ci DEFAULT 'draft',
  `file_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `file_size` int NOT NULL,
  `file_type` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `asset_id` int DEFAULT NULL,
  `uploaded_by` int NOT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `language_code` char(2) COLLATE utf8mb4_unicode_520_ci DEFAULT 'en' COMMENT 'ISO 639-1',
  `keywords` text COLLATE utf8mb4_unicode_520_ci,
  `download_count` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `document_number` (`document_number`),
  KEY `idx_category` (`category`),
  KEY `idx_asset` (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `document_approvals`
--

DROP TABLE IF EXISTS `document_approvals`;
CREATE TABLE IF NOT EXISTS `document_approvals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `document_id` int NOT NULL,
  `approver_id` int NOT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_520_ci DEFAULT 'pending',
  `comments` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `document_id` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `document_versions`
--

DROP TABLE IF EXISTS `document_versions`;
CREATE TABLE IF NOT EXISTS `document_versions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `document_id` int NOT NULL,
  `version` varchar(20) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `file_size` int NOT NULL,
  `uploaded_by` int NOT NULL,
  `change_notes` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `document_id` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `downtime_cause_analysis`
--

DROP TABLE IF EXISTS `downtime_cause_analysis`;
CREATE TABLE IF NOT EXISTS `downtime_cause_analysis` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` int UNSIGNED NOT NULL,
  `work_order_id` int UNSIGNED DEFAULT NULL,
  `downtime_start` datetime NOT NULL,
  `downtime_end` datetime DEFAULT NULL,
  `duration_hours` decimal(10,2) DEFAULT NULL,
  `primary_cause` enum('mechanical_failure','electrical_failure','operator_error','maintenance_delay','parts_unavailable','power_outage','other') NOT NULL,
  `secondary_causes` json DEFAULT NULL,
  `production_loss_units` decimal(15,2) DEFAULT NULL,
  `revenue_loss` decimal(15,2) DEFAULT NULL,
  `preventable` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_asset` (`asset_id`,`downtime_start`),
  KEY `idx_cause` (`primary_cause`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `downtime_events`
--

DROP TABLE IF EXISTS `downtime_events`;
CREATE TABLE IF NOT EXISTS `downtime_events` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `plant_id` int DEFAULT NULL,
  `machine_id` int UNSIGNED NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `duration_hours` decimal(10,2) DEFAULT NULL,
  `downtime_category` enum('breakdown','planned_maintenance','changeover','no_operator','no_material','other') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_520_ci,
  `impact` enum('production_stop','reduced_capacity','quality_impact','minimal') COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `work_order_id` int UNSIGNED DEFAULT NULL,
  `resolved_by` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_machine_id` (`machine_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `downtime_logs`
--

DROP TABLE IF EXISTS `downtime_logs`;
CREATE TABLE IF NOT EXISTS `downtime_logs` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `machine_id` int UNSIGNED NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `duration_minutes` int DEFAULT NULL,
  `category` varchar(100) NOT NULL,
  `description` text,
  `root_cause` text,
  `logged_by` int UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_machine` (`machine_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `downtime_reasons`
--

DROP TABLE IF EXISTS `downtime_reasons`;
CREATE TABLE IF NOT EXISTS `downtime_reasons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` enum('mechanical','electrical','instrumentation','power','operations','materials','planned_maintenance') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `subcategory` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `downtime_records`
--

DROP TABLE IF EXISTS `downtime_records`;
CREATE TABLE IF NOT EXISTS `downtime_records` (
  `id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `work_order_id` varchar(36) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `asset_id` int NOT NULL,
  `reason_id` int NOT NULL,
  `start_time` timestamp NOT NULL,
  `end_time` timestamp NULL DEFAULT NULL,
  `duration_minutes` int DEFAULT NULL,
  `production_loss_ghs` decimal(15,2) DEFAULT '0.00',
  `recorded_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employee_roster`
--

DROP TABLE IF EXISTS `employee_roster`;
CREATE TABLE IF NOT EXISTS `employee_roster` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `shift_id` int DEFAULT NULL,
  `roster_date` date NOT NULL,
  `status` enum('scheduled','completed','absent') DEFAULT 'scheduled',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employee_shifts`
--

DROP TABLE IF EXISTS `employee_shifts`;
CREATE TABLE IF NOT EXISTS `employee_shifts` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `shift_id` int UNSIGNED NOT NULL,
  `department_id` int UNSIGNED DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `assigned_by` int UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_employee_shifts_user` (`user_id`),
  KEY `fk_employee_shifts_shift` (`shift_id`),
  KEY `fk_employee_shifts_department` (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `energy_consumption`
--

DROP TABLE IF EXISTS `energy_consumption`;
CREATE TABLE IF NOT EXISTS `energy_consumption` (
  `id` int NOT NULL AUTO_INCREMENT,
  `facility_id` int DEFAULT NULL,
  `asset_id` int NOT NULL,
  `consumption_kwh` decimal(10,2) NOT NULL,
  `cost` decimal(10,2) NOT NULL,
  `rate_per_kwh` decimal(10,4) DEFAULT '0.1200',
  `peak_demand_kw` decimal(10,2) DEFAULT NULL,
  `power_factor` decimal(5,2) DEFAULT NULL,
  `timestamp` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `currency_code` char(3) COLLATE utf8mb4_unicode_520_ci DEFAULT 'USD' COMMENT 'ISO 4217',
  `co2_emissions_kg` decimal(15,3) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_asset` (`asset_id`),
  KEY `idx_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `energy_targets`
--

DROP TABLE IF EXISTS `energy_targets`;
CREATE TABLE IF NOT EXISTS `energy_targets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `target_kwh` decimal(10,2) NOT NULL,
  `target_cost` decimal(10,2) NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `enterprise_permissions`
--

DROP TABLE IF EXISTS `enterprise_permissions`;
CREATE TABLE IF NOT EXISTS `enterprise_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `permission_code` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `permission_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `module` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permission_code` (`permission_code`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `enterprise_role_permissions`
--

DROP TABLE IF EXISTS `enterprise_role_permissions`;
CREATE TABLE IF NOT EXISTS `enterprise_role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  `granted_by` int NOT NULL,
  `granted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_role_permission` (`role_id`,`permission_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `erp_field_mappings`
--

DROP TABLE IF EXISTS `erp_field_mappings`;
CREATE TABLE IF NOT EXISTS `erp_field_mappings` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `eam_field` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `erp_field` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `data_type` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT 'string',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_mapping` (`entity_type`,`eam_field`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `erp_sync_log`
--

DROP TABLE IF EXISTS `erp_sync_log`;
CREATE TABLE IF NOT EXISTS `erp_sync_log` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `status` enum('success','failed','pending') COLLATE utf8mb4_unicode_520_ci DEFAULT 'pending',
  `message` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `entity_type` (`entity_type`),
  KEY `status` (`status`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `erp_sync_schedules`
--

DROP TABLE IF EXISTS `erp_sync_schedules`;
CREATE TABLE IF NOT EXISTS `erp_sync_schedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entity_type` enum('assets','work_orders','inventory') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `sync_direction` enum('push','pull','bidirectional') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `frequency` enum('hourly','daily','weekly') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `time_of_day` time DEFAULT NULL,
  `day_of_week` tinyint DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_run` datetime DEFAULT NULL,
  `next_run` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `erp_transformations`
--

DROP TABLE IF EXISTS `erp_transformations`;
CREATE TABLE IF NOT EXISTS `erp_transformations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entity_type` enum('assets','work_orders','inventory') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `field_name` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `transformation_type` enum('value_map','formula','concat','split','date_format') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `transformation_rule` json NOT NULL,
  `direction` enum('eam_to_erp','erp_to_eam','both') COLLATE utf8mb4_unicode_520_ci DEFAULT 'both',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `facilities`
--

DROP TABLE IF EXISTS `facilities`;
CREATE TABLE IF NOT EXISTS `facilities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plant_id` int DEFAULT NULL,
  `facility_code` varchar(50) NOT NULL,
  `facility_name` varchar(255) NOT NULL,
  `facility_type` enum('plant','warehouse','office','distribution_center','service_center') DEFAULT 'plant',
  `address_line1` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `country_code` char(2) DEFAULT NULL,
  `timezone` varchar(50) DEFAULT 'UTC',
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `manager_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `facility_code` (`facility_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `facility_areas`
--

DROP TABLE IF EXISTS `facility_areas`;
CREATE TABLE IF NOT EXISTS `facility_areas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `facility_id` int NOT NULL,
  `area_code` varchar(10) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `area_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `supervisor_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_facility_area` (`facility_id`,`area_code`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `failed_login_attempts`
--

DROP TABLE IF EXISTS `failed_login_attempts`;
CREATE TABLE IF NOT EXISTS `failed_login_attempts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `attempted_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_username` (`username`),
  KEY `idx_ip_address` (`ip_address`),
  KEY `idx_attempted_at` (`attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `failure_attachments`
--

DROP TABLE IF EXISTS `failure_attachments`;
CREATE TABLE IF NOT EXISTS `failure_attachments` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `failure_report_id` int UNSIGNED DEFAULT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `file_type` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `uploaded_by` int UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `failure_report_id` (`failure_report_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `failure_codes`
--

DROP TABLE IF EXISTS `failure_codes`;
CREATE TABLE IF NOT EXISTS `failure_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `description` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `severity` enum('minor','moderate','major','critical') DEFAULT 'moderate',
  `typical_resolution_time` int DEFAULT NULL COMMENT 'in minutes',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `failure_modes`
--

DROP TABLE IF EXISTS `failure_modes`;
CREATE TABLE IF NOT EXISTS `failure_modes` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `failure_code` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `failure_name` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci,
  `category` enum('Mechanical','Electrical','Hydraulic','Pneumatic','Control','Structural','Other') COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `severity` enum('Critical','High','Medium','Low') COLLATE utf8mb4_unicode_520_ci DEFAULT 'Medium',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_520_ci DEFAULT 'active',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failure_code` (`failure_code`),
  KEY `category` (`category`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `failure_reports`
--

DROP TABLE IF EXISTS `failure_reports`;
CREATE TABLE IF NOT EXISTS `failure_reports` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `report_number` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `asset_id` int UNSIGNED DEFAULT NULL,
  `work_order_id` int UNSIGNED DEFAULT NULL,
  `failure_mode_id` int UNSIGNED DEFAULT NULL,
  `failure_date` datetime DEFAULT NULL,
  `detection_method` enum('Inspection','Monitoring','Operator Report','Breakdown','Other') COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `downtime_hours` decimal(10,2) DEFAULT '0.00',
  `failure_description` text COLLATE utf8mb4_unicode_520_ci,
  `immediate_action` text COLLATE utf8mb4_unicode_520_ci,
  `cost_impact` decimal(15,2) DEFAULT '0.00',
  `safety_impact` enum('None','Minor','Moderate','Severe') COLLATE utf8mb4_unicode_520_ci DEFAULT 'None',
  `reported_by` int UNSIGNED DEFAULT NULL,
  `status` enum('Open','Under Investigation','RCA Complete','CAPA In Progress','Closed') COLLATE utf8mb4_unicode_520_ci DEFAULT 'Open',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `report_number` (`report_number`),
  KEY `asset_id` (`asset_id`),
  KEY `failure_mode_id` (`failure_mode_id`),
  KEY `status` (`status`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `financial_periods`
--

DROP TABLE IF EXISTS `financial_periods`;
CREATE TABLE IF NOT EXISTS `financial_periods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `period_year` int NOT NULL,
  `period_month` int NOT NULL,
  `period_name` varchar(20) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('open','locked','closed') COLLATE utf8mb4_unicode_520_ci DEFAULT 'open',
  `locked_by` int DEFAULT NULL,
  `locked_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_period` (`period_year`,`period_month`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `hotspots`
--

DROP TABLE IF EXISTS `hotspots`;
CREATE TABLE IF NOT EXISTS `hotspots` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` int UNSIGNED NOT NULL,
  `mesh_id` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `position_x` decimal(10,6) NOT NULL,
  `position_y` decimal(10,6) NOT NULL,
  `position_z` decimal(10,6) NOT NULL,
  `tooltip_text` text COLLATE utf8mb4_unicode_520_ci,
  `hotspot_type` enum('info','warning','maintenance','part') COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'info',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_id` (`asset_id`),
  KEY `mesh_id` (`mesh_id`(250))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inspection_checklists`
--

DROP TABLE IF EXISTS `inspection_checklists`;
CREATE TABLE IF NOT EXISTS `inspection_checklists` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `asset_type` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `frequency` enum('daily','weekly','monthly','quarterly','annual') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `checklist_items` json NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inspection_results`
--

DROP TABLE IF EXISTS `inspection_results`;
CREATE TABLE IF NOT EXISTS `inspection_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `checklist_id` int NOT NULL,
  `asset_id` int NOT NULL,
  `inspector_id` int NOT NULL,
  `results` json NOT NULL,
  `pass_fail` enum('pass','fail','conditional') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_520_ci,
  `inspection_date` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `checklist_id` (`checklist_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_forecasts`
--

DROP TABLE IF EXISTS `inventory_forecasts`;
CREATE TABLE IF NOT EXISTS `inventory_forecasts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_code` varchar(100) NOT NULL,
  `forecast_date` date NOT NULL,
  `forecasted_demand` decimal(15,3) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_items`
--

DROP TABLE IF EXISTS `inventory_items`;
CREATE TABLE IF NOT EXISTS `inventory_items` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `plant_id` int DEFAULT NULL,
  `item_code` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `item_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci,
  `category` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `unit_of_measure` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `unit_cost` decimal(10,2) NOT NULL,
  `quantity_on_hand` decimal(15,2) NOT NULL DEFAULT '0.00',
  `reorder_point` decimal(15,2) NOT NULL DEFAULT '0.00',
  `reorder_quantity` decimal(15,2) NOT NULL DEFAULT '0.00',
  `location` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `vendor_id` int UNSIGNED DEFAULT NULL,
  `status` enum('active','inactive','obsolete') COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'active',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `quantity_reserved` decimal(15,2) DEFAULT '0.00',
  `min_stock_level` decimal(15,2) DEFAULT '0.00',
  `max_stock_level` decimal(15,2) DEFAULT '0.00',
  `abc_classification` enum('A','B','C') COLLATE utf8mb4_unicode_520_ci DEFAULT 'C',
  PRIMARY KEY (`id`),
  UNIQUE KEY `item_code` (`item_code`),
  KEY `category` (`category`),
  KEY `idx_inventory_category` (`category`),
  KEY `idx_plant_inv` (`plant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_reservations`
--

DROP TABLE IF EXISTS `inventory_reservations`;
CREATE TABLE IF NOT EXISTS `inventory_reservations` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `inventory_item_id` int UNSIGNED NOT NULL,
  `work_order_id` int UNSIGNED DEFAULT NULL,
  `reserved_quantity` decimal(10,3) NOT NULL,
  `reserved_by` int UNSIGNED NOT NULL,
  `reserved_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `status` enum('active','consumed','cancelled') COLLATE utf8mb4_unicode_520_ci DEFAULT 'active',
  PRIMARY KEY (`id`),
  KEY `idx_inventory` (`inventory_item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_transactions`
--

DROP TABLE IF EXISTS `inventory_transactions`;
CREATE TABLE IF NOT EXISTS `inventory_transactions` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `transaction_number` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `inventory_item_id` int UNSIGNED NOT NULL,
  `transaction_type` enum('receipt','issue','adjustment','transfer','return') COLLATE utf8mb4_general_ci DEFAULT 'issue',
  `quantity` decimal(10,2) NOT NULL,
  `unit_cost` decimal(10,2) DEFAULT NULL,
  `total_cost` decimal(10,2) DEFAULT NULL,
  `reference_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reference_id` int UNSIGNED DEFAULT NULL,
  `from_location_id` int UNSIGNED DEFAULT NULL,
  `to_location_id` int UNSIGNED DEFAULT NULL,
  `performed_by` int UNSIGNED NOT NULL,
  `transaction_date` datetime NOT NULL,
  `notes` text COLLATE utf8mb4_general_ci,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaction_number` (`transaction_number`),
  KEY `inventory_item_id` (`inventory_item_id`),
  KEY `transaction_type_date` (`transaction_type`,`transaction_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `iot_alerts`
--

DROP TABLE IF EXISTS `iot_alerts`;
CREATE TABLE IF NOT EXISTS `iot_alerts` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` int UNSIGNED DEFAULT NULL,
  `metric_type` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `value` decimal(10,2) DEFAULT NULL,
  `threshold` decimal(10,2) DEFAULT NULL,
  `severity` enum('warning','critical') COLLATE utf8mb4_unicode_520_ci DEFAULT 'warning',
  `acknowledged` tinyint(1) DEFAULT '0',
  `acknowledged_at` datetime DEFAULT NULL,
  `acknowledged_by` int UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_id` (`asset_id`),
  KEY `acknowledged` (`acknowledged`),
  KEY `idx_alerts_asset_ack` (`asset_id`,`acknowledged`),
  KEY `idx_alerts_severity` (`severity`,`acknowledged`),
  KEY `idx_alerts_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `iot_alert_rules`
--

DROP TABLE IF EXISTS `iot_alert_rules`;
CREATE TABLE IF NOT EXISTS `iot_alert_rules` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` int UNSIGNED NOT NULL,
  `metric_type` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `warning_threshold` decimal(10,2) NOT NULL,
  `critical_threshold` decimal(10,2) NOT NULL,
  `action` enum('alert','alert_and_email','alert_and_wo','shutdown') COLLATE utf8mb4_unicode_520_ci DEFAULT 'alert',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_id` (`asset_id`),
  KEY `metric_type` (`metric_type`),
  KEY `is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `iot_devices`
--

DROP TABLE IF EXISTS `iot_devices`;
CREATE TABLE IF NOT EXISTS `iot_devices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `device_name` varchar(255) NOT NULL,
  `device_type` enum('sensor_gateway','plc','scada','edge_device','camera','other') DEFAULT 'sensor_gateway',
  `asset_id` int DEFAULT NULL,
  `asset_type` enum('machine','assembly','part') DEFAULT 'machine',
  `status` enum('pending_setup','active','inactive','maintenance') DEFAULT 'pending_setup',
  `connection_status` enum('online','offline','error') DEFAULT 'offline',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `iot_metrics`
--

DROP TABLE IF EXISTS `iot_metrics`;
CREATE TABLE IF NOT EXISTS `iot_metrics` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `device_id` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `asset_id` int UNSIGNED DEFAULT NULL,
  `metric_type` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `value` decimal(10,2) DEFAULT NULL,
  `timestamp` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_timestamp` (`asset_id`,`timestamp`),
  KEY `metric_timestamp` (`metric_type`,`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `jwt_blacklist`
--

DROP TABLE IF EXISTS `jwt_blacklist`;
CREATE TABLE IF NOT EXISTS `jwt_blacklist` (
  `id` int NOT NULL AUTO_INCREMENT,
  `token_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `idx_token_hash` (`token_hash`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `kpi_snapshots`
--

DROP TABLE IF EXISTS `kpi_snapshots`;
CREATE TABLE IF NOT EXISTS `kpi_snapshots` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `snapshot_date` date NOT NULL,
  `mtbf` decimal(10,2) NOT NULL,
  `mttr` decimal(10,2) NOT NULL,
  `oee` decimal(5,2) NOT NULL,
  `pm_compliance` decimal(5,2) NOT NULL,
  `reactive_ratio` decimal(5,2) NOT NULL,
  `cost_per_asset` decimal(10,2) NOT NULL,
  `schedule_compliance` decimal(5,2) NOT NULL,
  `wrench_time` decimal(5,2) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_snapshot_date` (`snapshot_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `labor_logs`
--

DROP TABLE IF EXISTS `labor_logs`;
CREATE TABLE IF NOT EXISTS `labor_logs` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `technician_id` int UNSIGNED NOT NULL,
  `clock_in` datetime DEFAULT NULL,
  `clock_out` datetime DEFAULT NULL,
  `break_minutes` int DEFAULT '0',
  `actual_hours` decimal(10,2) DEFAULT NULL,
  `work_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `activity_description` text COLLATE utf8mb4_general_ci,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `duration_hours` decimal(10,2) DEFAULT NULL,
  `labor_type` enum('regular','overtime','emergency') COLLATE utf8mb4_general_ci DEFAULT 'regular',
  `notes` text COLLATE utf8mb4_general_ci,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `work_order_id` (`work_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `labor_rate_config`
--

DROP TABLE IF EXISTS `labor_rate_config`;
CREATE TABLE IF NOT EXISTS `labor_rate_config` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `labor_type` enum('normal','overtime','weekend','holiday','emergency') NOT NULL,
  `base_multiplier` decimal(4,2) NOT NULL DEFAULT '1.00',
  `description` varchar(255) DEFAULT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_labor_type_date` (`labor_type`,`effective_from`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `license_audit_log`
--

DROP TABLE IF EXISTS `license_audit_log`;
CREATE TABLE IF NOT EXISTS `license_audit_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `module_code` varchar(50) NOT NULL,
  `action` varchar(50) NOT NULL,
  `old_value` text,
  `new_value` text,
  `changed_by` int NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_module_code` (`module_code`),
  KEY `idx_changed_by` (`changed_by`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `loto_applications`
--

DROP TABLE IF EXISTS `loto_applications`;
CREATE TABLE IF NOT EXISTS `loto_applications` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `permit_id` int UNSIGNED DEFAULT NULL,
  `work_order_id` int UNSIGNED DEFAULT NULL,
  `equipment_id` int UNSIGNED NOT NULL,
  `procedure_id` int UNSIGNED NOT NULL,
  `applied_by` int UNSIGNED NOT NULL,
  `applied_at` datetime NOT NULL,
  `lock_numbers` json NOT NULL,
  `tag_numbers` json NOT NULL,
  `verified_by` int UNSIGNED DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `zero_energy_confirmed` tinyint(1) DEFAULT '0',
  `verification_notes` text,
  `removed_by` int UNSIGNED DEFAULT NULL,
  `removed_at` datetime DEFAULT NULL,
  `equipment_tested` tinyint(1) DEFAULT '0',
  `removal_notes` text,
  `status` enum('applied','verified','active','removed') DEFAULT 'applied',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_permit_work_order` (`permit_id`,`work_order_id`),
  KEY `idx_equipment_id` (`equipment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `loto_locks`
--

DROP TABLE IF EXISTS `loto_locks`;
CREATE TABLE IF NOT EXISTS `loto_locks` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `lock_number` varchar(50) NOT NULL,
  `lock_type` varchar(50) NOT NULL,
  `assigned_to` int UNSIGNED DEFAULT NULL,
  `current_location` varchar(255) DEFAULT NULL,
  `status` enum('available','in_use','damaged','lost') DEFAULT 'available',
  `last_inspection_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lock_number` (`lock_number`),
  KEY `idx_lock_number` (`lock_number`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `loto_procedures`
--

DROP TABLE IF EXISTS `loto_procedures`;
CREATE TABLE IF NOT EXISTS `loto_procedures` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `equipment_id` int UNSIGNED NOT NULL,
  `procedure_name` varchar(255) NOT NULL,
  `procedure_code` varchar(50) NOT NULL,
  `energy_sources` json NOT NULL,
  `isolation_steps` text NOT NULL,
  `verification_steps` text NOT NULL,
  `restoration_steps` text NOT NULL,
  `created_by` int UNSIGNED NOT NULL,
  `approved_by` int UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `procedure_code` (`procedure_code`),
  KEY `idx_equipment_id` (`equipment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `machines`
--

DROP TABLE IF EXISTS `machines`;
CREATE TABLE IF NOT EXISTS `machines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plant_id` int DEFAULT NULL,
  `facility_id` int DEFAULT NULL,
  `area_id` int DEFAULT NULL,
  `line_id` int DEFAULT NULL,
  `machine_name` varchar(255) NOT NULL,
  `machine_code` varchar(100) DEFAULT NULL,
  `machine_category` varchar(100) DEFAULT NULL,
  `model` varchar(100) DEFAULT NULL,
  `manufacturer` varchar(100) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `plant_location` varchar(255) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `description` text,
  `installation_date` date DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `warranty_expiry` date DEFAULT NULL,
  `status` enum('active','inactive','out_of_service') DEFAULT 'active',
  `criticality` enum('low','medium','high','critical') DEFAULT 'medium',
  `machine_photo` varchar(255) DEFAULT NULL,
  `asset_class` varchar(100) DEFAULT NULL,
  `functional_location` varchar(255) DEFAULT NULL,
  `cost_center` varchar(100) DEFAULT NULL,
  `production_line` varchar(100) DEFAULT NULL,
  `operation_type` enum('continuous','batch','manual','automated') DEFAULT 'continuous',
  `rated_power` varchar(50) DEFAULT NULL,
  `voltage` varchar(50) DEFAULT NULL,
  `capacity` varchar(100) DEFAULT NULL,
  `cycle_time` varchar(50) DEFAULT NULL,
  `speed_throughput` varchar(100) DEFAULT NULL,
  `operating_weight` varchar(50) DEFAULT NULL,
  `dimensions` varchar(100) DEFAULT NULL,
  `operating_temperature_range` varchar(100) DEFAULT NULL,
  `operating_pressure` varchar(50) DEFAULT NULL,
  `acquisition_cost` decimal(15,2) DEFAULT NULL,
  `current_value` decimal(15,2) DEFAULT NULL,
  `depreciation_method` enum('straight_line','declining_balance','units_of_production') DEFAULT NULL,
  `useful_life_years` int DEFAULT NULL,
  `salvage_value` decimal(15,2) DEFAULT NULL,
  `mtbf_hours` decimal(10,2) DEFAULT NULL,
  `mttr_hours` decimal(10,2) DEFAULT NULL,
  `design_life_years` int DEFAULT NULL,
  `oee_target` decimal(5,2) DEFAULT NULL,
  `replacement_planned_date` date DEFAULT NULL,
  `replacement_cost_estimate` decimal(15,2) DEFAULT NULL,
  `maintenance_strategy` enum('time-based','usage-based','condition-based') DEFAULT 'time-based',
  `warranty_alerts` enum('yes','no') DEFAULT 'no',
  `default_technician_group` varchar(100) DEFAULT NULL,
  `pm_frequency` int DEFAULT NULL,
  `usage_unit` enum('hours','cycles','meters','quantity_produced') DEFAULT 'hours',
  `calibration_required` enum('yes','no') DEFAULT 'no',
  `calibration_frequency_days` int DEFAULT NULL,
  `redundancy_available` enum('yes','no') DEFAULT 'no',
  `downtime_impact` enum('production_stop','reduced_capacity','quality_impact','minimal') DEFAULT NULL,
  `safety_class` enum('class_1','class_2','class_3','non_classified') DEFAULT NULL,
  `hazardous_area_classification` varchar(100) DEFAULT NULL,
  `permit_required` enum('yes','no') DEFAULT 'no',
  `lockout_tagout_required` enum('yes','no') DEFAULT 'no',
  `ppe_requirements` text,
  `commissioning_date` date DEFAULT NULL,
  `warranty_type` enum('none','manufacturer','extended','service_contract') DEFAULT 'none',
  `service_contract_number` varchar(100) DEFAULT NULL,
  `service_contract_expiry` date DEFAULT NULL,
  `installation_notes` text,
  `special_instructions` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `machine_assignments`
--

DROP TABLE IF EXISTS `machine_assignments`;
CREATE TABLE IF NOT EXISTS `machine_assignments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `asset_id` bigint NOT NULL,
  `assigned_by` bigint NOT NULL,
  `assignee_user_id` bigint DEFAULT NULL,
  `assignee_group_id` bigint DEFAULT NULL,
  `start_at` datetime NOT NULL,
  `end_at` datetime DEFAULT NULL,
  `shift_id` bigint DEFAULT NULL,
  `note` varchar(1000) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_id` (`asset_id`),
  KEY `assignee_user_id` (`assignee_user_id`),
  KEY `assignee_group_id` (`assignee_group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_attachments`
--

DROP TABLE IF EXISTS `maintenance_attachments`;
CREATE TABLE IF NOT EXISTS `maintenance_attachments` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `entity_type` enum('maintenance_request','work_order') COLLATE utf8mb4_general_ci NOT NULL,
  `entity_id` int UNSIGNED NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_general_ci NOT NULL,
  `file_type` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `file_size` int NOT NULL,
  `uploaded_by` int UNSIGNED NOT NULL,
  `uploaded_at` datetime NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `entity_type_id` (`entity_type`,`entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_comments`
--

DROP TABLE IF EXISTS `maintenance_comments`;
CREATE TABLE IF NOT EXISTS `maintenance_comments` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `entity_type` enum('maintenance_request','work_order') COLLATE utf8mb4_general_ci NOT NULL,
  `entity_id` int UNSIGNED NOT NULL,
  `comment` text COLLATE utf8mb4_general_ci NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `entity_type_id` (`entity_type`,`entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_cost_entries`
--

DROP TABLE IF EXISTS `maintenance_cost_entries`;
CREATE TABLE IF NOT EXISTS `maintenance_cost_entries` (
  `id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `work_order_id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `cost_type` enum('labor','parts','contractor','downtime','overhead') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `cost_category` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci,
  `quantity` decimal(10,3) DEFAULT '1.000',
  `unit_cost` decimal(15,2) NOT NULL,
  `total_cost` decimal(15,2) NOT NULL,
  `currency_code` char(3) COLLATE utf8mb4_unicode_520_ci DEFAULT 'GHS',
  `cost_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int NOT NULL,
  `reference_id` varchar(36) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `is_approved` tinyint(1) DEFAULT '0',
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cost_entries_wo` (`work_order_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_cost_trends`
--

DROP TABLE IF EXISTS `maintenance_cost_trends`;
CREATE TABLE IF NOT EXISTS `maintenance_cost_trends` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `period_type` enum('daily','weekly','monthly','quarterly','yearly') NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `asset_id` int UNSIGNED DEFAULT NULL,
  `department_id` int UNSIGNED DEFAULT NULL,
  `total_labor_cost` decimal(15,2) DEFAULT '0.00',
  `total_parts_cost` decimal(15,2) DEFAULT '0.00',
  `total_external_cost` decimal(15,2) DEFAULT '0.00',
  `total_downtime_cost` decimal(15,2) DEFAULT '0.00',
  `total_cost` decimal(15,2) DEFAULT '0.00',
  `work_order_count` int DEFAULT '0',
  `emergency_count` int DEFAULT '0',
  `preventive_count` int DEFAULT '0',
  `calculated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_period` (`period_type`,`period_start`,`asset_id`,`department_id`),
  KEY `idx_period` (`period_start`,`period_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_notifications`
--

DROP TABLE IF EXISTS `maintenance_notifications`;
CREATE TABLE IF NOT EXISTS `maintenance_notifications` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `message` text COLLATE utf8mb4_general_ci NOT NULL,
  `reference_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_orders`
--

DROP TABLE IF EXISTS `maintenance_orders`;
CREATE TABLE IF NOT EXISTS `maintenance_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_number` varchar(50) NOT NULL,
  `order_type` enum('preventive','corrective','breakdown','inspection','modification','calibration') NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `asset_id` int DEFAULT NULL,
  `asset_type` enum('machine','part','assembly','facility') DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `priority` enum('low','medium','high','critical','emergency') DEFAULT 'medium',
  `status` enum('draft','pending','approved','assigned','in_progress','on_hold','completed','cancelled','closed') DEFAULT 'pending',
  `permit_required` tinyint(1) DEFAULT '0',
  `permit_id` int UNSIGNED DEFAULT NULL,
  `loto_required` tinyint(1) DEFAULT '0',
  `loto_id` int UNSIGNED DEFAULT NULL,
  `failure_type` varchar(100) DEFAULT NULL,
  `failure_code` varchar(50) DEFAULT NULL,
  `downtime_impact` enum('none','low','medium','high','critical') DEFAULT 'none',
  `safety_risk` tinyint(1) DEFAULT '0',
  `requested_by` int DEFAULT NULL,
  `requested_date` datetime DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_date` datetime DEFAULT NULL,
  `assigned_to` int DEFAULT NULL,
  `assigned_team` varchar(100) DEFAULT NULL,
  `assigned_date` datetime DEFAULT NULL,
  `scheduled_start` datetime DEFAULT NULL,
  `scheduled_end` datetime DEFAULT NULL,
  `actual_start` datetime DEFAULT NULL,
  `actual_end` datetime DEFAULT NULL,
  `estimated_hours` decimal(10,2) DEFAULT NULL,
  `actual_hours` decimal(10,2) DEFAULT NULL,
  `estimated_cost` decimal(12,2) DEFAULT NULL,
  `actual_cost` decimal(12,2) DEFAULT NULL,
  `labor_cost` decimal(12,2) DEFAULT '0.00',
  `parts_cost` decimal(12,2) DEFAULT '0.00',
  `external_cost` decimal(12,2) DEFAULT '0.00',
  `completion_notes` text,
  `root_cause` text,
  `corrective_action` text,
  `preventive_action` text,
  `attachments` text,
  `parent_order_id` int DEFAULT NULL,
  `pm_task_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `locked` tinyint(1) DEFAULT '0',
  `locked_at` datetime DEFAULT NULL,
  `locked_by` int UNSIGNED DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `status` (`status`),
  KEY `priority` (`priority`),
  KEY `order_type` (`order_type`),
  KEY `asset_id` (`asset_id`),
  KEY `assigned_to` (`assigned_to`),
  KEY `scheduled_start` (`scheduled_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_order_checklist`
--

DROP TABLE IF EXISTS `maintenance_order_checklist`;
CREATE TABLE IF NOT EXISTS `maintenance_order_checklist` (
  `id` int NOT NULL AUTO_INCREMENT,
  `maintenance_order_id` int NOT NULL,
  `item_description` varchar(500) NOT NULL,
  `item_order` int DEFAULT '1',
  `category` varchar(100) DEFAULT NULL,
  `is_mandatory` tinyint(1) DEFAULT '0',
  `is_completed` tinyint(1) DEFAULT '0',
  `completed_by` int DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `result` enum('pass','fail','na') DEFAULT NULL,
  `measurement_value` varchar(100) DEFAULT NULL,
  `expected_value` varchar(100) DEFAULT NULL,
  `notes` text,
  `photo_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `maintenance_order_id` (`maintenance_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_order_downtime`
--

DROP TABLE IF EXISTS `maintenance_order_downtime`;
CREATE TABLE IF NOT EXISTS `maintenance_order_downtime` (
  `id` int NOT NULL AUTO_INCREMENT,
  `maintenance_order_id` int NOT NULL,
  `asset_id` int NOT NULL,
  `downtime_start` datetime NOT NULL,
  `downtime_end` datetime DEFAULT NULL,
  `duration_minutes` int DEFAULT NULL,
  `downtime_type` enum('planned','unplanned') DEFAULT 'unplanned',
  `production_loss_units` decimal(10,2) DEFAULT NULL,
  `production_loss_value` decimal(12,2) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `maintenance_order_id` (`maintenance_order_id`),
  KEY `asset_id` (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_order_external_services`
--

DROP TABLE IF EXISTS `maintenance_order_external_services`;
CREATE TABLE IF NOT EXISTS `maintenance_order_external_services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `maintenance_order_id` int NOT NULL,
  `vendor_name` varchar(255) NOT NULL,
  `vendor_contact` varchar(255) DEFAULT NULL,
  `service_type` varchar(100) DEFAULT NULL,
  `service_description` text,
  `po_number` varchar(100) DEFAULT NULL,
  `estimated_cost` decimal(12,2) DEFAULT NULL,
  `actual_cost` decimal(12,2) DEFAULT NULL,
  `start_date` datetime DEFAULT NULL,
  `completion_date` datetime DEFAULT NULL,
  `status` enum('requested','approved','in_progress','completed','cancelled') DEFAULT 'requested',
  `invoice_number` varchar(100) DEFAULT NULL,
  `payment_status` enum('pending','paid','overdue') DEFAULT 'pending',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `maintenance_order_id` (`maintenance_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_order_labor`
--

DROP TABLE IF EXISTS `maintenance_order_labor`;
CREATE TABLE IF NOT EXISTS `maintenance_order_labor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `maintenance_order_id` int NOT NULL,
  `technician_id` int NOT NULL,
  `technician_name` varchar(255) DEFAULT NULL,
  `role` varchar(100) DEFAULT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `hours_worked` decimal(10,2) DEFAULT NULL,
  `hourly_rate` decimal(10,2) DEFAULT NULL,
  `labor_cost` decimal(12,2) DEFAULT NULL,
  `work_description` text,
  `break_time_minutes` int DEFAULT '0',
  `overtime_hours` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `maintenance_order_id` (`maintenance_order_id`),
  KEY `technician_id` (`technician_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_order_logs`
--

DROP TABLE IF EXISTS `maintenance_order_logs`;
CREATE TABLE IF NOT EXISTS `maintenance_order_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `maintenance_order_id` int NOT NULL,
  `log_type` enum('status_change','assignment','comment','attachment','measurement','issue') DEFAULT 'comment',
  `user_id` int DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `old_value` varchar(500) DEFAULT NULL,
  `new_value` varchar(500) DEFAULT NULL,
  `comment` text,
  `is_internal` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `maintenance_order_id` (`maintenance_order_id`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_order_parts`
--

DROP TABLE IF EXISTS `maintenance_order_parts`;
CREATE TABLE IF NOT EXISTS `maintenance_order_parts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `maintenance_order_id` int NOT NULL,
  `part_id` int NOT NULL,
  `part_name` varchar(255) DEFAULT NULL,
  `part_number` varchar(100) DEFAULT NULL,
  `quantity_required` decimal(10,2) NOT NULL,
  `quantity_used` decimal(10,2) DEFAULT NULL,
  `unit_cost` decimal(12,2) DEFAULT NULL,
  `total_cost` decimal(12,2) DEFAULT NULL,
  `warehouse_location` varchar(100) DEFAULT NULL,
  `issued_by` int DEFAULT NULL,
  `issued_date` datetime DEFAULT NULL,
  `return_quantity` decimal(10,2) DEFAULT '0.00',
  `status` enum('requested','reserved','issued','returned','cancelled') DEFAULT 'requested',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `maintenance_order_id` (`maintenance_order_id`),
  KEY `part_id` (`part_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_order_templates`
--

DROP TABLE IF EXISTS `maintenance_order_templates`;
CREATE TABLE IF NOT EXISTS `maintenance_order_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_name` varchar(255) NOT NULL,
  `order_type` enum('preventive','corrective','breakdown','inspection','modification','calibration') NOT NULL,
  `description` text,
  `estimated_hours` decimal(10,2) DEFAULT NULL,
  `checklist_items` text COMMENT 'JSON array',
  `required_skills` text COMMENT 'JSON array',
  `required_parts` text COMMENT 'JSON array',
  `safety_requirements` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_requests`
--

DROP TABLE IF EXISTS `maintenance_requests`;
CREATE TABLE IF NOT EXISTS `maintenance_requests` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `plant_id` int UNSIGNED DEFAULT NULL,
  `request_number` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `priority` enum('low','medium','high','critical') COLLATE utf8mb4_general_ci DEFAULT 'medium',
  `machine_down_status` enum('Yes','No') COLLATE utf8mb4_general_ci DEFAULT 'No',
  `category` enum('breakdown','preventive','corrective','inspection','other') COLLATE utf8mb4_general_ci NOT NULL,
  `asset_id` int DEFAULT NULL,
  `assembly_id` int UNSIGNED DEFAULT NULL,
  `part_id` int UNSIGNED DEFAULT NULL,
  `department_id` int UNSIGNED NOT NULL,
  `sla_id` int UNSIGNED DEFAULT NULL,
  `location` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `item_type` enum('machine','manual') COLLATE utf8mb4_general_ci DEFAULT 'machine',
  `asset_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `requested_by` int UNSIGNED NOT NULL,
  `requested_date` datetime NOT NULL,
  `required_date` date DEFAULT NULL,
  `response_due` datetime DEFAULT NULL,
  `status` enum('pending','approved','rejected','converted') COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `workflow_status` enum('pending','supervisor_review','approved','rejected','assigned_to_planner','work_order_created','in_progress','technician_completed','planner_confirmed','satisfactory','supervisor_rejected','closed') COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `supervisor_id` int UNSIGNED DEFAULT NULL,
  `approved_by` int UNSIGNED DEFAULT NULL,
  `reviewed_by` int UNSIGNED DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `reviewed_date` datetime DEFAULT NULL,
  `review_notes` text COLLATE utf8mb4_general_ci,
  `assigned_planner_id` int UNSIGNED DEFAULT NULL,
  `assigned_technician_id` int UNSIGNED DEFAULT NULL,
  `planner_type` enum('engineering','production') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `approved_date` datetime DEFAULT NULL,
  `rejection_reason` text COLLATE utf8mb4_general_ci,
  `work_order_id` int UNSIGNED DEFAULT NULL,
  `satisfactory_checked_by` int UNSIGNED DEFAULT NULL,
  `satisfactory_checked_at` datetime DEFAULT NULL,
  `closed_by` int UNSIGNED DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `attachments` json DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `sla_due_date` datetime DEFAULT NULL,
  `sla_status` enum('on_time','at_risk','overdue') COLLATE utf8mb4_general_ci DEFAULT 'on_time',
  `response_time` int DEFAULT NULL,
  `resolution_time` int DEFAULT NULL,
  `technician_completed_by` int UNSIGNED DEFAULT NULL,
  `technician_completed_at` datetime DEFAULT NULL,
  `planner_confirmed_by` int UNSIGNED DEFAULT NULL,
  `planner_confirmed_at` datetime DEFAULT NULL,
  `supervisor_rejection_reason` text COLLATE utf8mb4_general_ci,
  `supervisor_rejected_by` int UNSIGNED DEFAULT NULL,
  `supervisor_rejected_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_number` (`request_number`),
  KEY `status` (`status`),
  KEY `fk_maintenance_requests_asset` (`asset_id`),
  KEY `idx_plant_id` (`plant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_request_workflow`
--

DROP TABLE IF EXISTS `maintenance_request_workflow`;
CREATE TABLE IF NOT EXISTS `maintenance_request_workflow` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `request_id` int UNSIGNED NOT NULL,
  `from_status` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `to_status` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `action_by` int UNSIGNED NOT NULL,
  `action_type` enum('created','reviewed','approved','rejected','assigned','converted','completed','commented') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_request` (`request_id`),
  KEY `idx_action_by` (`action_by`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_sla_config`
--

DROP TABLE IF EXISTS `maintenance_sla_config`;
CREATE TABLE IF NOT EXISTS `maintenance_sla_config` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `priority` enum('low','medium','high','urgent') NOT NULL,
  `response_time_hours` int NOT NULL,
  `resolution_time_hours` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `priority` (`priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_strategies`
--

DROP TABLE IF EXISTS `maintenance_strategies`;
CREATE TABLE IF NOT EXISTS `maintenance_strategies` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` int UNSIGNED NOT NULL,
  `strategy_type` enum('predictive','preventive','corrective','detective','redesign') NOT NULL,
  `task_description` text NOT NULL,
  `frequency` varchar(50) DEFAULT NULL,
  `estimated_cost` decimal(10,2) DEFAULT NULL,
  `estimated_benefit` decimal(10,2) DEFAULT NULL,
  `priority` int DEFAULT '5',
  `implementation_status` enum('planned','in_progress','implemented','cancelled') DEFAULT 'planned',
  `implemented_date` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_asset` (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `material_issues`
--

DROP TABLE IF EXISTS `material_issues`;
CREATE TABLE IF NOT EXISTS `material_issues` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `issue_number` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `material_request_id` int UNSIGNED NOT NULL,
  `work_order_id` int UNSIGNED DEFAULT NULL,
  `issued_by` int UNSIGNED NOT NULL,
  `issued_to` int UNSIGNED NOT NULL,
  `issue_date` datetime NOT NULL,
  `total_cost` decimal(10,2) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_general_ci,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `issue_number` (`issue_number`),
  KEY `material_request_id` (`material_request_id`),
  KEY `work_order_id` (`work_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `material_requests`
--

DROP TABLE IF EXISTS `material_requests`;
CREATE TABLE IF NOT EXISTS `material_requests` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `request_number` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `work_order_id` int UNSIGNED DEFAULT NULL,
  `request_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `requested_by` int UNSIGNED NOT NULL,
  `department_id` int UNSIGNED DEFAULT NULL,
  `request_date` datetime NOT NULL,
  `required_date` datetime DEFAULT NULL,
  `priority` enum('low','medium','high','urgent') COLLATE utf8mb4_general_ci DEFAULT 'medium',
  `status` enum('pending','approved','rejected','issued','completed','cancelled') COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `justification` text COLLATE utf8mb4_general_ci,
  `reviewed_by` int UNSIGNED DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `review_notes` text COLLATE utf8mb4_general_ci,
  `issued_by` int UNSIGNED DEFAULT NULL,
  `issued_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_number` (`request_number`),
  KEY `work_order_status` (`work_order_id`,`status`),
  KEY `requested_by` (`requested_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `material_request_items`
--

DROP TABLE IF EXISTS `material_request_items`;
CREATE TABLE IF NOT EXISTS `material_request_items` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `material_request_id` int UNSIGNED NOT NULL,
  `inventory_item_id` int UNSIGNED DEFAULT NULL,
  `item_code` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `item_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `quantity_requested` decimal(10,2) NOT NULL,
  `quantity_approved` decimal(10,2) DEFAULT NULL,
  `quantity_issued` decimal(10,2) DEFAULT NULL,
  `unit` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `unit_cost` decimal(10,2) DEFAULT NULL,
  `total_cost` decimal(10,2) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_general_ci,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `material_request_id` (`material_request_id`),
  KEY `inventory_item_id` (`inventory_item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `meters`
--

DROP TABLE IF EXISTS `meters`;
CREATE TABLE IF NOT EXISTS `meters` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_node_type` varchar(32) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `asset_node_id` bigint UNSIGNED NOT NULL,
  `meter_type` varchar(64) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `unit` varchar(16) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `value` decimal(20,4) DEFAULT '0.0000',
  `last_read_at` datetime DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `updated_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `version` int DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `asset_node_type` (`asset_node_type`,`asset_node_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `meter_readings`
--

DROP TABLE IF EXISTS `meter_readings`;
CREATE TABLE IF NOT EXISTS `meter_readings` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `meter_id` int UNSIGNED NOT NULL,
  `reading_value` decimal(15,2) NOT NULL,
  `reading_date` datetime NOT NULL,
  `recorded_by` int UNSIGNED NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `meter_id_reading_date` (`meter_id`,`reading_date`),
  KEY `idx_meter_readings_date` (`meter_id`,`reading_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `meter_update_queue`
--

DROP TABLE IF EXISTS `meter_update_queue`;
CREATE TABLE IF NOT EXISTS `meter_update_queue` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `meter_id` bigint UNSIGNED NOT NULL,
  `payload` json DEFAULT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_520_ci DEFAULT 'pending',
  `attempts` int DEFAULT '0',
  `last_error` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
CREATE TABLE IF NOT EXISTS `migrations` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `version` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `class` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `group` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `namespace` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `time` int NOT NULL,
  `batch` int UNSIGNED NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `mobile_sync_batches`
--

DROP TABLE IF EXISTS `mobile_sync_batches`;
CREATE TABLE IF NOT EXISTS `mobile_sync_batches` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `batch_id` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `operations` json NOT NULL,
  `status` enum('pending','processing','completed','failed') COLLATE utf8mb4_unicode_520_ci DEFAULT 'pending',
  `result_mapping` json DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` datetime DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `batch_id` (`batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `mobile_sync_queue`
--

DROP TABLE IF EXISTS `mobile_sync_queue`;
CREATE TABLE IF NOT EXISTS `mobile_sync_queue` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `technician_id` int UNSIGNED NOT NULL,
  `data_type` varchar(50) NOT NULL,
  `data_payload` json NOT NULL,
  `sync_status` enum('pending','synced','failed') DEFAULT 'pending',
  `created_at` datetime DEFAULT NULL,
  `synced_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tech` (`technician_id`),
  KEY `idx_status` (`sync_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `mobile_work_orders`
--

DROP TABLE IF EXISTS `mobile_work_orders`;
CREATE TABLE IF NOT EXISTS `mobile_work_orders` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `technician_id` int UNSIGNED NOT NULL,
  `status` enum('assigned','in_progress','completed','on_hold') DEFAULT 'assigned',
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `actual_hours` decimal(5,2) DEFAULT NULL,
  `completion_notes` text,
  `signature_data` text,
  `offline_sync` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_wo` (`work_order_id`),
  KEY `idx_tech` (`technician_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `mobile_wo_parts_used`
--

DROP TABLE IF EXISTS `mobile_wo_parts_used`;
CREATE TABLE IF NOT EXISTS `mobile_wo_parts_used` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `mobile_wo_id` int UNSIGNED NOT NULL,
  `part_id` int UNSIGNED NOT NULL,
  `quantity_used` decimal(10,2) NOT NULL,
  `scanned_barcode` varchar(100) DEFAULT NULL,
  `used_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_mobile_wo` (`mobile_wo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `mobile_wo_photos`
--

DROP TABLE IF EXISTS `mobile_wo_photos`;
CREATE TABLE IF NOT EXISTS `mobile_wo_photos` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `mobile_wo_id` int UNSIGNED NOT NULL,
  `photo_type` enum('before','during','after','issue') NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `caption` text,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `uploaded_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_mobile_wo` (`mobile_wo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `mobile_wo_time_logs`
--

DROP TABLE IF EXISTS `mobile_wo_time_logs`;
CREATE TABLE IF NOT EXISTS `mobile_wo_time_logs` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `mobile_wo_id` int UNSIGNED NOT NULL,
  `technician_id` int UNSIGNED NOT NULL,
  `clock_in` datetime NOT NULL,
  `clock_out` datetime DEFAULT NULL,
  `duration_minutes` int DEFAULT NULL,
  `activity_type` enum('travel','diagnosis','repair','testing','documentation') NOT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `idx_mobile_wo` (`mobile_wo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `model_hotspots`
--

DROP TABLE IF EXISTS `model_hotspots`;
CREATE TABLE IF NOT EXISTS `model_hotspots` (
  `id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `model_id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `node_type` enum('machine','assembly','part','subpart') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `node_id` int NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `shape` enum('circle','rect','poly') COLLATE utf8mb4_unicode_520_ci DEFAULT 'circle',
  `coords` json DEFAULT NULL,
  `mesh_name` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `world_coords` json DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `x` decimal(10,6) DEFAULT NULL,
  `y` decimal(10,6) DEFAULT NULL,
  `z` decimal(10,6) DEFAULT NULL,
  `metadata_json` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_model_node` (`model_id`,`node_type`,`node_id`),
  KEY `idx_coordinates` (`x`,`y`,`z`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `model_layers`
--

DROP TABLE IF EXISTS `model_layers`;
CREATE TABLE IF NOT EXISTS `model_layers` (
  `id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `model_id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `layer_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `layer_order` int DEFAULT '0',
  `visible_default` tinyint(1) DEFAULT '1',
  `color` varchar(7) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `opacity` decimal(3,2) DEFAULT '1.00',
  `metadata_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_model_layer` (`model_id`,`layer_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `model_navigation_history`
--

DROP TABLE IF EXISTS `model_navigation_history`;
CREATE TABLE IF NOT EXISTS `model_navigation_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `model_id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `navigation_path` json DEFAULT NULL,
  `view_state` json DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_model` (`user_id`,`model_id`),
  KEY `idx_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `model_processing_jobs`
--

DROP TABLE IF EXISTS `model_processing_jobs`;
CREATE TABLE IF NOT EXISTS `model_processing_jobs` (
  `id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `model_id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `status` enum('pending','running','success','failed') COLLATE utf8mb4_unicode_520_ci DEFAULT 'pending',
  `logs` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_model_id` (`model_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `modules`
--

DROP TABLE IF EXISTS `modules`;
CREATE TABLE IF NOT EXISTS `modules` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci,
  `version` varchar(20) COLLATE utf8mb4_unicode_520_ci DEFAULT '2.0.0',
  `icon` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `route_prefix` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `is_core` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `activation_locked` tinyint(1) DEFAULT '0',
  `activated_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_licensed` tinyint(1) DEFAULT '0' COMMENT 'Vendor licensed this module',
  `licensed_at` datetime DEFAULT NULL COMMENT 'When vendor licensed',
  `licensed_by` int DEFAULT NULL COMMENT 'Vendor admin who licensed',
  `activated_by` int DEFAULT NULL COMMENT 'Company admin who activated',
  `display_name` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL COMMENT 'Display name for UI',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `module_activation_logs`
--

DROP TABLE IF EXISTS `module_activation_logs`;
CREATE TABLE IF NOT EXISTS `module_activation_logs` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `module_id` int UNSIGNED NOT NULL,
  `action` enum('licensed','unlicensed','activated','deactivated','locked','unlocked') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `performed_by` int UNSIGNED NOT NULL,
  `performed_by_name` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `performed_by_role` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_520_ci,
  `reason` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `module_id` (`module_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `module_permissions`
--

DROP TABLE IF EXISTS `module_permissions`;
CREATE TABLE IF NOT EXISTS `module_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL,
  `module_code` varchar(50) NOT NULL,
  `can_access` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_role_module` (`role_id`,`module_code`),
  KEY `idx_role_id` (`role_id`),
  KEY `idx_module_code` (`module_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `module_usage_logs`
--

DROP TABLE IF EXISTS `module_usage_logs`;
CREATE TABLE IF NOT EXISTS `module_usage_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `module_code` varchar(50) NOT NULL,
  `action` varchar(50) NOT NULL,
  `access_granted` tinyint(1) DEFAULT '0',
  `denial_reason` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `request_uri` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_module` (`module_code`),
  KEY `idx_user` (`user_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `monitoring_thresholds`
--

DROP TABLE IF EXISTS `monitoring_thresholds`;
CREATE TABLE IF NOT EXISTS `monitoring_thresholds` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` int UNSIGNED NOT NULL,
  `reading_type` varchar(50) NOT NULL,
  `warning_min` decimal(10,2) DEFAULT NULL,
  `warning_max` decimal(10,2) DEFAULT NULL,
  `critical_min` decimal(10,2) DEFAULT NULL,
  `critical_max` decimal(10,2) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_asset_type` (`asset_id`,`reading_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `mv_asset_health_summary`
--

DROP TABLE IF EXISTS `mv_asset_health_summary`;
CREATE TABLE IF NOT EXISTS `mv_asset_health_summary` (
  `asset_id` bigint UNSIGNED NOT NULL,
  `asset_name` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `asset_type` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `health_score` decimal(5,2) DEFAULT NULL,
  `open_work_orders` int DEFAULT '0',
  `overdue_work_orders` int DEFAULT '0',
  `last_maintenance_date` date DEFAULT NULL,
  `next_maintenance_date` date DEFAULT NULL,
  `mtbf_hours` decimal(10,2) DEFAULT NULL,
  `mttr_hours` decimal(10,2) DEFAULT NULL,
  `oee_percent` decimal(5,2) DEFAULT NULL,
  `total_downtime_hours` decimal(10,2) DEFAULT '0.00',
  `maintenance_cost_ytd` decimal(15,2) DEFAULT '0.00',
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`asset_id`),
  KEY `idx_health` (`health_score`),
  KEY `idx_status` (`status`),
  KEY `idx_type` (`asset_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `non_conformances`
--

DROP TABLE IF EXISTS `non_conformances`;
CREATE TABLE IF NOT EXISTS `non_conformances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nc_number` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `severity` enum('minor','major','critical') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `status` enum('open','investigating','resolved','closed') COLLATE utf8mb4_unicode_520_ci DEFAULT 'open',
  `asset_id` int DEFAULT NULL,
  `root_cause` text COLLATE utf8mb4_unicode_520_ci,
  `corrective_action` text COLLATE utf8mb4_unicode_520_ci,
  `preventive_action` text COLLATE utf8mb4_unicode_520_ci,
  `reported_by` int NOT NULL,
  `assigned_to` int DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nc_number` (`nc_number`),
  KEY `idx_status` (`status`),
  KEY `idx_severity` (`severity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `type` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `entity_id` int UNSIGNED DEFAULT NULL,
  `priority` enum('low','normal','high','urgent') COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'normal',
  `user_id` int UNSIGNED NOT NULL,
  `work_order_id` int UNSIGNED DEFAULT NULL,
  `pm_schedule_id` int UNSIGNED DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id_is_read` (`user_id`,`is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification_jobs`
--

DROP TABLE IF EXISTS `notification_jobs`;
CREATE TABLE IF NOT EXISTS `notification_jobs` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `channel` enum('in_app','email','sms') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `data` json NOT NULL,
  `status` enum('pending','processing','completed','failed') COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'pending',
  `attempts` int NOT NULL DEFAULT '0',
  `error` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` datetime DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `status_created_at` (`status`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `obsolete_parts`
--

DROP TABLE IF EXISTS `obsolete_parts`;
CREATE TABLE IF NOT EXISTS `obsolete_parts` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `part_id` int UNSIGNED NOT NULL,
  `reason` enum('no_usage','asset_retired','superseded','expired') NOT NULL,
  `last_used_date` datetime DEFAULT NULL,
  `quantity_on_hand` decimal(10,2) DEFAULT '0.00',
  `value` decimal(10,2) DEFAULT '0.00',
  `disposition` enum('scrap','sell','return','keep') DEFAULT NULL,
  `identified_date` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_part` (`part_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `oee_asset_targets`
--

DROP TABLE IF EXISTS `oee_asset_targets`;
CREATE TABLE IF NOT EXISTS `oee_asset_targets` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` int UNSIGNED NOT NULL,
  `target_oee` decimal(5,2) DEFAULT '85.00',
  `target_availability` decimal(5,2) DEFAULT '90.00',
  `target_performance` decimal(5,2) DEFAULT '95.00',
  `target_quality` decimal(5,2) DEFAULT '99.00',
  `ideal_cycle_time` decimal(10,2) DEFAULT NULL COMMENT 'seconds per unit',
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_id` (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `oee_downtime_events`
--

DROP TABLE IF EXISTS `oee_downtime_events`;
CREATE TABLE IF NOT EXISTS `oee_downtime_events` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` int UNSIGNED NOT NULL,
  `reason_code_id` int UNSIGNED NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `duration_minutes` int DEFAULT '0',
  `is_planned` tinyint(1) DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_520_ci,
  `reported_by` int UNSIGNED NOT NULL,
  `work_order_id` int UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int UNSIGNED DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_asset_time` (`asset_id`,`start_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `oee_downtime_reasons`
--

DROP TABLE IF EXISTS `oee_downtime_reasons`;
CREATE TABLE IF NOT EXISTS `oee_downtime_reasons` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` varchar(20) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `category` enum('mechanical','electrical','material','operator','quality','changeover','planned_maintenance','other') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `is_planned` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `oee_metrics`
--

DROP TABLE IF EXISTS `oee_metrics`;
CREATE TABLE IF NOT EXISTS `oee_metrics` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` int UNSIGNED NOT NULL,
  `shift_date` date NOT NULL,
  `shift_name` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `planned_production_time` int DEFAULT NULL COMMENT 'minutes',
  `downtime_minutes` int DEFAULT '0',
  `runtime_minutes` int DEFAULT '0',
  `ideal_cycle_time` decimal(10,2) DEFAULT NULL COMMENT 'seconds per unit',
  `total_pieces` int DEFAULT '0',
  `good_pieces` int DEFAULT '0',
  `rejected_pieces` int DEFAULT '0',
  `availability` decimal(5,2) DEFAULT NULL COMMENT 'percentage',
  `performance` decimal(5,2) DEFAULT NULL COMMENT 'percentage',
  `quality` decimal(5,2) DEFAULT NULL COMMENT 'percentage',
  `oee` decimal(5,2) DEFAULT NULL COMMENT 'percentage',
  `created_at` datetime DEFAULT NULL,
  `created_by` int UNSIGNED DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int UNSIGNED DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_asset_date` (`asset_id`,`shift_date`),
  KEY `idx_oee_date_asset_oee` (`shift_date`,`asset_id`,`oee`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `oee_production_counts`
--

DROP TABLE IF EXISTS `oee_production_counts`;
CREATE TABLE IF NOT EXISTS `oee_production_counts` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` int UNSIGNED NOT NULL,
  `timestamp` datetime NOT NULL,
  `good_count` int DEFAULT '0',
  `reject_count` int DEFAULT '0',
  `shift_name` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `operator_id` int UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_asset_time` (`asset_id`,`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `oee_records`
--

DROP TABLE IF EXISTS `oee_records`;
CREATE TABLE IF NOT EXISTS `oee_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `equipment_id` int NOT NULL,
  `equipment_type` enum('machine','assembly') DEFAULT 'machine',
  `target_oee` decimal(5,2) DEFAULT NULL,
  `availability_target` decimal(5,2) DEFAULT '90.00',
  `performance_target` decimal(5,2) DEFAULT '95.00',
  `quality_target` decimal(5,2) DEFAULT '99.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `operator_checklists`
--

DROP TABLE IF EXISTS `operator_checklists`;
CREATE TABLE IF NOT EXISTS `operator_checklists` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `checklist_code` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `machine_id` int NOT NULL,
  `operator_id` int NOT NULL,
  `date` date NOT NULL,
  `shift` enum('Day','Night','Swing') COLLATE utf8mb4_unicode_520_ci DEFAULT 'Day',
  `items` json NOT NULL,
  `score` int DEFAULT '0',
  `max_score` int DEFAULT '0',
  `pass_percentage` decimal(5,2) DEFAULT '0.00',
  `failed_items` json DEFAULT NULL,
  `comments` text COLLATE utf8mb4_unicode_520_ci,
  `corrective_actions` text COLLATE utf8mb4_unicode_520_ci,
  `attachments` json DEFAULT NULL,
  `signature` text COLLATE utf8mb4_unicode_520_ci,
  `gps_location` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `status` enum('Draft','Submitted','Reviewed','Failed') COLLATE utf8mb4_unicode_520_ci DEFAULT 'Draft',
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `checklist_code` (`checklist_code`),
  KEY `idx_machine_date` (`machine_id`,`date`,`shift`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `operator_groups`
--

DROP TABLE IF EXISTS `operator_groups`;
CREATE TABLE IF NOT EXISTS `operator_groups` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `operator_group_members`
--

DROP TABLE IF EXISTS `operator_group_members`;
CREATE TABLE IF NOT EXISTS `operator_group_members` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `group_id` (`group_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `operator_production_data`
--

DROP TABLE IF EXISTS `operator_production_data`;
CREATE TABLE IF NOT EXISTS `operator_production_data` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `target_id` int UNSIGNED NOT NULL,
  `operator_id` int UNSIGNED NOT NULL,
  `shift` enum('Morning','Afternoon','Night') COLLATE utf8mb4_general_ci NOT NULL,
  `entry_date` date NOT NULL,
  `break_mins` int NOT NULL DEFAULT '0',
  `repair_maint_mins` int NOT NULL DEFAULT '0',
  `input_delivery_mins` int NOT NULL DEFAULT '0',
  `change_over_mins` int NOT NULL DEFAULT '0',
  `startup_mins` int NOT NULL DEFAULT '0',
  `cleaning_mins` int NOT NULL DEFAULT '0',
  `others_mins` int NOT NULL DEFAULT '0',
  `preventive_maint_mins` int NOT NULL DEFAULT '0',
  `total_downtime_mins` int NOT NULL DEFAULT '0',
  `production_yards` decimal(10,2) NOT NULL DEFAULT '0.00',
  `productive_time_mins` int NOT NULL DEFAULT '0',
  `utilization_actual` decimal(5,2) NOT NULL DEFAULT '0.00',
  `speed_actual` decimal(10,2) NOT NULL DEFAULT '0.00',
  `productivity` decimal(5,2) NOT NULL DEFAULT '0.00',
  `efficiency` decimal(5,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `target_id` (`target_id`),
  KEY `operator_id` (`operator_id`),
  KEY `entry_date` (`entry_date`),
  KEY `shift` (`shift`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `parts`
--

DROP TABLE IF EXISTS `parts`;
CREATE TABLE IF NOT EXISTS `parts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `component_id` int NOT NULL,
  `parent_part_id` int DEFAULT NULL,
  `part_name` varchar(255) NOT NULL,
  `part_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `part_category` varchar(100) DEFAULT NULL,
  `part_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `unit_cost` decimal(10,2) DEFAULT '0.00',
  `quantity` int DEFAULT '1',
  `spare_availability` enum('yes','no') DEFAULT 'no',
  `status` enum('active','inactive','discontinued') DEFAULT 'active',
  `criticality` enum('low','medium','high') DEFAULT 'medium',
  `part_image` varchar(255) DEFAULT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `parts_optimization`
--

DROP TABLE IF EXISTS `parts_optimization`;
CREATE TABLE IF NOT EXISTS `parts_optimization` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `part_id` int UNSIGNED NOT NULL,
  `abc_classification` enum('A','B','C') DEFAULT NULL,
  `xyz_classification` enum('X','Y','Z') DEFAULT NULL,
  `annual_usage` decimal(10,2) DEFAULT '0.00',
  `annual_cost` decimal(12,2) DEFAULT '0.00',
  `lead_time_days` int DEFAULT '0',
  `eoq` decimal(10,2) DEFAULT NULL,
  `reorder_point` decimal(10,2) DEFAULT NULL,
  `safety_stock` decimal(10,2) DEFAULT NULL,
  `last_calculated` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_part` (`part_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `parts_reservations`
--

DROP TABLE IF EXISTS `parts_reservations`;
CREATE TABLE IF NOT EXISTS `parts_reservations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `plant_id` int DEFAULT NULL,
  `work_order_id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `part_id` int NOT NULL,
  `quantity_reserved` int NOT NULL,
  `quantity_issued` int DEFAULT '0',
  `reserved_by` int NOT NULL,
  `reserved_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('reserved','partial_issued','fully_issued','cancelled') COLLATE utf8mb4_unicode_520_ci DEFAULT 'reserved',
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `cancellation_reason` text COLLATE utf8mb4_unicode_520_ci,
  PRIMARY KEY (`id`),
  KEY `idx_plant_pr` (`plant_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `parts_usage_history`
--

DROP TABLE IF EXISTS `parts_usage_history`;
CREATE TABLE IF NOT EXISTS `parts_usage_history` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `part_id` int UNSIGNED NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `transaction_type` enum('issue','return','adjustment','purchase') NOT NULL,
  `work_order_id` int UNSIGNED DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT NULL,
  `transaction_date` datetime NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_part` (`part_id`),
  KEY `idx_date` (`transaction_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `part_geometry`
--

DROP TABLE IF EXISTS `part_geometry`;
CREATE TABLE IF NOT EXISTS `part_geometry` (
  `id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `part_id` int NOT NULL,
  `model_id` varchar(36) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `mesh_name` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `mapping_confidence` float DEFAULT '0',
  `material` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `color` varchar(7) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `texture_path` varchar(500) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `geometry_data` json DEFAULT NULL,
  `bounding_box` json DEFAULT NULL,
  `metadata_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_part_id` (`part_id`),
  KEY `idx_mesh_name` (`mesh_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `part_inventory_links`
--

DROP TABLE IF EXISTS `part_inventory_links`;
CREATE TABLE IF NOT EXISTS `part_inventory_links` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `part_id` int NOT NULL,
  `inventory_item_id` int UNSIGNED NOT NULL,
  `quantity_per_unit` decimal(10,3) DEFAULT '1.000',
  `is_primary` tinyint(1) DEFAULT '1',
  `substitute_priority` int DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_part_inventory` (`part_id`,`inventory_item_id`),
  KEY `idx_part_id` (`part_id`),
  KEY `idx_inventory_item_id` (`inventory_item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `part_media`
--

DROP TABLE IF EXISTS `part_media`;
CREATE TABLE IF NOT EXISTS `part_media` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `part_id` int UNSIGNED NOT NULL,
  `media_type` enum('image','diagram','3d_model','document') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `thumbnail_path` varchar(500) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `hotspot_data` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_part` (`part_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `part_pm_tasks`
--

DROP TABLE IF EXISTS `part_pm_tasks`;
CREATE TABLE IF NOT EXISTS `part_pm_tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `part_id` int NOT NULL,
  `pm_task_id` int NOT NULL,
  `frequency_value` int NOT NULL,
  `pm_trigger_id` int NOT NULL,
  `pm_type_id` int NOT NULL,
  `pm_mode_id` int NOT NULL,
  `estimated_duration` time NOT NULL,
  `pm_inspection_type_id` int NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_performed_date` datetime DEFAULT NULL,
  `next_due_date` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `pm_task_id` (`pm_task_id`),
  KEY `pm_trigger_id` (`pm_trigger_id`),
  KEY `pm_type_id` (`pm_type_id`),
  KEY `pm_mode_id` (`pm_mode_id`),
  KEY `pm_inspection_type_id` (`pm_inspection_type_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `password_resets`
--

DROP TABLE IF EXISTS `password_resets`;
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_token` (`token`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `permission_slug` varchar(100) NOT NULL,
  `permission_name` varchar(255) NOT NULL,
  `module` varchar(50) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permission_slug` (`permission_slug`),
  KEY `module` (`module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permission_audit_log`
--

DROP TABLE IF EXISTS `permission_audit_log`;
CREATE TABLE IF NOT EXISTS `permission_audit_log` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED DEFAULT NULL,
  `role_id` int UNSIGNED DEFAULT NULL,
  `permission_id` int UNSIGNED DEFAULT NULL,
  `action` enum('granted','revoked','modified') COLLATE utf8mb4_unicode_ci NOT NULL,
  `performed_by` int UNSIGNED DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `role_id` (`role_id`),
  KEY `permission_id` (`permission_id`),
  KEY `performed_by` (`performed_by`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permits_to_work`
--

DROP TABLE IF EXISTS `permits_to_work`;
CREATE TABLE IF NOT EXISTS `permits_to_work` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `permit_number` varchar(50) NOT NULL,
  `permit_type` enum('hot_work','confined_space','electrical','height','excavation','cold_work') NOT NULL,
  `work_order_id` int UNSIGNED DEFAULT NULL,
  `location` varchar(255) NOT NULL,
  `equipment_id` int UNSIGNED DEFAULT NULL,
  `work_description` text NOT NULL,
  `hazards_identified` text NOT NULL,
  `risk_level` enum('low','medium','high','critical') NOT NULL,
  `control_measures` text NOT NULL,
  `ppe_required` text NOT NULL,
  `emergency_procedures` text,
  `requested_by` int UNSIGNED NOT NULL,
  `supervisor_id` int UNSIGNED DEFAULT NULL,
  `safety_officer_id` int UNSIGNED DEFAULT NULL,
  `area_manager_id` int UNSIGNED DEFAULT NULL,
  `authorized_workers` json DEFAULT NULL,
  `valid_from` datetime NOT NULL,
  `valid_until` datetime NOT NULL,
  `extended` tinyint(1) DEFAULT '0',
  `work_started_at` datetime DEFAULT NULL,
  `work_completed_at` datetime DEFAULT NULL,
  `permit_closed_by` int UNSIGNED DEFAULT NULL,
  `permit_closed_at` datetime DEFAULT NULL,
  `pre_work_inspection` json DEFAULT NULL,
  `post_work_inspection` json DEFAULT NULL,
  `incidents_reported` text,
  `status` enum('draft','pending_approval','approved','active','suspended','completed','cancelled') DEFAULT 'draft',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permit_number` (`permit_number`),
  KEY `idx_permit_number` (`permit_number`),
  KEY `idx_status` (`status`),
  KEY `idx_valid_from` (`valid_from`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permit_approvals`
--

DROP TABLE IF EXISTS `permit_approvals`;
CREATE TABLE IF NOT EXISTS `permit_approvals` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `permit_id` int UNSIGNED NOT NULL,
  `approver_id` int UNSIGNED NOT NULL,
  `approval_level` enum('supervisor','safety_officer','area_manager','plant_manager') NOT NULL,
  `approved` tinyint(1) DEFAULT NULL,
  `comments` text,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_permit_id` (`permit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permit_extensions`
--

DROP TABLE IF EXISTS `permit_extensions`;
CREATE TABLE IF NOT EXISTS `permit_extensions` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `permit_id` int UNSIGNED NOT NULL,
  `extended_by` int UNSIGNED NOT NULL,
  `reason` text NOT NULL,
  `previous_valid_until` datetime NOT NULL,
  `new_valid_until` datetime NOT NULL,
  `approved_by` int UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_permit_id` (`permit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `plants`
--

DROP TABLE IF EXISTS `plants`;
CREATE TABLE IF NOT EXISTS `plants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plant_code` varchar(20) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `plant_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `country` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `timezone` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT 'Africa/Accra',
  `manager_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `plant_code` (`plant_code`),
  KEY `idx_active` (`is_active`),
  KEY `idx_code` (`plant_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pm_checklists`
--

DROP TABLE IF EXISTS `pm_checklists`;
CREATE TABLE IF NOT EXISTS `pm_checklists` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `pm_template_id` int UNSIGNED NOT NULL,
  `checklist_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pm_template_id` (`pm_template_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pm_checklist_items`
--

DROP TABLE IF EXISTS `pm_checklist_items`;
CREATE TABLE IF NOT EXISTS `pm_checklist_items` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `pm_checklist_id` int UNSIGNED NOT NULL,
  `parent_id` int UNSIGNED DEFAULT NULL,
  `item_type` enum('text','yesno','numeric','passfail','photo','signature','group') COLLATE utf8mb4_general_ci NOT NULL,
  `item_text` text COLLATE utf8mb4_general_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_required` tinyint(1) NOT NULL DEFAULT '1',
  `reference_image` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pm_checklist_id` (`pm_checklist_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pm_execution_parameters`
--

DROP TABLE IF EXISTS `pm_execution_parameters`;
CREATE TABLE IF NOT EXISTS `pm_execution_parameters` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pm_work_order_id` int NOT NULL,
  `parameter_name` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `parameter_value` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `parameter_unit` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `expected_value` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `status` enum('normal','warning','critical') COLLATE utf8mb4_unicode_520_ci DEFAULT 'normal',
  `notes` text COLLATE utf8mb4_unicode_520_ci,
  `recorded_by` int NOT NULL,
  `recorded_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `pm_work_order_id` (`pm_work_order_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pm_history`
--

DROP TABLE IF EXISTS `pm_history`;
CREATE TABLE IF NOT EXISTS `pm_history` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `pm_schedule_id` bigint UNSIGNED NOT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_520_ci,
  `performed_by` bigint UNSIGNED DEFAULT NULL,
  `performed_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_schedule` (`pm_schedule_id`),
  KEY `idx_performed_at` (`performed_at`),
  KEY `idx_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pm_inspection_types`
--

DROP TABLE IF EXISTS `pm_inspection_types`;
CREATE TABLE IF NOT EXISTS `pm_inspection_types` (
  `inspection_id` int NOT NULL AUTO_INCREMENT,
  `inspection_name` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `inspection_description` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`inspection_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pm_meter_triggers`
--

DROP TABLE IF EXISTS `pm_meter_triggers`;
CREATE TABLE IF NOT EXISTS `pm_meter_triggers` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `pm_schedule_id` int UNSIGNED NOT NULL,
  `meter_id` int UNSIGNED NOT NULL,
  `trigger_value` int NOT NULL,
  `last_reading` int DEFAULT NULL,
  `last_wo_generated_at` datetime DEFAULT NULL,
  `active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pm_modes`
--

DROP TABLE IF EXISTS `pm_modes`;
CREATE TABLE IF NOT EXISTS `pm_modes` (
  `mode_id` int NOT NULL AUTO_INCREMENT,
  `mode_name` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `mode_description` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`mode_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pm_notifications`
--

DROP TABLE IF EXISTS `pm_notifications`;
CREATE TABLE IF NOT EXISTS `pm_notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `notification_type` enum('due_soon','overdue','assigned','completed') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `part_pm_task_id` int NOT NULL,
  `pm_work_order_id` int DEFAULT NULL,
  `recipient_role` enum('admin','planner','technician') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `recipient_user_id` int DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `read_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `part_pm_task_id` (`part_pm_task_id`),
  KEY `pm_work_order_id` (`pm_work_order_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pm_required_spares`
--

DROP TABLE IF EXISTS `pm_required_spares`;
CREATE TABLE IF NOT EXISTS `pm_required_spares` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `pm_template_id` int UNSIGNED NOT NULL,
  `part_number` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `part_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `quantity_required` int NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pm_template_id` (`pm_template_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pm_rules`
--

DROP TABLE IF EXISTS `pm_rules`;
CREATE TABLE IF NOT EXISTS `pm_rules` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `rule_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `asset_id` int UNSIGNED NOT NULL,
  `trigger_type` enum('time','meter','condition') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `frequency_value` int NOT NULL,
  `frequency_unit` enum('days','weeks','months','years','hours','cycles') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `meter_id` int UNSIGNED DEFAULT NULL,
  `meter_threshold` decimal(15,2) DEFAULT NULL,
  `default_checklist` json DEFAULT NULL,
  `lead_time_days` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `interval_usage` decimal(15,2) DEFAULT NULL,
  `default_planner_id` bigint DEFAULT NULL,
  `last_pm_reading` decimal(15,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `asset_id` (`asset_id`),
  KEY `meter_id` (`meter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pm_schedule`
--

DROP TABLE IF EXISTS `pm_schedule`;
CREATE TABLE IF NOT EXISTS `pm_schedule` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `pm_template_id` int UNSIGNED NOT NULL,
  `asset_node_id` int UNSIGNED NOT NULL,
  `next_due_date` datetime NOT NULL,
  `last_completed` datetime DEFAULT NULL,
  `status` enum('scheduled','due','overdue','completed') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'scheduled',
  `work_order_id` int UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pm_template_id` (`pm_template_id`),
  KEY `next_due_date` (`next_due_date`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pm_schedules`
--

DROP TABLE IF EXISTS `pm_schedules`;
CREATE TABLE IF NOT EXISTS `pm_schedules` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `plant_id` int DEFAULT NULL,
  `pm_rule_id` int UNSIGNED NOT NULL,
  `asset_id` int UNSIGNED NOT NULL,
  `scheduled_date` date NOT NULL,
  `due_date` date NOT NULL,
  `completed_date` date DEFAULT NULL,
  `status` enum('scheduled','due','overdue','completed','skipped') COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'scheduled',
  `work_order_id` int UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `next_due_usage` decimal(15,2) DEFAULT NULL,
  `created_usage_snapshot` decimal(15,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pm_schedules_pm_rule_id_foreign` (`pm_rule_id`),
  KEY `asset_id_due_date` (`asset_id`,`due_date`),
  KEY `status` (`status`),
  KEY `idx_pm_status_date` (`status`,`due_date`),
  KEY `idx_pm_asset` (`asset_id`,`status`),
  KEY `idx_pm_asset_status` (`asset_id`,`status`),
  KEY `idx_plant_pm` (`plant_id`),
  KEY `idx_pm_plant` (`plant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pm_tasks`
--

DROP TABLE IF EXISTS `pm_tasks`;
CREATE TABLE IF NOT EXISTS `pm_tasks` (
  `task_id` int NOT NULL AUTO_INCREMENT,
  `task_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `task_description` text COLLATE utf8mb4_unicode_520_ci,
  `task_category` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`task_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pm_task_materials`
--

DROP TABLE IF EXISTS `pm_task_materials`;
CREATE TABLE IF NOT EXISTS `pm_task_materials` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `pm_task_id` int NOT NULL,
  `part_id` int DEFAULT NULL,
  `inventory_item_id` int UNSIGNED NOT NULL,
  `planned_quantity` decimal(10,3) NOT NULL DEFAULT '1.000',
  `is_critical` tinyint(1) DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `part_id` (`part_id`),
  KEY `inventory_item_id` (`inventory_item_id`),
  KEY `idx_pm_task` (`pm_task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pm_templates`
--

DROP TABLE IF EXISTS `pm_templates`;
CREATE TABLE IF NOT EXISTS `pm_templates` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `pm_code` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `pm_title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `asset_node_id` int UNSIGNED NOT NULL,
  `maintenance_type` enum('pm','lubrication','inspection','calibration','cleaning') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pm',
  `priority` enum('low','medium','high','critical') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'medium',
  `estimated_duration` int NOT NULL COMMENT 'Minutes',
  `technician_group` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `required_tools` json DEFAULT NULL,
  `safety_instructions` text COLLATE utf8mb4_general_ci,
  `status` enum('active','inactive') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'active',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pm_code` (`pm_code`),
  KEY `asset_node_id` (`asset_node_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pm_triggers`
--

DROP TABLE IF EXISTS `pm_triggers`;
CREATE TABLE IF NOT EXISTS `pm_triggers` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `pm_template_id` int UNSIGNED NOT NULL,
  `trigger_type` enum('time','usage','event','condition') COLLATE utf8mb4_general_ci NOT NULL,
  `trigger_subtype` varchar(50) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'days, hours, cycles, etc',
  `trigger_value` decimal(15,2) NOT NULL,
  `trigger_config` json DEFAULT NULL COMMENT 'Cron, fixed dates, etc',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pm_template_id` (`pm_template_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pm_trigger_types`
--

DROP TABLE IF EXISTS `pm_trigger_types`;
CREATE TABLE IF NOT EXISTS `pm_trigger_types` (
  `trigger_id` int NOT NULL AUTO_INCREMENT,
  `trigger_name` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `trigger_description` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`trigger_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pm_types`
--

DROP TABLE IF EXISTS `pm_types`;
CREATE TABLE IF NOT EXISTS `pm_types` (
  `type_id` int NOT NULL AUTO_INCREMENT,
  `type_name` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `type_description` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`type_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pm_usage_triggers`
--

DROP TABLE IF EXISTS `pm_usage_triggers`;
CREATE TABLE IF NOT EXISTS `pm_usage_triggers` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `machine_id` int UNSIGNED NOT NULL,
  `pm_template_id` int UNSIGNED NOT NULL,
  `trigger_type` enum('units','cycles','hours') COLLATE utf8mb4_unicode_520_ci DEFAULT 'units',
  `threshold_value` int NOT NULL,
  `current_value` int DEFAULT '0',
  `last_pm_date` date DEFAULT NULL,
  `next_pm_due` date DEFAULT NULL,
  `status` enum('active','triggered','completed') COLLATE utf8mb4_unicode_520_ci DEFAULT 'active',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_machine_id` (`machine_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `predictive_health_scores`
--

DROP TABLE IF EXISTS `predictive_health_scores`;
CREATE TABLE IF NOT EXISTS `predictive_health_scores` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` int UNSIGNED DEFAULT NULL,
  `health_score` decimal(5,2) DEFAULT NULL,
  `failure_probability` decimal(5,2) DEFAULT NULL,
  `remaining_useful_life` int DEFAULT NULL,
  `risk_level` enum('low','medium','high','critical') COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `prediction_date` datetime DEFAULT NULL,
  `factors` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `asset_id` (`asset_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `predictive_maintenance_inspections`
--

DROP TABLE IF EXISTS `predictive_maintenance_inspections`;
CREATE TABLE IF NOT EXISTS `predictive_maintenance_inspections` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` int UNSIGNED NOT NULL,
  `inspection_type` enum('vibration','temperature','oil_analysis','visual','ultrasonic') NOT NULL,
  `reading_value` decimal(10,2) DEFAULT NULL,
  `threshold_warning` decimal(10,2) DEFAULT NULL,
  `threshold_critical` decimal(10,2) DEFAULT NULL,
  `status` enum('normal','warning','critical') NOT NULL,
  `inspector_id` int UNSIGNED NOT NULL,
  `inspection_date` datetime NOT NULL,
  `next_inspection_date` date DEFAULT NULL,
  `notes` text,
  `work_order_generated` tinyint(1) DEFAULT '0',
  `work_order_id` int UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_next_inspection` (`next_inspection_date`),
  KEY `idx_asset` (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `production`
--

DROP TABLE IF EXISTS `production`;
CREATE TABLE IF NOT EXISTS `production` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `production_order` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `product_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `quantity` int NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('planned','in-progress','completed') COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'planned',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `production_data_summary`
--

DROP TABLE IF EXISTS `production_data_summary`;
CREATE TABLE IF NOT EXISTS `production_data_summary` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_center` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `report_date` date NOT NULL,
  `total_time_available_mins` int NOT NULL,
  `total_downtime_mins` int NOT NULL,
  `productive_time_mins` int NOT NULL,
  `production_morning` decimal(10,2) NOT NULL DEFAULT '0.00',
  `production_afternoon` decimal(10,2) NOT NULL DEFAULT '0.00',
  `production_night` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_production_yards` decimal(10,2) NOT NULL DEFAULT '0.00',
  `target_yards` decimal(10,2) NOT NULL DEFAULT '0.00',
  `utilization_actual` decimal(5,2) NOT NULL,
  `utilization_standard` decimal(5,2) NOT NULL,
  `speed_actual` decimal(10,2) NOT NULL,
  `speed_standard` decimal(10,2) NOT NULL,
  `productivity` decimal(5,2) NOT NULL,
  `efficiency` decimal(5,2) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `report_date` (`report_date`),
  KEY `work_center_code` (`work_center`,`code`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `production_lines`
--

DROP TABLE IF EXISTS `production_lines`;
CREATE TABLE IF NOT EXISTS `production_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `area_id` int NOT NULL,
  `line_code` varchar(10) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `line_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `capacity_per_hour` decimal(10,2) DEFAULT NULL,
  `operator_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_area_line` (`area_id`,`line_code`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `production_loss_rates`
--

DROP TABLE IF EXISTS `production_loss_rates`;
CREATE TABLE IF NOT EXISTS `production_loss_rates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_id` int NOT NULL,
  `loss_rate_per_minute` decimal(15,2) NOT NULL,
  `currency_code` char(3) COLLATE utf8mb4_unicode_520_ci DEFAULT 'GHS',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `production_runs`
--

DROP TABLE IF EXISTS `production_runs`;
CREATE TABLE IF NOT EXISTS `production_runs` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `plant_id` int DEFAULT '1',
  `batch_no` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `product_id` int UNSIGNED NOT NULL,
  `asset_id` int UNSIGNED DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `produced_qty` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `batch_no` (`batch_no`),
  KEY `idx_production_plant` (`plant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `production_schedules`
--

DROP TABLE IF EXISTS `production_schedules`;
CREATE TABLE IF NOT EXISTS `production_schedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `schedule_code` varchar(50) NOT NULL,
  `schedule_name` varchar(255) NOT NULL,
  `planned_start_date` datetime NOT NULL,
  `planned_end_date` datetime NOT NULL,
  `status` enum('planned','in_progress','completed','cancelled') DEFAULT 'planned',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `schedule_code` (`schedule_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `production_surveys`
--

DROP TABLE IF EXISTS `production_surveys`;
CREATE TABLE IF NOT EXISTS `production_surveys` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `plant_id` int DEFAULT NULL,
  `operator_id` int UNSIGNED DEFAULT NULL,
  `run_id` bigint DEFAULT NULL,
  `asset_id` bigint NOT NULL,
  `inspector_id` bigint NOT NULL,
  `shift_id` bigint DEFAULT NULL,
  `produced_qty` decimal(12,2) DEFAULT '0.00',
  `runtime_hours` decimal(8,2) DEFAULT '0.00',
  `cycles` int DEFAULT '0',
  `additional_metrics` json DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_520_ci,
  `copy_in_ci_project_path` varchar(1024) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `units_produced` int DEFAULT '0',
  `cycles_completed` int DEFAULT '0',
  `trigger_pm_check` tinyint(1) DEFAULT '0',
  `safety_incident` tinyint(1) DEFAULT '0',
  `safety_incident_type` enum('near_miss','injury','spill','equipment_damage','other') COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `safety_notes` text COLLATE utf8mb4_unicode_520_ci,
  `ppe_compliant` tinyint(1) DEFAULT '1',
  `loto_verified` tinyint(1) DEFAULT '0',
  `environmental_incident` tinyint(1) DEFAULT '0',
  `first_article_pass` tinyint(1) DEFAULT NULL,
  `quality_hold` tinyint(1) DEFAULT '0',
  `scrap_quantity` int DEFAULT '0',
  `scrap_reason` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `rework_quantity` int DEFAULT '0',
  `batch_number` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `lot_number` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `customer_complaint_ref` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `tools_changed` json DEFAULT NULL,
  `consumables_used` json DEFAULT NULL,
  `tool_life_alerts` json DEFAULT NULL,
  `cost_per_unit` decimal(10,2) DEFAULT '0.00',
  `operator_certification` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `skill_level` enum('trainee','competent','expert') COLLATE utf8mb4_unicode_520_ci DEFAULT 'competent',
  `certification_expiry` date DEFAULT NULL,
  `supervisor_override` tinyint(1) DEFAULT '0',
  `multi_operator_handoff` tinyint(1) DEFAULT '0',
  `power_consumption_kwh` decimal(10,2) DEFAULT '0.00',
  `compressed_air_m3` decimal(10,2) DEFAULT '0.00',
  `water_consumption_liters` decimal(10,2) DEFAULT '0.00',
  `gas_consumption_m3` decimal(10,2) DEFAULT '0.00',
  `carbon_footprint_kg` decimal(10,2) DEFAULT '0.00',
  `energy_cost` decimal(10,2) DEFAULT '0.00',
  `setup_start_time` time DEFAULT NULL,
  `setup_end_time` time DEFAULT NULL,
  `changeover_duration_minutes` int DEFAULT '0',
  `previous_job` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `next_job` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `setup_approved_by` int DEFAULT NULL,
  `tooling_changeover_notes` text COLLATE utf8mb4_unicode_520_ci,
  `target_units` int DEFAULT '0',
  `target_cycle_time_seconds` int DEFAULT '0',
  `actual_cycle_time_seconds` int DEFAULT '0',
  `efficiency_percent` decimal(5,2) DEFAULT '0.00',
  `variance_percent` decimal(5,2) DEFAULT '0.00',
  `bonus_eligible` tinyint(1) DEFAULT '0',
  `offline_created` tinyint(1) DEFAULT '0',
  `sync_status` enum('synced','pending','conflict') COLLATE utf8mb4_unicode_520_ci DEFAULT 'synced',
  `device_id` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `gps_latitude` decimal(10,8) DEFAULT NULL,
  `gps_longitude` decimal(11,8) DEFAULT NULL,
  `photo_attachments` json DEFAULT NULL,
  `voice_notes` json DEFAULT NULL,
  `requires_operator_signature` tinyint(1) DEFAULT '0',
  `requires_supervisor_signature` tinyint(1) DEFAULT '0',
  `operator_signed_at` timestamp NULL DEFAULT NULL,
  `supervisor_signed_at` timestamp NULL DEFAULT NULL,
  `signature_compliance_level` enum('none','basic','fda_21cfr11') COLLATE utf8mb4_unicode_520_ci DEFAULT 'basic',
  `template_id` int DEFAULT NULL,
  `auto_assigned` tinyint(1) DEFAULT '0',
  `escalation_level` int DEFAULT '0',
  `escalated_at` timestamp NULL DEFAULT NULL,
  `capa_required` tinyint(1) DEFAULT '0',
  `capa_count` int DEFAULT '0',
  `schedule_id` int DEFAULT NULL,
  `is_scheduled` tinyint(1) DEFAULT '0',
  `mes_integrated` tinyint(1) DEFAULT '0',
  `mes_data_source` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `auto_populate_enabled` tinyint(1) DEFAULT '0',
  `language_code` varchar(10) COLLATE utf8mb4_unicode_520_ci DEFAULT 'en',
  PRIMARY KEY (`id`),
  KEY `asset_id` (`asset_id`),
  KEY `inspector_id` (`inspector_id`),
  KEY `shift_id` (`shift_id`),
  KEY `idx_template` (`template_id`),
  KEY `idx_schedule` (`schedule_id`),
  KEY `idx_plant_ps` (`plant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `production_survey_attachments`
--

DROP TABLE IF EXISTS `production_survey_attachments`;
CREATE TABLE IF NOT EXISTS `production_survey_attachments` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `survey_id` int UNSIGNED NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `thumbnail_path` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `file_type` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `file_size` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_survey_id` (`survey_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `production_targets`
--

DROP TABLE IF EXISTS `production_targets`;
CREATE TABLE IF NOT EXISTS `production_targets` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `plant_id` int UNSIGNED DEFAULT NULL,
  `work_center` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `machine_id` int UNSIGNED NOT NULL,
  `target_date` date NOT NULL,
  `units_per_day` int DEFAULT NULL,
  `hours_per_unit_shift` decimal(10,2) DEFAULT NULL,
  `target_per_machine` int DEFAULT NULL,
  `total_time_available_mins` int NOT NULL,
  `utilization_standard_percent` decimal(5,2) DEFAULT '85.00',
  `speed_standard_yds_per_min` decimal(10,2) DEFAULT '50.00',
  `created_by` int UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `machine_id` (`machine_id`),
  KEY `target_date` (`target_date`),
  KEY `idx_targets_plant` (`plant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `po_number` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `vendor_id` int UNSIGNED NOT NULL,
  `po_date` date NOT NULL,
  `expected_delivery` date DEFAULT NULL,
  `status` enum('draft','submitted','approved','received','cancelled') COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'draft',
  `total_amount` decimal(12,2) NOT NULL,
  `requested_by` int UNSIGNED NOT NULL,
  `approved_by` int UNSIGNED DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `po_number` (`po_number`),
  KEY `vendor_id_status` (`vendor_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `push_tokens`
--

DROP TABLE IF EXISTS `push_tokens`;
CREATE TABLE IF NOT EXISTS `push_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token` varchar(500) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `device_type` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT 'web',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quality_inspections`
--

DROP TABLE IF EXISTS `quality_inspections`;
CREATE TABLE IF NOT EXISTS `quality_inspections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `inspection_number` varchar(50) NOT NULL,
  `inspection_type` enum('incoming','in_process','final','audit') DEFAULT 'in_process',
  `inspection_date` datetime NOT NULL,
  `result` enum('pass','fail','pending') DEFAULT 'pending',
  `status` enum('open','closed') DEFAULT 'open',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inspection_number` (`inspection_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rca_5whys`
--

DROP TABLE IF EXISTS `rca_5whys`;
CREATE TABLE IF NOT EXISTS `rca_5whys` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` int UNSIGNED NOT NULL,
  `problem_statement` text COLLATE utf8mb4_general_ci NOT NULL,
  `why1` text COLLATE utf8mb4_general_ci,
  `why2` text COLLATE utf8mb4_general_ci,
  `why3` text COLLATE utf8mb4_general_ci,
  `why4` text COLLATE utf8mb4_general_ci,
  `why5` text COLLATE utf8mb4_general_ci,
  `root_cause` text COLLATE utf8mb4_general_ci,
  `created_by` int UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_asset_id` (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rca_fishbone`
--

DROP TABLE IF EXISTS `rca_fishbone`;
CREATE TABLE IF NOT EXISTS `rca_fishbone` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` int UNSIGNED NOT NULL,
  `problem_statement` text COLLATE utf8mb4_general_ci NOT NULL,
  `people` json DEFAULT NULL,
  `process` json DEFAULT NULL,
  `equipment` json DEFAULT NULL,
  `materials` json DEFAULT NULL,
  `environment` json DEFAULT NULL,
  `management` json DEFAULT NULL,
  `created_by` int UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_asset_id` (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rcm_analysis`
--

DROP TABLE IF EXISTS `rcm_analysis`;
CREATE TABLE IF NOT EXISTS `rcm_analysis` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` int UNSIGNED NOT NULL,
  `function_description` text NOT NULL,
  `functional_failure` text NOT NULL,
  `failure_mode` text NOT NULL,
  `failure_effect` text NOT NULL,
  `failure_consequence` enum('safety','environmental','operational','non-operational') NOT NULL,
  `recommended_strategy` enum('predictive','preventive','corrective','detective','redesign') NOT NULL,
  `current_strategy` varchar(100) DEFAULT NULL,
  `cost_benefit_ratio` decimal(5,2) DEFAULT NULL,
  `status` enum('draft','review','approved','implemented') DEFAULT 'draft',
  `created_by` int UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_asset` (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rcm_assessments`
--

DROP TABLE IF EXISTS `rcm_assessments`;
CREATE TABLE IF NOT EXISTS `rcm_assessments` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` int UNSIGNED NOT NULL,
  `safety_score` int NOT NULL,
  `production_score` int NOT NULL,
  `quality_score` int NOT NULL,
  `environmental_score` int NOT NULL,
  `cost_score` int NOT NULL,
  `total_score` int NOT NULL,
  `criticality_level` enum('critical','high','medium','low') COLLATE utf8mb4_general_ci NOT NULL,
  `maintenance_strategy` enum('predictive','preventive','corrective') COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_asset_id` (`asset_id`),
  KEY `idx_criticality` (`criticality_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `recurring_work_orders`
--

DROP TABLE IF EXISTS `recurring_work_orders`;
CREATE TABLE IF NOT EXISTS `recurring_work_orders` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `template_id` int UNSIGNED DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `machine_id` int UNSIGNED DEFAULT NULL,
  `department_id` int UNSIGNED NOT NULL,
  `assigned_to` int UNSIGNED DEFAULT NULL,
  `frequency` enum('daily','weekly','biweekly','monthly','quarterly','semiannual','annual') DEFAULT 'monthly',
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `next_due_date` date NOT NULL,
  `last_generated` datetime DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `priority` enum('low','medium','high','critical') DEFAULT 'medium',
  `type` enum('breakdown','preventive','corrective','inspection','project') DEFAULT 'preventive',
  `estimated_hours` decimal(10,2) DEFAULT NULL,
  `created_by` int UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `next_due_date` (`next_due_date`),
  KEY `is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reliability_metrics`
--

DROP TABLE IF EXISTS `reliability_metrics`;
CREATE TABLE IF NOT EXISTS `reliability_metrics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `machine_id` int NOT NULL,
  `mtbf_target` decimal(10,2) DEFAULT NULL,
  `mttr_target` decimal(10,2) DEFAULT NULL,
  `mtbf_actual` decimal(10,2) DEFAULT '0.00',
  `mttr_actual` decimal(10,2) DEFAULT '0.00',
  `failure_count` int DEFAULT '0',
  `total_downtime_hours` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `report_definitions`
--

DROP TABLE IF EXISTS `report_definitions`;
CREATE TABLE IF NOT EXISTS `report_definitions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `report_code` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `report_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `report_category` enum('operations','engineering','financial','executive') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci,
  `sql_query` longtext COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `parameters` json DEFAULT NULL,
  `output_formats` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `report_code` (`report_code`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `report_execution_log`
--

DROP TABLE IF EXISTS `report_execution_log`;
CREATE TABLE IF NOT EXISTS `report_execution_log` (
  `id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `report_definition_id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `scheduled_report_id` varchar(36) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `execution_type` enum('manual','scheduled') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `parameters` json DEFAULT NULL,
  `output_format` varchar(10) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `execution_status` enum('running','completed','failed') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `execution_time_ms` int DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_520_ci,
  `executed_by` int DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `resource_availability`
--

DROP TABLE IF EXISTS `resource_availability`;
CREATE TABLE IF NOT EXISTS `resource_availability` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `date` date NOT NULL,
  `available_hours` decimal(5,2) DEFAULT '8.00',
  `scheduled_hours` decimal(5,2) DEFAULT '0.00',
  `is_available` tinyint(1) DEFAULT '1',
  `notes` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_date` (`user_id`,`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `risk_assessments`
--

DROP TABLE IF EXISTS `risk_assessments`;
CREATE TABLE IF NOT EXISTS `risk_assessments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `assessment_code` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `machine_id` int NOT NULL,
  `work_order_id` int DEFAULT NULL,
  `assessed_by` int NOT NULL,
  `assessment_date` date NOT NULL,
  `task_description` text COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `task_type` enum('Preventive','Corrective','Breakdown','Installation','Inspection') COLLATE utf8mb4_unicode_520_ci DEFAULT 'Preventive',
  `location` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `hazard_list` json NOT NULL,
  `risk_matrix` json DEFAULT NULL,
  `overall_risk_score` int DEFAULT '0',
  `risk_level` enum('Low','Medium','High','Critical') COLLATE utf8mb4_unicode_520_ci DEFAULT 'Low',
  `mitigations` json DEFAULT NULL,
  `ppe_required` json DEFAULT NULL,
  `permits_required` json DEFAULT NULL,
  `emergency_procedures` text COLLATE utf8mb4_unicode_520_ci,
  `team_members` json DEFAULT NULL,
  `training_required` text COLLATE utf8mb4_unicode_520_ci,
  `attachments` json DEFAULT NULL,
  `status` enum('Draft','Submitted','Approved','Rejected','Closed') COLLATE utf8mb4_unicode_520_ci DEFAULT 'Draft',
  `accepted_by` int DEFAULT NULL,
  `accepted_at` datetime DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejection_reason` text COLLATE utf8mb4_unicode_520_ci,
  `closed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `assessment_code` (`assessment_code`),
  KEY `idx_machine` (`machine_id`),
  KEY `idx_risk_level` (`risk_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `risk_control_measures`
--

DROP TABLE IF EXISTS `risk_control_measures`;
CREATE TABLE IF NOT EXISTS `risk_control_measures` (
  `id` int NOT NULL AUTO_INCREMENT,
  `assessment_id` bigint NOT NULL,
  `measure_text` text COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `measure_type` enum('Engineering','Administrative','PPE','Training') COLLATE utf8mb4_unicode_520_ci DEFAULT 'Engineering',
  `owner` int NOT NULL,
  `due_date` date NOT NULL,
  `priority` enum('Low','Medium','High','Critical') COLLATE utf8mb4_unicode_520_ci DEFAULT 'Medium',
  `status` enum('Pending','InProgress','Completed','Verified') COLLATE utf8mb4_unicode_520_ci DEFAULT 'Pending',
  `completed_at` datetime DEFAULT NULL,
  `verified_by` int DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_assessment` (`assessment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `risk_snapshots`
--

DROP TABLE IF EXISTS `risk_snapshots`;
CREATE TABLE IF NOT EXISTS `risk_snapshots` (
  `id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `date` date NOT NULL,
  `plant_risk_index` int NOT NULL,
  `risk_level` enum('low','medium','high','critical') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `total_backlog` int NOT NULL,
  `critical_count` int NOT NULL,
  `overdue_count` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `date` (`date`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
CREATE TABLE IF NOT EXISTS `roles` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` int UNSIGNED NOT NULL,
  `permission_id` int UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `role_id` (`role_id`),
  KEY `permission_id` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `root_cause_analysis`
--

DROP TABLE IF EXISTS `root_cause_analysis`;
CREATE TABLE IF NOT EXISTS `root_cause_analysis` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `failure_report_id` int UNSIGNED DEFAULT NULL,
  `analysis_method` enum('5 Whys','Fishbone','Fault Tree','FMEA','Other') COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `root_cause_category` enum('Human Error','Equipment','Process','Material','Environment','Design','Maintenance') COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `root_cause_description` text COLLATE utf8mb4_unicode_520_ci,
  `contributing_factors` text COLLATE utf8mb4_unicode_520_ci,
  `analysis_data` json DEFAULT NULL,
  `analyzed_by` int UNSIGNED DEFAULT NULL,
  `analysis_date` datetime DEFAULT NULL,
  `verified_by` int UNSIGNED DEFAULT NULL,
  `verification_date` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `failure_report_id` (`failure_report_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rwop_approvals`
--

DROP TABLE IF EXISTS `rwop_approvals`;
CREATE TABLE IF NOT EXISTS `rwop_approvals` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `entity_type` enum('maintenance_request','work_order') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `entity_id` int UNSIGNED NOT NULL,
  `approval_type` enum('standard','cost_threshold','safety','shutdown') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `required_approver_role` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `approver_user_id` int UNSIGNED DEFAULT NULL,
  `approval_status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_520_ci DEFAULT 'pending',
  `approval_notes` text COLLATE utf8mb4_unicode_520_ci,
  `approved_at` datetime DEFAULT NULL,
  `sequence_order` int DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_entity` (`entity_type`,`entity_id`),
  KEY `idx_status` (`approval_status`),
  KEY `idx_approver` (`approver_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci COMMENT='Approval tracking log';

-- --------------------------------------------------------

--
-- Table structure for table `rwop_approval_matrix`
--

DROP TABLE IF EXISTS `rwop_approval_matrix`;
CREATE TABLE IF NOT EXISTS `rwop_approval_matrix` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `entity_type` enum('maintenance_request','work_order') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `approval_type` enum('standard','cost_threshold','safety','shutdown') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `priority_level` varchar(20) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL COMMENT 'Applies to specific priority',
  `cost_threshold_min` decimal(12,2) DEFAULT NULL,
  `cost_threshold_max` decimal(12,2) DEFAULT NULL,
  `required_approver_role` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `approval_sequence` int DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_entity_type` (`entity_type`,`approval_type`),
  KEY `idx_cost_threshold` (`cost_threshold_min`,`cost_threshold_max`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci COMMENT='Configurable approval matrix';

-- --------------------------------------------------------

--
-- Table structure for table `rwop_cost_adjustments`
--

DROP TABLE IF EXISTS `rwop_cost_adjustments`;
CREATE TABLE IF NOT EXISTS `rwop_cost_adjustments` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `adjustment_type` enum('labor','material','contractor','overhead') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `original_amount` decimal(12,2) NOT NULL,
  `adjusted_amount` decimal(12,2) NOT NULL,
  `adjustment_delta` decimal(12,2) NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `approved_by` int UNSIGNED NOT NULL,
  `adjusted_by` int UNSIGNED NOT NULL,
  `adjusted_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_work_order` (`work_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rwop_domain_events`
--

DROP TABLE IF EXISTS `rwop_domain_events`;
CREATE TABLE IF NOT EXISTS `rwop_domain_events` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_type` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `entity_type` enum('maintenance_request','work_order') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `entity_id` int UNSIGNED NOT NULL,
  `event_data` json NOT NULL,
  `triggered_by` int UNSIGNED NOT NULL,
  `triggered_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `processed` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_processed` (`processed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rwop_event_types`
--

DROP TABLE IF EXISTS `rwop_event_types`;
CREATE TABLE IF NOT EXISTS `rwop_event_types` (
  `event_type` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `entity_type` enum('maintenance_request','work_order') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci,
  `consumers` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rwop_failure_causes`
--

DROP TABLE IF EXISTS `rwop_failure_causes`;
CREATE TABLE IF NOT EXISTS `rwop_failure_causes` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` varchar(20) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `category` enum('wear','fatigue','corrosion','contamination','misalignment','overload','design','installation','maintenance','operation') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci COMMENT='Failure cause taxonomy';

-- --------------------------------------------------------

--
-- Table structure for table `rwop_failure_modes`
--

DROP TABLE IF EXISTS `rwop_failure_modes`;
CREATE TABLE IF NOT EXISTS `rwop_failure_modes` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` varchar(20) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `category` enum('mechanical','electrical','hydraulic','pneumatic','instrumentation','software','process','operator') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci COMMENT='Failure mode taxonomy';

-- --------------------------------------------------------

--
-- Table structure for table `rwop_failure_remedies`
--

DROP TABLE IF EXISTS `rwop_failure_remedies`;
CREATE TABLE IF NOT EXISTS `rwop_failure_remedies` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` varchar(20) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `category` enum('repair','replace','adjust','clean','lubricate','calibrate','redesign','upgrade') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci COMMENT='Failure remedy taxonomy';

-- --------------------------------------------------------

--
-- Table structure for table `rwop_mr_status_enum`
--

DROP TABLE IF EXISTS `rwop_mr_status_enum`;
CREATE TABLE IF NOT EXISTS `rwop_mr_status_enum` (
  `status_code` varchar(20) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `status_name` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `sequence_order` int NOT NULL,
  `is_terminal` tinyint(1) DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_520_ci,
  PRIMARY KEY (`status_code`),
  UNIQUE KEY `uk_sequence` (`sequence_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci COMMENT='Maintenance request status state machine';

-- --------------------------------------------------------

--
-- Table structure for table `rwop_status_transitions`
--

DROP TABLE IF EXISTS `rwop_status_transitions`;
CREATE TABLE IF NOT EXISTS `rwop_status_transitions` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `entity_type` enum('maintenance_request','work_order') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `from_status` varchar(20) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `to_status` varchar(20) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `requires_approval` tinyint(1) DEFAULT '0',
  `requires_reason` tinyint(1) DEFAULT '0',
  `allowed_roles` json DEFAULT NULL COMMENT 'Array of role codes allowed to make this transition',
  `validation_rules` json DEFAULT NULL COMMENT 'Additional validation requirements',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_transition` (`entity_type`,`from_status`,`to_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci COMMENT='Valid status transitions and rules';

-- --------------------------------------------------------

--
-- Table structure for table `rwop_verification_templates`
--

DROP TABLE IF EXISTS `rwop_verification_templates`;
CREATE TABLE IF NOT EXISTS `rwop_verification_templates` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `wo_type` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL COMMENT 'Applies to specific WO type',
  `checklist_items` json NOT NULL COMMENT 'Array of checklist items',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci COMMENT='Verification checklist templates';

-- --------------------------------------------------------

--
-- Table structure for table `rwop_wo_failure_analysis`
--

DROP TABLE IF EXISTS `rwop_wo_failure_analysis`;
CREATE TABLE IF NOT EXISTS `rwop_wo_failure_analysis` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `failure_mode_id` int UNSIGNED NOT NULL,
  `failure_cause_id` int UNSIGNED NOT NULL,
  `failure_remedy_id` int UNSIGNED NOT NULL,
  `failure_classification` enum('random','wear_out','infant_mortality','systematic') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `failure_severity` enum('minor','moderate','major','critical') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `failure_description` text COLLATE utf8mb4_unicode_520_ci,
  `root_cause_analysis` text COLLATE utf8mb4_unicode_520_ci,
  `corrective_action` text COLLATE utf8mb4_unicode_520_ci,
  `preventive_action` text COLLATE utf8mb4_unicode_520_ci,
  `is_primary` tinyint(1) DEFAULT '1',
  `analyzed_by` int UNSIGNED NOT NULL,
  `analyzed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `failure_mode_id` (`failure_mode_id`),
  KEY `failure_cause_id` (`failure_cause_id`),
  KEY `failure_remedy_id` (`failure_remedy_id`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_classification` (`failure_classification`),
  KEY `idx_severity` (`failure_severity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci COMMENT='Structured failure analysis';

-- --------------------------------------------------------

--
-- Table structure for table `rwop_wo_kpi_snapshots`
--

DROP TABLE IF EXISTS `rwop_wo_kpi_snapshots`;
CREATE TABLE IF NOT EXISTS `rwop_wo_kpi_snapshots` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `plant_id` int UNSIGNED NOT NULL,
  `asset_id` int UNSIGNED NOT NULL,
  `wo_type` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `priority` varchar(20) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `closed_at` datetime NOT NULL,
  `response_time_minutes` int DEFAULT NULL,
  `resolution_time_minutes` int DEFAULT NULL,
  `mttr_hours` decimal(10,2) DEFAULT NULL,
  `mtta_hours` decimal(10,2) DEFAULT NULL,
  `sla_met` tinyint(1) DEFAULT NULL,
  `final_total_cost` decimal(12,2) DEFAULT '0.00',
  `downtime_minutes` int DEFAULT '0',
  `first_time_fix` tinyint(1) DEFAULT '1',
  `verification_passed` tinyint(1) DEFAULT NULL,
  `snapshot_created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `snapshot_created_by` int UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `work_order_id` (`work_order_id`),
  KEY `idx_plant_asset` (`plant_id`,`asset_id`),
  KEY `idx_closed_at` (`closed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rwop_wo_status_enum`
--

DROP TABLE IF EXISTS `rwop_wo_status_enum`;
CREATE TABLE IF NOT EXISTS `rwop_wo_status_enum` (
  `status_code` varchar(20) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `status_name` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `sequence_order` int NOT NULL,
  `is_terminal` tinyint(1) DEFAULT '0',
  `requires_verification` tinyint(1) DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_520_ci,
  PRIMARY KEY (`status_code`),
  UNIQUE KEY `uk_sequence` (`sequence_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci COMMENT='Work order status state machine';

-- --------------------------------------------------------

--
-- Table structure for table `rwop_wo_verifications`
--

DROP TABLE IF EXISTS `rwop_wo_verifications`;
CREATE TABLE IF NOT EXISTS `rwop_wo_verifications` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `verified_by` int UNSIGNED NOT NULL,
  `verification_status` enum('passed','failed','conditional') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `verification_notes` text COLLATE utf8mb4_unicode_520_ci,
  `checklist_results` json DEFAULT NULL COMMENT 'Checklist item results',
  `rejection_reason` text COLLATE utf8mb4_unicode_520_ci,
  `verified_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `reopened_at` datetime DEFAULT NULL,
  `reopened_by` int UNSIGNED DEFAULT NULL,
  `reopen_reason` text COLLATE utf8mb4_unicode_520_ci,
  PRIMARY KEY (`id`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_status` (`verification_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci COMMENT='Work order verification records';

-- --------------------------------------------------------

--
-- Table structure for table `scheduled_reports`
--

DROP TABLE IF EXISTS `scheduled_reports`;
CREATE TABLE IF NOT EXISTS `scheduled_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `report_type` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `frequency` enum('daily','weekly','monthly') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `format` enum('pdf','excel','csv') COLLATE utf8mb4_unicode_520_ci DEFAULT 'pdf',
  `recipients` json NOT NULL,
  `filters` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_run` datetime DEFAULT NULL,
  `next_run` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `shifts`
--

DROP TABLE IF EXISTS `shifts`;
CREATE TABLE IF NOT EXISTS `shifts` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `plant_id` int DEFAULT '1',
  `shift_code` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `dept_id` int UNSIGNED DEFAULT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `created_by` int UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `facility_id` int DEFAULT NULL,
  `is_active` enum('yes','no') COLLATE utf8mb4_unicode_520_ci DEFAULT 'yes',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shift_code` (`shift_code`),
  KEY `idx_shifts_plant` (`plant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `shift_assignments`
--

DROP TABLE IF EXISTS `shift_assignments`;
CREATE TABLE IF NOT EXISTS `shift_assignments` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `shift_id` int UNSIGNED NOT NULL,
  `department_id` int UNSIGNED DEFAULT NULL,
  `machine_id` int UNSIGNED DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_shift` (`shift_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `shift_handovers`
--

DROP TABLE IF EXISTS `shift_handovers`;
CREATE TABLE IF NOT EXISTS `shift_handovers` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `handover_number` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `survey_id` int UNSIGNED NOT NULL,
  `handover_notes` text COLLATE utf8mb4_unicode_520_ci,
  `issues_reported` text COLLATE utf8mb4_unicode_520_ci,
  `pending_tasks` text COLLATE utf8mb4_unicode_520_ci,
  `machine_condition` text COLLATE utf8mb4_unicode_520_ci,
  `special_instructions` text COLLATE utf8mb4_unicode_520_ci,
  `next_shift_actions` text COLLATE utf8mb4_unicode_520_ci,
  `acknowledged_by` int UNSIGNED DEFAULT NULL,
  `acknowledged_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `status` enum('draft','submitted','acknowledged','completed') COLLATE utf8mb4_unicode_520_ci DEFAULT 'draft',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `handover_number` (`handover_number`),
  KEY `idx_survey_id` (`survey_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `shutdown_events`
--

DROP TABLE IF EXISTS `shutdown_events`;
CREATE TABLE IF NOT EXISTS `shutdown_events` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_name` varchar(255) NOT NULL,
  `event_type` enum('planned_shutdown','turnaround','overhaul') NOT NULL,
  `facility_id` int UNSIGNED DEFAULT NULL,
  `planned_start_date` date NOT NULL,
  `planned_end_date` date NOT NULL,
  `actual_start_date` date DEFAULT NULL,
  `actual_end_date` date DEFAULT NULL,
  `status` enum('planning','approved','in_progress','completed','cancelled') DEFAULT 'planning',
  `budget` decimal(15,2) DEFAULT NULL,
  `actual_cost` decimal(15,2) DEFAULT NULL,
  `coordinator_id` int UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_dates` (`planned_start_date`,`planned_end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `shutdown_work_orders`
--

DROP TABLE IF EXISTS `shutdown_work_orders`;
CREATE TABLE IF NOT EXISTS `shutdown_work_orders` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `shutdown_event_id` int UNSIGNED NOT NULL,
  `work_order_id` int UNSIGNED NOT NULL,
  `sequence_order` int DEFAULT NULL,
  `critical_path` tinyint(1) DEFAULT '0',
  `dependencies` json DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_shutdown` (`shutdown_event_id`,`sequence_order`),
  KEY `idx_critical` (`critical_path`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `skills`
--

DROP TABLE IF EXISTS `skills`;
CREATE TABLE IF NOT EXISTS `skills` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `category` enum('mechanical','electrical','hydraulic','pneumatic','plc','welding','quality','safety','other') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `category_id` int DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci,
  `required_for_role` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `skill_categories`
--

DROP TABLE IF EXISTS `skill_categories`;
CREATE TABLE IF NOT EXISTS `skill_categories` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sla_definitions`
--

DROP TABLE IF EXISTS `sla_definitions`;
CREATE TABLE IF NOT EXISTS `sla_definitions` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `priority` enum('low','medium','high','urgent') NOT NULL,
  `order_type` enum('preventive','corrective','breakdown','inspection','modification','calibration') NOT NULL,
  `response_time_hours` int NOT NULL,
  `resolution_time_hours` int NOT NULL,
  `escalation_level_1_hours` int DEFAULT NULL,
  `escalation_level_2_hours` int DEFAULT NULL,
  `escalation_level_3_hours` int DEFAULT NULL,
  `active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_priority_type` (`priority`,`order_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sla_escalations`
--

DROP TABLE IF EXISTS `sla_escalations`;
CREATE TABLE IF NOT EXISTS `sla_escalations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `work_order_id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `escalation_level` int NOT NULL,
  `triggered_by` int NOT NULL,
  `triggered_at` timestamp NOT NULL,
  `alert_type` enum('supervisor','manager','executive') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `acknowledged_by` int DEFAULT NULL,
  `acknowledged_at` timestamp NULL DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_transactions`
--

DROP TABLE IF EXISTS `stock_transactions`;
CREATE TABLE IF NOT EXISTS `stock_transactions` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `inventory_item_id` int UNSIGNED NOT NULL,
  `transaction_type` enum('receipt','issue','adjustment','transfer','return') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `quantity` decimal(15,2) NOT NULL,
  `unit_cost` decimal(10,2) DEFAULT NULL,
  `reference_type` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `transaction_date` datetime NOT NULL,
  `performed_by` int UNSIGNED NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inventory_item_id_transaction_date` (`inventory_item_id`,`transaction_date`),
  KEY `reference_type_reference_id` (`reference_type`,`reference_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sub_parts`
--

DROP TABLE IF EXISTS `sub_parts`;
CREATE TABLE IF NOT EXISTS `sub_parts` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `part_id` int UNSIGNED NOT NULL,
  `sub_part_number` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `sub_part_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `part_id` (`part_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_alerts`
--

DROP TABLE IF EXISTS `survey_alerts`;
CREATE TABLE IF NOT EXISTS `survey_alerts` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `survey_id` int UNSIGNED NOT NULL,
  `rule_id` int UNSIGNED NOT NULL,
  `alert_message` text COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `severity` enum('low','medium','high','critical') COLLATE utf8mb4_unicode_520_ci DEFAULT 'medium',
  `acknowledged` tinyint(1) DEFAULT '0',
  `acknowledged_by` int UNSIGNED DEFAULT NULL,
  `acknowledged_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_survey_id` (`survey_id`),
  KEY `idx_acknowledged` (`acknowledged`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_alert_rules`
--

DROP TABLE IF EXISTS `survey_alert_rules`;
CREATE TABLE IF NOT EXISTS `survey_alert_rules` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `rule_name` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `alert_type` enum('defects','downtime','production','quality','safety') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `threshold_value` decimal(10,2) NOT NULL,
  `comparison` enum('greater_than','less_than','equals') COLLATE utf8mb4_unicode_520_ci DEFAULT 'greater_than',
  `notification_method` enum('email','sms','system','all') COLLATE utf8mb4_unicode_520_ci DEFAULT 'system',
  `recipients` json DEFAULT NULL,
  `active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_alert_type` (`alert_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_analytics_cache`
--

DROP TABLE IF EXISTS `survey_analytics_cache`;
CREATE TABLE IF NOT EXISTS `survey_analytics_cache` (
  `cache_id` int NOT NULL AUTO_INCREMENT,
  `metric_type` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `dimension` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `time_period` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `metric_data` json NOT NULL,
  `calculated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NOT NULL,
  PRIMARY KEY (`cache_id`),
  KEY `idx_metric_type` (`metric_type`),
  KEY `idx_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_anomalies`
--

DROP TABLE IF EXISTS `survey_anomalies`;
CREATE TABLE IF NOT EXISTS `survey_anomalies` (
  `anomaly_id` int NOT NULL AUTO_INCREMENT,
  `survey_id` int NOT NULL,
  `anomaly_type` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `field_name` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `expected_value` decimal(12,2) DEFAULT NULL,
  `actual_value` decimal(12,2) DEFAULT NULL,
  `deviation_percent` decimal(5,2) DEFAULT NULL,
  `severity` enum('low','medium','high') COLLATE utf8mb4_unicode_520_ci DEFAULT 'medium',
  `ml_confidence` decimal(5,4) DEFAULT NULL,
  `detected_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `acknowledged_by` int DEFAULT NULL,
  `acknowledged_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`anomaly_id`),
  KEY `idx_survey_anomaly` (`survey_id`),
  KEY `idx_detected` (`detected_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_audit_trail`
--

DROP TABLE IF EXISTS `survey_audit_trail`;
CREATE TABLE IF NOT EXISTS `survey_audit_trail` (
  `audit_id` bigint NOT NULL AUTO_INCREMENT,
  `survey_id` int NOT NULL,
  `user_id` int NOT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `field_name` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `old_value` text COLLATE utf8mb4_unicode_520_ci,
  `new_value` text COLLATE utf8mb4_unicode_520_ci,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `session_id` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`audit_id`),
  KEY `idx_survey_audit` (`survey_id`),
  KEY `idx_user_audit` (`user_id`),
  KEY `idx_action_audit` (`action`),
  KEY `idx_created_audit` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_batch_operations`
--

DROP TABLE IF EXISTS `survey_batch_operations`;
CREATE TABLE IF NOT EXISTS `survey_batch_operations` (
  `batch_id` int NOT NULL AUTO_INCREMENT,
  `operation_type` enum('approve','reject','export','update','delete') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `survey_ids` json NOT NULL,
  `parameters` json DEFAULT NULL,
  `initiated_by` int NOT NULL,
  `status` enum('pending','processing','completed','failed') COLLATE utf8mb4_unicode_520_ci DEFAULT 'pending',
  `total_count` int NOT NULL,
  `processed_count` int DEFAULT '0',
  `success_count` int DEFAULT '0',
  `failed_count` int DEFAULT '0',
  `error_log` json DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`batch_id`),
  KEY `idx_batch_status` (`status`),
  KEY `idx_batch_user` (`initiated_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_bi_exports`
--

DROP TABLE IF EXISTS `survey_bi_exports`;
CREATE TABLE IF NOT EXISTS `survey_bi_exports` (
  `export_id` int NOT NULL AUTO_INCREMENT,
  `export_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `bi_system` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `query_config` json NOT NULL,
  `schedule_frequency` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `last_export_at` timestamp NULL DEFAULT NULL,
  `next_export_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`export_id`),
  KEY `idx_bi_active` (`is_active`),
  KEY `idx_next_export` (`next_export_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_capa`
--

DROP TABLE IF EXISTS `survey_capa`;
CREATE TABLE IF NOT EXISTS `survey_capa` (
  `capa_id` int NOT NULL AUTO_INCREMENT,
  `capa_code` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `survey_id` int NOT NULL,
  `capa_type` enum('corrective','preventive') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `issue_description` text COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `root_cause` text COLLATE utf8mb4_unicode_520_ci,
  `action_plan` text COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `responsible_user_id` int NOT NULL,
  `due_date` date NOT NULL,
  `status` enum('open','in_progress','completed','verified','closed') COLLATE utf8mb4_unicode_520_ci DEFAULT 'open',
  `priority` enum('low','medium','high','critical') COLLATE utf8mb4_unicode_520_ci DEFAULT 'medium',
  `cost_estimate` decimal(12,2) DEFAULT NULL,
  `actual_cost` decimal(12,2) DEFAULT NULL,
  `effectiveness_check` text COLLATE utf8mb4_unicode_520_ci,
  `completed_at` timestamp NULL DEFAULT NULL,
  `verified_by` int DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`capa_id`),
  UNIQUE KEY `capa_code` (`capa_code`),
  KEY `idx_survey_capa` (`survey_id`),
  KEY `idx_status_capa` (`status`),
  KEY `idx_due_date` (`due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_comparisons`
--

DROP TABLE IF EXISTS `survey_comparisons`;
CREATE TABLE IF NOT EXISTS `survey_comparisons` (
  `comparison_id` int NOT NULL AUTO_INCREMENT,
  `comparison_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `survey_ids` json NOT NULL,
  `comparison_type` enum('side_by_side','trend','benchmark') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `metrics` json NOT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`comparison_id`),
  KEY `idx_comparison_user` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_mes_integration`
--

DROP TABLE IF EXISTS `survey_mes_integration`;
CREATE TABLE IF NOT EXISTS `survey_mes_integration` (
  `integration_id` int NOT NULL AUTO_INCREMENT,
  `survey_id` int NOT NULL,
  `mes_system` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `data_source` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `field_mappings` json NOT NULL,
  `sync_status` enum('pending','synced','failed') COLLATE utf8mb4_unicode_520_ci DEFAULT 'pending',
  `synced_data` json DEFAULT NULL,
  `last_sync_at` timestamp NULL DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_520_ci,
  PRIMARY KEY (`integration_id`),
  KEY `idx_survey_mes` (`survey_id`),
  KEY `idx_sync_status` (`sync_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_reminders`
--

DROP TABLE IF EXISTS `survey_reminders`;
CREATE TABLE IF NOT EXISTS `survey_reminders` (
  `reminder_id` int NOT NULL AUTO_INCREMENT,
  `survey_id` int NOT NULL,
  `user_id` int NOT NULL,
  `reminder_type` enum('overdue','due_soon','scheduled') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`reminder_id`),
  KEY `idx_survey_reminder` (`survey_id`),
  KEY `idx_user_reminder` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_schedules`
--

DROP TABLE IF EXISTS `survey_schedules`;
CREATE TABLE IF NOT EXISTS `survey_schedules` (
  `schedule_id` int NOT NULL AUTO_INCREMENT,
  `schedule_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `template_id` int DEFAULT NULL,
  `machine_id` int DEFAULT NULL,
  `shift_id` int DEFAULT NULL,
  `frequency` enum('daily','weekly','monthly','per_shift','custom') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `frequency_value` int DEFAULT '1',
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `auto_create` tinyint(1) DEFAULT '1',
  `auto_assign_user_id` int DEFAULT NULL,
  `reminder_hours` int DEFAULT '2',
  `is_active` tinyint(1) DEFAULT '1',
  `last_generated_at` timestamp NULL DEFAULT NULL,
  `next_generation_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`schedule_id`),
  KEY `idx_schedule_active` (`is_active`),
  KEY `idx_next_gen` (`next_generation_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_signatures`
--

DROP TABLE IF EXISTS `survey_signatures`;
CREATE TABLE IF NOT EXISTS `survey_signatures` (
  `signature_id` int NOT NULL AUTO_INCREMENT,
  `survey_id` int NOT NULL,
  `user_id` int NOT NULL,
  `signature_type` enum('operator','supervisor','manager','quality') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `signature_data` text COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `signature_method` enum('drawn','typed','uploaded','biometric') COLLATE utf8mb4_unicode_520_ci DEFAULT 'drawn',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `device_info` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `signed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_valid` tinyint(1) DEFAULT '1',
  `invalidated_at` timestamp NULL DEFAULT NULL,
  `invalidated_by` int DEFAULT NULL,
  `invalidation_reason` text COLLATE utf8mb4_unicode_520_ci,
  PRIMARY KEY (`signature_id`),
  KEY `idx_survey_sig` (`survey_id`),
  KEY `idx_user_sig` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_templates`
--

DROP TABLE IF EXISTS `survey_templates`;
CREATE TABLE IF NOT EXISTS `survey_templates` (
  `template_id` int NOT NULL AUTO_INCREMENT,
  `template_code` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `template_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci,
  `machine_type` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `template_data` json NOT NULL,
  `field_config` json DEFAULT NULL,
  `validation_rules` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `version` int DEFAULT '1',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`template_id`),
  UNIQUE KEY `template_code` (`template_code`),
  KEY `idx_template_active` (`is_active`),
  KEY `idx_template_machine` (`machine_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_translations`
--

DROP TABLE IF EXISTS `survey_translations`;
CREATE TABLE IF NOT EXISTS `survey_translations` (
  `translation_id` int NOT NULL AUTO_INCREMENT,
  `entity_type` enum('template','field','instruction','alert') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `entity_id` int NOT NULL,
  `field_name` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `language_code` varchar(10) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `translated_text` text COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`translation_id`),
  UNIQUE KEY `unique_translation` (`entity_type`,`entity_id`,`field_name`,`language_code`),
  KEY `idx_entity` (`entity_type`,`entity_id`),
  KEY `idx_language` (`language_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_workflow_history`
--

DROP TABLE IF EXISTS `survey_workflow_history`;
CREATE TABLE IF NOT EXISTS `survey_workflow_history` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `survey_id` int NOT NULL,
  `rule_id` int DEFAULT NULL,
  `action_type` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `from_status` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `to_status` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `from_user_id` int DEFAULT NULL,
  `to_user_id` int DEFAULT NULL,
  `automated` tinyint(1) DEFAULT '0',
  `metadata` json DEFAULT NULL,
  `executed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`),
  KEY `idx_survey_workflow` (`survey_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_workflow_rules`
--

DROP TABLE IF EXISTS `survey_workflow_rules`;
CREATE TABLE IF NOT EXISTS `survey_workflow_rules` (
  `rule_id` int NOT NULL AUTO_INCREMENT,
  `rule_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `rule_type` enum('auto_assign','auto_escalate','auto_approve','conditional_routing') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `conditions` json NOT NULL,
  `actions` json NOT NULL,
  `priority` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`rule_id`),
  KEY `idx_rule_type` (`rule_type`,`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_modules`
--

DROP TABLE IF EXISTS `system_modules`;
CREATE TABLE IF NOT EXISTS `system_modules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module_code` varchar(50) NOT NULL,
  `module_name` varchar(100) NOT NULL,
  `description` text,
  `is_enabled` tinyint(1) DEFAULT '1',
  `license_key` varchar(255) DEFAULT NULL,
  `license_expires_at` datetime DEFAULT NULL,
  `max_users` int DEFAULT '0',
  `max_plants` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `module_code` (`module_code`),
  KEY `idx_module_code` (`module_code`),
  KEY `idx_is_enabled` (`is_enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `setting_value` text COLLATE utf8mb4_unicode_520_ci,
  `setting_type` enum('string','integer','decimal','boolean','json') COLLATE utf8mb4_unicode_520_ci DEFAULT 'string',
  `category` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_public` enum('yes','no') COLLATE utf8mb4_unicode_520_ci DEFAULT 'no',
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `technician_groups`
--

DROP TABLE IF EXISTS `technician_groups`;
CREATE TABLE IF NOT EXISTS `technician_groups` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `group_name` varchar(100) NOT NULL,
  `group_code` varchar(50) DEFAULT NULL,
  `department_id` int UNSIGNED DEFAULT NULL,
  `group_leader_id` int UNSIGNED NOT NULL,
  `description` text,
  `specialization` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `group_code` (`group_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `technician_group_members`
--

DROP TABLE IF EXISTS `technician_group_members`;
CREATE TABLE IF NOT EXISTS `technician_group_members` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `group_id` int UNSIGNED NOT NULL,
  `technician_id` int UNSIGNED NOT NULL,
  `role` varchar(50) DEFAULT 'member',
  `joined_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_group_member` (`group_id`,`technician_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `technician_rate_cards`
--

DROP TABLE IF EXISTS `technician_rate_cards`;
CREATE TABLE IF NOT EXISTS `technician_rate_cards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `hourly_rate` decimal(10,2) NOT NULL,
  `overtime_multiplier` decimal(3,2) DEFAULT '1.50',
  `shift_premium` decimal(10,2) DEFAULT '0.00',
  `currency_code` char(3) COLLATE utf8mb4_unicode_520_ci DEFAULT 'GHS',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `technician_skills`
--

DROP TABLE IF EXISTS `technician_skills`;
CREATE TABLE IF NOT EXISTS `technician_skills` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `technician_id` int UNSIGNED NOT NULL,
  `skill_name` varchar(100) NOT NULL,
  `proficiency_level` enum('beginner','intermediate','advanced','expert') NOT NULL,
  `certified` tinyint(1) DEFAULT '0',
  `certification_date` date DEFAULT NULL,
  `certification_expiry` date DEFAULT NULL,
  `years_experience` decimal(4,2) DEFAULT '0.00',
  `verified_by` int UNSIGNED DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tech_skill` (`technician_id`,`skill_name`),
  KEY `idx_skill` (`skill_name`),
  KEY `idx_proficiency` (`proficiency_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `technician_time_logs`
--

DROP TABLE IF EXISTS `technician_time_logs`;
CREATE TABLE IF NOT EXISTS `technician_time_logs` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `technician_id` int UNSIGNED NOT NULL,
  `clock_in` datetime NOT NULL,
  `clock_out` datetime DEFAULT NULL,
  `break_duration` int DEFAULT '0' COMMENT 'minutes',
  `actual_hours` decimal(10,2) DEFAULT NULL,
  `activity_description` text COLLATE utf8mb4_general_ci,
  `work_type` enum('diagnosis','repair','testing','documentation','other') COLLATE utf8mb4_general_ci DEFAULT 'repair',
  `location` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_overtime` tinyint(1) DEFAULT '0',
  `status` enum('active','paused','completed') COLLATE utf8mb4_general_ci DEFAULT 'active',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_work_order_tech` (`work_order_id`,`technician_id`),
  KEY `idx_clock_in` (`clock_in`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tools`
--

DROP TABLE IF EXISTS `tools`;
CREATE TABLE IF NOT EXISTS `tools` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `plant_id` int UNSIGNED NOT NULL,
  `tool_code` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `tool_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `serial_number` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_calibrated` tinyint(1) NOT NULL DEFAULT '0',
  `calibration_due_date` date DEFAULT NULL,
  `condition_status` enum('GOOD','FAIR','DAMAGED','UNDER_REPAIR') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'GOOD',
  `availability_status` enum('AVAILABLE','RESERVED','ISSUED','MAINTENANCE') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'AVAILABLE',
  `location` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `replacement_cost` decimal(10,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `plant_id_tool_code` (`plant_id`,`tool_code`),
  KEY `plant_id` (`plant_id`),
  KEY `tool_code` (`tool_code`),
  KEY `availability_status` (`availability_status`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tool_assignments`
--

DROP TABLE IF EXISTS `tool_assignments`;
CREATE TABLE IF NOT EXISTS `tool_assignments` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `tool_id` int UNSIGNED NOT NULL,
  `work_order_id` int UNSIGNED NOT NULL,
  `assigned_to_user_id` int UNSIGNED DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `assigned_at` datetime DEFAULT NULL,
  `returned_at` datetime DEFAULT NULL,
  `status` enum('required','assigned','in_use','returned','damaged') DEFAULT 'required',
  `condition_on_return` enum('excellent','good','fair','poor','damaged') DEFAULT NULL,
  `notes` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tool_id` (`tool_id`),
  KEY `work_order_id` (`work_order_id`),
  KEY `assigned_to_user_id` (`assigned_to_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tool_issue_logs`
--

DROP TABLE IF EXISTS `tool_issue_logs`;
CREATE TABLE IF NOT EXISTS `tool_issue_logs` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `plant_id` int UNSIGNED NOT NULL,
  `tool_request_id` int UNSIGNED NOT NULL,
  `tool_request_item_id` int UNSIGNED DEFAULT NULL,
  `tool_id` int UNSIGNED DEFAULT NULL,
  `quantity` int DEFAULT '1',
  `issued_by` int UNSIGNED NOT NULL,
  `issued_to` int UNSIGNED NOT NULL,
  `issue_date` timestamp NOT NULL,
  `return_received_by` int UNSIGNED DEFAULT NULL,
  `return_date` timestamp NULL DEFAULT NULL,
  `condition_on_issue` enum('GOOD','FAIR','DAMAGED','UNDER_MAINTENANCE','NOT_AVAILABLE') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'GOOD',
  `issue_notes` text COLLATE utf8mb4_general_ci,
  `condition_on_return` enum('GOOD','DAMAGED','LOST') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `damage_notes` text COLLATE utf8mb4_general_ci,
  `penalty_cost` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tool_issue_logs_issued_by_foreign` (`issued_by`),
  KEY `tool_issue_logs_issued_to_foreign` (`issued_to`),
  KEY `plant_id` (`plant_id`),
  KEY `tool_request_id` (`tool_request_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tool_maintenance_records`
--

DROP TABLE IF EXISTS `tool_maintenance_records`;
CREATE TABLE IF NOT EXISTS `tool_maintenance_records` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `schedule_id` int UNSIGNED NOT NULL,
  `tool_id` int UNSIGNED NOT NULL,
  `maintenance_date` date NOT NULL,
  `performed_by` int UNSIGNED NOT NULL,
  `maintenance_type` enum('CALIBRATION','INSPECTION','REPAIR','REPLACEMENT','CLEANING') COLLATE utf8mb4_general_ci NOT NULL,
  `status` enum('COMPLETED','FAILED','PARTIAL') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'COMPLETED',
  `notes` text COLLATE utf8mb4_general_ci,
  `cost` decimal(10,2) DEFAULT NULL,
  `next_due_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_schedule_id` (`schedule_id`),
  KEY `idx_tool_id` (`tool_id`),
  KEY `idx_maintenance_date` (`maintenance_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tool_maintenance_schedules`
--

DROP TABLE IF EXISTS `tool_maintenance_schedules`;
CREATE TABLE IF NOT EXISTS `tool_maintenance_schedules` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `tool_id` int UNSIGNED NOT NULL,
  `maintenance_type` enum('CALIBRATION','INSPECTION','REPAIR','REPLACEMENT','CLEANING') COLLATE utf8mb4_general_ci NOT NULL,
  `frequency_days` int NOT NULL,
  `last_maintenance_date` date DEFAULT NULL,
  `next_due_date` date NOT NULL,
  `assigned_to` int UNSIGNED DEFAULT NULL,
  `instructions` text COLLATE utf8mb4_general_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tool_id` (`tool_id`),
  KEY `idx_next_due_date` (`next_due_date`),
  KEY `idx_maintenance_type` (`maintenance_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `training_records`
--

DROP TABLE IF EXISTS `training_records`;
CREATE TABLE IF NOT EXISTS `training_records` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `skill_id` int UNSIGNED DEFAULT NULL,
  `training_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `training_date` date NOT NULL,
  `duration_hours` decimal(5,2) DEFAULT NULL,
  `trainer` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `status` enum('scheduled','completed','cancelled') COLLATE utf8mb4_unicode_520_ci DEFAULT 'scheduled',
  `proficiency_level` tinyint DEFAULT NULL,
  `certified` tinyint(1) DEFAULT '0',
  `cost` decimal(10,2) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `created_by` int UNSIGNED DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `plant_id` int DEFAULT NULL,
  `default_plant_id` int DEFAULT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `residential_address` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `last_login` datetime DEFAULT NULL,
  `remember_token` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'active',
  `role` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT 'technician',
  `is_vendor_admin` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `department_id` int UNSIGNED DEFAULT NULL,
  `supervisor_id` int DEFAULT NULL,
  `title` varchar(20) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL COMMENT 'Mr, Mrs, Dr, Eng',
  `first_name` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `middle_name` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other') COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `marital_status` enum('single','married','divorced','widowed') COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `nationality` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `national_id` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL COMMENT 'Ghana Card, Passport',
  `ssnit_number` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `tin_number` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `staff_id` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `employment_type` enum('permanent','contract','temporary','casual','intern') COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `employment_status` enum('active','on_leave','suspended','terminated','retired') COLLATE utf8mb4_unicode_520_ci DEFAULT 'active',
  `contract_start_date` date DEFAULT NULL,
  `contract_end_date` date DEFAULT NULL,
  `probation_end_date` date DEFAULT NULL,
  `confirmation_date` date DEFAULT NULL,
  `grade_level` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `step` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `bank_branch` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `account_number` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `account_name` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `basic_salary` decimal(12,2) DEFAULT NULL,
  `emergency_contact_1_name` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `emergency_contact_1_phone` varchar(20) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `emergency_contact_2_name` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `emergency_contact_2_phone` varchar(20) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `blood_group` varchar(10) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `annual_leave_days` int DEFAULT '0',
  `leave_days_remaining` int DEFAULT '0',
  `hire_date` date DEFAULT NULL,
  `trade` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `hourly_rate` decimal(10,2) DEFAULT NULL,
  `emergency_contact_1_relationship` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `staff_id` (`staff_id`),
  KEY `fk_users_department` (`department_id`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_status_role` (`status`,`role`),
  KEY `idx_is_vendor_admin` (`is_vendor_admin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_permissions`
--

DROP TABLE IF EXISTS `user_permissions`;
CREATE TABLE IF NOT EXISTS `user_permissions` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `permission_id` int UNSIGNED NOT NULL,
  `is_granted` tinyint(1) DEFAULT '1',
  `granted_by` int UNSIGNED DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_permission` (`user_id`,`permission_id`),
  KEY `granted_by` (`granted_by`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_permission_id` (`permission_id`),
  KEY `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_plants`
--

DROP TABLE IF EXISTS `user_plants`;
CREATE TABLE IF NOT EXISTS `user_plants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `plant_id` int NOT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `is_default` tinyint(1) DEFAULT '0',
  `access_level` enum('read','write','admin') COLLATE utf8mb4_unicode_520_ci DEFAULT 'read',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_plant` (`user_id`,`plant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `role_id` int UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `role_id` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_skills`
--

DROP TABLE IF EXISTS `user_skills`;
CREATE TABLE IF NOT EXISTS `user_skills` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `skill_id` int UNSIGNED NOT NULL,
  `proficiency_level` tinyint DEFAULT NULL,
  `certified` tinyint(1) DEFAULT '0',
  `certification_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `last_assessed` date DEFAULT NULL,
  `assessor_id` int UNSIGNED DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` datetime DEFAULT NULL,
  `created_by` int UNSIGNED DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int UNSIGNED DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_skill` (`user_id`,`skill_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_skill` (`skill_id`)
) ;

-- --------------------------------------------------------

--
-- Table structure for table `vendors`
--

DROP TABLE IF EXISTS `vendors`;
CREATE TABLE IF NOT EXISTS `vendors` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `vendor_code` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `vendor_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `contact_person` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_520_ci,
  `city` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `country` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `payment_terms` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'active',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vendor_code` (`vendor_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `vendor_contracts`
--

DROP TABLE IF EXISTS `vendor_contracts`;
CREATE TABLE IF NOT EXISTS `vendor_contracts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vendor_id` int NOT NULL,
  `contract_number` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `contract_type` enum('service','supply','maintenance','project') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `value` decimal(12,2) NOT NULL,
  `status` enum('draft','active','expired','terminated') COLLATE utf8mb4_unicode_520_ci DEFAULT 'draft',
  `sla_response_time` int DEFAULT NULL,
  `sla_resolution_time` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contract_number` (`contract_number`),
  KEY `vendor_id` (`vendor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `vendor_performance`
--

DROP TABLE IF EXISTS `vendor_performance`;
CREATE TABLE IF NOT EXISTS `vendor_performance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vendor_id` int NOT NULL,
  `work_order_id` int DEFAULT NULL,
  `rating` int NOT NULL,
  `on_time` tinyint(1) DEFAULT '1',
  `quality_score` int DEFAULT NULL,
  `comments` text COLLATE utf8mb4_unicode_520_ci,
  `evaluated_by` int NOT NULL,
  `evaluation_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `vendor_id` (`vendor_id`)
) ;

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_asset_performance`
-- (See below for the actual view)
--
DROP VIEW IF EXISTS `vw_asset_performance`;
CREATE TABLE IF NOT EXISTS `vw_asset_performance` (
`asset_code` varchar(100)
,`asset_name` varchar(255)
,`completed_work_orders` bigint
,`criticality` enum('low','medium','high','critical')
,`facility_id` int
,`facility_name` varchar(255)
,`id` int
,`last_maintenance_date` datetime
,`status` enum('active','inactive','maintenance','out_of_service')
,`total_maintenance_cost` decimal(34,2)
,`total_work_orders` bigint
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_failure_statistics`
-- (See below for the actual view)
--
DROP VIEW IF EXISTS `vw_failure_statistics`;
CREATE TABLE IF NOT EXISTS `vw_failure_statistics` (
`asset_id` int
,`asset_name` varchar(255)
,`avg_downtime` decimal(14,6)
,`last_failure_date` datetime
,`total_cost` decimal(37,2)
,`total_downtime` decimal(32,2)
,`total_failures` bigint
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_parts_inventory_status`
-- (See below for the actual view)
--
DROP VIEW IF EXISTS `vw_parts_inventory_status`;
CREATE TABLE IF NOT EXISTS `vw_parts_inventory_status` (
`inventory_item_id` int unsigned
,`item_name` varchar(255)
,`location` varchar(255)
,`part_id` int
,`part_name` varchar(255)
,`part_number` varchar(100)
,`quantity_on_hand` decimal(15,2)
,`quantity_reserved` decimal(15,2)
,`stock_status` varchar(12)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_work_order_summary`
-- (See below for the actual view)
--
DROP VIEW IF EXISTS `vw_work_order_summary`;
CREATE TABLE IF NOT EXISTS `vw_work_order_summary` (
`actual_end` datetime
,`actual_start` datetime
,`age_hours` bigint
,`asset_name` varchar(255)
,`assigned_name` varchar(255)
,`created_at` datetime
,`facility_id` int
,`facility_name` varchar(255)
,`id` int unsigned
,`planned_start` datetime
,`priority` enum('low','medium','high','critical')
,`requestor_name` varchar(255)
,`sla_status` varchar(9)
,`status` enum('requested','approved','planned','assigned_to_supervisor','assigned','in_progress','waiting_parts','on_hold','completed','closed','cancelled')
,`title` varchar(255)
,`total_cost` decimal(12,2)
,`wo_number` varchar(50)
);

-- --------------------------------------------------------

--
-- Table structure for table `webhooks`
--

DROP TABLE IF EXISTS `webhooks`;
CREATE TABLE IF NOT EXISTS `webhooks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `url` varchar(500) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `event_type` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `secret` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `weekly_production_summaries`
--

DROP TABLE IF EXISTS `weekly_production_summaries`;
CREATE TABLE IF NOT EXISTS `weekly_production_summaries` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_center_id` int UNSIGNED NOT NULL,
  `week_start` date NOT NULL,
  `week_end` date NOT NULL,
  `week_number` int NOT NULL,
  `total_time` int DEFAULT '0',
  `total_stoppages` int DEFAULT '0',
  `productive_time` int DEFAULT '0',
  `total_production` decimal(12,2) DEFAULT '0.00',
  `target_production` decimal(12,2) DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `work_center_id` (`work_center_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_centers`
--

DROP TABLE IF EXISTS `work_centers`;
CREATE TABLE IF NOT EXISTS `work_centers` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `standard_speed` decimal(10,2) DEFAULT '0.00',
  `target_utilization` decimal(5,2) DEFAULT '90.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_executions`
--

DROP TABLE IF EXISTS `work_executions`;
CREATE TABLE IF NOT EXISTS `work_executions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `execution_code` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `work_order_id` int NOT NULL,
  `technician_id` int NOT NULL,
  `team_members` json DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `actual_hours` decimal(8,2) DEFAULT '0.00',
  `break_time_minutes` int DEFAULT '0',
  `travel_time_minutes` int DEFAULT '0',
  `activities` json DEFAULT NULL,
  `checklist_items` json DEFAULT NULL,
  `parts_used` json DEFAULT NULL,
  `tools_used` json DEFAULT NULL,
  `safety_checks` json DEFAULT NULL,
  `permit_to_work` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `loto_applied` tinyint(1) DEFAULT '0',
  `loto_number` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `hot_work_permit` tinyint(1) DEFAULT '0',
  `confined_space_permit` tinyint(1) DEFAULT '0',
  `findings` text COLLATE utf8mb4_unicode_520_ci,
  `root_cause` text COLLATE utf8mb4_unicode_520_ci,
  `corrective_action` text COLLATE utf8mb4_unicode_520_ci,
  `recommendations` text COLLATE utf8mb4_unicode_520_ci,
  `failure_code` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `downtime_impact_hours` decimal(8,2) DEFAULT '0.00',
  `production_loss_units` int DEFAULT '0',
  `cost_labor` decimal(12,2) DEFAULT '0.00',
  `cost_parts` decimal(12,2) DEFAULT '0.00',
  `cost_total` decimal(12,2) DEFAULT '0.00',
  `quality_check_passed` tinyint(1) DEFAULT NULL,
  `quality_checked_by` int DEFAULT NULL,
  `quality_check_date` datetime DEFAULT NULL,
  `meter_readings` json DEFAULT NULL,
  `attachments` json DEFAULT NULL,
  `signature_technician` text COLLATE utf8mb4_unicode_520_ci,
  `signature_supervisor` text COLLATE utf8mb4_unicode_520_ci,
  `gps_location` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `weather_conditions` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `status` enum('Assigned','InProgress','Paused','Completed','Verified','Closed') COLLATE utf8mb4_unicode_520_ci DEFAULT 'Assigned',
  `pause_reason` text COLLATE utf8mb4_unicode_520_ci,
  `paused_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `verified_by` int DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `execution_code` (`execution_code`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_technician` (`technician_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_execution_logs`
--

DROP TABLE IF EXISTS `work_execution_logs`;
CREATE TABLE IF NOT EXISTS `work_execution_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `execution_id` bigint NOT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `user_id` int NOT NULL,
  `old_value` text COLLATE utf8mb4_unicode_520_ci,
  `new_value` text COLLATE utf8mb4_unicode_520_ci,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_execution` (`execution_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_orders`
--

DROP TABLE IF EXISTS `work_orders`;
CREATE TABLE IF NOT EXISTS `work_orders` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `plant_id` int DEFAULT NULL,
  `facility_id` int DEFAULT NULL,
  `wo_number` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `template_id` int UNSIGNED DEFAULT NULL,
  `recurring_id` int UNSIGNED DEFAULT NULL,
  `work_order_number` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `maintenance_order_code` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `request_id` int UNSIGNED DEFAULT NULL,
  `type` enum('breakdown','corrective','inspection','lubrication','emergency','safety','improvement') COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `work_order_type` enum('breakdown','preventive','corrective','other') COLLATE utf8mb4_unicode_520_ci DEFAULT 'corrective',
  `machine_id` int UNSIGNED DEFAULT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `department_id` int UNSIGNED DEFAULT NULL,
  `assigned_to` int UNSIGNED DEFAULT NULL,
  `team_leader_id` int UNSIGNED DEFAULT NULL,
  `assigned_supervisor_id` int UNSIGNED DEFAULT NULL,
  `forwarded_by` int UNSIGNED DEFAULT NULL,
  `forwarded_at` datetime DEFAULT NULL,
  `assignment_type` enum('direct','via_supervisor') COLLATE utf8mb4_unicode_520_ci DEFAULT 'direct',
  `assigned_by` int UNSIGNED DEFAULT NULL,
  `assigned_date` datetime DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci,
  `technical_description` text COLLATE utf8mb4_unicode_520_ci,
  `asset_id` int UNSIGNED DEFAULT NULL,
  `related_pm_id` int UNSIGNED DEFAULT NULL,
  `requestor_id` int UNSIGNED NOT NULL,
  `planner_id` int UNSIGNED DEFAULT NULL,
  `assigned_user_id` int UNSIGNED DEFAULT NULL,
  `assigned_group_id` int UNSIGNED DEFAULT NULL,
  `sla_id` int UNSIGNED DEFAULT NULL,
  `priority` enum('low','medium','high','critical') COLLATE utf8mb4_unicode_520_ci DEFAULT 'medium',
  `status` enum('requested','approved','planned','assigned_to_supervisor','assigned','in_progress','waiting_parts','on_hold','completed','closed','cancelled') COLLATE utf8mb4_unicode_520_ci DEFAULT 'requested',
  `shift_id` varchar(36) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `union_notification_sent` tinyint(1) DEFAULT '0',
  `production_loss_ghs` decimal(15,2) DEFAULT '0.00',
  `power_outage_related` tinyint(1) DEFAULT '0',
  `forex_impact_ghs` decimal(15,2) DEFAULT '0.00',
  `wo_type` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `estimated_hours` decimal(10,2) DEFAULT NULL,
  `actual_hours` decimal(10,2) DEFAULT NULL,
  `completion_notes` text COLLATE utf8mb4_unicode_520_ci,
  `inspection_by` int UNSIGNED DEFAULT NULL,
  `inspection_date` datetime DEFAULT NULL,
  `inspection_notes` text COLLATE utf8mb4_unicode_520_ci,
  `inspection_status` enum('passed','failed','pending') COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `closed_by` int UNSIGNED DEFAULT NULL,
  `closed_date` datetime DEFAULT NULL,
  `created_by` int UNSIGNED DEFAULT NULL,
  `total_labor_hours` decimal(10,2) DEFAULT NULL,
  `planned_start` datetime DEFAULT NULL,
  `planned_end` datetime DEFAULT NULL,
  `actual_start` datetime DEFAULT NULL,
  `actual_end` datetime DEFAULT NULL,
  `sla_hours` int DEFAULT NULL,
  `sla_started_at` datetime DEFAULT NULL,
  `sla_breached_at` datetime DEFAULT NULL,
  `response_due` datetime DEFAULT NULL,
  `resolution_due` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `version` int DEFAULT '1',
  `total_cost` decimal(12,2) DEFAULT '0.00',
  `total_material_cost` decimal(10,2) DEFAULT NULL,
  `downtime_hours` decimal(10,2) DEFAULT NULL,
  `trade_activity` varchar(100) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `safety_notes` text COLLATE utf8mb4_unicode_520_ci,
  `ppe_required` text COLLATE utf8mb4_unicode_520_ci,
  `delivery_date_required` date DEFAULT NULL,
  `date_sent` datetime DEFAULT NULL,
  `time_sent` time DEFAULT NULL,
  `is_breakdown` tinyint(1) DEFAULT '0',
  `received_by_engineering` datetime DEFAULT NULL,
  `completed_by_engineering` datetime DEFAULT NULL,
  `total_downtime_hours` decimal(10,2) DEFAULT NULL,
  `repair_started` datetime DEFAULT NULL,
  `repair_ended` datetime DEFAULT NULL,
  `technician_remarks` text COLLATE utf8mb4_unicode_520_ci,
  `technician_brief_report` text COLLATE utf8mb4_unicode_520_ci,
  `failure_description` text COLLATE utf8mb4_unicode_520_ci,
  `cause_description` text COLLATE utf8mb4_unicode_520_ci,
  `action_description` text COLLATE utf8mb4_unicode_520_ci,
  `general_remarks` text COLLATE utf8mb4_unicode_520_ci,
  `notes` text COLLATE utf8mb4_unicode_520_ci,
  `operator_signature` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `line_manager_signature` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `supervisor_signature` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `operator_signed_at` datetime DEFAULT NULL,
  `line_manager_signed_at` datetime DEFAULT NULL,
  `supervisor_signed_at` datetime DEFAULT NULL,
  `escalation_level` int DEFAULT '0',
  `sla_response_minutes` int DEFAULT NULL,
  `sla_repair_hours` int DEFAULT NULL,
  `downtime_start` datetime DEFAULT NULL,
  `downtime_end` datetime DEFAULT NULL,
  `risk_score` int DEFAULT '0',
  `labor_cost_total` decimal(15,2) DEFAULT '0.00',
  `parts_cost_total` decimal(15,2) DEFAULT '0.00',
  `contractor_cost_total` decimal(15,2) DEFAULT '0.00',
  `total_maintenance_cost` decimal(15,2) DEFAULT '0.00',
  `downtime_cost_total` decimal(15,2) DEFAULT '0.00',
  `cost_center_id` int DEFAULT NULL,
  `is_locked` tinyint(1) DEFAULT '0',
  `locked_by` int DEFAULT NULL,
  `locked_at` timestamp NULL DEFAULT NULL,
  `lock_reason` text COLLATE utf8mb4_unicode_520_ci,
  PRIMARY KEY (`id`),
  KEY `idx_type_status` (`type`,`status`),
  KEY `idx_asset` (`asset_id`),
  KEY `idx_assigned` (`assigned_user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_wo_status_date` (`status`,`planned_start`),
  KEY `idx_wo_asset` (`asset_id`,`status`),
  KEY `idx_wo_assigned` (`assigned_user_id`,`status`),
  KEY `idx_wo_priority` (`priority`,`status`),
  KEY `idx_wo_dates` (`planned_start`,`planned_end`),
  KEY `idx_wo_status` (`status`),
  KEY `idx_wo_created` (`created_at`),
  KEY `idx_wo_asset_status` (`asset_id`,`status`),
  KEY `idx_shift` (`shift_id`),
  KEY `idx_wo_cost_center` (`cost_center_id`),
  KEY `idx_wo_status_created` (`status`,`created_at`),
  KEY `idx_work_orders_status_created` (`status`,`created_at`),
  KEY `idx_work_orders_asset_status` (`asset_id`,`status`),
  KEY `idx_wo_status_priority_created` (`status`,`priority`,`created_at`),
  KEY `idx_wo_assigned_user_status` (`assigned_user_id`,`status`),
  KEY `idx_wo_asset_created` (`asset_id`,`created_at`),
  KEY `idx_wo_requestor_created` (`requestor_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

--
-- Triggers `work_orders`
--
DROP TRIGGER IF EXISTS `trg_financial_period_lock_validation`;
DELIMITER $$
CREATE TRIGGER `trg_financial_period_lock_validation` BEFORE UPDATE ON `work_orders` FOR EACH ROW BEGIN
    DECLARE period_locked INT DEFAULT 0;
    
    -- Check if work order falls within a locked financial period
    SELECT COUNT(*) INTO period_locked
    FROM financial_periods fp
    WHERE fp.status = 'locked'
    AND DATE(NEW.created_at) BETWEEN fp.start_date AND fp.end_date
    AND (
        COALESCE(OLD.total_cost, 0) != COALESCE(NEW.total_cost, 0) OR
        COALESCE(OLD.labor_cost_total, 0) != COALESCE(NEW.labor_cost_total, 0) OR
        COALESCE(OLD.parts_cost_total, 0) != COALESCE(NEW.parts_cost_total, 0)
    );
    
    IF period_locked > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot modify costs during locked financial period';
    END IF;
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `trg_work_order_history`;
DELIMITER $$
CREATE TRIGGER `trg_work_order_history` AFTER UPDATE ON `work_orders` FOR EACH ROW BEGIN
    -- Log status changes
    IF OLD.status != NEW.status THEN
        INSERT INTO work_order_history (id, work_order_id, field_name, old_value, new_value, changed_by)
        VALUES (UUID(), NEW.id, 'status', OLD.status, NEW.status, 1);
    END IF;
    
    -- Log cost changes
    IF COALESCE(OLD.total_cost, 0) != COALESCE(NEW.total_cost, 0) THEN
        INSERT INTO cost_history (id, work_order_id, cost_type, old_amount, new_amount, changed_by)
        VALUES (UUID(), NEW.id, 'labor', OLD.total_cost, NEW.total_cost, 1);
    END IF;
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `trg_work_order_status_validation`;
DELIMITER $$
CREATE TRIGGER `trg_work_order_status_validation` BEFORE UPDATE ON `work_orders` FOR EACH ROW BEGIN
    -- Prevent status regression (completed -> open)
    IF OLD.status = 'completed' AND NEW.status IN ('draft', 'open', 'in_progress') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot reopen completed work order without proper authorization';
    END IF;
    
    -- Prevent cost changes on locked work orders
    IF OLD.is_locked = 1 AND (
        COALESCE(OLD.total_cost, 0) != COALESCE(NEW.total_cost, 0) OR 
        COALESCE(OLD.labor_cost_total, 0) != COALESCE(NEW.labor_cost_total, 0) OR 
        COALESCE(OLD.parts_cost_total, 0) != COALESCE(NEW.parts_cost_total, 0)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot modify costs on locked work order';
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_activities`
--

DROP TABLE IF EXISTS `work_order_activities`;
CREATE TABLE IF NOT EXISTS `work_order_activities` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `activity_type` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci NOT NULL,
  `performed_by` int UNSIGNED NOT NULL,
  `activity_date` datetime NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `work_order_id` (`work_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_assignments`
--

DROP TABLE IF EXISTS `work_order_assignments`;
CREATE TABLE IF NOT EXISTS `work_order_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `department_id` int DEFAULT NULL,
  `assigned_to_user_id` int DEFAULT NULL,
  `user_type` enum('supervisor','technician') DEFAULT NULL,
  `is_team_leader` tinyint(1) DEFAULT '0',
  `skill` varchar(100) DEFAULT NULL,
  `assigned_date` datetime NOT NULL,
  `estimated_hours` decimal(8,2) DEFAULT NULL,
  `actual_hours` decimal(8,2) DEFAULT NULL,
  `assignment_status` enum('assigned','in_progress','completed') DEFAULT 'assigned',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_assistance_requests`
--

DROP TABLE IF EXISTS `work_order_assistance_requests`;
CREATE TABLE IF NOT EXISTS `work_order_assistance_requests` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `requested_by` int UNSIGNED NOT NULL,
  `requested_to` int UNSIGNED NOT NULL COMMENT 'Supervisor or Planner',
  `reason` text NOT NULL,
  `required_skills` json DEFAULT NULL,
  `urgency` enum('low','medium','high','critical') DEFAULT 'medium',
  `status` enum('pending','approved','rejected','fulfilled') DEFAULT 'pending',
  `approved_by` int UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `assigned_technicians` json DEFAULT NULL,
  `rejection_reason` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_attachments`
--

DROP TABLE IF EXISTS `work_order_attachments`;
CREATE TABLE IF NOT EXISTS `work_order_attachments` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `file_type` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `file_size` int NOT NULL,
  `uploaded_by` int UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_wo` (`work_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_audit_log`
--

DROP TABLE IF EXISTS `work_order_audit_log`;
CREATE TABLE IF NOT EXISTS `work_order_audit_log` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `action_type` enum('created','assigned','started','paused','resumed','completed','approved','rejected','closed','modified') NOT NULL,
  `entity_type` varchar(50) NOT NULL COMMENT 'team, labor, parts, report, etc',
  `entity_id` int UNSIGNED DEFAULT NULL,
  `field_changed` varchar(100) DEFAULT NULL,
  `old_value` text,
  `new_value` text,
  `changed_by` int UNSIGNED NOT NULL,
  `changed_at` datetime NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_work_order` (`work_order_id`,`changed_at`),
  KEY `idx_action` (`action_type`),
  KEY `idx_entity` (`entity_type`,`entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_authority_overrides`
--

DROP TABLE IF EXISTS `work_order_authority_overrides`;
CREATE TABLE IF NOT EXISTS `work_order_authority_overrides` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `override_type` enum('cross_department_assignment','priority_change','cost_override','deadline_extension') NOT NULL,
  `original_value` varchar(255) DEFAULT NULL,
  `new_value` varchar(255) DEFAULT NULL,
  `overridden_by` int UNSIGNED NOT NULL,
  `override_reason` text NOT NULL,
  `approved_by` int UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_override_type` (`override_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_checklist_items`
--

DROP TABLE IF EXISTS `work_order_checklist_items`;
CREATE TABLE IF NOT EXISTS `work_order_checklist_items` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `item_id` int NOT NULL,
  `value` text COLLATE utf8mb4_unicode_520_ci,
  `item_order` int DEFAULT '0',
  `item_type` enum('text','yesno','numeric','passfail','photo','signature') COLLATE utf8mb4_unicode_520_ci DEFAULT 'text',
  `description` text COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `response_value` text COLLATE utf8mb4_unicode_520_ci,
  `is_completed` tinyint(1) DEFAULT '0',
  `completed_by` int UNSIGNED DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_wo` (`work_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_comments`
--

DROP TABLE IF EXISTS `work_order_comments`;
CREATE TABLE IF NOT EXISTS `work_order_comments` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_wo` (`work_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_completion_reports`
--

DROP TABLE IF EXISTS `work_order_completion_reports`;
CREATE TABLE IF NOT EXISTS `work_order_completion_reports` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `submitted_by` int UNSIGNED NOT NULL,
  `work_performed` text COLLATE utf8mb4_general_ci NOT NULL,
  `findings` text COLLATE utf8mb4_general_ci,
  `recommendations` text COLLATE utf8mb4_general_ci,
  `team_members_data` json NOT NULL,
  `materials_used` json DEFAULT NULL,
  `completion_status` enum('completed','partial','pending_parts') COLLATE utf8mb4_general_ci DEFAULT 'completed',
  `submitted_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `work_order_id` (`work_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_delays`
--

DROP TABLE IF EXISTS `work_order_delays`;
CREATE TABLE IF NOT EXISTS `work_order_delays` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `delay_type` enum('parts_unavailable','technician_unavailable','tool_unavailable','approval_pending','other') NOT NULL,
  `delay_start` datetime NOT NULL,
  `delay_end` datetime DEFAULT NULL,
  `duration_hours` decimal(10,2) DEFAULT NULL,
  `part_id` int UNSIGNED DEFAULT NULL,
  `expected_availability_date` date DEFAULT NULL,
  `impact` enum('low','medium','high','critical') NOT NULL,
  `notes` text,
  `created_by` int UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_delay_type` (`delay_type`),
  KEY `idx_impact` (`impact`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_failures`
--

DROP TABLE IF EXISTS `work_order_failures`;
CREATE TABLE IF NOT EXISTS `work_order_failures` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `failure_code_id` int UNSIGNED NOT NULL,
  `failure_description` text COLLATE utf8mb4_general_ci NOT NULL,
  `root_cause` text COLLATE utf8mb4_general_ci,
  `remedy_action` text COLLATE utf8mb4_general_ci,
  `recorded_by` int UNSIGNED NOT NULL,
  `recorded_at` datetime NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `work_order_id` (`work_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_help_requests`
--

DROP TABLE IF EXISTS `work_order_help_requests`;
CREATE TABLE IF NOT EXISTS `work_order_help_requests` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `requested_by` int UNSIGNED NOT NULL,
  `requested_technicians` json NOT NULL,
  `reason` text COLLATE utf8mb4_general_ci NOT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `approved_by` int UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `work_order_id` (`work_order_id`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_history`
--

DROP TABLE IF EXISTS `work_order_history`;
CREATE TABLE IF NOT EXISTS `work_order_history` (
  `id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `work_order_id` int NOT NULL,
  `field_name` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `old_value` text COLLATE utf8mb4_unicode_520_ci,
  `new_value` text COLLATE utf8mb4_unicode_520_ci,
  `changed_by` int NOT NULL,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `change_reason` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_wo_history_work_order` (`work_order_id`),
  KEY `idx_wo_history_changed_at` (`changed_at`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_interruptions`
--

DROP TABLE IF EXISTS `work_order_interruptions`;
CREATE TABLE IF NOT EXISTS `work_order_interruptions` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `interruption_type` enum('power_outage','network_loss','equipment_failure','other') NOT NULL,
  `started_at` datetime NOT NULL,
  `ended_at` datetime DEFAULT NULL,
  `duration_minutes` int DEFAULT NULL,
  `auto_detected` tinyint(1) DEFAULT '1',
  `technician_id` int UNSIGNED DEFAULT NULL,
  `notes` text,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_type` (`interruption_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_job_plans`
--

DROP TABLE IF EXISTS `work_order_job_plans`;
CREATE TABLE IF NOT EXISTS `work_order_job_plans` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `plan_name` varchar(255) DEFAULT NULL,
  `estimated_duration` int DEFAULT NULL COMMENT 'minutes',
  `required_skills` json DEFAULT NULL,
  `required_tools` json DEFAULT NULL,
  `required_parts` json DEFAULT NULL,
  `safety_requirements` text,
  `step_by_step_instructions` text,
  `permits_required` json DEFAULT NULL,
  `special_instructions` text,
  `created_by` int UNSIGNED NOT NULL,
  `approved_by` int UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `status` enum('draft','submitted','approved','rejected') DEFAULT 'draft',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_wo_id` (`work_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_labor_enhanced`
--

DROP TABLE IF EXISTS `work_order_labor_enhanced`;
CREATE TABLE IF NOT EXISTS `work_order_labor_enhanced` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `technician_id` int UNSIGNED NOT NULL,
  `labor_type` enum('normal','overtime','weekend','holiday','emergency') NOT NULL DEFAULT 'normal',
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `hours_worked` decimal(10,2) DEFAULT '0.00',
  `base_rate` decimal(10,2) NOT NULL,
  `multiplier` decimal(4,2) DEFAULT '1.00',
  `total_cost` decimal(10,2) DEFAULT '0.00',
  `justification` text COMMENT 'Required for overtime/emergency',
  `approved_by` int UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_labor_type` (`labor_type`),
  KEY `idx_approval` (`approved_by`,`approved_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_logs`
--

DROP TABLE IF EXISTS `work_order_logs`;
CREATE TABLE IF NOT EXISTS `work_order_logs` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `details` json DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_wo` (`work_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_materials`
--

DROP TABLE IF EXISTS `work_order_materials`;
CREATE TABLE IF NOT EXISTS `work_order_materials` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `inventory_item_id` int UNSIGNED NOT NULL,
  `part_id` int DEFAULT NULL,
  `quantity_required` decimal(10,2) NOT NULL,
  `quantity_reserved` decimal(10,2) DEFAULT '0.00',
  `quantity_issued` decimal(10,2) DEFAULT '0.00',
  `unit_cost` decimal(10,2) DEFAULT '0.00',
  `status` enum('pending','reserved','issued','returned') COLLATE utf8mb4_unicode_520_ci DEFAULT 'pending',
  `issued_by` int UNSIGNED DEFAULT NULL,
  `issued_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_520_ci,
  PRIMARY KEY (`id`),
  KEY `idx_wo` (`work_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_materials_used`
--

DROP TABLE IF EXISTS `work_order_materials_used`;
CREATE TABLE IF NOT EXISTS `work_order_materials_used` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `part_id` int UNSIGNED NOT NULL,
  `technician_id` int UNSIGNED NOT NULL,
  `quantity_requested` int NOT NULL,
  `quantity_used` int NOT NULL,
  `quantity_returned` int DEFAULT '0',
  `issued_by` int UNSIGNED DEFAULT NULL,
  `issued_at` datetime DEFAULT NULL,
  `returned_at` datetime DEFAULT NULL,
  `unit_cost` decimal(10,2) DEFAULT NULL,
  `total_cost` decimal(10,2) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_general_ci,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_work_order` (`work_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_offline_queue`
--

DROP TABLE IF EXISTS `work_order_offline_queue`;
CREATE TABLE IF NOT EXISTS `work_order_offline_queue` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `technician_id` int UNSIGNED NOT NULL,
  `action_type` enum('start','pause','resume','update','complete') NOT NULL,
  `offline_data` json NOT NULL,
  `device_id` varchar(100) DEFAULT NULL,
  `offline_timestamp` datetime NOT NULL,
  `synced` tinyint(1) DEFAULT '0',
  `synced_at` datetime DEFAULT NULL,
  `sync_error` text,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sync_status` (`synced`,`offline_timestamp`),
  KEY `idx_work_order` (`work_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_part_substitutions`
--

DROP TABLE IF EXISTS `work_order_part_substitutions`;
CREATE TABLE IF NOT EXISTS `work_order_part_substitutions` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `original_part_id` int UNSIGNED NOT NULL,
  `substitute_part_id` int UNSIGNED DEFAULT NULL,
  `is_fabricated` tinyint(1) DEFAULT '0',
  `fabrication_details` text,
  `reason` enum('unavailable','cost_saving','upgrade','emergency') NOT NULL,
  `quantity` int NOT NULL,
  `cost_difference` decimal(10,2) DEFAULT '0.00',
  `approved_by` int UNSIGNED NOT NULL,
  `approved_at` datetime NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_original_part` (`original_part_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_resource_reservations`
--

DROP TABLE IF EXISTS `work_order_resource_reservations`;
CREATE TABLE IF NOT EXISTS `work_order_resource_reservations` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `resource_type` enum('part','tool','equipment') NOT NULL,
  `resource_id` int UNSIGNED NOT NULL,
  `quantity` int NOT NULL,
  `reserved_by` int UNSIGNED NOT NULL,
  `reserved_at` datetime NOT NULL,
  `released_at` datetime DEFAULT NULL,
  `status` enum('reserved','issued','returned','consumed') DEFAULT 'reserved',
  `notes` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_resource` (`resource_type`,`resource_id`),
  KEY `idx_status` (`status`),
  KEY `idx_wo_id` (`work_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_schedules`
--

DROP TABLE IF EXISTS `work_order_schedules`;
CREATE TABLE IF NOT EXISTS `work_order_schedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `technician_id` int NOT NULL,
  `scheduled_start` datetime NOT NULL,
  `scheduled_end` datetime NOT NULL,
  `estimated_hours` decimal(5,2) NOT NULL,
  `actual_hours` decimal(5,2) DEFAULT NULL,
  `status` enum('scheduled','in_progress','completed','cancelled') COLLATE utf8mb4_unicode_520_ci DEFAULT 'scheduled',
  `notes` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_technician` (`technician_id`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_scheduled_start` (`scheduled_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_signatures`
--

DROP TABLE IF EXISTS `work_order_signatures`;
CREATE TABLE IF NOT EXISTS `work_order_signatures` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `role` enum('technician','team_leader','supervisor','planner','manager') COLLATE utf8mb4_general_ci NOT NULL,
  `signature_type` enum('work_performed','work_approved','work_verified') COLLATE utf8mb4_general_ci NOT NULL,
  `signature_data` text COLLATE utf8mb4_general_ci,
  `signed_at` datetime NOT NULL,
  `comments` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  KEY `idx_work_order` (`work_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_sla_tracking`
--

DROP TABLE IF EXISTS `work_order_sla_tracking`;
CREATE TABLE IF NOT EXISTS `work_order_sla_tracking` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `sla_definition_id` int UNSIGNED NOT NULL,
  `target_response_time` datetime NOT NULL,
  `actual_response_time` datetime DEFAULT NULL,
  `target_resolution_time` datetime NOT NULL,
  `actual_resolution_time` datetime DEFAULT NULL,
  `response_breached` tinyint(1) DEFAULT '0',
  `resolution_breached` tinyint(1) DEFAULT '0',
  `response_breach_duration` int DEFAULT NULL,
  `resolution_breach_duration` int DEFAULT NULL,
  `current_escalation_level` int DEFAULT '0',
  `escalated_to` int UNSIGNED DEFAULT NULL,
  `escalated_at` datetime DEFAULT NULL,
  `escalation_notes` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_breached` (`response_breached`,`resolution_breached`),
  KEY `idx_escalation` (`current_escalation_level`),
  KEY `idx_wo_id` (`work_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_status_history`
--

DROP TABLE IF EXISTS `work_order_status_history`;
CREATE TABLE IF NOT EXISTS `work_order_status_history` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `from_status` varchar(50) DEFAULT NULL,
  `to_status` varchar(50) NOT NULL,
  `changed_by` int UNSIGNED NOT NULL,
  `changed_at` datetime NOT NULL,
  `reason` text,
  PRIMARY KEY (`id`),
  KEY `idx_wo_status` (`work_order_id`,`changed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_tasks`
--

DROP TABLE IF EXISTS `work_order_tasks`;
CREATE TABLE IF NOT EXISTS `work_order_tasks` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `task_order` int DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `is_completed` tinyint(1) DEFAULT '0',
  `completed_by` int UNSIGNED DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_wo` (`work_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_team_members`
--

DROP TABLE IF EXISTS `work_order_team_members`;
CREATE TABLE IF NOT EXISTS `work_order_team_members` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `technician_id` int UNSIGNED NOT NULL,
  `role` enum('leader','assistant','specialist') DEFAULT 'assistant',
  `is_leader` tinyint(1) DEFAULT '0',
  `assigned_by` int UNSIGNED DEFAULT NULL,
  `assigned_at` datetime DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `hours_worked` decimal(10,2) DEFAULT NULL,
  `status` enum('assigned','active','completed','removed') DEFAULT 'assigned',
  `notes` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wo_tech` (`work_order_id`,`technician_id`),
  KEY `idx_leader` (`work_order_id`,`is_leader`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_technicians`
--

DROP TABLE IF EXISTS `work_order_technicians`;
CREATE TABLE IF NOT EXISTS `work_order_technicians` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `technician_id` int UNSIGNED NOT NULL,
  `skill` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `role` enum('leader','member') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'member',
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `hours_worked` decimal(10,2) DEFAULT NULL,
  `assigned_at` datetime NOT NULL,
  `assigned_by` int UNSIGNED NOT NULL,
  `notes` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  KEY `work_order_id` (`work_order_id`),
  KEY `technician_id` (`technician_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_templates`
--

DROP TABLE IF EXISTS `work_order_templates`;
CREATE TABLE IF NOT EXISTS `work_order_templates` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `template_name` varchar(255) NOT NULL,
  `description` text,
  `type` enum('breakdown','preventive','corrective','inspection','project') DEFAULT 'preventive',
  `priority` enum('low','medium','high','critical') DEFAULT 'medium',
  `estimated_hours` decimal(10,2) DEFAULT NULL,
  `instructions` text,
  `safety_notes` text,
  `checklist` json DEFAULT NULL,
  `required_parts` json DEFAULT NULL,
  `created_by` int UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_timeline`
--

DROP TABLE IF EXISTS `work_order_timeline`;
CREATE TABLE IF NOT EXISTS `work_order_timeline` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `event_type` enum('created','assigned','started','paused','resumed','material_requested','material_issued','assistance_requested','team_member_added','team_member_removed','completed','inspected','closed','cancelled') NOT NULL,
  `event_timestamp` datetime NOT NULL,
  `performed_by` int UNSIGNED DEFAULT NULL,
  `affected_user_id` int UNSIGNED DEFAULT NULL COMMENT 'For assignments, team changes',
  `old_value` varchar(255) DEFAULT NULL,
  `new_value` varchar(255) DEFAULT NULL,
  `details` json DEFAULT NULL,
  `notes` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wo_timeline` (`work_order_id`,`event_timestamp`),
  KEY `idx_event_type` (`event_type`,`event_timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_time_entries`
--

DROP TABLE IF EXISTS `work_order_time_entries`;
CREATE TABLE IF NOT EXISTS `work_order_time_entries` (
  `id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `work_order_id` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `user_id` int NOT NULL,
  `start_time` timestamp NOT NULL,
  `end_time` timestamp NULL DEFAULT NULL,
  `duration_minutes` int DEFAULT NULL,
  `is_overtime` tinyint(1) DEFAULT '0',
  `hourly_rate` decimal(10,2) NOT NULL,
  `labor_cost` decimal(15,2) DEFAULT '0.00',
  `description` text COLLATE utf8mb4_unicode_520_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_time_entries_wo` (`work_order_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_time_logs`
--

DROP TABLE IF EXISTS `work_order_time_logs`;
CREATE TABLE IF NOT EXISTS `work_order_time_logs` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_id` int UNSIGNED NOT NULL,
  `technician_id` int UNSIGNED NOT NULL,
  `log_type` enum('start','pause','resume','complete') NOT NULL,
  `timestamp` datetime NOT NULL,
  `duration_minutes` int DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `notes` text,
  `gps_coordinates` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wo_tech_time` (`work_order_id`,`technician_id`,`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_tool_requests`
--

DROP TABLE IF EXISTS `work_order_tool_requests`;
CREATE TABLE IF NOT EXISTS `work_order_tool_requests` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `request_number` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `plant_id` int UNSIGNED NOT NULL,
  `work_order_id` int UNSIGNED NOT NULL,
  `requested_by` int UNSIGNED NOT NULL,
  `reason` text COLLATE utf8mb4_general_ci,
  `request_status` enum('PENDING','APPROVED','REJECTED','ISSUED','RETURN_PENDING','COMPLETED','CANCELLED') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'PENDING',
  `approved_by` int UNSIGNED DEFAULT NULL,
  `issued_by` int UNSIGNED DEFAULT NULL,
  `issued_at` datetime DEFAULT NULL,
  `returned_at` datetime DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejected_reason` text COLLATE utf8mb4_general_ci,
  `required_from_date` date DEFAULT NULL,
  `expected_return_date` date DEFAULT NULL,
  `actual_return_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_request_number` (`request_number`),
  KEY `work_order_tool_requests_requested_by_foreign` (`requested_by`),
  KEY `plant_id` (`plant_id`),
  KEY `work_order_id` (`work_order_id`),
  KEY `request_status` (`request_status`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_tool_request_items`
--

DROP TABLE IF EXISTS `work_order_tool_request_items`;
CREATE TABLE IF NOT EXISTS `work_order_tool_request_items` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `tool_request_id` int UNSIGNED NOT NULL,
  `tool_id` int UNSIGNED NOT NULL,
  `quantity` int DEFAULT '1',
  `issued_quantity` int DEFAULT '0',
  `condition_on_issue` enum('GOOD','FAIR','DAMAGED','UNDER_MAINTENANCE','NOT_AVAILABLE') DEFAULT NULL,
  `issue_notes` text,
  `condition_on_return` enum('GOOD','FAIR','DAMAGED','LOST') DEFAULT NULL,
  `damage_notes` text,
  `penalty_cost` decimal(10,2) DEFAULT '0.00',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tool_request_id` (`tool_request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `work_order_types_meta`
--

DROP TABLE IF EXISTS `work_order_types_meta`;
CREATE TABLE IF NOT EXISTS `work_order_types_meta` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `work_order_type` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `default_checklist_template_id` int UNSIGNED DEFAULT NULL,
  `default_required_tools` json DEFAULT NULL,
  `default_required_spares` json DEFAULT NULL,
  `default_priority` enum('low','medium','high','critical') COLLATE utf8mb4_unicode_520_ci DEFAULT 'medium',
  `default_sla_hours` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `work_order_type` (`work_order_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `documents`
--
ALTER TABLE `documents` ADD FULLTEXT KEY `idx_search` (`title`);

-- --------------------------------------------------------

--
-- Structure for view `vw_asset_performance`
--
DROP TABLE IF EXISTS `vw_asset_performance`;

DROP VIEW IF EXISTS `vw_asset_performance`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_asset_performance`  AS SELECT `a`.`id` AS `id`, `a`.`asset_name` AS `asset_name`, `a`.`asset_code` AS `asset_code`, `a`.`status` AS `status`, `a`.`criticality` AS `criticality`, `a`.`facility_id` AS `facility_id`, `f`.`facility_name` AS `facility_name`, count(`wo`.`id`) AS `total_work_orders`, count((case when (`wo`.`status` = 'completed') then 1 end)) AS `completed_work_orders`, coalesce(sum(`wo`.`total_cost`),0) AS `total_maintenance_cost`, max(`wo`.`created_at`) AS `last_maintenance_date` FROM ((`assets_unified` `a` left join `facilities` `f` on((`a`.`facility_id` = `f`.`id`))) left join `work_orders` `wo` on(((`a`.`id` = `wo`.`asset_id`) and (`wo`.`created_at` >= (now() - interval 12 month))))) WHERE (`a`.`status` = 'active') GROUP BY `a`.`id`, `a`.`asset_name`, `a`.`asset_code`, `a`.`status`, `a`.`criticality`, `a`.`facility_id`, `f`.`facility_name` ;

-- --------------------------------------------------------

--
-- Structure for view `vw_failure_statistics`
--
DROP TABLE IF EXISTS `vw_failure_statistics`;

DROP VIEW IF EXISTS `vw_failure_statistics`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_failure_statistics`  AS SELECT `a`.`id` AS `asset_id`, `a`.`asset_name` AS `asset_name`, count(`fr`.`id`) AS `total_failures`, sum(`fr`.`downtime_hours`) AS `total_downtime`, sum(`fr`.`cost_impact`) AS `total_cost`, avg(`fr`.`downtime_hours`) AS `avg_downtime`, max(`fr`.`failure_date`) AS `last_failure_date` FROM (`assets_unified` `a` left join `failure_reports` `fr` on((`a`.`id` = `fr`.`asset_id`))) GROUP BY `a`.`id` ;

-- --------------------------------------------------------

--
-- Structure for view `vw_parts_inventory_status`
--
DROP TABLE IF EXISTS `vw_parts_inventory_status`;

DROP VIEW IF EXISTS `vw_parts_inventory_status`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_parts_inventory_status`  AS SELECT `p`.`id` AS `part_id`, `p`.`part_name` AS `part_name`, `p`.`part_number` AS `part_number`, `pil`.`inventory_item_id` AS `inventory_item_id`, `ii`.`item_name` AS `item_name`, `ii`.`quantity_on_hand` AS `quantity_on_hand`, `ii`.`quantity_reserved` AS `quantity_reserved`, `ii`.`location` AS `location`, (case when (`ii`.`id` is null) then 'NO_INVENTORY' when ((`ii`.`quantity_on_hand` - ifnull(`ii`.`quantity_reserved`,0)) <= 0) then 'OUT_OF_STOCK' when ((`ii`.`quantity_on_hand` - ifnull(`ii`.`quantity_reserved`,0)) <= `ii`.`reorder_point`) then 'LOW_STOCK' else 'IN_STOCK' end) AS `stock_status` FROM ((`parts` `p` left join `part_inventory_links` `pil` on(((`p`.`id` = `pil`.`part_id`) and (`pil`.`is_primary` = true)))) left join `inventory_items` `ii` on((`pil`.`inventory_item_id` = `ii`.`id`))) ;

-- --------------------------------------------------------

--
-- Structure for view `vw_work_order_summary`
--
DROP TABLE IF EXISTS `vw_work_order_summary`;

DROP VIEW IF EXISTS `vw_work_order_summary`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_work_order_summary`  AS SELECT `wo`.`id` AS `id`, `wo`.`wo_number` AS `wo_number`, `wo`.`title` AS `title`, `wo`.`status` AS `status`, `wo`.`priority` AS `priority`, `wo`.`created_at` AS `created_at`, `wo`.`planned_start` AS `planned_start`, `wo`.`actual_start` AS `actual_start`, `wo`.`actual_end` AS `actual_end`, `wo`.`total_cost` AS `total_cost`, `a`.`asset_name` AS `asset_name`, `a`.`facility_id` AS `facility_id`, `u_req`.`full_name` AS `requestor_name`, `u_ass`.`full_name` AS `assigned_name`, `f`.`facility_name` AS `facility_name`, (case when (`wo`.`status` = 'completed') then 'Completed' when ((`wo`.`resolution_due` < now()) and (`wo`.`status` not in ('completed','cancelled'))) then 'Overdue' when ((`wo`.`resolution_due` < (now() + interval 24 hour)) and (`wo`.`status` not in ('completed','cancelled'))) then 'Due Soon' else 'On Track' end) AS `sla_status`, timestampdiff(HOUR,`wo`.`created_at`,coalesce(`wo`.`actual_end`,now())) AS `age_hours` FROM ((((`work_orders` `wo` left join `assets_unified` `a` on((`wo`.`asset_id` = `a`.`id`))) left join `users` `u_req` on((`wo`.`requestor_id` = `u_req`.`id`))) left join `users` `u_ass` on((`wo`.`assigned_user_id` = `u_ass`.`id`))) left join `facilities` `f` on((`a`.`facility_id` = `f`.`id`))) ;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `departments`
--
ALTER TABLE `departments`
  ADD CONSTRAINT `fk_departments_parent` FOREIGN KEY (`parent_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `inventory_reservations`
--
ALTER TABLE `inventory_reservations`
  ADD CONSTRAINT `inventory_reservations_ibfk_1` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `maintenance_requests`
--
ALTER TABLE `maintenance_requests`
  ADD CONSTRAINT `fk_maintenance_requests_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets_unified` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `module_activation_logs`
--
ALTER TABLE `module_activation_logs`
  ADD CONSTRAINT `module_activation_logs_ibfk_1` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `part_inventory_links`
--
ALTER TABLE `part_inventory_links`
  ADD CONSTRAINT `part_inventory_links_ibfk_1` FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `part_inventory_links_ibfk_2` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE RESTRICT;

--
-- Constraints for table `permission_audit_log`
--
ALTER TABLE `permission_audit_log`
  ADD CONSTRAINT `permission_audit_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `permission_audit_log_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `permission_audit_log_ibfk_3` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `permission_audit_log_ibfk_4` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `pm_task_materials`
--
ALTER TABLE `pm_task_materials`
  ADD CONSTRAINT `pm_task_materials_ibfk_1` FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `pm_task_materials_ibfk_2` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE RESTRICT;

--
-- Constraints for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `rwop_wo_failure_analysis`
--
ALTER TABLE `rwop_wo_failure_analysis`
  ADD CONSTRAINT `rwop_wo_failure_analysis_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `rwop_wo_failure_analysis_ibfk_2` FOREIGN KEY (`failure_mode_id`) REFERENCES `rwop_failure_modes` (`id`),
  ADD CONSTRAINT `rwop_wo_failure_analysis_ibfk_3` FOREIGN KEY (`failure_cause_id`) REFERENCES `rwop_failure_causes` (`id`),
  ADD CONSTRAINT `rwop_wo_failure_analysis_ibfk_4` FOREIGN KEY (`failure_remedy_id`) REFERENCES `rwop_failure_remedies` (`id`);

--
-- Constraints for table `rwop_wo_verifications`
--
ALTER TABLE `rwop_wo_verifications`
  ADD CONSTRAINT `rwop_wo_verifications_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_permissions`
--
ALTER TABLE `user_permissions`
  ADD CONSTRAINT `user_permissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_permissions_ibfk_3` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
