#!/usr/bin/env bash
# DormMatch regression test — every endpoint built so far (Steps 1–5).
# Usage: bash test.sh          (backend must be running on $API_URL)
# Creates fresh users each run (timestamped emails) so it can run repeatedly.

API_URL="${API_URL:-http://localhost:3001}"
RUN_ID="$(date +%s)"
PASS=0
FAIL=0

# --- helpers -----------------------------------------------------------------

# req METHOD PATH [TOKEN] [JSON_BODY] — sets $STATUS and $BODY
req() {
  local method="$1" path="$2" token="$3" body="$4"
  local args=(-s -w $'\n%{http_code}' -X "$method" "$API_URL$path" -H "Content-Type: application/json")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$body" ] && args+=(-d "$body")
  local raw
  raw="$(curl "${args[@]}")"
  STATUS="$(echo "$raw" | tail -1)"
  BODY="$(echo "$raw" | sed '$d')"
}

# json_get FIELD.PATH — reads JSON from stdin, prints field ('' if missing)
json_get() {
  node -e "
    let d='';
    process.stdin.on('data',c=>d+=c).on('end',()=>{
      try {
        const v='$1'.split('.').reduce((o,k)=>o?.[k], JSON.parse(d));
        console.log(v ?? '');
      } catch { console.log(''); }
    })"
}

check() { # check EXPECTED ACTUAL DESCRIPTION
  if [ "$1" = "$2" ]; then
    echo "  PASS  $3"
    PASS=$((PASS+1))
  else
    echo "  FAIL  $3 (expected $1, got $2)"
    FAIL=$((FAIL+1))
  fi
}

check_not_empty() { # check_not_empty VALUE DESCRIPTION
  if [ -n "$1" ]; then
    echo "  PASS  $2"
    PASS=$((PASS+1))
  else
    echo "  FAIL  $2 (value was empty)"
    FAIL=$((FAIL+1))
  fi
}

# --- 0. health ----------------------------------------------------------------

echo "== Health =="
req GET /health
check 200 "$STATUS" "GET /health"

# --- 1. auth ------------------------------------------------------------------

echo "== Auth =="
req POST /api/auth/register "" "{\"name\":\"Test Owner A\",\"email\":\"owner.a.$RUN_ID@test.dormmatch.dev\",\"password\":\"test1234\",\"role\":\"owner\"}"
check 201 "$STATUS" "register owner A"
OWNER_A_TOKEN="$(echo "$BODY" | json_get token)"

req POST /api/auth/register "" "{\"name\":\"Test Owner B\",\"email\":\"owner.b.$RUN_ID@test.dormmatch.dev\",\"password\":\"test1234\",\"role\":\"owner\"}"
check 201 "$STATUS" "register owner B"
OWNER_B_TOKEN="$(echo "$BODY" | json_get token)"

req POST /api/auth/register "" "{\"name\":\"Test Tenant\",\"email\":\"tenant.$RUN_ID@test.dormmatch.dev\",\"password\":\"test1234\",\"role\":\"tenant\"}"
check 201 "$STATUS" "register tenant"
TENANT_TOKEN="$(echo "$BODY" | json_get token)"

req POST /api/auth/login "" "{\"email\":\"owner.a.$RUN_ID@test.dormmatch.dev\",\"password\":\"test1234\"}"
check 200 "$STATUS" "login owner A"
OWNER_A_TOKEN="$(echo "$BODY" | json_get token)"
check_not_empty "$OWNER_A_TOKEN" "login returns token"

req POST /api/auth/login "" "{\"email\":\"owner.a.$RUN_ID@test.dormmatch.dev\",\"password\":\"wrongpass\"}"
check 401 "$STATUS" "login with wrong password -> 401"

req GET /api/auth/me "$TENANT_TOKEN"
check 200 "$STATUS" "GET /me with token"
check tenant "$(echo "$BODY" | json_get user.role)" "/me returns correct role"

req GET /api/auth/me
check 401 "$STATUS" "GET /me without token -> 401"

# --- 2. buildings ---------------------------------------------------------------

echo "== Buildings =="
req POST /api/buildings "$OWNER_A_TOKEN" '{"name":"Test Building A","address":"123 Test Rd, Bangkok","facilities":["WiFi","Parking"],"electricity_rate":8,"water_rate":18}'
check 201 "$STATUS" "owner A creates building"
BUILDING_A="$(echo "$BODY" | json_get building.id)"
check_not_empty "$BUILDING_A" "building has id"

req POST /api/buildings "$TENANT_TOKEN" '{"name":"Hack Building","address":"1 Hack St"}'
check 403 "$STATUS" "tenant creates building -> 403"

req POST /api/buildings "" '{"name":"Anon Building","address":"1 Anon St"}'
check 401 "$STATUS" "no token creates building -> 401"

req GET "/api/buildings/$BUILDING_A" "$OWNER_A_TOKEN"
check 200 "$STATUS" "owner A reads own building"

req GET "/api/buildings/$BUILDING_A" "$OWNER_B_TOKEN"
check 403 "$STATUS" "owner B reads A's building -> 403 (isolation)"

