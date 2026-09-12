// Every plugin Mere X can genuinely connect to, and the read-only calls the
// model is allowed to make once a person has granted access.
//
// A plugin only appears connectable when its OAuth credentials are present in
// the environment. Anything without credentials is reported as "needs setup"
// rather than pretending to connect; deployment credentials stay in the
// runtime environment and local credentials stay in .env.local.

const GOOGLE = {
  provider: "google",
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  authorizeParams: { access_type: "offline", prompt: "consent", include_granted_scopes: "true" }
};

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

  gmail: {
    ...GOOGLE,
    label: "Gmail",
    scope: "openid email https://www.googleapis.com/auth/gmail.readonly",
    identity: googleIdentity,
    tools: [
      {
        name: "gmail_search_messages",
        description: "Search the connected Gmail mailbox and return matching message headers and snippets. Read-only.",
        parameters: {
          type: "object",
          properties: { query: { type: "string", description: "Gmail search syntax, e.g. \"from:jane is:unread newer_than:7d\"" } },
          required: ["query"],
          additionalProperties: false
        },
        async run({ query }, token) {
          const list = await json(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8&q=${encodeURIComponent(query)}`, token);
          const messages = [];
          for (const item of list.messages || []) {
            const message = await json(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
              token
            );
            const header = (name) => message.payload?.headers?.find((entry) => entry.name === name)?.value || "";
            messages.push({ from: header("From"), subject: header("Subject"), date: header("Date"), snippet: message.snippet });
          }
          return truncate(messages);
        }
      }
    ]
  },

  "google-calendar": {
    ...GOOGLE,
    label: "Google Calendar",
    scope: "openid email https://www.googleapis.com/auth/calendar.readonly",
    identity: googleIdentity,
    tools: [
      {
        name: "calendar_list_events",
        description: "List upcoming events from the connected Google Calendar. Read-only.",
        parameters: {
          type: "object",
          properties: {
            days_ahead: { type: "number", description: "How far ahead to look, in days (default 7)" },
            query: { type: "string", description: "Optional free-text filter" }
          },
          required: [],
          additionalProperties: false
        },
        async run({ days_ahead = 7, query = "" }, token) {
          const now = new Date();
          const until = new Date(now.getTime() + Math.min(Math.max(days_ahead, 1), 90) * 86_400_000);
          const params = new URLSearchParams({
            timeMin: now.toISOString(),
            timeMax: until.toISOString(),
            singleEvents: "true",
            orderBy: "startTime",
            maxResults: "20"
          });
          if (query) params.set("q", query);
          const result = await json(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, token);
          return truncate((result.items || []).map((event) => ({
            summary: event.summary,
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            location: event.location,
            attendees: (event.attendees || []).map((person) => person.email)
          })));
        }
      }
    ]
  },

  "google-drive": {
    ...GOOGLE,
    label: "Google Drive",
    scope: "openid email https://www.googleapis.com/auth/drive.readonly",
    identity: googleIdentity,
    tools: [
      {
        name: "drive_search_files",
        description: "Search files in the connected Google Drive. Read-only.",
        parameters: {
          type: "object",
          properties: { query: { type: "string", description: "Words to look for in the file name or contents" } },
          required: ["query"],
          additionalProperties: false
        },
        async run({ query }, token) {
          const params = new URLSearchParams({
            q: `fullText contains '${String(query).replace(/'/g, "\\'")}' and trashed = false`,
            fields: "files(name,mimeType,modifiedTime,webViewLink,owners(emailAddress))",
            pageSize: "15"
          });
          const result = await json(`https://www.googleapis.com/drive/v3/files?${params}`, token);
          return truncate(result.files || []);
        }
      }
    ]
  },

  slack: {
    provider: "slack",
    label: "Slack",
    authorizeUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scope: "",
    userScope: "channels:read,groups:read,search:read,users:read",
    tokenFromPayload: (payload) => payload.authed_user?.access_token,
    identityFromPayload: (payload) => payload.team?.name ? `${payload.team.name} workspace` : "Slack workspace",
    tools: [
      {
        name: "slack_list_channels",
        description: "List Slack channels the connected account can see. Read-only.",
        parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
        async run(_args, token) {
          const result = await json("https://slack.com/api/conversations.list?limit=60&exclude_archived=true", token);
          if (!result.ok) throw new Error(result.error || "Slack rejected the request.");
          return truncate((result.channels || []).map((channel) => ({ name: channel.name, id: channel.id, members: channel.num_members, topic: channel.topic?.value })));
        }
      },
      {
        name: "slack_search_messages",
        description: "Search messages across the connected Slack workspace. Read-only.",
        parameters: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
          additionalProperties: false
        },
        async run({ query }, token) {
          const result = await json(`https://slack.com/api/search.messages?count=15&query=${encodeURIComponent(query)}`, token);
          if (!result.ok) throw new Error(result.error || "Slack rejected the request.");
          return truncate((result.messages?.matches || []).map((match) => ({
            channel: match.channel?.name,
            user: match.username,
            text: match.text,
            timestamp: match.ts,
            permalink: match.permalink
          })));
        }
      }
    ]
  },

  notion: {
    provider: "notion",
    label: "Notion",
    authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    scope: "",
    authorizeParams: { owner: "user" },
    tokenAuth: "basic",
    identityFromPayload: (payload) => payload.workspace_name ? `${payload.workspace_name} workspace` : "Notion workspace",
    tools: [
      {
        name: "notion_search",
        description: "Search pages and databases shared with the Mere X integration. Read-only.",
        parameters: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
          additionalProperties: false
        },
        async run({ query }, token) {
          const result = await json("https://api.notion.com/v1/search", token, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Notion-Version": "2022-06-28" },
            body: JSON.stringify({ query, page_size: 15 })
          });
          return truncate((result.results || []).map((item) => ({
            type: item.object,
            title: item.properties?.title?.title?.[0]?.plain_text
              || item.properties?.Name?.title?.[0]?.plain_text
              || item.title?.[0]?.plain_text
              || "Untitled",
            last_edited: item.last_edited_time,
            url: item.url
          })));
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

async function googleIdentity(token) {
  const user = await json("https://www.googleapis.com/oauth2/v3/userinfo", token);
  return user.email || "Google account";
}

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
