<?php

namespace App\Services;

use App\Models\ModelProcessingJobModel;

class ModelProcessingService
{
    protected $processingJobModel;

    public function __construct()
    {
        $this->processingJobModel = new ModelProcessingJobModel();
    }

    public function queueProcessing(string $modelId): string
    {
        $jobId = $this->generateUUID();
        
        $this->processingJobModel->insert([
            'id' => $jobId,
            'model_id' => $modelId,
            'status' => 'pending'
        ]);

        // Trigger Node.js processing script
        $this->triggerNodeProcessing($modelId, $jobId);

        return $jobId;
    }

    public function updateJobStatus(string $jobId, string $status, ?string $logs = null): bool
    {
        $data = ['status' => $status];
        if ($logs) {
            $data['logs'] = $logs;
        }

        return $this->processingJobModel->update($jobId, $data);
    }

    public function getJobStatus(string $jobId): ?array
    {
        return $this->processingJobModel->find($jobId);
    }

    private function triggerNodeProcessing(string $modelId, string $jobId): void
    {
        $nodeScript = ROOTPATH . 'node-processing/process-model.js';
        $command = "node {$nodeScript} {$modelId} {$jobId}";
        
        // Run in background
        if (PHP_OS_FAMILY === 'Windows') {
            pclose(popen("start /B {$command}", "r"));
        } else {
            exec("{$command} > /dev/null 2>&1 &");
        }
    }

    private function generateUUID(): string
    {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}