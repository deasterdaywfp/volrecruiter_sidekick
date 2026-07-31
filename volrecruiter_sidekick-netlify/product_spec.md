# Next Shift Recommender v4 Product Spec

## Purpose

Help member-leaders make a strong next ask to activists who recently completed an event and have not yet had a relational phone call.

The tool should always produce a concrete next ask while making the tradeoffs clear.

## User flow

1. Caller searches for a contact by phone or email.
2. The tool pulls known context from Daisychain when available.
3. Caller reviews or edits the context.
4. The tool searches/scans available Mobilize opportunities.
5. The tool ranks the best next asks.
6. Caller opens the signup page or uses the fallback pathway.
7. Caller records the outcome.
8. The tool posts the outcome back to Daisychain as an action.

## Contact context pulled from Daisychain

The v4 prototype expects, or can be mapped to, fields like:

- first name
- last name
- email
- phone
- ZIP
- state
- most recent completed event title
- most recent completed event type
- experience: good, OK, bad, or unknown
- virtual preference
- relational call completed status
- notes

The exact WFP field names should be confirmed before production.

## Recommendation ladder

1. Repeat what worked: same event or same action if experience was good/OK.
2. Keep it local.
3. Keep it in-state.
4. Use high-priority opportunities when no local/state fit is available.
5. Route to endorsed candidate opportunities if needed.
6. Fall back to national virtual voter contact.

## Daisychain writeback

Each call outcome is posted as a Daisychain action with `action_data.type` set to:

`next_shift_recommendation_call`

The action includes:

- call result
- relational call completed flag
- notes
- completed event context
- recommended next shift
- recommendation tier and score
- geography classification
- timestamp

This action can appear on the person timeline and can trigger Daisychain automations.

## Security principles

- Daisychain API token must never be in browser code.
- Use serverless functions or another backend proxy.
- Use environment variables for credentials.
- Add access control before using live member data with volunteers.
- Start with demo/sample contacts for training.

## Open decisions

- Which Daisychain fields represent recent completed event and experience?
- Is relational call status already a field, tag, or action?
- Should saving the outcome also update a field/tag, or only create an action?
- Should signed-up outcomes be verified against Mobilize later?
- What access control is required for member-leaders?
