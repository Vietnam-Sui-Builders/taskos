/**
 * Script to check task assignee and result blob ID
 * 
 * Usage:
 * npx tsx scripts/check-task-assignee.ts <TASK_ID>
 * 
 * Example:
 * npx tsx scripts/check-task-assignee.ts 0x3033e3eb16d41528ca83a8c91416e1461d0723e2d3c8cc497d0a355b31dccd4f
 */

import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

const NETWORK = "testnet";

async function checkTaskAssignee(taskId: string) {
  const client = new SuiClient({ url: getFullnodeUrl(NETWORK) });

  console.log(`\n🔍 Checking Task: ${taskId}\n`);

  try {
    // 1. Fetch the task object
    const taskData = await client.getObject({
      id: taskId,
      options: {
        showContent: true,
        showOwner: true,
      },
    });

    if (!taskData.data || taskData.data.content?.dataType !== "moveObject") {
      console.error("❌ Invalid task data");
      return;
    }

    const fields = taskData.data.content.fields as Record<string, unknown>;
    
    console.log("📋 Task Information:");
    console.log("  Title:", fields.title);
    console.log("  Creator:", fields.creator);
    console.log("  Status:", getStatusLabel(fields.status as number));
    console.log("  Priority:", getPriorityLabel(fields.priority as number));
    
    // Check result_blob_id
    const resultBlobId = fields.result_blob_id as { vec: string[] } | undefined;
    if (resultBlobId && resultBlobId.vec && resultBlobId.vec.length > 0) {
      console.log("\n✅ Submitted Work (Result Blob ID):");
      console.log("  ", resultBlobId.vec[0]);
    } else {
      console.log("\n⚠️  No submitted work yet");
    }

    // 2. Fetch dynamic fields to find assignee
    console.log("\n🔎 Checking Dynamic Fields...");
    const dynamicFields = await client.getDynamicFields({ parentId: taskId });

    let foundAssignee = false;
    let foundReward = false;

    for (const df of dynamicFields.data) {
      const dfType = typeof df.name === "string" ? df.name : (df.name as Record<string, unknown>)?.type || "";
      
      // Check for AssigneeKey
      if (typeof dfType === "string" && dfType.includes("AssigneeKey")) {
        try {
          const dfObj = await client.getDynamicFieldObject({
            parentId: taskId,
            name: df.name,
          });
          
          const content = dfObj.data?.content;
          if (content && content.dataType === "moveObject" && "fields" in content) {
            const dfFields = content.fields as Record<string, unknown>;
            const assigneeAddress = dfFields.value as string;
            
            console.log("\n👤 Assignee Found:");
            console.log("  Address:", assigneeAddress);
            foundAssignee = true;
          }
        } catch (err) {
          console.error("Error fetching assignee:", err);
        }
      }

      // Check for RewardBalanceKey
      if (typeof dfType === "string" && dfType.includes("RewardBalanceKey")) {
        try {
          const dfObj = await client.getDynamicFieldObject({
            parentId: taskId,
            name: df.name,
          });
          
          const content = dfObj.data?.content;
          if (content && content.dataType === "moveObject" && "fields" in content) {
            const dfFields = content.fields as Record<string, unknown>;
            const balance = dfFields.value as number | string;
            
            console.log("\n💰 Reward Balance:");
            console.log("  Amount:", Number(balance) / 1_000_000_000, "SUI");
            foundReward = true;
          }
        } catch (err) {
          console.error("Error fetching reward:", err);
        }
      }

      // Check for CompletionApprovedKey
      if (typeof dfType === "string" && dfType.includes("CompletionApprovedKey")) {
        try {
          const dfObj = await client.getDynamicFieldObject({
            parentId: taskId,
            name: df.name,
          });
          
          const content = dfObj.data?.content;
          if (content && content.dataType === "moveObject" && "fields" in content) {
            const dfFields = content.fields as Record<string, unknown>;
            const approved = dfFields.value as boolean;
            
            console.log("\n✅ Completion Approved:", approved);
          }
        } catch (err) {
          console.error("Error fetching approval status:", err);
        }
      }
    }

    if (!foundAssignee) {
      console.log("\n⚠️  No assignee set for this task");
    }

    if (!foundReward) {
      console.log("\n⚠️  No reward deposited for this task");
    }

    console.log("\n✨ Done!\n");

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

function getStatusLabel(status: number): string {
  const labels = {
    0: "To Do",
    1: "In Progress",
    2: "Completed",
    3: "Approved",
    4: "Archived",
  };
  return labels[status as keyof typeof labels] || "Unknown";
}

function getPriorityLabel(priority: number): string {
  const labels = {
    1: "Low",
    2: "Medium",
    3: "High",
    4: "Critical",
  };
  return labels[priority as keyof typeof labels] || "Unknown";
}

// Main execution
const taskId = process.argv[2];

if (!taskId) {
  console.error("\n❌ Please provide a task ID as an argument\n");
  console.log("Usage: npx tsx scripts/check-task-assignee.ts <TASK_ID>\n");
  console.log("Example:");
  console.log("  npx tsx scripts/check-task-assignee.ts 0x3033e3eb16d41528ca83a8c91416e1461d0723e2d3c8cc497d0a355b31dccd4f\n");
  process.exit(1);
}

checkTaskAssignee(taskId);
