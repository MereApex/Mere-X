// Every plugin Mere X can genuinely connect to, and the read-only calls the
// model is allowed to make once a person has granted access.
//
// A plugin only appears connectable when its OAuth credentials are present in
// the environment. Anything without credentials is reported as "needs setup"
// rather than pretending to connect; deployment credentials stay in the
// runtime environment and local credentials stay in .env.local.

async function json(url, token, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...init.headers }
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const error = new Error(`${response.status} ${detail.slice(0, 300)}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function truncate(value, limit = 4_000) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > limit ? `${text.slice(0, limit)}\n…truncated` : text;
}

export const PLUGIN_PROVIDERS = {
  github: {
    provider: "github",
    label: "GitHub",
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scope: "read:user repo",
    async identity(token) {
      const user = await json("https://api.github.com/user", token);
      return user.login ? `@${user.login}` : "GitHub account";
    },
    tools: [
      {
        name: "github_search_repositories",
        description: "Search GitHub repositories the connected account can see. Read-only.",
        parameters: {
          type: "object",
          properties: { query: { type: "string", description: "GitHub search syntax, e.g. \"user:octocat language:go\"" } },
          required: ["query"],
          additionalProperties: false
        },
        async run({ query }, token) {
          const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=10`;
          const result = await json(url, token);
          return truncate((result.items || []).map((repo) => ({
            full_name: repo.full_name,
            description: repo.description,
            stars: repo.stargazers_count,
            updated_at: repo.updated_at,
            url: repo.html_url
          })));
        }
      },
      {
        name: "github_list_issues",
        description: "List open issues or pull requests in one repository. Read-only.",
        parameters: {
          type: "object",
          properties: {
            repository: { type: "string", description: "owner/name" },
            state: { type: "string", enum: ["open", "closed", "all"] }
          },
          required: ["repository"],
          additionalProperties: false
        },
        async run({ repository, state = "open" }, token) {
          const url = `https://api.github.com/repos/${repository}/issues?state=${state}&per_page=15`;
          const result = await json(url, token);
          return truncate(result.map((issue) => ({
            number: issue.number,
            title: issue.title,
            is_pull_request: Boolean(issue.pull_request),
            state: issue.state,
            updated_at: issue.updated_at,
            url: issue.html_url
          })));
        }
      },
      {
        name: "github_read_file",
        description: "Read one text file from a repository at a branch or commit. Read-only.",
        parameters: {
          type: "object",
          properties: {
            repository: { type: "string", description: "owner/name" },
            path: { type: "string" },
            ref: { type: "string", description: "branch, tag or commit; defaults to the default branch" }
          },
          required: ["repository", "path"],
          additionalProperties: false
        },
        async run({ repository, path, ref }, token) {
          const query = ref ? `?ref=${encodeURIComponent(ref)}` : "";
          const file = await json(`https://api.github.com/repos/${repository}/contents/${path}${query}`, token);
          if (file.encoding !== "base64" || !file.content) return "That path is not a readable text file.";
          return truncate(Buffer.from(file.content, "base64").toString("utf8"), 8_000);
        }
      }
    ]
  },

  linear: {
    provider: "linear",
    label: "Linear",
    authorizeUrl: "https://linear.app/oauth/authorize",
    tokenUrl: "https://api.linear.app/oauth/token",
    scope: "read",
    async identity(token) {
      const result = await linearQuery(token, "{ viewer { name email } }");
      return result.data?.viewer?.name || result.data?.viewer?.email || "Linear account";
    },
    tools: [
      {
        name: "linear_list_issues",
        description: "List recent Linear issues assigned to or created by the connected account. Read-only.",
        parameters: {
          type: "object",
          properties: { state: { type: "string", description: "Optional workflow state name filter" } },
          required: [],
          additionalProperties: false
        },
        async run({ state = "" }, token) {
          const result = await linearQuery(token, `{
            issues(first: 20, orderBy: updatedAt) {
              nodes { identifier title state { name } assignee { name } updatedAt url }
            }
          }`);
          const nodes = result.data?.issues?.nodes || [];
          const filtered = state ? nodes.filter((issue) => issue.state?.name?.toLowerCase() === state.toLowerCase()) : nodes;
          return truncate(filtered);
        }
      }
    ]
  },

  figma: {
    provider: "figma",
    label: "Figma",
    authorizeUrl: "https://www.figma.com/oauth",
    tokenUrl: "https://api.figma.com/v1/oauth/token",
    scope: "file_read",
    responseTypeCode: true,
    async identity(token) {
      const me = await json("https://api.figma.com/v1/me", token);
      return me.email || me.handle || "Figma account";
    },
    tools: [
      {
        name: "figma_read_file",
        description: "Read the page and frame structure of one Figma file. Read-only.",
        parameters: {
          type: "object",
          properties: { file_key: { type: "string", description: "The key from a Figma file URL" } },
          required: ["file_key"],
          additionalProperties: false
        },
        async run({ file_key }, token) {
          const file = await json(`https://api.figma.com/v1/files/${encodeURIComponent(file_key)}?depth=2`, token);
          return truncate({
            name: file.name,
            last_modified: file.lastModified,
            pages: (file.document?.children || []).map((page) => ({
              name: page.name,
              frames: (page.children || []).map((frame) => frame.name)
            }))
          });
        }
      }
    ]
  }
};

async function linearQuery(token, query) {
  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  if (!response.ok) throw new Error(`Linear returned ${response.status}`);
  return response.json();
}

/* Credentials live under one prefix per provider so several plugins can share
   a single OAuth app — the three Google surfaces do exactly that. */
export function credentialsFor(pluginId) {
  const config = PLUGIN_PROVIDERS[pluginId];
  if (!config) return null;
  const prefix = `MERE_X_${config.provider.toUpperCase().replace(/-/g, "_")}`;
  const clientId = process.env[`${prefix}_CLIENT_ID`];
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function isConnectable(pluginId) {
  return Boolean(PLUGIN_PROVIDERS[pluginId]);
}

export function toolsForPlugin(pluginId) {
  return PLUGIN_PROVIDERS[pluginId]?.tools || [];
}
