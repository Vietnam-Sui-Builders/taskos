import { useSuiClient, useSuiClientQuery } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";
import { TaskItem } from "@/types";
import { SuiObjectResponse } from "@mysten/sui/client";
import { useMemo } from "react";

// Status constants from Move contract
const STATUS_TODO = 0;
const STATUS_IN_PROGRESS = 1;
const STATUS_COMPLETED = 2;
const STATUS_APPROVED = 3;

// Helper function to convert Move task data to TaskItem
const convertToTaskItem = (taskObject: SuiObjectResponse): TaskItem | null => {
  try {
    if (!taskObject?.data?.content) {
      console.warn("Task object has no content:", taskObject);
      return null;
    }
    if (taskObject.data.content.dataType !== "moveObject") {
      console.warn("Task content is not a moveObject:", taskObject.data.content.dataType);
      return null;
    }

    const fields = taskObject.data.content.fields as Record<string, unknown>;
    const objectId = taskObject.data.objectId;

    const extractOptionValue = (value: unknown): string | undefined => {
      if (!value || typeof value !== "object") return undefined;
      const vecVal = (value as any).vec ?? (value as any).fields?.vec;
      if (Array.isArray(vecVal) && vecVal.length > 0 && vecVal[0] != null) {
        return String(vecVal[0]);
      }
      return undefined;
    };

    const dueDate = extractOptionValue(fields.due_date);
    const createdAt = fields.created_at as string;
    const status = fields.status as number;
    const assignee = fields.assignee as { vec: string[] } | undefined;
    const accessControlTable = fields.access_control as { fields?: { roles: { id: string } } } | undefined;

    console.log("Converting task:", { objectId, fields });

    return {
      id: objectId,
      title: String(fields.title || ""),
      description: String(fields.description || ""),
      creator: String(fields.creator || ""),
      is_completed: status === STATUS_COMPLETED || status === STATUS_APPROVED,
      created_at: new Date(parseInt(createdAt)).toISOString(),
      due_date: dueDate
        ? new Date(parseInt(dueDate)).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      priority: String(fields.priority || 1),
      assignee: assignee?.vec?.[0] || undefined,
      access_control_table_id: accessControlTable?.fields?.roles?.id,
    };
  } catch (error) {
    console.error("Error converting task:", error, taskObject);
    return null;
  }
};

export const useTaskRegistry = (registryId: string | undefined) => {
  const client = useSuiClient();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [rolesByTask, setRolesByTask] = useState<Record<string, Array<{ address: string; role: number }>>>({});

  // Fetch the registry object to get dynamic field info
  const { data: registryData, isLoading: isLoadingRegistry, isError } = useSuiClientQuery(
    "getObject",
    {
      id: registryId!,
      options: {
        showContent: true,
      },
    },
    {
      enabled: !!registryId,
    }
  );

  // Fetch task IDs from dynamic fields
  useEffect(() => {
    const fetchTaskIds = async () => {
      if (!registryId || !registryData?.data?.content) return;
      if (registryData.data.content.dataType !== "moveObject") return;

      try {
        setIsLoadingTasks(true);
        
        // Get the tasks_by_status Table object ID
        const fields = registryData.data.content.fields as Record<string, unknown>;
        const tasksByStatus = fields.tasks_by_status as {
          type: string;
          fields: {
            id: { id: string };
            size: string;
          };
        };

        const tableId = tasksByStatus.fields.id.id;
        console.log("Table ID:", tableId);

        // Get all dynamic fields from the Table object
        const dynamicFields = await client.getDynamicFields({
          parentId: tableId,
        });

        console.log("Dynamic fields:", dynamicFields);

        const allTaskIds: string[] = [];

        // Fetch task IDs for each status
        for (const field of dynamicFields.data) {
          try {
            const fieldObject = await client.getDynamicFieldObject({
              parentId: tableId,
              name: field.name,
            });

            console.log("Field object:", fieldObject);

            if (fieldObject.data?.content && "fields" in fieldObject.data.content) {
              const fieldContent = fieldObject.data.content.fields as Record<string, unknown>;
              const taskIdsVector = fieldContent.value as string[];
              
              if (Array.isArray(taskIdsVector) && taskIdsVector.length > 0) {
                console.log(`Found ${taskIdsVector.length} tasks for status:`, field.name);
                allTaskIds.push(...taskIdsVector);
              }
            }
          } catch (err) {
            console.warn(`Could not fetch tasks for field:`, field.name, err);
          }
        }

        console.log("All task IDs:", allTaskIds);
        setTaskIds(allTaskIds);
      } catch (error) {
        console.error("Error fetching task IDs:", error);
      } finally {
        setIsLoadingTasks(false);
      }
    };

    fetchTaskIds();
  }, [registryId, registryData, client]);

  // Fetch actual task objects
  useEffect(() => {
    const fetchTasks = async () => {
      if (taskIds.length === 0) {
        setTasks([]);
        return;
      }

      try {
        setIsLoadingTasks(true);

        console.log("Fetching task objects for IDs:", taskIds);

        const taskObjects = await client.multiGetObjects({
          ids: taskIds,
          options: {
            showContent: true,
            showOwner: true,
          },
        });

        console.log("Task objects:", taskObjects);

        const convertedTasks = taskObjects
          .map(convertToTaskItem)
          .filter((task): task is TaskItem => task !== null);

        console.log("Converted tasks:", convertedTasks);

        setTasks(convertedTasks);
        // fetch roles for each task that exposes access_control_table_id
        const tasksWithAcl = convertedTasks.filter((t) => t.access_control_table_id);
        if (tasksWithAcl.length) {
          const roleResults: Record<string, Array<{ address: string; role: number }>> = {};
          for (const task of tasksWithAcl) {
            try {
              const tableId = task.access_control_table_id!;
              const dynFields = await client.getDynamicFields({ parentId: tableId });
              const rows: Array<{ address: string; role: number }> = [];
              for (const field of dynFields.data) {
                const dfObj = await client.getDynamicFieldObject({
                  parentId: tableId,
                  name: field.name,
                });
                const moveObj = dfObj.data?.content;
                if (moveObj && moveObj.dataType === "moveObject" && "fields" in moveObj) {
                  const fields = (moveObj as any).fields;
                  if (fields?.key && fields?.value) {
                    rows.push({ address: String(fields.key), role: Number(fields.value) });
                  }
                }
              }
              roleResults[task.id] = rows;
            } catch (err) {
              console.warn("Unable to fetch roles for task", task.id, err);
            }
          }
          setRolesByTask(roleResults);
        } else {
          setRolesByTask({});
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
        setTasks([]);
      } finally {
        setIsLoadingTasks(false);
      }
    };

    fetchTasks();
  }, [taskIds, client]);

  return {
    tasks,
    rolesByTask,
    isLoading: isLoadingRegistry || isLoadingTasks,
    isError,
    refetch: async () => {
      // Trigger refetch by clearing task IDs
      setTaskIds([]);
    },
  };
};
