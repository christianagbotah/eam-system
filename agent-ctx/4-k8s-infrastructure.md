# Task ID: 4 — K8s Infrastructure Agent

## Task
Create comprehensive Kubernetes manifests for production deployment of iAssetsPro EAM platform.

## Files Created (12 manifests in `k8s/`)

| # | File | Description |
|---|------|-------------|
| 1 | `namespace.yaml` | Dedicated `iassetspro` namespace with standard labels |
| 2 | `configmap.yaml` | Non-sensitive config: app settings, pool sizes, BullMQ, feature flags, session timeouts |
| 3 | `secret.yaml` | Opaque secret template with placeholder base64 values and replacement instructions |
| 4 | `mariadb-statefulset.yaml` | MariaDB 11.4 StatefulSet: initContainer, 10Gi PVC, slow query log, probes |
| 5 | `redis-deployment.yaml` | Redis 7 Deployment: 256mb maxmemory, allkeys-lru, AOF persistence, 1Gi PVC |
| 6 | `app-deployment.yaml` | Next.js app: 2 replicas, RollingUpdate, initContainers, all 3 probe types, 2Gi/2CPU |
| 7 | `app-service.yaml` | ClusterIP Service for app (80→3000) |
| 8 | `ingress.yaml` | nginx Ingress with TLS, rate limiting, WebSocket, security headers |
| 9 | `hpa.yaml` | HPA: min 2, max 5, CPU 70%, memory 80%, behavior policies |
| 10 | `networkpolicy.yaml` | 7 NetworkPolicies: default deny, explicit allow rules for app↔DB/Redis/WS |
| 11 | `pdb.yaml` | PodDisruptionBudget: minAvailable 1 |
| 12 | `notification-service-deployment.yaml` | Socket.IO service: 1 replica, ports 3004+3005, Redis init, probes |

## Key Design Decisions
- **Zero-trust networking**: Default deny all ingress/egress with explicit allow rules
- **MariaDB as StatefulSet**: Stable network identity for database persistence
- **Redis as Deployment with Recreate**: Avoids split-brain with single-tenant persistence
- **Startup probes**: Give Next.js 60s to build/initialize before liveness kicks in
- **Conservative HPA scale-down**: 300s stabilization prevents pod thrashing
- **Security headers via Ingress**: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
