<?php

namespace App\Controllers\Api\V1\Modules\Core;

use App\Controllers\BaseController;
use App\Models\ProductionSurveyAttachmentModel;
use App\Services\ProductionSurvey\AttachmentService;

class AttachmentController extends BaseController
{
    protected $attachmentModel;
    protected $attachmentService;

    public function __construct()
    {
        $this->attachmentModel = new ProductionSurveyAttachmentModel();
        $this->attachmentService = new AttachmentService();
    }

    public function index($surveyId)
    {
        $attachments = $this->attachmentModel->where('survey_id', $surveyId)->findAll();

        return $this->response->setJSON([
            'status' => 'success',
            'data' => $attachments
        ]);
    }

    public function upload($surveyId)
    {
        $file = $this->request->getFile('file');

        if (!$file) {
            return $this->response->setStatusCode(400)->setJSON([
                'status' => 'error',
                'message' => 'No file uploaded'
            ]);
        }

        try {
            $attachmentId = $this->attachmentService->uploadAttachment($surveyId, $file);

            return $this->response->setStatusCode(201)->setJSON([
                'status' => 'success',
                'message' => 'File uploaded successfully',
                'data' => ['id' => $attachmentId]
            ]);
        } catch (\Exception $e) {
            return $this->response->setStatusCode(400)->setJSON([
                'status' => 'error',
                'message' => $e->getMessage()
            ]);
        }
    }

    public function delete($attachmentId)
    {
        try {
            $this->attachmentService->deleteAttachment($attachmentId);

            return $this->response->setJSON([
                'status' => 'success',
                'message' => 'Attachment deleted successfully'
            ]);
        } catch (\Exception $e) {
            return $this->response->setStatusCode(400)->setJSON([
                'status' => 'error',
                'message' => $e->getMessage()
            ]);
        }
    }
}
