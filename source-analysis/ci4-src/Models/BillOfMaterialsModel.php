<?php

namespace App\Models;

use CodeIgniter\Model;

class BillOfMaterialsModel extends Model
{
    protected $table = 'bill_of_materials';
    protected $primaryKey = 'id';
    protected $allowedFields = ['asset_id', 'bom_name', 'version', 'status', 'effective_date', 'notes'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
