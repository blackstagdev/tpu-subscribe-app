import { json } from '@sveltejs/kit';
import { SHOPIFY_DOMAIN, SHOPIFY_ACCESS_TOKEN } from '$env/static/private';
import { updateTag } from '$lib/shopify';

const TAG = 'student-monthly';
const API = `https://${SHOPIFY_DOMAIN}/admin/api/2024-07`;
const EMAILS = [
  "jonny@thecarterselection.com",
  "ryanasmith247@yahoo.com",
  "lfbowmer@gmail.com",
  "rostam.behroozian@gmail.com",
  "morganlittauer@gmail.com",
  "svgfitness@gmail.com",
  "handateleservices@gmail.com",
  "kuba@eellcrx.com",
  "kris10karma@yahoo.com",
  "garrett@gg-med.com",
  "coelhofitness@yahoo.com",
  "alli@bodcompany.com",
  "jv@medicomglobal.com",
  "johnmarino381@gmail.com",
  "jademmitchell@icloud.com",
  "elevatemenswellness@gmail.com",
  "brittensmith@icloud.com",
  "cassandramhammond@gmail.com",
  "kevinspillzie@gmail.com",
  "zoe@zzfit.com",
  "cj@actionpointmarketing.com",
  "thebiohackingdude@gmail.com",
  "chris@revcommand.com",
  "makingmymark22@gmail.com",
  "core10pilates@gmail.com",
  "katinamft@gmail.com",
  "LuxeLifelacey@gmail.com",
  "eliguest25@gmail.com",
  "juancarlos@tigadvertising.com",
  "adrian@radicallyhealthy.com",
  "jessicareinhart@outlook.com",
  "wendydadkins@gmail.com",
  "sjtenerovich@gmail.com",
  "courtny.moulton@gmail.com",
  "lalibertevi@gmail.com",
  "odeuschle@gmail.com",
  "RansomMedical@gmail.com",
  "mark212003@gmail.com",
  "laceybuteyn@gmail.com",
  "Liza@Nulifeessentials.com",
  "sudore86@gmail.com",
  "olivebskin@hotmail.com",
  "rayofsunshine9413@gmail.com",
  "TRACYLBURCHILL@GMAIL.COM",
  "dorseybrian51@gmail.com",
  "jclarke@forhealthycells.com",
  "JACOB.SEARS@SCITON.COM",
  "david@sanomedtech.com",
  "bk@empireinv.com",
  "brandon.truelifecover@gmail.com",
  "pebell2006@gmail.com",
  "mfons300@gmail.com",
  "lea.wood@yahoo.com",
  "jo_cru_lmt85@yahoo.com",
  "logan@medovationpartners.com",
  "peptiebestie@gmail.com",
  "Dylanrussellbake03@gmail.com",
  "coretherapeutix@gmail.com",
  "jillian@jjvbio.com",
  "ehstleen@gmail.com",
  "caseybrookman@msn.com",
  "devintoups@gmail.com",
  "jeremy@vopzmedical.com",
  "onthegeauxbeauty@gmail.com",
  "wnordean@hotmail.com",
  "taylorthorne7117@gmail.com",
  "wirelessbcs@gmail.com",
  "erikabroadbent@gmail.com",
  "awhipps23@gmail.com",
  "brooksloughrysatx@gmail.com",
  "affiliate@demand.io",
  "skylerhumphrey89@gmail.com",
  "Jason.Efron5@gmail.com",
  "4CloutMarketing@gmail.com",
  "bradrowefit@gmail.com",
  "marryaraygoza@gmail.com",
  "spencer@poweredbyspencer.com",
  "guthriegarrit@gmail.com",
  "markball@gamedaymenshealth.com",
  "lisafowlkes@yahoo.com",
  "erinalejandrino@gmail.com",
  "conquerandthrive1@gmail.com",
  "nancydugay@gmail.com",
  "cosimo.arnesano@gmail.com",
  "tylergaffney0@gmail.com",
  "crozanske1@gmail.com",
  "timothys87@gmail.com",
  "w.fordfit@gmail.com",
  "jgcuthbert51@gmail.com",
  "info@amandanighbert.com",
  "rk@primalpharm.com",
  "drelrod@integratedak.com",
  "Panofs@aol.com",
  "derekpruski@gmail.com",
  "bsander09@gmail.com",
  "mishel600@yahoo.com",
  "joelanthonyvierra@gmail.com",
  "grant@htttptraining.com",
  "kimberlyhames67@gmail.com",
  "mdesjardins63@aol.com",
  "johndencejr@gmail.com",
  "floresjimenezfcc@yahoo.com",
  "claxton.courtney@yahoo.com",
  "jasmine.braga08@gmail.com",
  "richardqcamp@icloud.com",
  "kasseyfrey@gmail.com",
  "nhartson08@gmail.com",
  "brandonrivers09@gmail.com",
  "kappeler37@yahoo.com",
  "Langdir@gmail.com",
  "cjmunoz14@gmail.com",
  "lucia@shinebrighterwellness.com",
  "heatherhancock1981@gmail.com",
  "bobby.wells@live.com",
  "leeanna.franks@live.com",
  "shonntew@me.com",
  "tlynn5520@gmail.com",
  "stacie_fernandez@yahoo.com",
  "rhondajean4@hotmail.com",
  "wapoulsen@yahoo.com",
  "marsha_ann27@yahoo.com"
];

// helper
async function shopifyFetch(path) {
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-07${path}`, {
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) throw new Error(`Shopify API ${res.status}: ${await res.text()}`);
  return res.json();
}

function addTag(currentTags, newTag) {
  if (!currentTags) return newTag;
  const tags = currentTags
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
  if (!tags.includes(newTag.toLowerCase())) tags.push(newTag);
  return tags.join(', ');
}

export async function GET() {
  try {
    console.log(`🔁 Restoring "${TAG}" tag for ${EMAILS.length} customers...`);
    let updated = 0;

    for (const email of EMAILS) {
      try {
        const res = await shopifyFetch(`/customers/search.json?query=email:${encodeURIComponent(email)}`);
        const customers = res.customers || [];

        if (customers.length === 0) {
          console.warn(`⚠️ No customer found for ${email}`);
          continue;
        }

        const customer = customers[0];
        const currentTags = customer.tags || '';
        const newTags = addTag(currentTags, TAG);

        if (newTags !== currentTags) {
          await updateTag(customer.id, newTags);
          updated++;
          console.log(`✅ Added "${TAG}" for ${email} (ID: ${customer.id})`);
        } else {
          console.log(`ℹ️ ${email} already has "${TAG}".`);
        }
      } catch (err) {
        console.error(`❌ Failed to update ${email}:`, err.message);
      }
    }

    console.log(`🎯 Completed — ${updated} customers updated.`);
    return json({ message: 'Tag restoration complete', updated });
  } catch (err) {
    console.error('❌ Error during tag restoration:', err);
    return json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}


