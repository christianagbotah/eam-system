module.exports = [
"[project]/src/components/EAMApp.tsx [app-ssr] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/ssr/src_components_modules_5c06124e._.js",
  "server/chunks/ssr/[root-of-the-server]__917101b2._.js",
  "server/chunks/ssr/node_modules_3ac75fd7._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/src/components/EAMApp.tsx [app-ssr] (ecmascript)");
    });
});
}),
];