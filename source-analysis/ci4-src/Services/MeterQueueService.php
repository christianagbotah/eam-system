<?php 

namespace App\Services;

use App\Models\MeterUpdateQueueModel;

class MeterQueueService
{
    protected $queueModel;

    public function __construct()
    {
        $this->queueModel = new \App\Models\MeterUpdateQueueModel();
    }

    public function enqueue(int $meterId, array $payload = [])
    {
        return $this->queueModel->insert([
            'meter_id' => $meterId,
            'payload'  => json_encode($payload),
            'status'   => 'pending',
            'created_at'=> date('Y-m-d H:i:s')
        ], true);
    }

    public function fetchPending($limit = 50)
    {
        return $this->queueModel->where('status','pending')->orderBy('created_at','ASC')->findAll($limit);
    }

    public function markProcessing($id)
    {
        return $this->queueModel->update($id, ['status'=>'processing','updated_at'=>date('Y-m-d H:i:s')]);
    }

    public function markDone($id)
    {
        return $this->queueModel->update($id, ['status'=>'done','updated_at'=>date('Y-m-d H:i:s')]);
    }

    public function markFailed($id, $error, $attempts = null)
    {
        return $this->queueModel->update($id, [
            'status'=>'failed',
            'last_error'=>$error,
            'attempts'=> ($attempts !== null ? $attempts : 1),
            'updated_at'=>date('Y-m-d H:i:s')
        ]);
    }
}