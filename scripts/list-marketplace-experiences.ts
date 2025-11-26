#!/usr/bin/env ts-node
import { suiClient } from '../e2e/suiClient';
import { ENV } from '../e2e/env';

function parseOptionString(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0] || '';
  if (typeof value === 'object' && 'vec' in value) {
    const vecVal = (value as any).vec;
    if (Array.isArray(vecVal)) return vecVal[0] || '';
  }
  if (typeof value === 'object' && 'fields' in value) {
    const maybeSome = (value as any).fields?.some;
    if (typeof maybeSome === 'string') return maybeSome;
    if (typeof maybeSome === 'object' && maybeSome?.fields?.bytes) {
      return maybeSome.fields.bytes;
    }
  }
  return '';
}

function parseDisplayField(experienceObj: any, key: string) {
  return (
    experienceObj?.data?.display?.data?.[key] ||
    experienceObj?.data?.display?.data?.[`${key}#string`] ||
    ''
  );
}

async function main() {
  const packageId = ENV.PACKAGE_ID;
  if (!packageId) {
    console.error('PACKAGE_ID not set in environment (ENV.PACKAGE_ID)');
    process.exit(1);
  }

  console.log('Querying marketplace listings for package:', packageId);

  try {
    const events = await suiClient.queryEvents({
      query: {
        MoveEventType: `${packageId}::marketplace::ExperienceListed`,
      },
      limit: 200,
      order: 'descending',
    });

    if (!events?.data || events.data.length === 0) {
      console.log('No marketplace listing events found.');
      process.exit(0);
    }

    const results: Array<Record<string, any>> = [];

    for (const event of events.data) {
      try {
        const eventData = event.parsedJson as Record<string, any>;
        const listingId = String(eventData.listing_id || '');
        const experienceId = String(eventData.experience_id || '');
        if (!listingId || !experienceId) continue;

        const listingObj = await suiClient.getObject({
          id: listingId,
          options: { showContent: true },
        });

        const listingFields =
          listingObj.data?.content?.dataType === 'moveObject'
            ? (listingObj.data.content.fields as Record<string, any>)
            : null;

        const experienceObj = await suiClient.getObject({
          id: experienceId,
          options: { showContent: true },
        });

        const expFields =
          experienceObj.data?.content?.dataType === 'moveObject'
            ? (experienceObj.data.content.fields as Record<string, any>)
            : null;

        if (!listingFields || !expFields) continue;

        const ratingCount = Number(expFields.rating_count || 0);
        const totalRating = Number(expFields.total_rating || 0);
        const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;

        const walrusContent = parseOptionString(expFields.walrus_content_blob_id);
        const walrusResult = parseOptionString(expFields.walrus_result_blob_id);

        const description =
          parseDisplayField(experienceObj, 'description') ||
          parseOptionString(expFields.description) ||
          '';

        const priceRaw = Number(listingFields.price || expFields.price || 0);
        const priceSUI = priceRaw / 1e9;

        const entry = {
          experienceId: experienceObj.data?.objectId || experienceId,
          listingId,
          skill: String(expFields.skill || 'Unknown'),
          domain: String(expFields.domain || 'General'),
          difficulty: parseInt(String(expFields.difficulty || '3')),
          quality_score: parseInt(String(expFields.quality_score || '0')),
          price_raw: priceRaw,
          price_sui: priceSUI,
          seller: String(listingFields.seller || expFields.creator || ''),
          rating: avgRating,
          soldCount: parseInt(String(expFields.sold_count || '0')),
          walrus_blob_id: walrusContent || walrusResult || '',
          seal_policy_id: String(expFields.seal_policy_id || ''),
          timeSpent: parseInt(String(expFields.time_spent || '0')),
          description,
        };

        results.push(entry);
      } catch (err) {
        console.warn('Failed to parse event entry:', err);
      }
    }

    if (results.length === 0) {
      console.log('No valid listings parsed from events.');
      process.exit(0);
    }

    // Print a simple table
    console.log('\nMarketplace Experiences:');
    for (const r of results) {
      console.log('----------------------------------------');
      console.log('Experience ID :', r.experienceId);
      console.log('Listing ID    :', r.listingId);
      console.log('Skill / Domain:', r.skill, '/', r.domain);
      console.log('Price (SUI)   :', r.price_sui, `(${r.price_raw} mist)`);
      console.log('Seller        :', r.seller);
      console.log('Rating        :', r.rating.toFixed(2));
      console.log('Sold Count    :', r.soldCount);
      if (r.description) console.log('Description   :', r.description);
      if (r.walrus_blob_id) console.log('Walrus Blob   :', r.walrus_blob_id);
      if (r.seal_policy_id) console.log('Seal Policy   :', r.seal_policy_id);
    }

    // Also output JSON to stdout in case user wants to pipe
    console.log('\nJSON_OUTPUT_START');
    console.log(JSON.stringify(results, null, 2));
    console.log('JSON_OUTPUT_END');
  } catch (err) {
    console.error('Error querying marketplace listings:', err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
