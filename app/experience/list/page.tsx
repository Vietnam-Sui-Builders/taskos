"use client";

import { useEffect, useMemo, useState } from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ExternalLink, Hash, Shield, Layers, FileCode, Copy } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface ExperienceWithDetails {
  id: string;
  skill: string;
  domain: string;
  difficulty: number;
  quality_score: number;
  price: number;
  taskId: string;
  walrus_blob_id: string;
  seal_policy_id: string;
  sealPolicy?: {
    id: string;
    policy_type: number;
    walrus_blob_id: string;
    seal_policy_id: string;
  };
}

export default function ExperienceListPage() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const [experiences, setExperiences] = useState<ExperienceWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;

  const experienceStruct = useMemo(() => {
    if (!packageId) return "";
    return `${packageId}::experience::Experience`;
  }, [packageId]);

  const sealPolicyStruct = useMemo(() => {
    if (!packageId) return "";
    return `${packageId}::seal_integration::SEALPolicy`;
  }, [packageId]);

  useEffect(() => {
    const fetchExperiences = async () => {
      if (!account?.address || !packageId) {
        setExperiences([]);
        return;
      }

      setIsLoading(true);
      try {
        // Query for ExperienceMinted events created by this wallet
        const events = await client.queryEvents({
          query: {
            MoveEventType: `${packageId}::experience::ExperienceMinted`,
          },
          limit: 100,
          order: "descending",
        });

        // Filter events by creator
        const userEvents = events.data.filter((event) => {
          const parsed = event.parsedJson as { creator?: string };
          return parsed?.creator?.toLowerCase() === account.address.toLowerCase();
        });

        // Fetch SEAL policies owned by the wallet
        const policyResp = await client.getOwnedObjects({
          owner: account.address,
          filter: { StructType: sealPolicyStruct },
          options: { showContent: true },
        });

        // Also query SEAL policy creation events as a fallback
        const policyEvents = await client.queryEvents({
          query: {
            MoveEventType: `${packageId}::seal_integration::SEALPolicyCreated`,
          },
          limit: 100,
          order: "descending",
        });

        // Create a map of SEAL policies by experience_id
        const policyMap = new Map<string, any>();
        
        // First, add policies from owned objects
        policyResp.data.forEach((obj) => {
          const content: any = obj.data?.content;
          if (content?.dataType !== "moveObject") return;
          const fields = content.fields as Record<string, any>;
          const experienceId = String(fields.experience_id || "");
          if (experienceId) {
            policyMap.set(experienceId, {
              id: obj.data!.objectId,
              policy_type: Number(fields.policy_type),
              walrus_blob_id: String(fields.walrus_blob_id || ""),
              seal_policy_id: String(fields.seal_policy_id || ""),
            });
          }
        });

        // Then, add policies from events (in case they're shared objects)
        for (const event of policyEvents.data) {
          try {
            const eventData = event.parsedJson as {
              policy_id?: string;
              experience_id?: string;
              policy_type?: number;
            };
            
            const experienceId = String(eventData.experience_id || "");
            const policyId = String(eventData.policy_id || "");
            
            if (experienceId && policyId && !policyMap.has(experienceId)) {
              // Fetch the actual policy object to get all fields
              const policyObj = await client.getObject({
                id: policyId,
                options: { showContent: true },
              });

              const policyContent: any = policyObj.data?.content;
              if (policyContent?.dataType === "moveObject") {
                const policyFields = policyContent.fields as Record<string, any>;
                policyMap.set(experienceId, {
                  id: policyId,
                  policy_type: Number(policyFields.policy_type || 0),
                  walrus_blob_id: String(policyFields.walrus_blob_id || ""),
                  seal_policy_id: String(policyFields.seal_policy_id || ""),
                });
              }
            }
          } catch (err) {
            console.warn("Failed to fetch policy from event:", err);
          }
        }

        const items: ExperienceWithDetails[] = [];
        
        // Fetch each experience object
        for (const event of userEvents) {
          try {
            const eventData = event.parsedJson as {
              experience_id?: string;
              task_id?: string;
              creator?: string;
              seal_policy_id?: string;
              license_type?: number;
              copy_limit?: number;
              price?: number;
            };

            const experienceId = eventData.experience_id;
            if (!experienceId) continue;

            // Fetch the experience object
            const expObj = await client.getObject({
              id: experienceId,
              options: { showContent: true },
            });

            const content: any = expObj.data?.content;
            if (content?.dataType !== "moveObject") continue;
            const fields = content.fields as Record<string, any>;

            const sealPolicy = policyMap.get(experienceId);
            
            items.push({
              id: experienceId,
              skill: String(fields.skill || "Unknown"),
              domain: String(fields.domain || "General"),
              difficulty: Number(fields.difficulty || 3),
              quality_score: Number(fields.quality_score || 80),
              price: Number(fields.price || 0),
              taskId: String(fields.task_id || ""),
              walrus_blob_id: String(
                fields.walrus_content_blob_id?.vec?.[0] ||
                fields.walrus_result_blob_id?.vec?.[0] ||
                ""
              ),
              seal_policy_id: String(fields.seal_policy_id || ""),
              sealPolicy,
            });
          } catch (err) {
            console.warn("Failed to fetch experience:", err);
          }
        }

        setExperiences(items);
      } catch (error) {
        console.error("Failed to load experiences", error);
        toast.error("Failed to load experiences from wallet");
      } finally {
        setIsLoading(false);
      }
    };

    fetchExperiences();
  }, [account?.address, client, packageId, sealPolicyStruct]);

  const getPolicyTypeLabel = (type: number) => {
    switch (type) {
      case 0: return "Private";
      case 1: return "Allowlist";
      case 2: return "Subscription";
      default: return `Type ${type}`;
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy");
    }
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "18rem",
          "--header-height": "3rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col bg-background selection:bg-primary/20 selection:text-primary overflow-x-hidden relative">
          <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background opacity-70" />
            <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-primary/5 to-transparent" />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
          </div>

          <main className="flex-1 relative z-10 p-4 md:p-6 lg:p-8 space-y-6">
            <header className="space-y-2">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                Experience Management
              </p>
              <h1 className="text-3xl md:text-4xl font-bold font-display tracking-wider text-primary glow-text">
                My Experience NFTs
              </h1>
              <p className="text-sm text-muted-foreground">
                View and manage your minted Experience NFTs with their associated tasks and SEAL policies.
              </p>
            </header>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="font-mono text-primary/80 tracking-widest">LOADING_EXPERIENCES...</p>
              </div>
            ) : experiences.length === 0 ? (
              <Card className="border-primary/10 bg-card/60 backdrop-blur-md">
                <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                    <Layers className="h-8 w-8 text-primary/50" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold font-display text-primary">NO_EXPERIENCES_FOUND</h3>
                    <p className="text-sm text-muted-foreground font-mono max-w-md">
                      You haven't minted any Experience NFTs yet. Complete and approve tasks, then mint them as experiences.
                    </p>
                  </div>
                  <Button asChild className="mt-4">
                    <Link href="/dashboard">Go to Dashboard</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {experiences.map((exp) => (
                  <Card key={exp.id} className="border-primary/10 bg-card/60 backdrop-blur-md hover:shadow-[0_0_20px_rgba(var(--primary),0.2)] transition-all">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-xl font-display flex items-center gap-2">
                            {exp.skill}
                            <Badge variant="secondary" className="text-[10px]">
                              {exp.domain}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="font-mono text-xs mt-1">
                            Experience #{exp.id.slice(0, 8)}...
                          </CardDescription>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                          <Layers className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                        <div className="bg-background/50 rounded-lg p-2 border border-primary/10">
                          <div className="text-muted-foreground">Difficulty</div>
                          <div className="text-foreground font-bold">Level {exp.difficulty}</div>
                        </div>
                        <div className="bg-background/50 rounded-lg p-2 border border-primary/10">
                          <div className="text-muted-foreground">Quality</div>
                          <div className="text-foreground font-bold">{exp.quality_score}%</div>
                        </div>
                        <div className="bg-background/50 rounded-lg p-2 border border-primary/10">
                          <div className="text-muted-foreground">Price</div>
                          <div className="text-foreground font-bold">{(exp.price / 1e9).toFixed(2)} SUI</div>
                        </div>
                      </div>

                      {/* Task Link */}
                      {exp.taskId && (
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1">
                              <div className="text-xs font-mono text-muted-foreground mb-1">Source Task</div>
                              <code className="text-xs text-foreground break-all">{exp.taskId}</code>
                            </div>
                            <Button size="sm" variant="ghost" asChild className="flex-shrink-0">
                              <Link href={`/task/${exp.taskId}`}>
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* SEAL Policy */}
                      {exp.sealPolicy ? (
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-emerald-500" />
                              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                SEAL Policy Active
                              </span>
                            </div>
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                              {getPolicyTypeLabel(exp.sealPolicy.policy_type)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-muted-foreground flex-1 break-all">
                              {exp.sealPolicy.id.slice(0, 16)}...
                            </code>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-emerald-500/10"
                              onClick={() => copyToClipboard(exp.sealPolicy!.id)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm text-yellow-600 dark:text-yellow-400">
                              No SEAL Policy
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Create a SEAL policy to protect this experience data
                          </p>
                          <Button size="sm" variant="outline" className="mt-2 w-full" asChild>
                            <Link href="/experience/create-seal-policy">Create Policy</Link>
                          </Button>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t border-primary/10">
                        <Button size="sm" variant="outline" className="flex-1" asChild>
                          <a
                            href={`https://suiscan.xyz/testnet/object/${exp.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View on Explorer
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(exp.id)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
