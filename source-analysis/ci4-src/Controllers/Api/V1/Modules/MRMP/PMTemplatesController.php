<?php

namespace App\Controllers\Api\V1\Modules\MRMP;

use App\Controllers\Api\V1\BaseResourceController;
use App\Services\PM\PMTemplateService;
use CodeIgniter\HTTP\ResponseInterface;

class PMTemplatesController extends BaseResourceController
{
    protected $templateService;

    public function __construct()
    {
        $this->templateService = new PMTemplateService();
    }

    public function index(): ResponseInterface
    {
        try {
            $filters = [
                'active' => $this->request->getGet('active'),
                'asset_node_type' => $this->request->getGet('asset_node_type'),
                'maintenance_type' => $this->request->getGet('maintenance_type'),
                'priority' => $this->request->getGet('priority')
            ];

            $templates = $this->templateService->listTemplates(array_filter($filters));

            return $this->respond([
                'success' => true,
                'data' => $templates,
                'error' => null
            ]);

        } catch (\Exception $e) {
            return $this->respond([
                'success' => false,
                'data' => null,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id = null): ResponseInterface
    {
        try {
            $template = $this->templateService->getTemplate($id);

            if (!$template) {
                return $this->respond([
                    'success' => false,
                    'data' => null,
                    'error' => 'Template not found'
                ], 404);
            }

            return $this->respond([
                'success' => true,
                'data' => $template,
                'error' => null
            ]);

        } catch (\Exception $e) {
            return $this->respond([
                'success' => false,
                'data' => null,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function create(): ResponseInterface
    {
        try {
            $payload = $this->request->getJSON(true);
            $result = $this->templateService->createTemplate($payload);

            return $this->respond([
                'success' => true,
                'data' => $result,
                'error' => null
            ], 201);

        } catch (\Exception $e) {
            return $this->respond([
                'success' => false,
                'data' => null,
                'error' => $e->getMessage()
            ], 400);
        }
    }

    public function update($id = null): ResponseInterface
    {
        try {
            $payload = $this->request->getJSON(true);
            $result = $this->templateService->updateTemplate($id, $payload);

            return $this->respond([
                'success' => true,
                'data' => $result,
                'error' => null
            ]);

        } catch (\Exception $e) {
            return $this->respond([
                'success' => false,
                'data' => null,
                'error' => $e->getMessage()
            ], 400);
        }
    }

    public function delete($id = null): ResponseInterface
    {
        try {
            $db = \Config\Database::connect();
            $result = $db->table('pm_templates')->where('id', $id)->delete();

            if (!$result) {
                return $this->respond([
                    'success' => false,
                    'data' => null,
                    'error' => 'Template not found'
                ], 404);
            }

            return $this->respond([
                'success' => true,
                'data' => ['deleted' => true],
                'error' => null
            ]);

        } catch (\Exception $e) {
            return $this->respond([
                'success' => false,
                'data' => null,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function activate($id = null): ResponseInterface
    {
        try {
            $db = \Config\Database::connect();
            $result = $db->table('pm_templates')->where('id', $id)->update(['active' => 1]);

            if (!$result) {
                return $this->respond([
                    'success' => false,
                    'data' => null,
                    'error' => 'Template not found'
                ], 404);
            }

            return $this->respond([
                'success' => true,
                'data' => ['activated' => true],
                'error' => null
            ]);

        } catch (\Exception $e) {
            return $this->respond([
                'success' => false,
                'data' => null,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function deactivate($id = null): ResponseInterface
    {
        try {
            $db = \Config\Database::connect();
            $result = $db->table('pm_templates')->where('id', $id)->update(['active' => 0]);

            if (!$result) {
                return $this->respond([
                    'success' => false,
                    'data' => null,
                    'error' => 'Template not found'
                ], 404);
            }

            return $this->respond([
                'success' => true,
                'data' => ['deactivated' => true],
                'error' => null
            ]);

        } catch (\Exception $e) {
            return $this->respond([
                'success' => false,
                'data' => null,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
