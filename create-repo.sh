#!/bin/bash

# GitHub repository creation script
echo "Creating GitHub repository..."

# Create public repository with description
gh repo create cv-screening-tool \
  --public \
  --description "AI-powered CV screening platform with recruitment automation features - Phase 1: Basic screening, Phase 2.5: Email automation, candidate pool search, LinkedIn integration" \
  --add-readme=false \
  --clone=false

echo "Repository created successfully!"
echo "Repository URL: https://github.com/$(gh api user --jq .login)/cv-screening-tool"