(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,470152,e=>{"use strict";function t(e,[t,a]){return Math.min(a,Math.max(t,e))}e.s(["clamp",()=>t])},999682,e=>{"use strict";var t=e.i(271645);function a(e){let a=t.useRef({value:e,previous:e});return t.useMemo(()=>(a.current.value!==e&&(a.current.previous=a.current.value,a.current.value=e),a.current.previous),[e])}e.s(["usePrevious",()=>a])},878894,e=>{"use strict";var t=e.i(582458);e.s(["AlertTriangle",()=>t.default])},515288,e=>{"use strict";var t=e.i(843476),a=e.i(975157);function r({className:e,...r}){return(0,t.jsx)("div",{"data-slot":"card",className:(0,a.cn)("bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",e),...r})}function o({className:e,...r}){return(0,t.jsx)("div",{"data-slot":"card-header",className:(0,a.cn)("@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",e),...r})}function n({className:e,...r}){return(0,t.jsx)("div",{"data-slot":"card-title",className:(0,a.cn)("leading-none font-semibold",e),...r})}function i({className:e,...r}){return(0,t.jsx)("div",{"data-slot":"card-description",className:(0,a.cn)("text-muted-foreground text-sm",e),...r})}function s({className:e,...r}){return(0,t.jsx)("div",{"data-slot":"card-content",className:(0,a.cn)("px-6",e),...r})}e.s(["Card",()=>r,"CardContent",()=>s,"CardDescription",()=>i,"CardHeader",()=>o,"CardTitle",()=>n])},784774,e=>{"use strict";var t=e.i(843476),a=e.i(975157);function r({className:e,...r}){return(0,t.jsx)("div",{"data-slot":"table-container",className:"relative w-full overflow-x-auto",children:(0,t.jsx)("table",{"data-slot":"table",className:(0,a.cn)("w-full caption-bottom text-sm",e),...r})})}function o({className:e,sticky:r,...o}){return(0,t.jsx)("thead",{"data-slot":"table-header",className:(0,a.cn)("[&_tr]:border-b",r&&"sticky top-0 z-10",e),...o})}function n({className:e,...r}){return(0,t.jsx)("tbody",{"data-slot":"table-body",className:(0,a.cn)("[&_tr:last-child]:border-0",e),...r})}function i({className:e,...r}){return(0,t.jsx)("tr",{"data-slot":"table-row",className:(0,a.cn)("hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",e),...r})}function s({className:e,...r}){return(0,t.jsx)("th",{"data-slot":"table-head",className:(0,a.cn)("text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",e),...r})}function l({className:e,...r}){return(0,t.jsx)("td",{"data-slot":"table-cell",className:(0,a.cn)("p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",e),...r})}e.s(["Table",()=>r,"TableBody",()=>n,"TableCell",()=>l,"TableHead",()=>s,"TableHeader",()=>o,"TableRow",()=>i])},677572,e=>{"use strict";var t=e.i(843476),a=e.i(271645),r=e.i(981140),o=e.i(30030),n=e.i(842727),i=e.i(296626),s=e.i(248425),l=e.i(586318),d=e.i(369340),c=e.i(610772),u="Tabs",[p,b]=(0,o.createContextScope)(u,[n.createRovingFocusGroupScope]),f=(0,n.createRovingFocusGroupScope)(),[m,x]=p(u),h=a.forwardRef((e,a)=>{let{__scopeTabs:r,value:o,onValueChange:n,defaultValue:i,orientation:p="horizontal",dir:b,activationMode:f="automatic",...x}=e,h=(0,l.useDirection)(b),[g,v]=(0,d.useControllableState)({prop:o,onChange:n,defaultProp:i??"",caller:u});return(0,t.jsx)(m,{scope:r,baseId:(0,c.useId)(),value:g,onValueChange:v,orientation:p,dir:h,activationMode:f,children:(0,t.jsx)(s.Primitive.div,{dir:h,"data-orientation":p,...x,ref:a})})});h.displayName=u;var g="TabsList",v=a.forwardRef((e,a)=>{let{__scopeTabs:r,loop:o=!0,...i}=e,l=x(g,r),d=f(r);return(0,t.jsx)(n.Root,{asChild:!0,...d,orientation:l.orientation,dir:l.dir,loop:o,children:(0,t.jsx)(s.Primitive.div,{role:"tablist","aria-orientation":l.orientation,...i,ref:a})})});v.displayName=g;var y="TabsTrigger",w=a.forwardRef((e,a)=>{let{__scopeTabs:o,value:i,disabled:l=!1,...d}=e,c=x(y,o),u=f(o),p=C(c.baseId,i),b=k(c.baseId,i),m=i===c.value;return(0,t.jsx)(n.Item,{asChild:!0,...u,focusable:!l,active:m,children:(0,t.jsx)(s.Primitive.button,{type:"button",role:"tab","aria-selected":m,"aria-controls":b,"data-state":m?"active":"inactive","data-disabled":l?"":void 0,disabled:l,id:p,...d,ref:a,onMouseDown:(0,r.composeEventHandlers)(e.onMouseDown,e=>{l||0!==e.button||!1!==e.ctrlKey?e.preventDefault():c.onValueChange(i)}),onKeyDown:(0,r.composeEventHandlers)(e.onKeyDown,e=>{[" ","Enter"].includes(e.key)&&c.onValueChange(i)}),onFocus:(0,r.composeEventHandlers)(e.onFocus,()=>{let e="manual"!==c.activationMode;m||l||!e||c.onValueChange(i)})})})});w.displayName=y;var j="TabsContent",T=a.forwardRef((e,r)=>{let{__scopeTabs:o,value:n,forceMount:l,children:d,...c}=e,u=x(j,o),p=C(u.baseId,n),b=k(u.baseId,n),f=n===u.value,m=a.useRef(f);return a.useEffect(()=>{let e=requestAnimationFrame(()=>m.current=!1);return()=>cancelAnimationFrame(e)},[]),(0,t.jsx)(i.Presence,{present:l||f,children:({present:a})=>(0,t.jsx)(s.Primitive.div,{"data-state":f?"active":"inactive","data-orientation":u.orientation,role:"tabpanel","aria-labelledby":p,hidden:!a,id:b,tabIndex:0,...c,ref:r,style:{...e.style,animationDuration:m.current?"0s":void 0},children:a&&d})})});function C(e,t){return`${e}-trigger-${t}`}function k(e,t){return`${e}-content-${t}`}T.displayName=j;var N=e.i(975157);function $({className:e,...a}){return(0,t.jsx)(h,{"data-slot":"tabs",className:(0,N.cn)("flex flex-col gap-2",e),...a})}function A({className:e,...a}){return(0,t.jsx)(v,{"data-slot":"tabs-list",className:(0,N.cn)("bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",e),...a})}function R({className:e,...a}){return(0,t.jsx)(w,{"data-slot":"tabs-trigger",className:(0,N.cn)("data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",e),...a})}function z({className:e,...a}){return(0,t.jsx)(T,{"data-slot":"tabs-content",className:(0,N.cn)("flex-1 outline-none",e),...a})}e.s(["Tabs",()=>$,"TabsContent",()=>z,"TabsList",()=>A,"TabsTrigger",()=>R],677572)},212426,e=>{"use strict";let t=(0,e.i(475254).default)("dollar-sign",[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]]);e.s(["DollarSign",()=>t],212426)},509694,e=>{"use strict";var t=e.i(883966),a=e.i(475225),r=e.i(785183),o=e.i(93230),n=e.i(844171),i=(0,t.generateCategoricalChart)({chartName:"BarChart",GraphicalChild:a.Bar,defaultTooltipEventType:"axis",validateTooltipEventTypes:["axis","item"],axisComponents:[{axisType:"xAxis",AxisComp:r.XAxis},{axisType:"yAxis",AxisComp:o.YAxis}],formatAxisMap:n.formatAxisMap});e.s(["BarChart",()=>i])},27365,e=>{"use strict";let t=(0,e.i(475254).default)("file-down",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M12 18v-6",key:"17g6i2"}],["path",{d:"m9 15 3 3 3-3",key:"1npd3o"}]]);e.s(["FileDown",()=>t],27365)},561951,e=>{"use strict";function t(e){let{title:t,subtitle:a,headers:r,rows:o,filename:n="report",orientation:i="landscape",summary:s}=e,l=s&&s.length>0?`
    <div class="summary">
      ${s.map(e=>`
        <div class="summary-item">
          <span class="summary-label">${e.label}</span>
          <span class="summary-value">${e.value}</span>
        </div>
      `).join("")}
    </div>
  `:"",d=new Blob([`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${t}</title>
  <style>
    @page { size: ${i}; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; color: #333; line-height: 1.5; }
    h1 { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 2px; }
    .subtitle { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
    .date { font-size: 10px; color: #9ca3af; margin-bottom: 16px; }
    .summary {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
    }
    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 11px;
    }
    .summary-label { color: #374151; }
    .summary-value { font-weight: 700; color: #059669; }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      background: #059669;
      color: #ffffff;
      padding: 8px 12px;
      text-align: left;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      white-space: nowrap;
    }
    tbody td {
      padding: 7px 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 10px;
      color: #374151;
    }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody tr:hover { background: #f0fdf4; }
    .footer {
      margin-top: 24px;
      font-size: 9px;
      color: #9ca3af;
      border-top: 1px solid #e5e7eb;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
    }
    .footer-brand { font-weight: 600; color: #6b7280; }
  </style>
</head>
<body>
  <h1>${t}</h1>
  ${a?`<div class="subtitle">${a}</div>`:""}
  <div class="date">Generated: ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})} at ${new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</div>
  ${l}
  ${o.length>0?`
  <table>
    <thead>
      <tr>${r.map(e=>`<th>${e}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${o.map(e=>`<tr>${e.map(e=>`<td>${e??""}</td>`).join("")}</tr>`).join("")}
    </tbody>
  </table>
  `:'<p style="color:#9ca3af; font-style:italic;">No data available for the selected filters.</p>'}
  <div class="footer">
    <span class="footer-brand">iAssetsPro EAM — Enterprise Asset Management</span>
    <span>Generated automatically</span>
  </div>
</body>
</html>`],{type:"text/html;charset=utf-8"}),c=URL.createObjectURL(d),u=window.open(c,"_blank");u&&(u.onload=()=>{u.print(),setTimeout(()=>URL.revokeObjectURL(c),5e3)})}e.s(["exportPDF",()=>t])}]);

//# sourceMappingURL=8a564659c9edd1a5.js.map