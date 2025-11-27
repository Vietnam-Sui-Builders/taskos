"use client";

import React, { useState, useEffect } from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AccessDataModal } from "@/components/marketplace";
import { ReencryptModal } from "@/components/marketplace/ReencryptModal";
import { Experience } from "@/components/marketplace/types";

const SELLER_ADDRESS = "0x34113ecfcf1c0547879eb474818f2433292221926f3776597354124150ab7989";

export default function MyExperiencesPage() {
  const currentAccount = useCurrentAccount();
  const client = useSuiClient();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [reencryptExperience, setReencryptExperience] = useState<Experience | null>(null);

  const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;

  useEffect(() => {
    loadMyExperiences();
  }, []);

  const loadMyExperiences = async () => {
    if (!packageId) {
      setError("NEXT_PUBLIC_PACKAGE_ID is not configured");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Query for ExperienceListed events from this seller
      const events = await client.queryEvents({
        query: {
          MoveEventType: `${packageId}::marketplace::ExperienceListed`,
        },
        limit: 100,
        order: 'descending',
      });

      console.log('All marketplace events:', events);

      const myExperiences: Experience[] = [];

      for (const event of events.data) {
        try {
          const eventData = event.parsedJson as Record<string, unknown>;
          const seller = eventData.seller as string;
          
          // Filter by seller address
          if (seller?.toLowerCase() !== SELLER_ADDRESS.toLowerCase()) {
            continue;
          }

          const listingId = eventData.listing_id as string;
          const experienceId = eventData.experience_id as string;

          if (!listingId || !experienceId) continue;

          // Fetch experience object
          const experienceObj = await client.getObject({
            id: experienceId,
            options: { showContent: true },
          });

          const expFields =
            experienceObj.data?.content?.dataType === 'moveObject'
              ? (experienceObj.data.content.fields as Record<string, any>)
              : null;

          if (!expFields) continue;

          // Parse optional fields
          const parseOptionString = (value: any): string => {
            if (!value) return '';
            if (typeof value === 'string') return value;
            if (Array.isArray(value)) return value[0] || '';
            if (typeof value === 'object' && 'vec' in value) {
              const vecVal = (value as any).vec;
              if (Array.isArray(vecVal)) return vecVal[0] || '';
            }
            return '';
          };

          const ratingCount = Number(expFields.rating_count || 0);
          const totalRating = Number(expFields.total_rating || 0);
          const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;
          const walrusContent = parseOptionString(expFields.walrus_content_blob_id);
          const walrusResult = parseOptionString(expFields.walrus_result_blob_id);

          const experience: Experience = {
            id: experienceObj.data!.objectId,
            listingId,
            skill: String(expFields.skill || 'Unknown Skill'),
            domain: String(expFields.domain || 'General'),
            difficulty: parseInt(String(expFields.difficulty || '3')),
            quality_score: parseInt(String(expFields.quality_score || '80')),
            price: Number(eventData.price || 0),
            seller: seller,
            rating: avgRating,
            soldCount: parseInt(String(expFields.sold_count || '0')),
            walrus_blob_id: walrusContent || walrusResult || '',
            seal_policy_id: String(expFields.seal_policy_id || ''),
            timeSpent: parseInt(String(expFields.time_spent || '3600')),
            description: parseOptionString(expFields.description) || '',
          };

          myExperiences.push(experience);
        } catch (err) {
          console.warn('Error parsing experience:', err);
        }
      }

      console.log(`Found ${myExperiences.length} experiences for seller`);
      setExperiences(myExperiences);
    } catch (err) {
      console.error('Failed to load experiences:', err);
      setError('Failed to load your experiences');
    } finally {
      setIsLoading(false);
    }
  };

  const isOwner = currentAccount?.address?.toLowerCase() === SELLER_ADDRESS.toLowerCase();

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
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  My Experiences
                </p>
                <h1 className="text-3xl md:text-4xl font-bold font-display tracking-wider text-primary glow-text">
                  CREATED_EXPERIENCES
                </h1>
                <p className="text-sm text-muted-foreground font-mono mt-2">
                  Seller: <span className="text-foreground">{SELLER_ADDRESS}</span>
                  {isOwner && <span className="text-primary ml-2">(You)</span>}
                  {!isOwner && currentAccount?.address && (
                    <span className="text-yellow-500 ml-2">(Connect seller wallet to manage)</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-4 py-2 rounded-md border border-primary/20 text-primary hover:bg-primary/10 transition-colors font-mono text-xs uppercase tracking-wider"
                  onClick={loadMyExperiences}
                >
                  ↻ Refresh
                </button>
              </div>
            </header>

            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="font-mono text-primary/80 tracking-widest">
                  LOADING_EXPERIENCES...
                </p>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-lg font-mono text-sm">
                {error}
              </div>
            )}

            {!isLoading && !error && experiences.length === 0 && (
              <div className="bg-muted/30 border border-primary/10 p-10 rounded-lg text-center backdrop-blur-md">
                <p className="text-xl font-display text-primary mb-2">
                  NO_EXPERIENCES_FOUND
                </p>
                <p className="text-sm font-mono text-muted-foreground">
                  No experiences created by this seller yet.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {experiences.map((experience) => (
                <div
                  key={experience.id}
                  className="border border-primary/10 rounded-lg bg-card/60 backdrop-blur-md p-4 shadow-sm space-y-3 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                        {experience.domain}
                      </p>
                      <h3 className="text-xl font-display font-bold text-foreground">
                        {experience.skill}
                      </h3>
                      <p className="text-sm text-muted-foreground font-mono">
                        Difficulty {experience.difficulty}/5
                      </p>
                    </div>
                    <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded">
                      #{experience.id.slice(0, 6)}...
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm font-mono">
                    <div className="space-y-1">
                      <p className="text-muted-foreground uppercase tracking-wider text-xs">
                        Price
                      </p>
                      <p className="text-foreground">{(experience.price / 1e9).toFixed(3)} SUI</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground uppercase tracking-wider text-xs">
                        Quality
                      </p>
                      <p className="text-primary">{experience.quality_score}/100</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground uppercase tracking-wider text-xs">
                        Rating
                      </p>
                      <p>{experience.rating.toFixed(1)} ⭐</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground uppercase tracking-wider text-xs">
                        Sold
                      </p>
                      <p>{experience.soldCount} times</p>
                    </div>
                  </div>

                  {experience.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {experience.description}
                    </p>
                  )}

                  <div className="flex flex-col gap-2 pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        className="flex-1 px-3 py-2 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-mono text-xs uppercase tracking-wider"
                        onClick={() => setSelectedExperience(experience)}
                      >
                        View Data
                      </button>
                      <button
                        className="px-3 py-2 rounded-md border border-primary/20 text-primary hover:bg-primary/10 transition-colors font-mono text-xs uppercase tracking-wider"
                        onClick={() => {
                          navigator.clipboard.writeText(experience.id);
                          alert('Experience ID copied!');
                        }}
                      >
                        📋
                      </button>
                    </div>
                    <button
                      className="w-full px-3 py-2 rounded-md border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 transition-colors font-mono text-xs uppercase tracking-wider"
                      onClick={() => setReencryptExperience(experience)}
                    >
                      🔄 Re-encrypt Data
                    </button>
                  </div>

                  <div className="text-xs font-mono text-muted-foreground space-y-1 pt-2 border-t border-primary/10">
                    <div className="flex justify-between">
                      <span>Blob ID:</span>
                      <span className="text-foreground">{experience.walrus_blob_id.slice(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SEAL Policy:</span>
                      <span className="text-foreground">{experience.seal_policy_id.slice(0, 8)}...</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </SidebarInset>

      {selectedExperience && (
        <AccessDataModal
          experience={selectedExperience}
          onClose={() => setSelectedExperience(null)}
        />
      )}

      {reencryptExperience && (
        <ReencryptModal
          experience={reencryptExperience}
          onClose={() => setReencryptExperience(null)}
        />
      )}
    </SidebarProvider>
  );
}
