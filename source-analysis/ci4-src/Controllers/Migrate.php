<?php

namespace App\Controllers;

class Migrate extends BaseController
{
    public function runPmMigration()
    {
        $db = \Config\Database::connect();
        
        try {
            // Create pm_schedule_tracking table
            $db->query("
                CREATE TABLE IF NOT EXISTS `pm_schedule_tracking` (
                  `tracking_id` int(11) NOT NULL AUTO_INCREMENT,
                  `schedule_id` int(11) NOT NULL,
                  `last_completed_date` date DEFAULT NULL,
                  `next_due_date` date NOT NULL,
                  `last_usage_value` decimal(10,2) DEFAULT 0.00,
                  `next_due_usage` decimal(10,2) DEFAULT 0.00,
                  `status` enum('pending','overdue','completed') DEFAULT 'pending',
                  `notes` text DEFAULT NULL,
                  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
                  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  PRIMARY KEY (`tracking_id`),
                  KEY `schedule_id` (`schedule_id`),
                  KEY `status` (`status`),
                  KEY `next_due_date` (`next_due_date`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");
            
            // Create pm_inspection_records table
            $db->query("
                CREATE TABLE IF NOT EXISTS `pm_inspection_records` (
                  `record_id` int(11) NOT NULL AUTO_INCREMENT,
                  `tracking_id` int(11) DEFAULT NULL,
                  `equipment_id` int(11) NOT NULL,
                  `part_id` int(11) DEFAULT NULL,
                  `inspection_type_id` int(11) NOT NULL,
                  `technician_name` varchar(100) NOT NULL,
                  `inspection_date` date NOT NULL,
                  `total_time` time DEFAULT NULL,
                  `overall_notes` text DEFAULT NULL,
                  `overall_status` enum('pass','warning','fail') DEFAULT 'pass',
                  `completed_by` int(11) DEFAULT NULL,
                  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
                  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  PRIMARY KEY (`record_id`),
                  KEY `equipment_id` (`equipment_id`),
                  KEY `inspection_type_id` (`inspection_type_id`),
                  KEY `inspection_date` (`inspection_date`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");
            
            // Create pm_inspection_details table
            $db->query("
                CREATE TABLE IF NOT EXISTS `pm_inspection_details` (
                  `detail_id` int(11) NOT NULL AUTO_INCREMENT,
                  `record_id` int(11) NOT NULL,
                  `part_id` int(11) NOT NULL,
                  `checklist_item_id` int(11) DEFAULT NULL,
                  `method_name` varchar(200) NOT NULL,
                  `standard_value` varchar(100) DEFAULT NULL,
                  `measured_value` varchar(100) DEFAULT NULL,
                  `visual_condition` varchar(50) DEFAULT NULL,
                  `remark` text DEFAULT NULL,
                  `status` enum('pass','warning','fail') DEFAULT 'pass',
                  PRIMARY KEY (`detail_id`),
                  KEY `record_id` (`record_id`),
                  KEY `part_id` (`part_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");
            
            // Insert default data
            $db->query("INSERT IGNORE INTO `pm_type` (`type_id`, `type_name`, `type_description`) VALUES
                (1, 'UBM', 'Usage-Based Maintenance'),
                (2, 'CBM', 'Condition-Based Maintenance'),
                (3, 'FBM', 'Failure-Based Maintenance')");
            
            $db->query("INSERT IGNORE INTO `pm_mode` (`mode_id`, `mode_name`, `mode_description`) VALUES
                (1, 'Inspection', 'Visual and measurement inspection'),
                (2, 'Lubrication', 'Lubrication and greasing'),
                (3, 'Replacement', 'Part replacement')");
            
            $db->query("INSERT IGNORE INTO `pm_inspection_type` (`inspection_id`, `inspection_name`, `inspection_description`) VALUES
                (1, 'Running', 'Inspection while equipment is running'),
                (2, 'Standstill', 'Inspection while equipment is stopped')");
            
            $db->query("INSERT IGNORE INTO `pm_trigger` (`trigger_id`, `trigger_name`, `trigger_description`) VALUES
                (1, 'Time-Based', 'Triggered by number of days'),
                (2, 'Usage-Based', 'Triggered by usage hours or cycles')");
            
            return $this->response->setJSON([
                'status' => 'success',
                'message' => 'PM system tables created successfully! Now visit /pm-setup/initialize'
            ]);
            
        } catch (\Exception $e) {
            return $this->response->setJSON([
                'status' => 'error',
                'message' => $e->getMessage()
            ]);
        }
    }
    
    public function fixFrequency()
    {
        $db = \Config\Database::connect();
        
        try {
            // Update existing decimal values to integers first
            $db->query("UPDATE `pm_schedule` SET `frequency` = CEIL(`frequency`) WHERE `frequency` IS NOT NULL");
            
            // Modify frequency column to integer
            $db->query("ALTER TABLE `pm_schedule` 
                MODIFY COLUMN `frequency` int(11) NOT NULL COMMENT 'Frequency value (days for time-based, hours/km for usage-based)'");
            
            return $this->response->setJSON([
                'status' => 'success',
                'message' => 'Frequency field updated to integer successfully!'
            ]);
            
        } catch (\Exception $e) {
            return $this->response->setJSON([
                'status' => 'error',
                'message' => $e->getMessage()
            ]);
        }
    }
}
