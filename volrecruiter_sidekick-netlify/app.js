const CONFIG = {
  endorsedCandidateActionUrl: 'https://www.mobilize.us/workingfamilies/event/952158/',
  nationalVirtualFallbackUrl: 'https://www.mobilize.us/workingfamilies/?event_type=1&event_type=2&event_type=38&event_type=12&event_type=21&is_virtual=true&show_all_events=true',
  daisychainActionType: 'next_shift_recommendation_call',
  defaultRadiusMiles: 60,
  nearbyRadiusMiles: 100,
  zipPrefixDigits: 3
};

const VOTER_CONTACT_TYPES = new Set([
  'CANVASS','COMMUNITY_CANVASS','PHONE_BANK','TEXT_BANK','FRIEND_TO_FRIEND_OUTREACH',
  'VOTER_REG','LITERATURE_DROP_OFF','VISIBILITY_EVENT','AUTOMATED_PHONE_BANK'
]);
const LOWER_PRIORITY_TYPES = new Set(['MEETING','TRAINING','FUNDRAISER','HOUSE_PARTY','OTHER','SIGNATURE_GATHERING']);
const SAME_ACTION_EXPERIENCE = new Set(['GOOD','OK']);
const EVENT_TYPE_LABELS = {
  CANVASS:'Canvass', COMMUNITY_CANVASS:'Community canvass', PHONE_BANK:'Phone bank', TEXT_BANK:'Text bank',
  FRIEND_TO_FRIEND_OUTREACH:'Friend-to-friend outreach', VOTER_REG:'Voter registration', LITERATURE_DROP_OFF:'Lit drop',
  VISIBILITY_EVENT:'Visibility event', AUTOMATED_PHONE_BANK:'Automated phone bank', MEETING:'Meeting', TRAINING:'Training',
  FUNDRAISER:'Fundraiser', HOUSE_PARTY:'House party', OTHER:'Other'
};

