<?php

namespace App\Controllers;

class PMReset extends BaseController
{
    public function resetDueDates()
    {
        $db = db_connect();
        
        $db->query("UPDATE pm_schedules ps 
            JOIN pm_part_tasks ppt ON ps.part_task_id = ppt.id 
            SET ps.next_due_date = CURDATE(), ps.status = 'scheduled' 
            WHERE ppt.frequency_type != 'usage'");
        $dateCount = $db->affectedRows();
        
        $db->query("UPDATE pm_schedules ps 
            JOIN pm_part_tasks ppt ON ps.part_task_id = ppt.id 
            SET ps.accumulated_usage = 0, ps.status = 'scheduled' 
            WHERE ppt.frequency_type = 'usage'");
        $usageCount = $db->affectedRows();
        
        echo "<h2>PM Due Dates Reset</h2>";
        echo "<p>$dateCount date-based schedules updated to be due today.</p>";
        echo "<p>$usageCount usage-based schedules reset to 0 accumulated usage.</p>";
        echo "<ul>";
        echo "<li><a href='/pmo/dashboard'>Go to PM Dashboard (Checklist Generator)</a></li>";
        echo "<li><a href='/pmo/generateWorkOrders'>Generate Work Orders</a></li>";
        echo "<li><a href='/pmo'>View PM Work Orders</a></li>";
        echo "</ul>";
    }
}
