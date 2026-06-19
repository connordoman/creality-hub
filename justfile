# Creality Hub — Docker build & push
#
# Build and push a linux/amd64 :latest image (for TrueNAS / x86 hosts).
# Override the image name: just push image=docker.io/you/creality-hub

image := "ghcr.io/connordoman/creality-hub"
platform := "linux/amd64"
tag := "latest"

default:
    @just --list

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
