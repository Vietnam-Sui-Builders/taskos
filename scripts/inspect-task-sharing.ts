/**
 * Debug script to inspect task sharing and dynamic fields
 * Usage: ts-node scripts/inspect-task-sharing.ts <task-id>
 */

import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";

const TASK_ID = process.argv[2] || "0x3033e3eb16d41528ca83a8c91416e1461d0723e2d3c8cc497d0a355b31dccd4f";

async function inspectTaskSharing() {
    const client = new SuiClient({ url: getFullnodeUrl("testnet") });

    console.log("=".repeat(80));
    console.log("Inspecting Task:", TASK_ID);
    console.log("=".repeat(80));

    // 1. Get the task object
    const taskObj = await client.getObject({
        id: TASK_ID,
        options: {
            showContent: true,
            showOwner: true,
        },
    });

    console.log("\n📦 Task Object:");
    console.log(JSON.stringify(taskObj, null, 2));

    // 2. Get dynamic fields
    console.log("\n🔍 Dynamic Fields:");
    const dynamicFields = await client.getDynamicFields({ parentId: TASK_ID });
    console.log(`Found ${dynamicFields.data.length} dynamic fields`);

    for (const df of dynamicFields.data) {
        console.log("\n  Dynamic Field:");
        console.log("  - Name:", JSON.stringify(df.name, null, 2));
        console.log("  - Object ID:", df.objectId);
        console.log("  - Object Type:", df.objectType);

        // Try to fetch the dynamic field object
        try {
            const dfObj = await client.getDynamicFieldObject({
                parentId: TASK_ID,
                name: df.name,
            });

            console.log("  - Content:", JSON.stringify(dfObj.data?.content, null, 2));

            // If this is AccessControl, try to get the roles table
            const dfName = typeof df.name === "string" ? df.name : df.name?.type || "";
            if (dfName.includes("AccessControlKey")) {
                console.log("\n  🎯 Found AccessControl!");
                
                const content = dfObj.data?.content;
                if (content && content.dataType === "moveObject" && "fields" in content) {
                    const fields = (content as any).fields;
                    console.log("  - Fields:", JSON.stringify(fields, null, 2));
                    
                    // The structure is: fields.value.fields.roles.fields.id.id
                    const valueFields = fields?.value?.fields;
                    const rolesField = valueFields?.roles;
                    const rolesTableId = 
                        rolesField?.fields?.id?.id ||
                        rolesField?.fields?.id ||
                        rolesField?.id?.id ||
                        rolesField?.id;
                    
                    console.log("  - Roles Field:", JSON.stringify(rolesField, null, 2));
                    console.log("  - Roles Table ID:", rolesTableId);
                    
                    if (rolesTableId) {
                        console.log("\n  📋 Fetching roles from table...");
                        const roleDynamicFields = await client.getDynamicFields({ 
                            parentId: rolesTableId 
                        });
                        console.log(`  Found ${roleDynamicFields.data.length} role entries`);
                        
                        for (const roleDF of roleDynamicFields.data) {
                            console.log("\n    Role Entry:");
                            console.log("    - Name:", JSON.stringify(roleDF.name, null, 2));
                            console.log("    - Object ID:", roleDF.objectId);
                            
                            try {
                                const roleEntryObj = await client.getDynamicFieldObject({
                                    parentId: rolesTableId,
                                    name: roleDF.name,
                                });
                                
                                console.log("    - Content:", JSON.stringify(roleEntryObj.data?.content, null, 2));
                                
                                const entryContent = roleEntryObj.data?.content;
                                if (entryContent && entryContent.dataType === "moveObject" && "fields" in entryContent) {
                                    const f = (entryContent as any).fields;
                                    console.log("    - Parsed:");
                                    console.log("      Address:", f.name || f.key || roleDF.name);
                                    console.log("      Role:", f.value || f.val);
                                }
                            } catch (err) {
                                console.error("    Error fetching role entry:", err);
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("  Error fetching dynamic field:", err);
        }
    }

    console.log("\n" + "=".repeat(80));
}

inspectTaskSharing().catch(console.error);
