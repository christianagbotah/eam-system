/**
 * ══════════════════════════════════════════════════════════════════════════
 * DEPRECATED: Use the API endpoint instead!
 * ══════════════════════════════════════════════════════════════════════════
 *
 * This standalone script has been replaced by the API endpoint:
 *
 *   POST /api/admin/sync-permissions
 *
 * The API endpoint runs inside the Next.js server where Prisma and the
 * MariaDB adapter are already properly initialized — no Bun/mariadb
 * compatibility issues.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * HOW TO USE ON VPS:
 * ──────────────────────────────────────────────────────────────────────────
 *
 * 1. Deploy the latest code:
 *      cd /home/ifleetpro/git/eam-system
 *      git pull origin main
 *      bun run build && pm2 restart all
 *
 * 2. Get an admin auth token (login first):
 *      TOKEN=$(curl -s -X POST /api/auth/login \
 *        -H 'Content-Type: application/json' \
 *        -d '{"username":"admin","password":"<password>"}' \
 *        | jq -r '.token')
 *
 * 3. Run the sync:
 *      curl -X POST /api/admin/sync-permissions \
 *        -H "Authorization: Bearer $TOKEN" \
 *        -H 'Content-Type: application/json' \
 *        | jq .
 *
 * 4. All users must re-login for new permissions to take effect.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * LOCAL TESTING:
 * ──────────────────────────────────────────────────────────────────────────
 *
 *   curl -X POST http://localhost:3000/api/admin/sync-permissions \
 *     -H "Authorization: Bearer <your-admin-token>" \
 *     -H 'Content-Type: application/json'
 *
 * ══════════════════════════════════════════════════════════════════════════
 */

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  This script has been replaced by the API endpoint.');
console.log('  Use: POST /api/admin/sync-permissions');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('See the script header for detailed instructions.');
console.log('');
process.exit(0);
