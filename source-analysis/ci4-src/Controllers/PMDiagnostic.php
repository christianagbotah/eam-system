<?php

namespace App\Controllers;

class PMDiagnostic extends BaseController
{
    public function index()
    {
        $db = db_connect();
        
        echo "<h1>PM System Diagnostic</h1>";
        echo "<style>table{border-collapse:collapse;margin:20px 0;}th,td{border:1px solid #ddd;padding:8px;}th{background:#f2f2f2;}</style>";
        
        // Check Equipment
        echo "<h2>1. Equipment</h2>";
        $equipment = $db->query("SELECT COUNT(*) as count FROM equipment")->getRow();
        echo "<p>Total Equipment: <strong>{$equipment->count}</strong></p>";
        if ($equipment->count > 0) {
            $list = $db->query("SELECT id, name, equipment_id FROM equipment LIMIT 5")->getResult();
            echo "<table><tr><th>ID</th><th>Name</th><th>Equipment ID</th></tr>";
            foreach ($list as $item) {
                echo "<tr><td>{$item->id}</td><td>{$item->name}</td><td>{$item->equipment_id}</td></tr>";
            }
            echo "</table>";
        }
        
        // Check Parts
        echo "<h2>2. Parts</h2>";
        $parts = $db->query("SELECT COUNT(*) as count FROM parts")->getRow();
        echo "<p>Total Parts: <strong>{$parts->count}</strong></p>";
        
        // Check PM Tasks
        echo "<h2>3. PM Tasks</h2>";
        $tasks = $db->query("SELECT COUNT(*) as count FROM pm_tasks")->getRow();
        echo "<p>Total PM Tasks: <strong>{$tasks->count}</strong></p>";
        
        // Check PM Part Tasks
        echo "<h2>4. PM Part Task Assignments</h2>";
        $partTasks = $db->query("SELECT COUNT(*) as count FROM pm_part_tasks WHERE is_active = 1")->getRow();
        echo "<p>Active Part Task Assignments: <strong>{$partTasks->count}</strong></p>";
        if ($partTasks->count > 0) {
            $list = $db->query("SELECT ppt.*, p.name as part_name, pt.task_name 
                FROM pm_part_tasks ppt 
                JOIN parts p ON ppt.part_id = p.id 
                JOIN pm_tasks pt ON ppt.task_id = pt.task_id 
                WHERE ppt.is_active = 1 LIMIT 5")->getResult();
            echo "<table><tr><th>Part</th><th>Task</th><th>Frequency</th></tr>";
            foreach ($list as $item) {
                echo "<tr><td>{$item->part_name}</td><td>{$item->task_name}</td><td>{$item->frequency_value} {$item->frequency_unit}</td></tr>";
            }
            echo "</table>";
        }
        
        // Check PM Schedules (NEW SYSTEM)
        echo "<h2>5. PM Schedules (New System)</h2>";
        $schedules = $db->query("SELECT COUNT(*) as count FROM pm_schedules")->getRow();
        echo "<p>Total Schedules: <strong>{$schedules->count}</strong></p>";
        if ($schedules->count > 0) {
            $due = $db->query("SELECT COUNT(*) as count FROM pm_schedules WHERE next_due_date <= CURDATE() AND status = 'scheduled'")->getRow();
            echo "<p>Due Schedules: <strong>{$due->count}</strong></p>";
        }
        
        // Check PM Schedule Tracking (OLD SYSTEM)
        echo "<h2>6. PM Schedule Tracking (Old System)</h2>";
        try {
            $tracking = $db->query("SELECT COUNT(*) as count FROM pm_schedule_tracking")->getRow();
            echo "<p>Total Tracking Records: <strong>{$tracking->count}</strong></p>";
            if ($tracking->count > 0) {
                $due = $db->query("SELECT COUNT(*) as count FROM pm_schedule_tracking WHERE next_due_date <= CURDATE() AND status = 'scheduled'")->getRow();
                echo "<p>Due Schedules: <strong>{$due->count}</strong></p>";
            }
        } catch (\Exception $e) {
            echo "<p style='color:red;'>Table pm_schedule_tracking does not exist</p>";
        }
        
        // Check Inspection Types
        echo "<h2>7. PM Inspection Types</h2>";
        try {
            $types = $db->query("SELECT * FROM pm_inspection_types")->getResult();
            echo "<p>Total Inspection Types: <strong>" . count($types) . "</strong></p>";
            if (count($types) > 0) {
                echo "<table><tr><th>ID</th><th>Name</th><th>Description</th></tr>";
                foreach ($types as $type) {
                    echo "<tr><td>{$type->inspection_id}</td><td>{$type->inspection_name}</td><td>{$type->inspection_description}</td></tr>";
                }
                echo "</table>";
            }
        } catch (\Exception $e) {
            echo "<p style='color:red;'>Table pm_inspection_types does not exist</p>";
        }
        
        // Check Checklist Templates
        echo "<h2>8. Checklist Templates</h2>";
        $templates = $db->query("SELECT COUNT(*) as count FROM maintenance_checklist_templates")->getRow();
        echo "<p>Total Templates: <strong>{$templates->count}</strong></p>";
        
        $partTemplates = $db->query("SELECT COUNT(*) as count FROM part_checklist_templates WHERE is_active = 1")->getRow();
        echo "<p>Active Part Template Assignments: <strong>{$partTemplates->count}</strong></p>";
        
        // Recommendations
        echo "<h2>Recommendations</h2>";
        echo "<ul>";
        
        if ($equipment->count == 0) {
            echo "<li style='color:red;'>❌ Add equipment/machines first</li>";
        } else {
            echo "<li style='color:green;'>✅ Equipment exists</li>";
        }
        
        if ($parts->count == 0) {
            echo "<li style='color:red;'>❌ Add parts to equipment</li>";
        } else {
            echo "<li style='color:green;'>✅ Parts exist</li>";
        }
        
        if ($tasks->count == 0) {
            echo "<li style='color:red;'>❌ Create PM tasks</li>";
        } else {
            echo "<li style='color:green;'>✅ PM tasks exist</li>";
        }
        
        if ($partTasks->count == 0) {
            echo "<li style='color:red;'>❌ Assign PM tasks to parts</li>";
        } else {
            echo "<li style='color:green;'>✅ PM tasks assigned to parts</li>";
        }
        
        if ($schedules->count == 0) {
            echo "<li style='color:orange;'>⚠️ No PM schedules. <a href='/pm-setup/create-test'>Create test schedules</a></li>";
        } else {
            echo "<li style='color:green;'>✅ PM schedules exist</li>";
        }
        
        echo "</ul>";
        
        echo "<h2>Quick Actions</h2>";
        echo "<ul>";
        echo "<li><a href='/pm-setup/create-test'>Create Test Schedules</a></li>";
        echo "<li><a href='/pmo/generateWorkOrders'>Generate Work Orders</a></li>";
        echo "<li><a href='/pmo'>View PM Work Orders</a></li>";
        echo "<li><a href='/pmo/dashboard'>View PM Dashboard (Checklist Generator)</a></li>";
        echo "</ul>";
    }
}
