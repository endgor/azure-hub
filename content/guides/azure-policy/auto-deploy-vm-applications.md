---
title: "VM Application Auto-Deployment with Azure Policy"
description: "Automation of VM applications deployment using Azure Policy"
category: "azure-policy"
tags: ["policy", "vm", "vm-applications", "automation"]
date: "2025-12-03"
---

# Enforce VM Applications with Custom Azure Policy

**[VM Applications](https://learn.microsoft.com/en-us/azure/virtual-machines/vm-applications?tabs=template%2CVM%2Cubuntu)** is a handy Azure feature that lets you package and deploy applications to your VMs in a consistent way. It's often overlooked, but it can save you a lot of time.

If you're deploying VMs with code (Bicep, Terraform, etc.), you probably already handle application installation automatically. But with **manual VM deployments**, it's easy to forget installing things like monitoring agents, security tools, or other required software. And once VMs are deployed, it's hard to keep track of which ones are missing applications.

Azure Policy doesn't have a built-in policy for this, but you can create a simple **custom policy** that automatically deploys missing applications to your VMs. As a bonus, you'll get an easy overview of which VMs are missing applications.

## Setup Steps

### 1. Create a New Policy Definition

Create a new policy definition with the following policy rule:

```json
{
  "mode": "Indexed",
  "policyRule": {
    "if": {
      "allOf": [
        {
          "field": "type",
          "equals": "Microsoft.Compute/virtualMachines"
        },
        {
          "field": "Microsoft.Compute/virtualMachines/storageProfile.osDisk.osType",
          "equals": "Windows"
        }
      ]
    },
    "then": {
      "effect": "DeployIfNotExists",
      "details": {
        "type": "Microsoft.Compute/virtualMachines",
        "name": "[field('name')]",
        "evaluationDelay": "AfterProvisioning",
        "roleDefinitionIds": [
          "/providers/Microsoft.Authorization/roleDefinitions/9980e02c-c2be-4d73-94e8-173b1dc7cf3c"
        ],
        "existenceCondition": {
          "anyOf": [
            {
              "field": "Microsoft.Compute/virtualMachines/applicationProfile.galleryApplications[*].packageReferenceId",
              "like": "[concat(parameters('vmApplicationId'), '/*')]"
            }
          ]
        },
        "deployment": {
          "properties": {
            "mode": "incremental",
            "parameters": {
              "vmName": {
                "value": "[field('name')]"
              },
              "location": {
                "value": "[field('location')]"
              },
              "vmApplicationVersionId": {
                "value": "[concat(parameters('vmApplicationId'), '/versions/latest')]"
              }
            },
            "template": {
              "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
              "contentVersion": "1.0.0.0",
              "parameters": {
                "vmName": {
                  "type": "string"
                },
                "location": {
                  "type": "string"
                },
                "vmApplicationVersionId": {
                  "type": "string"
                }
              },
              "resources": [
                {
                  "type": "Microsoft.Compute/virtualMachines",
                  "apiVersion": "2024-03-01",
                  "name": "[parameters('vmName')]",
                  "location": "[parameters('location')]",
                  "properties": {
                    "applicationProfile": {
                      "galleryApplications": [
                        {
                          "packageReferenceId": "[parameters('vmApplicationVersionId')]",
                          "treatFailureAsDeploymentFailure": true
                        }
                      ]
                    }
                  }
                }
              ]
            }
          }
        }
      }
    }
  },
  "parameters": {
    "vmApplicationId": {
      "type": "String",
      "metadata": {
        "displayName": "VM Application",
        "description": "Select the VM Application to deploy. The latest version will be used automatically.",
        "strongType": "Microsoft.Compute/galleries/applications"
      }
    }
  }
}
```

### 2. Assign the Policy

Assign the policy to your subscription or resource group.

### 3. Set the Parameters

When assigning the policy, you'll need to pick:

- Your **subscription**
- The **gallery** where your application lives
- The **application** you want to auto-deploy

**Note:** Need multiple applications? Create a separate policy assignment for each one.

> For Linux VMs you need to create a separate policy and change `"Windows"` to `"Linux"` in the policy rule.

### 4. Copy the Managed Identity ID

1. Go to your assigned policy and click **View assignment**
2. Find the **Managed Identity** section
3. Copy the **Principal ID** (you'll need this in the next step)

### 5. Give the Policy Reader Access

Head over to your **Azure Compute Gallery** and assign the **Reader** role to the Principal ID you just copied.

⚠️ **Important:** The policy needs this permission to read the application from the gallery. Without it, deployments will fail.

### 6. You're Done

That's it! From now on:

- **New VMs** will automatically get the application during creation
- **Existing VMs** can be fixed by running a remediation task from the policy assignment page