function $(id){ return document.getElementById(id); }
function val(id){ return ($(id)?.value || '').trim(); }
function checked(id){ return !!$(id)?.checked; }
let selectedContact = null;
let lastPrimaryRecommendation = null;
function nowTs(){ return Math.floor(Date.now()/1000); }
function normalizeText(s=''){ return String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); }
function sameTitle(a,b){ return normalizeText(a) && normalizeText(a) === normalizeText(b); }
function esc(s=''){ return String(s).replace(/[&<>\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
function eventLabel(type){ return EVENT_TYPE_LABELS[type] || String(type || 'Event').replaceAll('_',' ').toLowerCase(); }
function fmtDate(ts){
  if(!ts) return 'Anytime';
  return new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(ts*1000));
}
function firstOpenTimeslot(event){
  const n = nowTs();
  return (event.timeslots || []).filter(t => Number(t.start_date) >= n && !t.is_full).sort((a,b)=>a.start_date-b.start_date)[0];
}
function locationText(event){
  if(event.is_virtual) return 'Virtual';
  const l = event.location || {};
  return [l.locality, l.region].filter(Boolean).join(', ') || 'Location shown after signup';
}
function getInput(){
  return {
    dataMode: val('dataMode'),
    orgId: val('orgId'),
    firstName: val('firstName'),
    zip: val('zip'),
    state: val('state').toUpperCase(),
    experience: val('experience'),
    completedType: val('completedType'),
    completedTitle: val('completedTitle'),
    virtualOk: val('virtualOk'),
    availability: val('availability'),
    notes: val('notes'),
    includeLowerPriority: checked('includeLowerPriority'),
    contactMode: val('contactMode'),
    lookupPhone: val('lookupPhone'),
    lookupEmail: val('lookupEmail'),
    outcome: val('outcome'),
    outcomeNotes: val('outcomeNotes'),
    relationalCallCompleted: checked('relationalCallCompleted')
  };
}

function zipPrefix(zip){ return String(zip || '').replace(/[^0-9]/g,'').slice(0, CONFIG.zipPrefixDigits); }
function regionOf(event){ return (event.location?.region || '').toUpperCase(); }
function isLocalMatch(event, input){
  const eventZip = zipPrefix(event.location?.postal_code);
  const inputZip = zipPrefix(input.zip);
  return !!eventZip && !!inputZip && eventZip === inputZip;
}
function isSameStateMatch(event, input){
  const region = regionOf(event);
  return !!region && !!input.state && region === input.state;
}
function isNationalVirtual(event){ return !!event.is_virtual && !regionOf(event); }
function isOutOfStateInPerson(event, input){
  const region = regionOf(event);
  return !!region && !!input.state && region !== input.state && !event.is_virtual;
}
function geographyLabel(event, input){
  if(isLocalMatch(event, input)) return 'Local match';
  if(isSameStateMatch(event, input)) return event.is_virtual ? 'Same-state virtual' : 'Same-state in-person';
  if(isNationalVirtual(event)) return 'National virtual';
  if(isOutOfStateInPerson(event, input)) return 'Out-of-state in-person';
  if(event.is_virtual) return 'Virtual';
  return 'Other location';
}
function geographyClass(event, input){
  if(isLocalMatch(event, input)) return 'local';
  if(isSameStateMatch(event, input)) return 'state';
  if(isNationalVirtual(event)) return 'national';
  if(isOutOfStateInPerson(event, input)) return 'out';
  return 'other';
}
function isGoodVoterContact(rec){
  return rec && VOTER_CONTACT_TYPES.has(rec.event.event_type) && !LOWER_PRIORITY_TYPES.has(rec.event.event_type) && rec.score >= 25;
}

function scoreEvent(event, input){
  const slot = firstOpenTimeslot(event);
  if(!slot && !event.virtual_action_url) return null;
  let score = 0;
  const reasons = [];
  const penalties = [];
  const goodish = SAME_ACTION_EXPERIENCE.has(input.experience);
  const locality = event.location?.locality;

  const local = isLocalMatch(event, input);
  const sameState = isSameStateMatch(event, input);
  const nationalVirtual = isNationalVirtual(event);
  const outOfStateInPerson = isOutOfStateInPerson(event, input);

  if(goodish && sameTitle(event.title, input.completedTitle)){ score += 55; reasons.push('same event'); }
  if(goodish && event.event_type === input.completedType){ score += 38; reasons.push('same action'); }
  if(goodish){ score += 18; reasons.push(`${input.experience.toLowerCase()} experience`); }

  if(local){ score += 46; reasons.push('local match'); }
  else if(sameState){ score += event.is_virtual ? 30 : 36; reasons.push(event.is_virtual ? 'same-state virtual' : 'same-state in-person'); }
  else if(nationalVirtual){ score += 12; reasons.push('national virtual'); }
  else if(outOfStateInPerson){ score -= 50; penalties.push('out-of-state in-person'); }

  if(locality){ score += 4; }
  if(event.high_priority){ score += 24; reasons.push('high priority'); }
  if(VOTER_CONTACT_TYPES.has(event.event_type)){ score += 28; reasons.push('voter contact'); }
  if(event.is_virtual && VOTER_CONTACT_TYPES.has(event.event_type)){ score += 8; reasons.push('virtual voter contact'); }
  if(input.virtualOk === 'NO' && event.is_virtual){ score -= 25; penalties.push('virtual not preferred'); }
  if(input.virtualOk === 'YES' && event.is_virtual){ score += 8; reasons.push('virtual OK'); }
  if(LOWER_PRIORITY_TYPES.has(event.event_type)){ score -= 32; penalties.push('lower-priority type'); }
  if(input.experience === 'BAD' && event.event_type === input.completedType){ score -= 38; penalties.push('avoid repeat after bad experience'); }
  if(slot){
    const daysOut = Math.floor((slot.start_date - nowTs()) / 86400);
    score += Math.max(0, 16 - daysOut);
    if(daysOut <= 7) reasons.push('soon');
  }

  const tier = pickTier(event, input, reasons, penalties);
  return {event, slot, score, reasons, penalties, tier, geography: geographyLabel(event, input), geographyClass: geographyClass(event, input)};
}

function pickTier(event, input, reasons){
  if(reasons.includes('same event') || reasons.includes('same action')) return 'Tier 1: re-shift';
  if(reasons.includes('local match') || reasons.includes('same-state in-person') || reasons.includes('same-state virtual')) return 'Tier 2: local/state';
  if(event.high_priority) return 'Tier 3: high priority';
  if(event.is_virtual && VOTER_CONTACT_TYPES.has(event.event_type)) return 'Tier 5: national virtual voter contact';
  return 'Other';
}

function geographyPriority(rec, context){
  if(context.hasLocal){
    if(rec.geographyClass === 'local') return 0;
    if(rec.geographyClass === 'state') return 1;
    if(rec.geographyClass === 'national') return 2;
    if(rec.geographyClass === 'out') return 5;
    return 4;
  }
  if(context.hasSameState){
    if(rec.geographyClass === 'state') return 0;
    if(rec.geographyClass === 'national') return 1;
    if(rec.geographyClass === 'local') return 0;
    if(rec.geographyClass === 'out') return 5;
    return 4;
  }
  if(context.hasNationalVirtual){
    if(rec.geographyClass === 'national') return 1;
    if(rec.geographyClass === 'out') return 4;
    return 2;
  }
  return rec.geographyClass === 'out' ? 3 : 1;
}

function buildGeoContext(scored){
  const meaningful = scored.filter(isGoodVoterContact);
  return {
    hasLocal: meaningful.some(r => r.geographyClass === 'local'),
    hasSameState: meaningful.some(r => r.geographyClass === 'state'),
    hasNationalVirtual: meaningful.some(r => r.geographyClass === 'national'),
    outOfStateCount: scored.filter(r => r.geographyClass === 'out').length
  };
}

function sortWithGeoPreference(scored, context){
  return scored.sort((a,b) => {
    const gp = geographyPriority(a, context) - geographyPriority(b, context);
    if(gp !== 0) return gp;
    return b.score - a.score || ((a.slot?.start_date || 9999999999) - (b.slot?.start_date || 9999999999));
  });
}

function shouldKeep(scored, input){
  if(!scored) return false;
  if(input.includeLowerPriority) return true;
  return !LOWER_PRIORITY_TYPES.has(scored.event.event_type) || scored.score >= 30;
}


function normalizePhone(phone=''){
  const digits = String(phone).replace(/[^0-9]/g,'');
  if(digits.length === 10) return `+1${digits}`;
  if(digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return String(phone).trim();
}
function contactDisplayName(contact){
  return [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email_address || contact.phone_number || 'Contact';
}
function contactState(contact){
  return (contact.state || contact.addresses?.[0]?.state || contact.addresses?.[0]?.region || '').toUpperCase();
}
function contactZip(contact){
  return contact.postal_code || contact.zip || contact.addresses?.[0]?.postal_code || contact.addresses?.[0]?.zip || '';
}
function applyContact(contact){
  selectedContact = contact;
  if(contact.first_name) $('firstName').value = contact.first_name;
  if(contactZip(contact)) $('zip').value = contactZip(contact);
  if(contactState(contact)) $('state').value = contactState(contact);
  if(contact.last_completed_event_type) $('completedType').value = contact.last_completed_event_type;
  if(contact.last_completed_event_title) $('completedTitle').value = contact.last_completed_event_title;
  if(contact.last_event_experience) $('experience').value = contact.last_event_experience;
  if(contact.virtual_ok) $('virtualOk').value = contact.virtual_ok;
  if(contact.notes && !$('notes').value) $('notes').value = contact.notes;
  $('contactStatus').innerHTML = `<b>Loaded ${esc(contactDisplayName(contact))}.</b> Review the fields below before recommending a next ask.`;
}
async function fetchDemoContact(input){
  const res = await fetch('data/sample-contacts.json');
  const json = await res.json();
  const phone = normalizePhone(input.lookupPhone);
  const email = input.lookupEmail.toLowerCase();
  const contacts = json.data || [];
  return contacts.find(c => (phone && normalizePhone(c.phone_number) === phone) || (email && String(c.email_address || '').toLowerCase() === email)) || contacts[0];
}
async function fetchLiveContact(input){
  const url = new URL('/api/daisychain-contact', window.location.origin);
  if(input.lookupEmail) url.searchParams.set('email_address', input.lookupEmail);
  if(input.lookupPhone) url.searchParams.set('phone_number', normalizePhone(input.lookupPhone));
  const res = await fetch(url.toString());
  const json = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(json.error || `Daisychain lookup returned ${res.status}`);
  const contacts = json.data || json.people || [];
  return Array.isArray(contacts) ? contacts[0] : contacts;
}
async function findContact(){
  const input = getInput();
  if(input.contactMode === 'manual'){
    $('contactStatus').textContent = 'Manual mode: enter the caller context below.';
    return;
  }
  $('contactStatus').textContent = 'Looking up contact...';
  try{
    const contact = input.contactMode === 'demo' ? await fetchDemoContact(input) : await fetchLiveContact(input);
    if(!contact){
      $('contactStatus').innerHTML = '<span class="danger">No matching contact found.</span> You can still enter details manually.';
      return;
    }
    applyContact(contact);
  }catch(err){
    $('contactStatus').innerHTML = `<span class="danger">Contact lookup failed: ${esc(err.message)}</span>`;
  }
}
function recommendationForOutcome(){
  if(lastPrimaryRecommendation){
    const e = lastPrimaryRecommendation.event;
    return {
      event_id: e.id || null,
      event_title: e.title || null,
      event_type: e.event_type || null,
      event_url: e.browser_url || null,
      recommendation_tier: lastPrimaryRecommendation.tier,
      recommendation_score: Math.round(lastPrimaryRecommendation.score),
      recommendation_geography: lastPrimaryRecommendation.geography,
      timeslot_start: lastPrimaryRecommendation.slot?.start_date || null
    };
  }
  return {
    event_title: 'Fallback endorsed candidate or national virtual ask',
    event_url: CONFIG.endorsedCandidateActionUrl,
    recommendation_tier: 'Fallback',
    recommendation_score: null,
    recommendation_geography: null,
    timeslot_start: null
  };
}
function buildOutcomePayload(input){
  return {
    email_address: input.lookupEmail || selectedContact?.email_address || null,
    phone_number: input.lookupPhone ? normalizePhone(input.lookupPhone) : (selectedContact?.phone_number || null),
    first_name: input.firstName || selectedContact?.first_name || null,
    last_name: selectedContact?.last_name || null,
    addresses: input.zip || input.state ? [{postal_code: input.zip || undefined, state: input.state || undefined}] : undefined,
    action_data: {
      type: CONFIG.daisychainActionType,
      tool_version: 'v4',
      call_result: input.outcome,
      relational_call_completed: input.relationalCallCompleted,
      notes: input.outcomeNotes || input.notes || '',
      completed_event_title: input.completedTitle,
      completed_event_type: input.completedType,
      completed_event_experience: input.experience,
      recommended_next_shift: recommendationForOutcome(),
      recorded_at: new Date().toISOString()
    }
  };
}
async function saveOutcome(){
  const input = getInput();
  const payload = buildOutcomePayload(input);
  const isLive = input.contactMode === 'live';
  $('outcomeStatus').textContent = isLive ? 'Saving to Daisychain...' : 'Demo save: building Daisychain action payload...';
  try{
    if(!isLive){
      $('outcomeStatus').innerHTML = `<b>Demo outcome ready.</b> In live mode this would post an action of type <code>${esc(CONFIG.daisychainActionType)}</code> to Daisychain.`;
      console.log('Demo Daisychain action payload', payload);
      return;
    }
    const res = await fetch('/api/daisychain-action', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body: JSON.stringify(payload)
    });
    const json = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(json.error || `Daisychain action returned ${res.status}`);
    $('outcomeStatus').innerHTML = `<b>Saved to Daisychain.</b> Person ID: ${esc(json.person_id || json.id || 'returned by API')}`;
  }catch(err){
    $('outcomeStatus').innerHTML = `<span class="danger">Could not save outcome: ${esc(err.message)}</span>`;
  }
}

async function fetchSampleEvents(){
  const res = await fetch('data/sample-events.json');
  const json = await res.json();
  return json.data || [];
}

async function fetchMobilizeEvents(input){
  const eventTypes = Array.from(VOTER_CONTACT_TYPES);
  const searches = [];
  if(input.zip) searches.push(fetchEvents({zipcode:input.zip, max_dist:String(CONFIG.defaultRadiusMiles)}));
  if(input.state) searches.push(fetchEvents({state:input.state}));
  searches.push(fetchEvents({high_priority_only:'true'}));
  searches.push(fetchEvents({is_virtual:'true', event_types:eventTypes}));
  const batches = await Promise.allSettled(searches);
  const errors = batches.filter(b=>b.status==='rejected').map(b=>b.reason?.message).filter(Boolean);
  const unique = new Map();
  batches.flatMap(b => b.status === 'fulfilled' ? b.value : []).forEach(e => unique.set(e.id, e));
  const events = Array.from(unique.values());
  if(!events.length && errors.length) throw new Error(errors[0]);
  return events;
}

async function fetchEvents(params={}){
  const url = new URL('/api/mobilize-events', window.location.origin);
  url.searchParams.set('per_page','100');
  url.searchParams.set('exclude_full','true');
  url.searchParams.set('timeslot_start',`gte_${nowTs()}`);
  for(const [k,v] of Object.entries(params)){
    if(Array.isArray(v)) v.forEach(x => url.searchParams.append(k, x));
    else if(v !== undefined && v !== '') url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if(!res.ok) throw new Error(`Mobilize returned ${res.status}`);
  const json = await res.json();
  return json.data || [];
}

async function recommend(input){
  const events = input.dataMode === 'demo' ? await fetchSampleEvents() : await fetchMobilizeEvents(input);
  const scored = events.map(e => scoreEvent(e, input)).filter(s => shouldKeep(s, input));
  const context = buildGeoContext(scored);
  sortWithGeoPreference(scored, context);
  scored.geoContext = context;
  return scored.slice(0, 6);
}

function renderLadder(activeTier){
  const steps = [
    ['Tier 1','Re-shift same/similar action'],
    ['Tier 2','Local or same-state opportunity'],
    ['Tier 3','High-priority WFP event'],
    ['Tier 4','Endorsed candidate finder'],
    ['Tier 5','National virtual voter contact']
  ];
  return `<div class="ladder">${steps.map(([k,t])=>`<div class="step ${activeTier?.includes(k)?'active':''}"><b>${k}</b>${t}</div>`).join('')}</div>`;
}

function scriptFor(rec, input){
  const e = rec.event;
  const greeting = input.firstName ? `${input.firstName}, ` : '';
  const prior = input.completedTitle || `the ${eventLabel(input.completedType)}`;
  const exp = SAME_ACTION_EXPERIENCE.has(input.experience) ? ` and it sounds like that went ${input.experience.toLowerCase()}` : '';
  const time = rec.slot ? ` on ${fmtDate(rec.slot.start_date)}` : '';
  const reason = rec.reasons.includes('same action') ? 'It is the same kind of shift you just did' : rec.reasons.includes('same state') ? 'It is connected to work in your state' : rec.reasons.includes('high priority') ? 'It is one of our top-priority shifts right now' : 'It is the best voter-contact option I am seeing';
  return `${greeting}since you just came out for ${prior}${exp}, I wanted to help you find the next concrete way to plug in. ${reason}: ${e.title}${time}. Could I help you sign up for that now?`;
}

function fallbackScript(input, type){
  const greeting = input.firstName ? `${input.firstName}, ` : '';
  if(type === 'candidate') return `${greeting}I am not seeing the right local shift at this moment, but the next best step is to find a WFP-endorsed candidate opportunity that fits your schedule. Could I help you look at that now?`;
  return `${greeting}I am not seeing a clean local fit right now, but we do have national virtual voter-contact shifts where you can help reach people from home. Could I help you find one that works?`;
}

function resultCard(rec, input, idx){
  const e = rec.event;
  const title = idx === 0 ? 'Primary ask' : idx === 1 ? 'Backup ask' : `Option ${idx+1}`;
  const script = scriptFor(rec, input);
  const card = document.createElement('article');
  card.className = 'card result';
  card.innerHTML = `
    <div class="topbar"><div><div class="label">${title} · ${rec.tier} · score ${Math.round(rec.score)}</div><h3>${esc(e.title)}</h3></div><a class="button secondary" href="${esc(e.browser_url || '#')}" target="_blank" rel="noopener">Open signup</a></div>
    <div class="meta"><span>${esc(eventLabel(e.event_type))}</span><span>${esc(locationText(e))}</span><span>${esc(rec.slot ? fmtDate(rec.slot.start_date) : 'Anytime')}</span><span class="geo-pill ${esc(rec.geographyClass)}">${esc(rec.geography)}</span></div>
    ${renderLadder(rec.tier)}
    <div class="chips">${rec.reasons.map(r=>`<span class="chip good">${esc(r)}</span>`).join('')}${rec.penalties.map(p=>`<span class="chip warn">${esc(p)}</span>`).join('')}</div>
    <div class="script" data-script="${esc(script)}">${esc(script)}</div>
    <div class="links"><button class="secondary copy-script">Copy script</button><span class="copy-ok" hidden>Copied</span></div>
  `;
  return card;
}

function fallbackCard(input, type){
  const candidate = type === 'candidate';
  const title = candidate ? 'Endorsed candidate opportunity' : 'National virtual voter-contact option';
  const url = candidate ? CONFIG.endorsedCandidateActionUrl : CONFIG.nationalVirtualFallbackUrl;
  const tier = candidate ? 'Tier 4: endorsed candidate finder' : 'Tier 5: national virtual voter contact';
  const script = fallbackScript(input, candidate ? 'candidate' : 'national');
  const card = document.createElement('article');
  card.className = 'card result';
  card.innerHTML = `
    <div class="topbar"><div><div class="label">Fallback ask · ${tier}</div><h3>${esc(title)}</h3></div><a class="button secondary" href="${esc(url)}" target="_blank" rel="noopener">Open Mobilize</a></div>
    <p class="muted">Use this when the stronger re-shift, local/state, or high-priority options do not fit the conversation.</p>
    ${renderLadder(tier)}
    <div class="script" data-script="${esc(script)}">${esc(script)}</div>
    <div class="links"><button class="secondary copy-script">Copy script</button><span class="copy-ok" hidden>Copied</span></div>
  `;
  return card;
}

function geoNotice(recs, input){
  const context = buildGeoContext(recs);
  const state = input.state || 'their state';
  if(context.hasLocal){
    return `<div class="geo-notice good"><b>Local match found.</b> The tool is prioritizing nearby options first, then same-state options, then broader fallbacks.</div>`;
  }
  if(context.hasSameState){
    return `<div class="geo-notice warn"><b>No strong local match found.</b> The tool is keeping the activist in ${esc(state)} by showing same-state options before national or out-of-state options.</div>`;
  }
  if(context.hasNationalVirtual){
    return `<div class="geo-notice warn"><b>No strong local or same-state match found.</b> The tool is avoiding out-of-state in-person asks where possible and showing national virtual voter-contact options before out-of-state options.</div>`;
  }
  return `<div class="geo-notice warn"><b>No local, same-state, or national virtual voter-contact match found.</b> Use the fallback ask, and only use an out-of-state option if the conversation makes it make sense.</div>`;
}

function renderResults(recs, input){
  const results = $('results');
  results.innerHTML = '';
  lastPrimaryRecommendation = recs[0] || null;
  if(recs.length){
    $('status').innerHTML = `<b>Found ${recs.length} scored option${recs.length===1?'':'s'}.</b><br><span class="muted">Use the primary ask unless the conversation points elsewhere.</span>`;
    results.insertAdjacentHTML('beforeend', geoNotice(recs, input));
    recs.slice(0,3).forEach((rec,i)=>results.appendChild(resultCard(rec,input,i)));
    results.appendChild(fallbackCard(input,'candidate'));
  } else {
    $('status').innerHTML = `<b>No strong live event match found.</b><br><span class="muted">The tool still produces fallback asks so the call has a concrete next step.</span>`;
    results.appendChild(fallbackCard(input,'candidate'));
    results.appendChild(fallbackCard(input,'national'));
  }
  bindCopyButtons();
  renderDebugTable(recs);
}

function renderDebugTable(recs){
  const rows = recs.map(r => `<tr><td>${esc(r.event.title)}</td><td>${esc(r.tier)}</td><td>${esc(r.geography)}</td><td>${Math.round(r.score)}</td><td>${esc(r.reasons.join(', '))}</td><td>${esc(r.penalties.join(', '))}</td></tr>`).join('');
  $('debug').innerHTML = rows ? `<div class="card panel"><h2>Scoring detail</h2><table class="table"><thead><tr><th>Event</th><th>Tier</th><th>Geography</th><th>Score</th><th>Reasons</th><th>Penalties</th></tr></thead><tbody>${rows}</tbody></table></div>` : '';
}

function bindCopyButtons(){
  document.querySelectorAll('.copy-script').forEach(btn => {
    btn.addEventListener('click', async () => {
      const script = btn.closest('.result').querySelector('.script').textContent;
      await navigator.clipboard.writeText(script);
      const ok = btn.parentElement.querySelector('.copy-ok');
      ok.hidden = false;
      setTimeout(()=>ok.hidden=true, 1500);
    });
  });
}

function updateModeHelp(){
  const demo = val('dataMode') === 'demo';
  $('orgIdWrap').style.display = 'none';
  $('modeHelp').textContent = demo ? 'Demo mode uses local sample events so you can test the workflow immediately.' : 'Live mode uses the /api/mobilize-events Netlify function. Set MOBILIZE_ORG_ID in Netlify environment variables.';
}

$('dataMode').addEventListener('change', updateModeHelp);
$('findContactBtn').addEventListener('click', findContact);
$('saveOutcomeBtn').addEventListener('click', saveOutcome);
$('contactMode').addEventListener('change', () => {
  const mode = val('contactMode');
  $('contactStatus').textContent = mode === 'manual' ? 'Manual mode: enter the caller context below.' : mode === 'demo' ? 'Demo mode: try ana@example.org, malik@example.org, or tasha@example.org; blank lookup loads a sample.' : 'Live mode uses the /api/daisychain-contact proxy. Never put the API key in the browser.';
});
$('recommendBtn').addEventListener('click', async () => {
  const input = getInput();
  $('results').innerHTML = '';
  $('debug').innerHTML = '';
  $('status').innerHTML = 'Searching and scoring next asks...';
  try{
    const recs = await recommend(input);
    renderResults(recs, input);
  }catch(err){
    $('status').innerHTML = `<span class="danger">Could not load events: ${esc(err.message)}</span><br><span class="muted">Showing fallback asks instead.</span>`;
    renderResults([], input);
  }
});
updateModeHelp();
