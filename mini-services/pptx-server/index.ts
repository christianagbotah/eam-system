import { serve } from "bun";

const PPTX_PATH = "/home/z/my-project/public/iAssetsPro-WO-Workflow-Presentation.pptx";
const PORT = 3099;

console.log(`PPTX Server starting on port ${PORT}...`);

serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === "/" || url.pathname === "/download") {
      const file = Bun.file(PPTX_PATH);
      return new Response(file, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "Content-Disposition": `attachment; filename="iAssetsPro-WO-Workflow-Presentation.pptx"`,
        },
      });
    }
    
    // Simple HTML page with download button
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Download iAssetsPro WO Workflow Presentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0F172A; color: #E2E8F0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #1E293B; border-radius: 16px; padding: 48px; text-align: center; max-width: 520px; box-shadow: 0 25px 50px rgba(0,0,0,0.5); border: 1px solid #334155; }
    .icon { width: 72px; height: 72px; background: linear-gradient(135deg, #10B981, #06B6D4); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
    .icon svg { width: 36px; height: 36px; fill: white; }
    h1 { font-size: 24px; margin-bottom: 8px; color: white; }
    p { color: #94A3B8; font-size: 14px; line-height: 1.6; margin-bottom: 28px; }
    .btn { display: inline-flex; align-items: center; gap: 8px; background: #10B981; color: white; padding: 14px 32px; border-radius: 10px; font-size: 16px; font-weight: 600; text-decoration: none; transition: all 0.2s; border: none; cursor: pointer; }
    .btn:hover { background: #059669; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16,185,129,0.4); }
    .btn svg { width: 20px; height: 20px; fill: white; }
    .info { margin-top: 20px; font-size: 12px; color: #64748B; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12,11L16,15H13.5V19H10.5V15H8L12,11Z"/></svg>
    </div>
    <h1>iAssetsPro WO Workflow Presentation</h1>
    <p>18 slides covering the complete Maintenance Repairs Work Order workflow — from operator request creation to completion and reporting, with real screenshots from the live application.</p>
    <button class="btn" onclick="window.location.href='/download'">
      <svg viewBox="0 0 24 24"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/></svg>
      Download Presentation (2.6 MB)
    </button>
    <div class="info">iAssetsPro — Enterprise Asset Management Platform | Lightworld Technology</div>
  </div>
</body>
</html>`;
    
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
});

console.log(`PPTX Server running at http://localhost:${PORT}`);