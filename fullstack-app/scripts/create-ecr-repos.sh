#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# create-ecr-repos.sh
# Creates AWS ECR repositories for Docker images.
# Run this ONCE from your local machine before first deployment.
# Prerequisites: AWS CLI installed and configured (aws configure)
# ═══════════════════════════════════════════════════════════════════════════════

set -e

AWS_REGION="ap-south-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "Creating ECR repositories in region: $AWS_REGION"
echo "AWS Account ID: $ACCOUNT_ID"
echo ""

create_repo() {
  REPO_NAME=$1
  echo "Creating ECR repo: $REPO_NAME..."
  aws ecr create-repository \
    --repository-name "$REPO_NAME" \
    --region "$AWS_REGION" \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256 \
    2>/dev/null && echo "  ✅ Created: $REPO_NAME" \
    || echo "  ⚠️  Already exists (that's fine): $REPO_NAME"

  # Set lifecycle policy — keep only last 10 images
  aws ecr put-lifecycle-policy \
    --repository-name "$REPO_NAME" \
    --region "$AWS_REGION" \
    --lifecycle-policy-text '{
      "rules": [{
        "rulePriority": 1,
        "description": "Keep only 10 most recent images",
        "selection": {
          "tagStatus": "any",
          "countType": "imageCountMoreThan",
          "countNumber": 10
        },
        "action": { "type": "expire" }
      }]
    }' 2>/dev/null && echo "  ✅ Lifecycle policy set"
}

create_repo "taskflow-backend"
create_repo "taskflow-frontend"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ECR repositories ready!"
echo ""
echo "Add these as GitHub Secrets:"
echo "  AWS_ACCOUNT_ID       = $ACCOUNT_ID"
echo "  AWS_ACCESS_KEY_ID    = (from IAM user)"
echo "  AWS_SECRET_ACCESS_KEY= (from IAM user)"
echo "  EC2_HOST             = (your EC2 public IP)"
echo "  EC2_SSH_PRIVATE_KEY  = (contents of your .pem file)"
echo ""
echo "ECR Registry URL:"
echo "  $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
