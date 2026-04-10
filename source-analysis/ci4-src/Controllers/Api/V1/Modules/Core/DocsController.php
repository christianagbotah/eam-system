<?php

namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\Controller;

class DocsController extends Controller
{
    public function openapi()
    {
        $openApiPath = FCPATH . 'api/docs/openapi.json';
        
        if (!file_exists($openApiPath)) {
            return $this->response->setStatusCode(404)->setJSON([
                'error' => 'OpenAPI specification not found'
            ]);
        }

        $openApiContent = file_get_contents($openApiPath);
        
        return $this->response
            ->setContentType('application/json')
            ->setBody($openApiContent);
    }

    public function swagger()
    {
        $swaggerHtml = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Factory Manager API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
    <style>
        html {
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
        }
        *, *:before, *:after {
            box-sizing: inherit;
        }
        body {
            margin:0;
            background: #fafafa;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: "/factorymanager/public/api/v1/docs/openapi.json",
                dom_id: "#swagger-ui",
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                validatorUrl: null,
                tryItOutEnabled: true,
                supportedSubmitMethods: ["get", "post", "put", "delete", "patch"],
                onComplete: function() {
                    console.log("Swagger UI loaded successfully");
                },
                requestInterceptor: function(request) {
                    const token = localStorage.getItem("token");
                    if (token) {
                        request.headers.Authorization = "Bearer " + token;
                    }
                    return request;
                }
            });
        };
    </script>
</body>
</html>';

        return $this->response
            ->setContentType('text/html')
            ->setBody($swaggerHtml);
    }
}
