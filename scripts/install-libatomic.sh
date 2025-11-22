#!/usr/bin/env bash
set -euo pipefail

# Install libatomic on the build host so native Node binaries (like esbuild) load correctly
# Vercel can run on Ubuntu or Amazon Linux images, so we handle both package managers.
if command -v apt-get >/dev/null 2>&1; then
  echo "Installing libatomic via apt-get..."
  apt-get update >/dev/null
  apt-get install -y libatomic1 >/dev/null
elif command -v yum >/dev/null 2>&1; then
  echo "Installing libatomic via yum..."
  yum install -y libatomic >/dev/null
else
  echo "Warning: No supported package manager found to install libatomic."
fi
