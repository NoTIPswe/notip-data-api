#!/usr/bin/env bash
# Fetch a specific OpenAPI spec from a producer repository at a given tag,
# then generate TypeScript types.
#
# Usage:
#   npm run fetch:openapi -- --repo notipswe/some-producer --tag v1.2.3 --file my-api.yaml
#
# Arguments:
#   --repo  Source GitHub repository (required)
#   --tag   Git tag or branch in the source repo (required)
#   --file  Filename inside api-contracts/openapi/ in the source repo (required)
set -euo pipefail

REMOTE_BASE="api-contracts/openapi"
LOCAL_DIR="api-contracts/openapi"
OUT_DIR="src/generated/openapi"

REPO=""
TAG=""
FILE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --repo) REPO="$2"; shift 2 ;;
    --tag)  TAG="$2";  shift 2 ;;
    --file) FILE="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

[[ -z "$REPO" ]] && { echo "Error: --repo is required"; exit 1; }
[[ -z "$TAG"  ]] && { echo "Error: --tag is required";  exit 1; }
[[ -z "$FILE" ]] && { echo "Error: --file is required"; exit 1; }

mkdir -p "$LOCAL_DIR" "$OUT_DIR"

echo "Fetching ${FILE} from ${REPO}@${TAG}..."
gh api \
  -H "Accept: application/vnd.github.raw" \
  "repos/${REPO}/contents/${REMOTE_BASE}/${FILE}?ref=${TAG}" \
  > "${LOCAL_DIR}/${FILE}"

if [[ ! -s "${LOCAL_DIR}/${FILE}" ]]; then
  echo "Error: fetched file is empty (${LOCAL_DIR}/${FILE}). Check --repo/--tag/--file and repository access."
  exit 1
fi

if ! grep -Eq '^[[:space:]]*openapi[[:space:]]*:|"openapi"[[:space:]]*:' "${LOCAL_DIR}/${FILE}"; then
  echo "Error: fetched file does not look like an OpenAPI spec (missing top-level 'openapi' field)."
  exit 1
fi
echo "  Saved → ${LOCAL_DIR}/${FILE}"

NAME="${FILE%.*}"
OUTPUT="${OUT_DIR}/${NAME}.ts"

echo "Generating TypeScript types → ${OUTPUT}"
npx openapi-typescript "${LOCAL_DIR}/${FILE}" -o "${OUTPUT}"

echo "Done."
