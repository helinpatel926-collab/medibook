#!/usr/bin/env bash
# Installs Argo CD and hands the cluster over to it (app of apps in k8s/argocd/root.yaml).
# Safe to run again: Helm upgrades in place and an existing Grafana login is kept.
# Needs kubectl, helm and openssl, with the current kubectl context pointing at the cluster.
set -euo pipefail

readonly ARGOCD_CHART_VERSION="10.9.2" # Argo CD v3.5.3
readonly ARGOCD_NAMESPACE="argocd"
readonly MONITORING_NAMESPACE="monitoring"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for tool in kubectl helm openssl; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "error: ${tool} is not installed or not on PATH" >&2
    exit 1
  fi
done

echo "kubectl context: $(kubectl config current-context)"

echo "==> Installing Argo CD (chart argo-cd ${ARGOCD_CHART_VERSION})"
helm upgrade --install argocd argo-cd \
  --repo https://argoproj.github.io/argo-helm \
  --version "$ARGOCD_CHART_VERSION" \
  --namespace "$ARGOCD_NAMESPACE" \
  --create-namespace \
  --values "${repo_root}/k8s/argocd/values.yaml" \
  --wait \
  --timeout 10m
kubectl wait --for=condition=Established crd/applications.argoproj.io --timeout=60s

echo "==> Creating the Grafana admin login"
if ! kubectl get namespace "$MONITORING_NAMESPACE" >/dev/null 2>&1; then
  kubectl create namespace "$MONITORING_NAMESPACE"
fi
if kubectl get secret grafana-admin --namespace "$MONITORING_NAMESPACE" >/dev/null 2>&1; then
  echo "Secret ${MONITORING_NAMESPACE}/grafana-admin already exists; keeping it."
else
  grafana_password="$(openssl rand -hex 24)"
  # Passed on stdin to "create" (not "apply"), so the password is not on a command line
  # and is not copied into a last-applied-configuration annotation.
  kubectl create --filename - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: grafana-admin
  namespace: ${MONITORING_NAMESPACE}
type: Opaque
stringData:
  admin-user: admin
  admin-password: "${grafana_password}"
EOF
  unset grafana_password
fi

echo "==> Applying the root application"
kubectl apply --filename "${repo_root}/k8s/argocd/root.yaml"

cat <<EOF

Argo CD now syncs every application in k8s/argocd/apps from Git.

Open the Argo CD UI:
  kubectl port-forward service/argocd-server --namespace ${ARGOCD_NAMESPACE} 8080:80
  Then browse to http://localhost:8080 and sign in as "admin".

Initial admin password:
  kubectl get secret argocd-initial-admin-secret --namespace ${ARGOCD_NAMESPACE} \\
    --output jsonpath='{.data.password}' | base64 --decode; echo

Grafana admin password:
  kubectl get secret grafana-admin --namespace ${MONITORING_NAMESPACE} \\
    --output jsonpath='{.data.admin-password}' | base64 --decode; echo

Follow the rollout:
  kubectl get applications --namespace ${ARGOCD_NAMESPACE} --watch
EOF
