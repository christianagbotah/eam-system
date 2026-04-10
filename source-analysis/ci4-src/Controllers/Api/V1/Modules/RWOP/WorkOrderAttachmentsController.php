<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseResourceController;
use App\Services\AttachmentService;
use App\Traits\ApiResponseTrait;

class WorkOrderAttachmentsController extends BaseResourceController
{
    use ApiResponseTrait;
    
    protected $attachmentService;
    protected $format = 'json';

    public function __construct()
    {
        $this->attachmentService = new AttachmentService();
    }

    public function index($workOrderId = null)
    {
        try {
            $attachments = $this->attachmentService->getByWorkOrder($workOrderId);
            return $this->respondSuccess($attachments);
        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function upload($workOrderId = null)
    {
        $files = $this->request->getFiles();
        $userId = $this->getUserId();

        if (empty($files['files'])) {
            return $this->failValidationErrors(['files' => 'No files uploaded']);
        }

        try {
            $uploaded = $this->attachmentService->upload($workOrderId, $files['files'], $userId);
            return $this->respondCreated([
                'success' => true,
                'data' => $uploaded,
                'message' => count($uploaded) . ' file(s) uploaded successfully'
            ]);
        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function delete($attachmentId = null)
    {
        try {
            $this->attachmentService->delete($attachmentId);
            return $this->respondDeleted([
                'success' => true,
                'message' => 'Attachment deleted successfully'
            ]);
        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function download($attachmentId = null)
    {
        try {
            $attachment = model('App\Models\WorkOrderAttachment')->find($attachmentId);
            if (!$attachment || !file_exists($attachment['file_path'])) {
                return $this->failNotFound('File not found');
            }

            return $this->response->download($attachment['file_path'], null, true);
        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    protected function getUserId(): int
    {
        $jwt = service('jwtauth');
        $token = $this->request->getHeaderLine('Authorization');
        
        if ($token && strpos($token, 'Bearer ') === 0) {
            $token = substr($token, 7);
            $payload = $jwt->decode($token);
            return $payload['data']['id'] ?? 1;
        }
        
        return 1;
    }
}
