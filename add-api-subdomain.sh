#!/bin/bash

set -e

echo "🌐 Adding api.pastetosummary.com subdomain to Route 53..."

HOSTED_ZONE_ID="Z04360013VZSDCOSG6CZH"
ELASTIC_IP="177.71.137.52"

# Create the JSON for the DNS change batch
cat > dns-change.json << EOF
{
    "Comment": "Add API subdomain for backend",
    "Changes": [
        {
            "Action": "UPSERT",
            "ResourceRecordSet": {
                "Name": "api.pastetosummary.com",
                "Type": "A",
                "TTL": 300,
                "ResourceRecords": [
                    {
                        "Value": "$ELASTIC_IP"
                    }
                ]
            }
        }
    ]
}
EOF

echo "📝 Creating DNS record for api.pastetosummary.com -> $ELASTIC_IP"

# Apply the DNS change
aws route53 change-resource-record-sets \
    --hosted-zone-id $HOSTED_ZONE_ID \
    --change-batch file://dns-change.json

echo "✅ DNS record created successfully!"
echo ""
echo "🕒 DNS propagation may take up to 5 minutes"
echo "📍 api.pastetosummary.com now points to $ELASTIC_IP"

# Clean up
rm dns-change.json

echo ""
echo "You can test when it's ready with:"
echo "  dig api.pastetosummary.com"
echo "  nslookup api.pastetosummary.com" 