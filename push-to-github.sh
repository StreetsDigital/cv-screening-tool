#!/bin/bash

# GitHub push script
echo "Adding GitHub remote and pushing code..."

# Get your GitHub username
USERNAME=$(gh api user --jq .login)
echo "GitHub username: $USERNAME"

# Add remote origin
git remote add origin https://github.com/$USERNAME/cv-screening-tool.git

echo "Remote origin added. Pushing code to GitHub..."

# Push code to main branch
git push -u origin main

echo ""
echo "🎉 Success! Repository created and code pushed to GitHub"
echo "Repository URL: https://github.com/$USERNAME/cv-screening-tool"
echo ""
echo "Next steps:"
echo "1. Visit your repository URL above"
echo "2. Review the README.md file"
echo "3. Set up any required secrets for deployment"
echo "4. Start development on Phase 2.5 features!"