(async () => {
  const base = 'http://localhost:8081';
  try {
    let r = await fetch(`${base}/api/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test+2@example.com', password: 'hunter2', displayName: 'Test User' }),
    });
    console.log('signup', r.status, r.statusText);
    for (const [k, v] of r.headers) console.log('signup header', k, v);
    const signupBody = await r.text();
    console.log('signup body', signupBody);

    let r2 = await fetch(`${base}/api/signin`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test+2@example.com', password: 'hunter2' }),
    });
    console.log('signin', r2.status, r2.statusText);
    for (const [k, v] of r2.headers) console.log('signin header', k, v);
    const signinBody = await r2.text();
    console.log('signin body', signinBody);
    const sc = r2.headers.get('set-cookie') || '';
    const m = sc.match(/alex_session=([^;]+)/);
    const cookie = m ? `alex_session=${m[1]}` : '';
    if (cookie) {
      const p = await fetch(`${base}/_authenticated/feed`, { headers: { Cookie: cookie } });
      console.log('/_authenticated/feed', p.status);
      const txt = await p.text();
      console.log('/_authenticated/feed body length', txt.length);
    }
  } catch (err) {
    console.error('error', err);
  }
})();
