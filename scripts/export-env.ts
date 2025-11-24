import fs from "fs/promises";
import path from "path";

type PublishJson = any;

async function main() {
  const root = path.resolve(__dirname, "..");
  const publishPath = path.join(root, "move", "publish.json");
  const envExamplePath = path.join(root, ".env.example");
  const envLocalPath = path.join(root, ".env.local");
  const readmePath = path.join(root, "README.md");

  const raw = await fs.readFile(publishPath, "utf8");
  const data: PublishJson = JSON.parse(raw);

  const objectChanges = data.objectChanges || [];

  // packageId: prefer objectChanges published entry, fallback to events[0].packageId
  let packageId: string | undefined;
  for (const c of objectChanges) {
    if (c.type === "published" && c.packageId) {
      packageId = c.packageId;
      break;
    }
  }
  if (!packageId && Array.isArray(data.events) && data.events.length > 0) {
    packageId = data.events[0].packageId;
  }

  // helper to find objectId by objectType substring match
  function findObjectIdByType(predicate: (t: string) => boolean) {
    for (const c of objectChanges) {
      if (!c.objectType) continue;
      if (predicate(c.objectType) && c.objectId) return c.objectId;
      // created entries sometimes have objectType and objectId under created items
    }
    // also scan created array in top-level if present
    if (Array.isArray(data.effects?.created)) {
      for (const created of data.effects.created) {
        const typ = created.reference?.objectType || created.objectType || created.owner?.objectType;
        if (!typ && created.reference && created.reference.objectId) {
          // nothing
        }
      }
    }
    return undefined;
  }

  // but the publish.json uses objectChanges entries with objectType and objectId present
  const tasksRegistryId = (() => {
    for (const c of objectChanges) {
      if (c.objectType && c.objectType.includes("::task_manage::TaskRegistry") && c.objectId) return c.objectId;
    }
    return undefined;
  })();

  const publisherId = (() => {
    for (const c of objectChanges) {
      if (c.objectType === "0x2::package::Publisher" && c.objectId) return c.objectId;
    }
    return undefined;
  })();

  const versionId = (() => {
    for (const c of objectChanges) {
      if (c.objectType && c.objectType.includes("::version::Version") && c.objectId) return c.objectId;
    }
    return undefined;
  })();

  const values: Record<string, string | undefined> = {
    NEXT_PUBLIC_PACKAGE_ID: packageId,
    NEXT_PUBLIC_TASKS_REGISTRY_ID: tasksRegistryId,
    NEXT_PUBLIC_PUBLISHER_ID: publisherId,
    NEXT_PUBLIC_VERSION_ID: versionId,
  };

  // Helper to update or create an env file with the values
  async function updateEnvFile(filePath: string) {
    let content = "";
    try {
      content = await fs.readFile(filePath, "utf8");
    } catch (e) {
      content = "";
    }

    for (const [key, val] of Object.entries(values)) {
      if (!val) continue;
      const re = new RegExp(`^${key}=.*$`, "m");
      if (re.test(content)) {
        content = content.replace(re, `${key}=${val}`);
      } else {
        if (content.length && !content.endsWith("\n")) content += "\n";
        content += `${key}=${val}\n`;
      }
    }

    await fs.writeFile(filePath, content, "utf8");
    console.log(`Updated ${path.basename(filePath)}`);
  }

  // Update both .env.example and .env.local
  await updateEnvFile(envExamplePath);
  await updateEnvFile(envLocalPath);

  // Update README Testnet Contract Addresses code block
  try {
    let readme = await fs.readFile(readmePath, "utf8");
    const newBlockLines: string[] = [];
    if (values.NEXT_PUBLIC_PACKAGE_ID) newBlockLines.push(`NEXT_PUBLIC_PACKAGE_ID=${values.NEXT_PUBLIC_PACKAGE_ID}`);
    if (values.NEXT_PUBLIC_TASKS_REGISTRY_ID) newBlockLines.push(`NEXT_PUBLIC_TASKS_REGISTRY_ID=${values.NEXT_PUBLIC_TASKS_REGISTRY_ID}`);
    if (values.NEXT_PUBLIC_PUBLISHER_ID) newBlockLines.push(`NEXT_PUBLIC_PUBLISHER_ID=${values.NEXT_PUBLIC_PUBLISHER_ID}`);
    if (values.NEXT_PUBLIC_VERSION_ID) newBlockLines.push(`NEXT_PUBLIC_VERSION_ID=${values.NEXT_PUBLIC_VERSION_ID}`);

    const newBlock = newBlockLines.join("\n");

    const sectionRe = /(### 📝 Testnet Contract Addresses\s*\n\s*\n)```[^\n]*\n([\s\S]*?)```/m;
    if (sectionRe.test(readme)) {
      readme = readme.replace(sectionRe, `$1\`\`\`bash\n${newBlock}\n\`\`\``);
      await fs.writeFile(readmePath, readme, "utf8");
      console.log("Updated README.md Testnet Contract Addresses block");
    } else {
      console.warn("Could not find Testnet Contract Addresses section in README.md");
    }
  } catch (e) {
    console.error("Failed to update README.md:", e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
