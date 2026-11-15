// একটাই ফাংশনে: login, callback, session, expiry, logout
const crypto = require("crypto");
const { GITHUB_CLIENT_ID: CID, GITHUB_CLIENT_SECRET: SEC, SESSION_SECRET: SS } = process.env;
const GH = "https://api.github.com";
const key = () => crypto.createHash("sha256").update(SS || "").digest();
const seal = o => { const iv = crypto.randomBytes(12), c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const e = Buffer.concat([c.update(JSON.stringify(o)), c.final()]); return Buffer.concat([iv, c.getAuthTag(), e]).toString("base64url"); };
const unseal = s => { try { const b = Buffer.from(s, "base64url"), d = crypto.createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28)); return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString()); } catch { return null; } };
const cookie = (req, n) => ((req.headers.cookie || "").split(";").map(s => s.trim()).find(s => s.startsWith(n + "=")) || "").slice(n.length + 1);
const mk = (n, v, age) => `${n}=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const json = (res, code, o) => { res.statusCode = code; res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(o)); };
const redirect = (res, url) => { res.statusCode = 302; res.setHeader("Location", url); res.end(); };
const origin = req => `https://${req.headers["x-forwarded-host"] || req.headers.host}`;
async function revoke(t) {
  try { await fetch(`${GH}/applications/${CID}/token`, { method: "DELETE",
    headers: { Authorization: "Basic " + Buffer.from(`${CID}:${SEC}`).toString("base64"), Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: t }) }); } catch {}
}

module.exports = async (req, res) => {
  if (!CID || !SEC || !SS) return json(res, 500, { error: "env_missing" });
  const a = req.query.action, ses = unseal(cookie(req, "ses"));

  if (a === "login") {
    const OK = ["repo", "user", "workflow", "read:org", "gist"];
    const scopes = String(req.query.scopes || "user").split(",").filter(s => OK.includes(s));
    const ttl = [0, 3600, 86400, 90000, 604800, 2592000].includes(+req.query.ttl) ? +req.query.ttl : 90000;
    const state = crypto.randomBytes(16).toString("hex");
    res.setHeader("Set-Cookie", mk("st", seal({ s: state, ttl }), 600));
    const u = new URL("https://github.com/login/oauth/authorize");
    u.search = new URLSearchParams({ client_id: CID, redirect_uri: origin(req) + "/api/callback", scope: scopes.join(" ") || "user", state });
    return redirect(res, u.toString());
  }

  if (a === "callback") {
    const st = unseal(cookie(req, "st"));
    if (!st || st.s !== req.query.state || !req.query.code) return redirect(res, "/?error=state");
    const r = await fetch("https://github.com/login/oauth/access_token", { method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: CID, client_secret: SEC, code: req.query.code, redirect_uri: origin(req) + "/api/callback" }) }).then(x => x.json());
    if (!r.access_token) return redirect(res, "/?error=token");
    const e = st.ttl ? Date.now() + st.ttl * 1000 : null;
    res.setHeader("Set-Cookie", [mk("ses", seal({ t: r.access_token, e, s: r.scope || "" }), 2592000), mk("st", "", 0)]);
    return redirect(res, "/");
  }

  if (a === "session") {
    if (!ses) return json(res, 401, { error: "none" });
    if (ses.e && Date.now() > ses.e) { await revoke(ses.t); res.setHeader("Set-Cookie", mk("ses", "", 0)); return json(res, 401, { expired: true }); }
    const r = await fetch(GH + "/user", { headers: { Authorization: "Bearer " + ses.t, Accept: "application/vnd.github+json" } });
    if (!r.ok) { res.setHeader("Set-Cookie", mk("ses", "", 0)); return json(res, 401, { error: "invalid" }); }
    const p = await r.json();
    return json(res, 200, { token: ses.t, expiresAt: ses.e, scopes: ses.s.split(/[ ,]+/).filter(Boolean),
      profile: { login: p.login, name: p.name, avatar: p.avatar_url, email: p.email, url: p.html_url, bio: p.bio, location: p.location,
        repos: p.public_repos, followers: p.followers, following: p.following, plan: p.plan && p.plan.name, created: p.created_at } });
  }

  if (a === "expiry" && req.method === "POST") {
    if (!ses) return json(res, 401, {});
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    if (b.expiresAt === undefined) return json(res, 400, { error: "expiresAt_required" });
    const e = b.expiresAt === null ? null : Number(b.expiresAt);
    if (e !== null && !(e > Date.now())) { await revoke(ses.t); res.setHeader("Set-Cookie", mk("ses", "", 0)); return json(res, 200, { ended: true }); }
    res.setHeader("Set-Cookie", mk("ses", seal({ ...ses, e }), 2592000));
    return json(res, 200, { expiresAt: e });
  }

  if (a === "logout") { if (ses) await revoke(ses.t); res.setHeader("Set-Cookie", mk("ses", "", 0)); return json(res, 200, { ok: true }); }
  json(res, 404, { error: "not_found" });
};
