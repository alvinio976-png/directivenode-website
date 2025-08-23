export default async function handler(req, res) {
  try {
    const { username, projectId } = req.query || {};
    if (!username || !projectId) return res.status(400).json({ ok: false, error: "Missing username/projectId" });

    const owner  = process.env.GH_OWNER;   // ex: "User" (ton compte GitHub)
    const repo   = process.env.GH_REPO;    // ex: "directivenode"
    const branch = process.env.GH_BRANCH || "main";
    const path   = `data/directivenode/${slug(username)}/${projectId}.json`;

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
    const r = await fetch(url, {
      headers: { "Accept": "application/vnd.github+json", "Authorization": `Bearer ${process.env.GH_TOKEN}` }
    });

    if (r.status === 404) return res.status(200).json({ ok: true, data: null });
    if (!r.ok) return res.status(r.status).json({ ok: false, error: `GitHub: ${r.status}` });

    const payload = await r.json();
    const content = Buffer.from(payload.content || "", "base64").toString("utf8");
    const data = JSON.parse(content);
    return res.status(200).json({ ok: true, data });
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