req PUT "/api/buildings/$BUILDING_A" "$OWNER_B_TOKEN" '{"name":"Stolen Building"}'
check 404 "$STATUS" "owner B updates A's building -> 404 (isolation)"

req GET /api/buildings "$OWNER_B_TOKEN"
LISTED="$(echo "$BODY" | node -e "
  let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
    const j=JSON.parse(d);
    console.log(j.buildings.some(b=>b.id==='$BUILDING_A')?'leaked':'clean');
  })")"
check clean "$LISTED" "owner B's list excludes A's building (isolation)"

# --- 3. rooms -------------------------------------------------------------------

echo "== Rooms =="
req POST /api/rooms "$OWNER_A_TOKEN" "{\"building_id\":\"$BUILDING_A\",\"room_number\":\"T-101\",\"floor\":1,\"has_ac\":true,\"monthly_price\":4500}"
check 201 "$STATUS" "owner A creates room"
ROOM_A="$(echo "$BODY" | json_get room.id)"
check_not_empty "$ROOM_A" "room has id"

req POST /api/rooms "$OWNER_B_TOKEN" "{\"building_id\":\"$BUILDING_A\",\"room_number\":\"T-999\",\"floor\":1,\"monthly_price\":4500}"
check 404 "$STATUS" "owner B creates room in A's building -> 404 (isolation)"

req POST /api/rooms "$TENANT_TOKEN" "{\"building_id\":\"$BUILDING_A\",\"room_number\":\"T-998\",\"floor\":1,\"monthly_price\":4500}"
check 403 "$STATUS" "tenant creates room -> 403"

req GET "/api/rooms?building_id=$BUILDING_A" "$TENANT_TOKEN"
check 200 "$STATUS" "tenant browses rooms"
FOUND="$(echo "$BODY" | node -e "
  let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
    const j=JSON.parse(d);
    console.log(j.rooms.some(r=>r.id==='$ROOM_A')?'found':'missing');
  })")"
check found "$FOUND" "tenant browse includes new available room"

req GET "/api/rooms/$ROOM_A"
check 200 "$STATUS" "public reads room detail"

req GET "/api/rooms/$ROOM_A/cost-estimate"
check 200 "$STATUS" "cost estimate (no meter data) -> 200"
check "No meter data available yet" "$(echo "$BODY" | json_get message)" "cost estimate returns null + message, not error"

# --- 4. applications --------------------------------------------------------------

echo "== Applications =="
req POST /api/applications "$TENANT_TOKEN" "{\"room_id\":\"$ROOM_A\",\"message\":\"Test application\"}"
check 201 "$STATUS" "tenant applies for room"
APP_ID="$(echo "$BODY" | json_get application.id)"
check_not_empty "$APP_ID" "application has id"

req POST /api/applications "$TENANT_TOKEN" "{\"room_id\":\"$ROOM_A\"}"
check 409 "$STATUS" "duplicate pending application -> 409"

req POST /api/applications "$OWNER_A_TOKEN" "{\"room_id\":\"$ROOM_A\"}"
check 403 "$STATUS" "owner applies for room -> 403"

req GET /api/applications "$OWNER_B_TOKEN"
APP_LEAK="$(echo "$BODY" | node -e "
  let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
    const j=JSON.parse(d);
    console.log(j.applications.some(a=>a.id==='$APP_ID')?'leaked':'clean');
  })")"
check clean "$APP_LEAK" "owner B can't see application for A's room (isolation)"

req PATCH "/api/applications/$APP_ID/approve" "$OWNER_B_TOKEN" '{"check_in_date":"2026-08-01"}'
check 403 "$STATUS" "owner B approves A's application -> 403 (isolation)"

req PATCH "/api/applications/$APP_ID/approve" "$TENANT_TOKEN" '{"check_in_date":"2026-08-01"}'
check 403 "$STATUS" "tenant approves application -> 403"

req PATCH "/api/applications/$APP_ID/approve" "$OWNER_A_TOKEN" '{"check_in_date":"2026-08-01"}'
check 200 "$STATUS" "owner A approves application"

req GET "/api/rooms/$ROOM_A" "$TENANT_TOKEN"
check occupied "$(echo "$BODY" | json_get room.status)" "room status -> occupied after approval"

req POST /api/applications "$TENANT_TOKEN" "{\"room_id\":\"$ROOM_A\"}"
check 409 "$STATUS" "applying to occupied room -> 409"

# --- 5. tenancies -----------------------------------------------------------------

echo "== Tenancies =="
req GET /api/tenancies "$OWNER_A_TOKEN"
check 200 "$STATUS" "owner A lists tenancies"
TENANCY_FOUND="$(echo "$BODY" | node -e "
  let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
    const j=JSON.parse(d);
    console.log(j.tenancies.some(t=>t.room_id==='$ROOM_A' && t.is_active)?'found':'missing');
  })")"
check found "$TENANCY_FOUND" "approval created active tenancy"

req GET /api/tenancies/my "$TENANT_TOKEN"
check 200 "$STATUS" "tenant fetches own tenancy"

# --- summary ------------------------------------------------------------------

echo ""
echo "=================================="
echo " Results: $PASS passed, $FAIL failed"
echo "=================================="
[ "$FAIL" -eq 0 ]
