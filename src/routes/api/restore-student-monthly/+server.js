import { json } from '@sveltejs/kit';
import { SHOPIFY_DOMAIN, SHOPIFY_ACCESS_TOKEN } from '$env/static/private';
import { updateTag } from '$lib/shopify';

const TAG = 'student-monthly';
const API = `https://${SHOPIFY_DOMAIN}/admin/api/2024-07`;
const EMAILS = [
  "94celis@gmail.com",
  "cheri@thealchemybeauty.com",
  "premierkotainfo@gmail.com",
  "jessbmommyto3@gmail.com",
  "tmharward@gmail.com",
  "holly@element7wellness.com",
  "andresayesta@yahoo.com",
  "drala@revivwell.com",
  "philipstonemd@gmail.com",
  "mertdinc@hotmail.com",
  "pvega1229@gmail.com",
  "courtney@goodmedizen.com",
  "prophecyclinic@gmail.com",
  "lillybeautytemecula@gmail.com",
  "having@evermore.fun",
  "bryanswain.fitness@gmail.com",
  "hoxiehealthllc@gmail.com",
  "tanner.barfield@yahoo.com",
  "drswendell@mac.com",
  "gswift38@gmail.com",
  "kelly_hartigan@icloud.com",
  "hhavey9@gmail.com",
  "antonio.rozier@gmail.com",
  "mikelmiller@gamedaymenshealth.com",
  "lsmith@aquarianclinic.com",
  "roxy@roxybarber.com",
  "vitawaters.iv@gmail.com",
  "kellie@alphahormones.com",
  "celeejansen@gmail.com",
  "janine@theliquidloungeiv.com",
  "tbvaug00@gmail.com",
  "zanherbs@msn.com",
  "mbeltran0509@gmail.com",
  "suzanne@betteryou.beauty",
  "mandy@rinconhealth.com",
  "serenityspringshw@gmail.com",
  "bethany_howard@hotmail.com",
  "drdhillon@icwomenshealth.com",
  "dallas@amaneciahealth.com",
  "mollykroeker@gmail.com",
  "valgandhiis@gmail.com",
  "tom@mccannmd.com",
  "sallysbeautifullife@yahoo.com",
  "sanders9874@gmail.com",
  "mmajorii@gmail.com",
  "ma@blueskieshealthwellness.com",
  "tdmassociates@outlook.com",
  "deidra.bobincheck@clevelandprimecare.com",
  "chris@alphabiomedlabs.com",
  "elizabeth.ortiz2009@gmail.com",
  "cbenet21@gmail.com",
  "amelodyofwellness@gmail.com",
  "phylcay@yahoo.com",
  "draleishamondina@gmail.com",
  "equanimityaesthetics@gmail.com",
  "monika@biohacknow.net",
  "ertrobb@gmail.com",
  "albert@blackstag.us",
  "kel_c30@yahoo.com",
  "jasmine@rizeupmedical.com",
  "drmiranda@universalwellnessconcepts.com",
  "ariprice99@gmail.com",
  "lunaaestheticcashclinic@gmail.com",
  "shlugmanfihc@gmail.com",
  "eric_obrien@hotmail.com",
  "drcambas5@gmail.com",
  "info@cirm1.org",
  "info@myhealth101.org",
  "yvettenp@aimnaples.com",
  "dr.abbeyhike@gmail.com",
  "julio@prohealthsolutionsfl.com",
  "Lupine24@hotmail.com",
  "drchiriano@vivalife.health",
  "wwmd2019@gmail.com",
  "rakesh@cascaidhealth.com",
  "restorewoundcare@gmail.com",
  "ljeanwhite@gmail.com",
  "mjwetherell24@gmail.com",
  "britta@europeanwellness.com",
  "hayleigh@silvergrovepartners.com",
  "lorensmedicalspa@gmail.com",
  "rx7mack@yahoo.com",
  "joe@aspirerejuvenation.com",
  "layna@gamwellness.com",
  "xiaoluli63@gmail.com",
  "marie.jhin@gmail.com",
  "vanessadyarbro@gmail.com",
  "info@oasisivmedspa.com",
  "info@auraskinspa.com",
  "catherine5graham@yahoo.com",
  "tracy@infinitywellnessclinic.com",
  "laurennpnaples@gmail.com",
  "admin@recoveryroomaz.com",
  "michael@neoancillary.com",
  "okunyan@optimalbody.org",
  "seefitpt@gmail.com",
  "chris.arangio@thedripbar.com",
  "info@bloomaestheticsfl.com",
  "amy@sweetspotmedispa.com",
  "injectormonet@gmail.com",
  "svivoni@gmail.com",
  "dharmawellnessmedspa@gmail.com",
  "danielhawkins66@yahoo.com",
  "jennifer@autonettools.com",
  "kkessing@gmail.com",
  "info@marketmd.io",
  "acovellijr@hotmail.com",
  "docstrick@vfmed.org",
  "hdr1974@yahoo.com",
  "abla@patrickbitterjrmd.com",
  "drlauracho@hotmail.com",
  "aidaaesthetics@icloud.com",
  "angelmd@outlook.com",
  "gregpeters5@gmail.com",
  "Axischiropractic2016@gmail.com"
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
