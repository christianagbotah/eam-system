import { serve } from "bun";

const PPTX_PATH = "/home/z/my-project/public/WO-Workflow-Presentation.pptx";
const PPTX_FILE = Bun.file(PPTX_PATH);

const HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Download Presentation</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;
background:linear-gradient(135deg,#0f172a 0%,#05332a 50%,#0f172a 100%);
font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.card{background:#fff;border-radius:20px;padding:48px 40px;max-width:500px;width:90%;
text-align:center;box-shadow:0 25px 60px rgba(0,0,0,.3)}
.icon{width:72px;height:72px;background:linear-gradient(135deg,#059669,#0d9488);
border-radius:18px;display:flex;align-items:center;justify-content:center;
margin:0 auto 24px;box-shadow:0 8px 24px rgba(5,150,105,.25)}
.icon svg{width:36px;height:36px;color:#fff}
h1{font-size:22px;color:#1e293b;margin-bottom:8px;font-weight:700}
p{font-size:14px;color:#64748b;margin-bottom:28px;line-height:1.6}
.btn{display:inline-flex;align-items:center;gap:10px;
background:linear-gradient(135deg,#059669,#0d9488);color:#fff;border:none;
padding:16px 32px;border-radius:14px;font-size:16px;font-weight:600;
cursor:pointer;text-decoration:none;
box-shadow:0 6px 20px rgba(5,150,105,.3);transition:all .2s}
.btn:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(5,150,105,.4)}
.btn svg{width:20px;height:20px}
.size{font-size:12px;color:#94a3b8;margin-top:16px}
</style></head>
<body>
<div class="card">
  <div class="icon">
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M12 10v6m0 0l-3-3m3 3l3-3M6 20h12a2 2 0 002-2V8l-6-6H6a2 2 0 00-2 2v14a2 2 0 002 2z"/>
    </svg>
  </div>
  <h1>WO Workflow Presentation</h1>
  <p>iAssetsPro Maintenance Repairs Work Order Module<br>19 slides with real app screenshots — from request to closure.</p>
  <a class="btn" href="/download" download="iAssetsPro-WO-Workflow-Presentation.pptx">
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/>
    </svg>
    Download PPTX (7 MB)
  </a>
  <p class="size">iAssetsPro-WO-Workflow-Presentation.pptx &middot; 19 slides &middot; 7.0 MB</p>
</div>
</body></html>`;

serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/download") {
      return new Response(PPTX_FILE, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "Content-Disposition": "attachment; filename=iAssetsPro-WO-Workflow-Presentation.pptx",
        },
      });
    }
    return new Response(HTML, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
});

console.log("Download server running on http://localhost:3000");