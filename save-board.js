export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

    const body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    const { username, projectId, data } = body || {};
    if (!username || !projectId || !data) return res.status(400).json({ ok: false, error: "Missing fields" });

    const owner  = process.env.GH_OWNER;
    const repo   = process.env.GH_REPO;
    const branch = process.env.GH_BRANCH || "main";
    const path   = `data/directivenode/${slug(username)}/${projectId}.json`;

    // 1) Get SHA if file exists
    const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
    let sha = null;
    {
      const r = await fetch(getUrl, {
        headers: { "Accept": "application/vnd.github+json", "Authorization": `Bearer ${process.env.GH_TOKEN}` }
      });
      if (r.ok) {
        const j = await r.json();
        sha = j.sha || null;
      }
    }

    // 2) Commit (create or update)
    const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    const contentB64 = Buffer.from(JSON.stringify(data, null, 2), "utf8").toString("base64");
    const commitBody = {
      message: `directivenode: save ${username}/${projectId}`,
      content: contentB64,
      branch,
      ...(sha ? { sha } : {})
    };

    const put = await fetch(putUrl, {
      method: "PUT",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${process.env.GH_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(commitBody)
    });

    if (!put.ok) return res.status(put.status).json({ ok: false, error: `GitHub PUT: ${put.status}` });

    return res.status(200).json({ ok: true });
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
