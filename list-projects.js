export default async function handler(req, res) {
  try {
    const { username } = req.query || {};
    if (!username) return res.status(400).json({ ok: false, error: "Missing username" });

    const owner  = process.env.GH_OWNER;
    const repo   = process.env.GH_REPO;
    const branch = process.env.GH_BRANCH || "main";
    const dir    = `data/directivenode/${slug(username)}`;

    const listUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(dir)}?ref=${encodeURIComponent(branch)}`;
    const listRes = await fetch(listUrl, {
      headers: { "Accept": "application/vnd.github+json", "Authorization": `Bearer ${process.env.GH_TOKEN}` }
    });

    if (listRes.status === 404) return res.status(200).json({ ok: true, items: [] });
    if (!listRes.ok) return res.status(listRes.status).json({ ok: false, error: `GitHub: ${listRes.status}` });

    const list = await listRes.json();
    const files = (Array.isArray(list) ? list : []).filter(x => x.type === "file" && /\.json$/i.test(x.name));

    const items = [];
    for (const f of files) {
      const r = await fetch(f.url, {
        headers: { "Accept": "application/vnd.github+json", "Authorization": `Bearer ${process.env.GH_TOKEN}` }
      });
      if (!r.ok) continue;
      const j = await r.json();
      let data = {};
      try { data = JSON.parse(Buffer.from(j.content||"", "base64").toString("utf8")); } catch {}
      const id = f.name.replace(/\.json$/i, "");
      const name = data?.meta?.name || data?.title || data?.name || id;
      const updatedAt = data?.meta?.updatedAt || Date.now();
      items.push({ id, name, updatedAt });
    }

    return res.status(200).json({ ok: true, items });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}

function slug(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
