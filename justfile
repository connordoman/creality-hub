# Creality Hub — Docker build & push
#
# Build and push a linux/amd64 :latest image (for TrueNAS / x86 hosts).
# Override the image name: just push image=docker.io/you/creality-hub

image := "ghcr.io/connordoman/creality-hub"
platform := "linux/amd64"
tag := "latest"

default:
    @just --list

# Regenerate PWA icons from scripts/assets/creality-logo.png
icons:
    ./scripts/generate-pwa-icons.sh

# Ensure Docker Buildx is ready (run once on a new machine)
setup:
    docker buildx inspect --bootstrap

# Build linux/amd64 and push :latest
push:
    docker buildx build \
        --platform {{platform}} \
        --tag {{image}}:{{tag}} \
        --push \
        .

# Build & push :VERSION and :latest, then create and push an annotated git tag.
# Usage:
#   just release 0.1.0
#   just release 0.1.0 "Temperature card and UI polish"
release version message='':
    #!/usr/bin/env bash
    set -euo pipefail

    version="{{version}}"
    message="{{message}}"
    docker_tag="${version#v}"
    git_tag="v${docker_tag}"

    echo "Building and pushing {{image}}:${docker_tag} and {{image}}:latest..."
    docker buildx build \
        --platform {{platform}} \
        --tag "{{image}}:${docker_tag}" \
        --tag "{{image}}:latest" \
        --push \
        .

    if git rev-parse "$git_tag" >/dev/null 2>&1; then
        echo "Error: git tag '$git_tag' already exists" >&2
        exit 1
    fi

    tag_message="${message:-Release ${git_tag}}"
    git tag -a "$git_tag" -m "$tag_message"
    git push origin "$git_tag"

    echo "Released ${git_tag}: {{image}}:${docker_tag}"
