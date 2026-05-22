(async () => {
  const base = 'http://localhost:8080';
  const now = new Date().toISOString().slice(0,10);
  const email = `test+${Date.now()}@example.com`;
  const password = 'Pass1234!';
  const displayName = 'Test User';

  function log(name, res, body) {
    console.log(`\n=== ${name} ===`);
    console.log('status:', res.status);
    console.log('body:', body);
  }

  async function doFetch(path, opts = {}){
    const res = await fetch(base + path, opts);
    const txt = await res.text();
    let body;
    try { body = JSON.parse(txt); } catch (e) { body = txt; }
    return { res, body };
  }

  try {
    // Signup
    let rObj = await doFetch('/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, displayName }) });
    let r = rObj.res;
    let signupBody = rObj.body;
    let setCookie = r.headers.get('set-cookie') || r.headers.get('Set-Cookie');
    log('signup', r, signupBody);

    // If no cookie, try signin
    if (!setCookie || !setCookie.includes('alex_session')) {
      const sObj = await doFetch('/api/signin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const s = sObj.res;
      setCookie = s.headers.get('set-cookie') || s.headers.get('Set-Cookie');
      log('signin', s, sObj.body);
    }

    if (!setCookie) {
      console.error('No session cookie received; aborting tests.');
      process.exit(1);
    }
    const cookie = setCookie.split(';')[0];
    console.log('Using cookie:', cookie);

    const headers = { 'Content-Type': 'application/json', 'Cookie': cookie };

    // Test endpoints
    const tests = [
      { name: '/api/log/nutrition-report', path: '/api/log/nutrition-report', body: { reportDate: now, calories: 2000 } },
      { name: '/api/inbody', path: '/api/inbody', body: { reportDate: now, weightKg: 72, muscleMassKg: 30, bodyFatPercent: 15 } },
      { name: '/api/plans', path: '/api/plans', body: { planDate: now, contentMd: 'Test plan' } },
      { name: '/api/feed', path: '/api/feed', body: { content: 'Hello from test' } },
      { name: '/api/log/workout', path: '/api/log/workout', body: { performedAt: now, exercise: 'Squat' } },
      { name: '/api/progress-photos', path: '/api/progress-photos', body: { imageBase64: 'aGVsbG8=' } },
      { name: '/api/analyses', path: '/api/analyses', body: { planDate: now, contentMd: 'Analysis' } },
      { name: '/api/progress-report', path: '/api/progress-report', body: { reportDate: now, totalSessions: 1 } },
    ];

    for (const t of tests) {
      try {
        const { res, body } = await doFetch(t.path, { method: 'POST', headers, body: JSON.stringify(t.body) });
        log(t.name, res, body);
      } catch (e) {
        console.error('Error testing', t.name, e);
      }
    }

    console.log('\nDone.');
  } catch (err) {
    console.error('Test script error', err);
    process.exit(1);
  }
})();
