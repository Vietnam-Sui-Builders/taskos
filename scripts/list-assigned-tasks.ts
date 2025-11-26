/**
 * Script to list all tasks assigned to a specific address
 * 
 * Usage:
 * npx tsx scripts/list-assigned-tasks.ts <ASSIGNEE_ADDRESS>
 * 
 * Example:
 * npx tsx scripts/list-assigned-tasks.ts 0x34113ecfcf1c0547879eb474818f2433292221926f3776597354124150ab7989
 */

import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

const NETWORK = "testnet";
const REGISTRY_ID = process.env.NEXT_PUBLIC_TASKS_REGISTRY_ID;

async function listAssignedTasks(assigneeAddress: string) {
  const client = new SuiClient({ url: getFullnodeUrl(NETWORK) });

  console.log(`\n🔍 Finding tasks assigned to: ${assigneeAddress}\n`);

  if (!REGISTRY_ID) {
    console.error("❌ NEXT_PUBLIC_TASKS_REGISTRY_ID not set in environment");
    return;
  }

  try {
    // 1. Fetch the registry
    const registryData = await client.getObject({
      id: REGISTRY_ID,
      options: {
        showContent: true,
      },
    });

    if (!registryData.data || registryData.data.content?.dataType !== "moveObject") {
      console.error("❌ Invalid registry data");
      return;
    }

    const fields = registryData.data.content.fields as Record<string, unknown>;
    const tasksByStatus = fields.tasks_by_status as {
      type: string;
      fields: {
        id: { id: string };
        size: string;
      };
    };

    const tableId = tasksByStatus.fields.id.id;

    // 2. Get all task IDs from the table
    const dynamicFields = await client.getDynamicFields({ parentId: tableId });
    const allTaskIds: string[] = [];

    for (const field of dynamicFields.data) {
      try {
        const fieldObject = await client.getDynamicFieldObject({
          parentId: tableId,
          name: field.name,
        });

        if (fieldObject.data?.content && "fields" in fieldObject.data.content) {
          const fieldContent = fieldObject.data.content.fields as Record<string, unknown>;
          const taskIdsVector = fieldContent.value as string[];
          
          if (Array.isArray(taskIdsVector) && taskIdsVector.length > 0) {
            allTaskIds.push(...taskIdsVector);
          }
        }
      } catch (err) {
        console.warn(`Could not fetch tasks for field:`, field.name);
      }
    }

    console.log(`📊 Total tasks in registry: ${allTaskIds.length}\n`);

    // 3. Check each task for assignee
    let foundCount = 0;
    const assignedTasks: Array<{
      id: string;
      title: string;
      status: number;
      creator: string;
    }> = [];

    for (const taskId of allTaskIds) {
      try {
        // Fetch task object
        const taskData = await client.getObject({
          id: taskId,
          options: {
            showContent: true,
          },
        });

        if (!taskData.data || taskData.data.content?.dataType !== "moveObject") {
          continue;
        }

        const taskFields = taskData.data.content.fields as Record<string, unknown>;

        // Check dynamic fields for assignee
        const dynamicFields = await client.getDynamicFields({ parentId: taskId });

        for (const df of dynamicFields.data) {
          // DynamicFieldName can be a string or object; safely pull out a string type key if present
          const dfType =
            typeof df.name === "string"
              ? df.name
              : typeof (df.name as { type?: unknown }).type === "string"
                ? (df.name as { type: string }).type
                : "";
          
          if (typeof dfType === "string" && dfType.includes("AssigneeKey")) {
            try {
              const dfObj = await client.getDynamicFieldObject({
                parentId: taskId,
                name: df.name,
              });
              
              const content = dfObj.data?.content;
              if (content && content.dataType === "moveObject" && "fields" in content) {
                const dfFields = content.fields as Record<string, unknown>;
                const taskAssignee = dfFields.value as string;
                
                if (taskAssignee.toLowerCase() === assigneeAddress.toLowerCase()) {
                  foundCount++;
                  assignedTasks.push({
                    id: taskId,
                    title: String(taskFields.title || "Untitled"),
                    status: Number(taskFields.status || 0),
                    creator: String(taskFields.creator || ""),
                  });
                }
              }
            } catch (err) {
              // No assignee or error fetching
            }
          }
        }
      } catch (err) {
        console.warn(`Error checking task ${taskId}:`, err);
      }
    }

    console.log(`✅ Found ${foundCount} task(s) assigned to ${assigneeAddress}\n`);

    if (assignedTasks.length > 0) {
      console.log("📋 Assigned Tasks:\n");
      assignedTasks.forEach((task, index) => {
        console.log(`${index + 1}. ${task.title}`);
        console.log(`   ID: ${task.id}`);
        console.log(`   Creator: ${task.creator}`);
        console.log(`   Status: ${getStatusLabel(task.status)}`);
        console.log();
      });
    } else {
      console.log("⚠️  No tasks assigned to this address");
    }

    console.log("✨ Done!\n");

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

// Main execution
const assigneeAddress = process.argv[2];

if (!assigneeAddress) {
  console.error("\n❌ Please provide an assignee address as an argument\n");
  console.log("Usage: npx tsx scripts/list-assigned-tasks.ts <ASSIGNEE_ADDRESS>\n");
  console.log("Example:");
  console.log("  npx tsx scripts/list-assigned-tasks.ts 0x34113ecfcf1c0547879eb474818f2433292221926f3776597354124150ab7989\n");
  process.exit(1);
}

listAssignedTasks(assigneeAddress);
