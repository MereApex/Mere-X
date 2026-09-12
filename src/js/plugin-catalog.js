// Single source of truth for the plugin directory.
//
// "logo" names the exact, full-colour brand mark to download, as <source>:<name>:
//   gb:   github.com/gilbarbara/logos      svgl: svgl.app      vlz: vectorlogo.zone
// "dark" is an alternate mark for the dark theme; "invertOnDark" flips a
// single-colour black mark to white instead. scripts/generate-plugin-logos.mjs
// writes each one to src/assets/plugins/<plugin id>.svg.

export const BUILT_IN_PLUGINS = [
  { id: "documents", name: "Documents", description: "Draft and edit long-form documents", icon: "i-file" },
  { id: "pdf", name: "PDF", description: "Read, search, and export PDFs", icon: "i-download" },
  { id: "spreadsheets", name: "Spreadsheets", description: "Build and analyse spreadsheets", icon: "i-chart" },
  { id: "presentations", name: "Presentations", description: "Turn ideas into slide decks", icon: "i-canvas" },
  { id: "templates", name: "Default templates", description: "Reusable starting points for new work", icon: "i-grid" },
  { id: "plugin-management", name: "Plugin management", description: "Control what each plugin may do", icon: "i-plugin" }
];

export const PLUGIN_CATEGORIES = [
  {
    id: "popular",
    name: "Popular",
    plugins: [
      { id: "gmail", name: "Gmail", logo: "gb:google-gmail", description: "Read and manage Gmail" },
      { id: "github", name: "GitHub", logo: "gb:github-icon", invertOnDark: true, description: "Triage PRs, issues, and CI" },
      { id: "google-drive", name: "Google Drive", logo: "gb:google-drive", description: "Drive, Docs, Sheets or Slides" },
      { id: "google-calendar", name: "Google Calendar", logo: "gb:google-calendar", description: "Manage calendar events" },
      { id: "notion", name: "Notion", logo: "gb:notion-icon", description: "Notion docs and workflows" },
      { id: "slack", name: "Slack", logo: "gb:slack-icon", description: "Read and manage Slack" }
    ]
  },
  {
    id: "productivity",
    name: "Productivity",
    plugins: [
      { id: "linear", name: "Linear", logo: "gb:linear-icon", invertOnDark: true, description: "Plan and track product work" },
      { id: "jira", name: "Jira", logo: "gb:jira", description: "Manage Jira issues and sprints" },
      { id: "asana", name: "Asana", logo: "gb:asana-icon", description: "Coordinate tasks and projects" },
      { id: "trello", name: "Trello", logo: "gb:trello", description: "Move work across boards" },
      { id: "todoist", name: "Todoist", logo: "gb:todoist-icon", description: "Capture and organise to-dos" },
      { id: "zoom", name: "Zoom", logo: "gb:zoom-icon", description: "Smart meeting insights" }
    ]
  },
  {
    id: "creativity",
    name: "Creativity",
    plugins: [
      { id: "figma", name: "Figma", logo: "gb:figma", description: "Design-to-code workflows" },
      { id: "canva", name: "Canva", logo: "svgl:canva", description: "Create, review, edit designs" },
      { id: "adobe", name: "Adobe", logo: "gb:adobe-icon", description: "Creative Cloud assets and files" },
      { id: "miro", name: "Miro", logo: "gb:miro-icon", description: "Whiteboards and diagrams" },
      { id: "framer", name: "Framer", logo: "gb:framer", invertOnDark: true, description: "Build and publish sites" },
      { id: "webflow", name: "Webflow", logo: "vlz:webflow", description: "Manage Webflow sites" }
    ]
  },
  {
    id: "developer",
    name: "Developer Tools",
    plugins: [
      { id: "vercel", name: "Vercel", logo: "gb:vercel-icon", invertOnDark: true, description: "Build and deploy web apps" },
      { id: "supabase", name: "Supabase", logo: "gb:supabase-icon", description: "Manage and query databases" },
      { id: "docker", name: "Docker", logo: "gb:docker-icon", description: "Inspect images and containers" },
      { id: "gitlab", name: "GitLab", logo: "gb:gitlab-icon", description: "Pipelines, merge requests, issues" },
      { id: "sentry", name: "Sentry", logo: "gb:sentry-icon", liftOnDark: true, description: "Trace errors and regressions" },
      { id: "cloudflare", name: "Cloudflare", logo: "gb:cloudflare-icon", description: "DNS, workers, and caching" }
    ]
  },
  {
    id: "business",
    name: "Business & Operations",
    plugins: [
      { id: "shopify", name: "Shopify", logo: "gb:shopify", description: "Build and manage your store" },
      { id: "salesforce", name: "Salesforce", logo: "gb:salesforce", description: "Manage Salesforce records" },
      { id: "hubspot", name: "HubSpot", logo: "vlz:hubspot", description: "Insights to action in HubSpot" },
      { id: "intercom", name: "Intercom", logo: "gb:intercom-icon", invertOnDark: true, description: "Reply to customer conversations" },
      { id: "zendesk", name: "Zendesk", logo: "gb:zendesk-icon", liftOnDark: true, description: "Resolve support tickets" },
      { id: "mailchimp", name: "Mailchimp", logo: "vlz:mailchimp", description: "Campaigns and audiences" }
    ]
  },
  {
    id: "data",
    name: "Data & Analytics",
    plugins: [
      { id: "google-analytics", name: "Google Analytics", logo: "gb:google-analytics", description: "Traffic and conversion data" },
      { id: "bigquery", name: "BigQuery", logo: "vlz:google_bigquery", description: "Query and manage BigQuery" },
      { id: "posthog", name: "PostHog", logo: "gb:posthog-icon", description: "Analyse your product data" },
      { id: "amplitude", name: "Amplitude", logo: "gb:amplitude-icon", liftOnDark: true, description: "Product analytics and cohorts" },
      { id: "snowflake", name: "Snowflake", logo: "gb:snowflake-icon", description: "Warehouse queries and models" },
      { id: "databricks", name: "Databricks", logo: "vlz:databricks", description: "Notebooks and data jobs" }
    ]
  },
  {
    id: "communication",
    name: "Communication",
    plugins: [
      { id: "outlook", name: "Outlook", logo: "svgl:microsoft-outlook", description: "Triage Outlook inboxes" },
      { id: "teams", name: "Microsoft Teams", logo: "gb:microsoft-teams", description: "Summarise Teams and follow up" },
      { id: "discord", name: "Discord", logo: "gb:discord-icon", description: "Read and post in servers" },
      { id: "telegram", name: "Telegram", logo: "gb:telegram", description: "Send and search messages" },
      { id: "whatsapp", name: "WhatsApp", logo: "gb:whatsapp-icon", description: "Business messages and replies" },
      { id: "linkedin", name: "LinkedIn", logo: "gb:linkedin-icon", description: "Find the right professional" }
    ]
  },
  {
    id: "security",
    name: "Security",
    plugins: [
      { id: "1password", name: "1Password", logo: "vlz:1password", description: "Retrieve secrets safely" },
      { id: "bitwarden", name: "Bitwarden", logo: "svgl:bitwarden", description: "Vault items and sharing" },
      { id: "okta", name: "Okta", logo: "gb:okta-icon", invertOnDark: true, description: "Identity and access reviews" },
      { id: "snyk", name: "Snyk", logo: "gb:snyk", description: "Scan dependencies for risks" },
      { id: "auth0", name: "Auth0", logo: "gb:auth0-icon", invertOnDark: true, description: "Authentication and tenants" },
      { id: "vault", name: "HashiCorp Vault", logo: "gb:vault-icon", description: "Read and rotate secrets" }
    ]
  },
  {
    id: "finance",
    name: "Finance",
    plugins: [
      { id: "stripe", name: "Stripe", logo: "vlz:stripe", description: "Payments, invoices, payouts" },
      { id: "paypal", name: "PayPal", logo: "gb:paypal", description: "Payments and transactions" },
      { id: "revolut", name: "Revolut", logo: "vlz:revolut", description: "Accounts and spending" },
      { id: "xero", name: "Xero", logo: "gb:xero", description: "Accounting and invoices" },
      { id: "binance", name: "Binance", logo: "svgl:binance", description: "Explore Binance market data" },
      { id: "coinbase", name: "Coinbase", logo: "svgl:coinbase", description: "Crypto balances and prices" }
    ]
  },
  {
    id: "travel",
    name: "Travel",
    plugins: [
      { id: "google-maps", name: "Google Maps", logo: "gb:google-maps", description: "Places, routes, travel time" },
      { id: "airbnb", name: "Airbnb", logo: "gb:airbnb-icon", description: "Find stays and experiences" },
      { id: "booking", name: "Booking.com", logo: "vlz:booking", description: "Search hotels and stays" },
      { id: "trivago", name: "Trivago", logo: "vlz:trivago", description: "Compare hotel prices" },
      { id: "uber", name: "Uber", logo: "svgl:uber_light", dark: "svgl:uber_dark", description: "Rides and delivery status" },
      { id: "tripadvisor", name: "Tripadvisor", logo: "vlz:tripadvisor", description: "Reviews and things to do" }
    ]
  },
  {
    id: "entertainment",
    name: "Entertainment",
    plugins: [
      { id: "spotify", name: "Spotify", logo: "gb:spotify-icon", description: "Build playlists and find music" },
      { id: "youtube", name: "YouTube", logo: "gb:youtube-icon", description: "Search and summarise videos" },
      { id: "apple-music", name: "Apple Music", logo: "svgl:apple-music-icon", description: "Library and playlists" },
      { id: "netflix", name: "Netflix", logo: "gb:netflix-icon", description: "Track what you are watching" },
      { id: "twitch", name: "Twitch", logo: "gb:twitch", description: "Streams, clips, and chat" },
      { id: "soundcloud", name: "SoundCloud", logo: "vlz:soundcloud", description: "Tracks and playlists" }
    ]
  },
  {
    id: "research",
    name: "Education & Research",
    plugins: [
      { id: "wikipedia", name: "Wikipedia", logo: "vlz:wikipedia", description: "Look up reliable summaries" },
      { id: "hugging-face", name: "Hugging Face", logo: "gb:hugging-face-icon", description: "Models, datasets, spaces" },
      { id: "stack-overflow", name: "Stack Overflow", logo: "gb:stackoverflow-icon", description: "Search technical answers" },
      { id: "coursera", name: "Coursera", logo: "vlz:coursera", description: "Courses and learning plans" },
      { id: "udemy", name: "Udemy", logo: "gb:udemy-icon", description: "Track course progress" },
      { id: "khan-academy", name: "Khan Academy", logo: "gb:khan_academy-icon", description: "Practice and lessons" }
    ]
  }
];

export const ALL_PLUGINS = PLUGIN_CATEGORIES.flatMap((category) =>
  category.plugins.map((plugin) => ({ ...plugin, category: category.name, categoryId: category.id }))
);
