const http = require('http');

async function request(path, method = 'GET', body = null, cookie = null) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path,
    method,
    headers: {}
  };

  if (body) {
    options.headers['Content-Type'] = 'application/json';
  }
  if (cookie) {
    options.headers['Cookie'] = cookie;
  }

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      let cookies = res.headers['set-cookie'] || [];
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, cookies });
        } catch (e) {
          resolve({ status: res.statusCode, data, cookies });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("🏏 Starting Maar Katar API Tests...");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Auth Tests
    console.log("\n--- Auth API ---");
    let res = await request('/api/auth', 'POST', { role: 'admin', pin: 'admin123' });
    assert(res.status === 200, "Admin login successful");
    const adminCookie = res.cookies[0].split(';')[0];

    res = await request('/api/auth', 'POST', { role: 'team1', pin: 'vipers123' });
    assert(res.status === 200, "Team 1 login successful");
    const team1Cookie = res.cookies[0].split(';')[0];

    res = await request('/api/auth', 'POST', { role: 'guest', pin: '' });
    assert(res.status === 200, "Guest login successful");

    res = await request('/api/auth', 'POST', { role: 'admin', pin: 'wrongpin' });
    assert(res.status === 401, "Invalid PIN rejected");

    // 2. Players API
    console.log("\n--- Players API ---");
    res = await request('/api/players', 'GET');
    assert(res.status === 200 && res.data.players.length > 0, "Fetch seeded players");
    const initialPlayerCount = res.data.players.length;

    res = await request('/api/players', 'POST', {
      name: 'Test Player', role: 'Batsman', basePrice: 100000, country: 'India', isTemp: true
    }, adminCookie);
    assert(res.status === 200 && res.data.player.name === 'Test Player', "Admin can add player");
    const newPlayerId = res.data.player.id;

    res = await request('/api/players', 'PUT', {
      id: newPlayerId, basePrice: 150000
    }, adminCookie);
    assert(res.status === 200 && res.data.player.basePrice === 150000, "Admin can edit player");

    res = await request('/api/players', 'POST', {
      name: 'Test Player 2', role: 'Bowler', basePrice: 100000
    }, team1Cookie);
    assert(res.status === 401, "Team 1 cannot add player (Unauthorized)");

    // 3. Teams API
    console.log("\n--- Teams API ---");
    res = await request('/api/teams', 'GET');
    assert(res.status === 200 && res.data.teams.vipers.name === "Roaring Vipers", "Fetch teams");
    
    res = await request('/api/teams', 'PUT', {
      manager: 'New Manager 1'
    }, team1Cookie);
    assert(res.status === 200 && res.data.team.manager === 'New Manager 1', "Team can edit own profile");

    res = await request('/api/teams', 'PUT', {
      action: 'resetPin', teamId: 'mongooses', newPin: 'newpin123'
    }, adminCookie);
    assert(res.status === 200, "Admin can reset team PIN");

    // 4. Auction API & Priority Last logic
    console.log("\n--- Auction API ---");
    res = await request('/api/auction', 'POST', { action: 'reset' }, adminCookie);
    assert(res.status === 200 && res.data.state.status === 'idle', "Admin can reset auction");

    // Set Priority Last for our new player
    res = await request('/api/auction', 'POST', { 
      action: 'updateConditions', 
      conditions: { roles: [], minBasePrice: 0, maxBasePrice: 99999999, excludeSold: true, lastPlayerIds: [newPlayerId] } 
    }, adminCookie);
    assert(res.status === 200 && res.data.state.conditions.lastPlayerIds.includes(newPlayerId), "Admin can set Priority Last condition");

    res = await request('/api/auction', 'POST', { action: 'start' }, adminCookie);
    assert(res.status === 200 && res.data.state.status === 'bidding', "Admin can start auction");
    assert(res.data.state.currentPlayer.id !== newPlayerId, "Started auction did not pick Priority Last player first");

    let currentBid = res.data.state.currentBid;

    // Team Bidding
    console.log("\n--- Bidding Logic ---");
    res = await request('/api/auction/bid', 'POST', { amount: currentBid + 50000 }, team1Cookie);
    assert(res.status === 200 && res.data.state.currentBidder === 'vipers', "Team 1 can place a valid bid");

    res = await request('/api/auction/bid', 'POST', { amount: currentBid + 20000 }, team1Cookie);
    assert(res.status === 400, "Team 1 cannot outbid themselves");

    res = await request('/api/auction/bid', 'POST', { amount: 100 }, adminCookie); // Admin bidding
    assert(res.status === 401, "Admin cannot bid");

    // Sell Player
    res = await request('/api/auction', 'POST', { action: 'sell' }, adminCookie);
    assert(res.status === 200 && res.data.state.status === 'sold', "Admin can sell player");

    // Verify team budget and squad
    res = await request('/api/teams', 'GET');
    const vipers = res.data.teams.vipers;
    console.log("VIPERS AFTER SELL:", JSON.stringify(vipers, null, 2));
    assert(vipers.spent === currentBid + 50000 && vipers.players.length === 1, "Player added to team squad and budget updated");

    // Next Player
    res = await request('/api/auction', 'POST', { action: 'next' }, adminCookie);
    assert(res.status === 200 && res.data.state.status === 'bidding', "Admin can move to next player");

    // Unsold Player
    res = await request('/api/auction', 'POST', { action: 'unsold' }, adminCookie);
    assert(res.status === 200 && res.data.state.status === 'unsold', "Admin can mark player unsold");

    // Pause / Resume
    res = await request('/api/auction', 'POST', { action: 'pause' }, adminCookie);
    assert(res.status === 200 && res.data.state.status === 'paused', "Admin can pause auction");
    res = await request('/api/auction', 'POST', { action: 'resume' }, adminCookie);
    assert(res.status === 200 && res.data.state.status === 'bidding', "Admin can resume auction");

    console.log(`\n🎉 Test Summary: ${passed} Passed, ${failed} Failed`);

  } catch (error) {
    console.error("Test execution failed:", error);
  }
}

runTests();
