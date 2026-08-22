import {
  Archive,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  BookOpen,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Clock3,
  Code2,
  Command,
  Copy,
  Cookie,
  CreditCard,
  Database,
  Download,
  ExternalLink,
  File,
  FileCode2,
  FileText,
  Folder,
  FolderKanban,
  Globe2,
  Headphones,
  Image,
  Info,
  Languages,
  LayoutGrid,
  Library,
  Link2,
  LifeBuoy,
  Lock,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Mic,
  Monitor,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Server,
  Settings,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User,
  Users,
  Video,
  Volume2,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react'
import { Dispatch, FormEvent, ReactNode, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LiveServerMessage, Session } from '@google/genai'
import { PayPalProvider, usePayPalSubscriptionPaymentSession } from '@paypal/react-paypal-js/sdk-v6'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import mereXEmblem from './assets/mere-x-emblem-transparent.png'

type Page = 'chat' | 'search' | 'projects' | 'library' | 'agents' | 'workflows' | 'settings'
type SettingsTab = 'general' | 'notifications' | 'personalization' | 'plugins' | 'voice' | 'billing' | 'data' | 'cloud' | 'storage' | 'safety' | 'security' | 'account' | 'keyboard'
type PublicRoute = 'landing' | 'signin' | 'signup' | 'reset-password' | 'shared' | 'app' | 'apex' | 'pricing' | 'privacy' | 'terms' | 'security' | 'acceptable-use' | 'cookies' | 'help' | 'status' | 'release-notes' | 'download'
type Source = { title: string; uri: string }
type AttachmentData = { name: string; mimeType: string; data: string; size: number }
type ExportFormat = 'docx' | 'xlsx' | 'pptx' | 'pdf' | 'md'
type GeneratedFile = { name: string; mimeType: string; data: string; size: number; format: ExportFormat }
type Message = {
  id: number
  role: 'user' | 'assistant'
  content: string
  attachments?: string[]
  sources?: Source[]
  images?: string[]
  files?: GeneratedFile[]
  error?: boolean
  interactionId?: string
}
type ConversationRecord = { id: string; title: string; messages: Message[]; updated: string; favorite?: boolean; archived?: boolean }
type SearchRecord = { id: string; title: string; kind: 'Conversation' | 'Project' | 'Library' | 'Agent' }
type SubmitOptions = { reasoning: boolean; research: boolean; imageMode: boolean; outputFormat?: ExportFormat | null; imageAspectRatio?: string; imageSize?: string }
type ProjectRecord = { id: string; name: string; description: string; chatCount: number; fileCount: number; updated: string; knowledgeStore?: string }
type LibraryRecord = { id: string; title: string; type: 'Document' | 'Code' | 'Image' | 'Canvas'; date: string; preview?: string; content?: string }
type AgentRecord = { id: string; name: string; desc: string; instructions: string; tag: string; builtIn?: boolean }
type Preferences = { memory: boolean; training: boolean; about: string; responseStyle: string; language: string; reasoning: string; voice: string }
type SettingsControls = { notifications: boolean; email: boolean; autoClean: boolean; safeMode: boolean; voiceInput: boolean; chatHistory: boolean }
type UserProfile = { name: string; email: string; avatar?: string | null }
type AuthUser = UserProfile & { id: string; plan: string; avatar: string | null; hasPassword: boolean }
type AuthIdentity = { provider: string; email: string; createdAt: number }
type PlanCapability = { label: string; included: boolean }
type UsageSummary = { plan: string; label: string; capabilities?: Record<string, PlanCapability>; state: 'available' | 'active' | 'limited' | 'paused'; window: { state: string; resetAt: number }; tools: { state: string } }
type AccountSession = { id: string; current: boolean; createdAt: number; expiresAt: number }
type BillingSubscription = { id: string; subscriptionId: string; plan: string; billingCycle: 'monthly' | 'annual'; quantity: number; status: string; accessExpiresAt: number | null; cancelAtPeriodEnd: boolean; createdAt: number; updatedAt: number }
type BillingTransaction = { id: string; type: string; status: string; amount: number | null; currency: string | null; createdAt: number }
type ManagedJob = {
  id: string
  type: string
  status: 'queued' | 'running' | 'processing' | 'completed' | 'failed' | 'cancelled'
  payload?: { prompt?: string; aspectRatio?: string; resolution?: string }
  result?: { text?: string; sources?: Source[]; file?: { name: string; url: string; mimeType: string; size: number }; remoteStatus?: string }
  error?: string | null
  createdAt?: number
  updatedAt?: number
}
type WorkspaceSnapshot = {
  conversations?: ConversationRecord[]
  projects?: ProjectRecord[]
  library?: LibraryRecord[]
  agents?: AgentRecord[]
  preferences?: Preferences
  settingsControls?: SettingsControls
  profile?: UserProfile
  thread?: Message[]
  activeConversationId?: string | null
}
type AccountStorage = { workspaceBytes: number; fileBytes: number; jobBytes: number; totalBytes: number; files: number; jobs: number; knowledgeStores: number }

type GoogleCredentialResponse = { credential?: string }
type GoogleIdentityApi = {
  accounts: {
    id: {
      initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void; ux_mode?: 'popup' | 'redirect'; auto_select?: boolean; cancel_on_tap_outside?: boolean; itp_support?: boolean; use_fedcm_for_prompt?: boolean }) => void
      renderButton: (element: HTMLElement, options: { type?: 'standard'; theme?: 'outline' | 'filled_black'; size?: 'large'; text?: 'signin_with' | 'signup_with' | 'continue_with'; shape?: 'rectangular'; logo_alignment?: 'left'; width?: number; locale?: string }) => void
      disableAutoSelect: () => void
    }
  }
}

// Google remembers the account a browser last approved. Clearing that choice
// before and after every session is what makes the next sign-in ask which
// account to use instead of silently reusing the previous one.
function forgetGoogleAccountChoice() {
  try { (window as unknown as { google?: GoogleIdentityApi }).google?.accounts.id.disableAutoSelect() }
  catch { /* The Identity Services script may not be loaded on this route. */ }
}

const defaultPreferences: Preferences = { memory: true, training: false, about: '', responseStyle: '', language: 'English', reasoning: 'Adaptive', voice: 'Nova' }
const defaultSettingsControls: SettingsControls = { notifications: true, email: false, autoClean: false, safeMode: true, voiceInput: true, chatHistory: true }
const defaultUserProfile: UserProfile = { name: 'Mere User', email: '' }

function profileInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'MX'
}

// One avatar everywhere: the account photo when there is one, and a stable
// monogram derived from the name when there is not.
function Avatar({ profile, className = '', size }: { profile: { name: string; avatar?: string | null }; className?: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const source = profile.avatar || ''
  useEffect(() => setFailed(false), [source])
  const style = size ? { width: size, height: size } : undefined
  if (source && !failed) {
    return <span className={`avatar avatar-photo ${className}`.trim()} style={style}>
      <img src={source} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    </span>
  }
  return <span className={`avatar ${className}`.trim()} style={style} aria-hidden="true">{profileInitials(profile.name)}</span>
}

const defaultConversations: ConversationRecord[] = []
const defaultProjects: ProjectRecord[] = []
const defaultLibrary: LibraryRecord[] = []

const agents = [
  { name: 'Research analyst', desc: 'Finds, verifies and synthesizes information into clear briefs.', tag: 'Research', icon: Search },
  { name: 'Writing partner', desc: 'Plans, drafts and refines writing in your own voice.', tag: 'Writing', icon: Pencil },
  { name: 'Code architect', desc: 'Designs systems, reviews code and ships technical solutions.', tag: 'Code', icon: Code2 },
  { name: 'Data strategist', desc: 'Turns raw information into decisions, models and narratives.', tag: 'Analysis', icon: SlidersHorizontal },
]

const defaultAgents: AgentRecord[] = agents.map((agent, index) => ({
  id: `agent-${index + 1}`,
  name: agent.name,
  desc: agent.desc,
  tag: agent.tag,
  builtIn: true,
  instructions: index === 0
    ? 'Act as a rigorous research analyst. Verify claims, use research when useful, compare sources, and produce concise evidence-led briefs.'
    : index === 1
      ? 'Act as an expert writing partner. Preserve the user voice, improve structure and clarity, and offer polished final copy.'
      : index === 2
        ? 'Act as a senior software architect. Produce secure, maintainable, production-quality technical solutions and explain tradeoffs.'
        : 'Act as a data strategist. Analyze information carefully, quantify conclusions, surface uncertainty, and focus on decisions.',
}))

const starterPrompts = [
  { label: 'Build something', detail: 'Turn an idea into a working plan', icon: Code2 },
  { label: 'Create an image', detail: 'Visualize a scene or concept', icon: Image },
  { label: 'Analyze files', detail: 'Extract insight from your documents', icon: FileText },
  { label: 'Deep research', detail: 'Explore a topic with verified sources', icon: Globe2 },
]

const publicPageRoutes: PublicRoute[] = ['apex', 'pricing', 'privacy', 'terms', 'security', 'acceptable-use', 'cookies', 'help', 'status', 'release-notes', 'download']

type PlanTier = {
  name: string
  eyebrow: string
  monthly: number | null
  annual: number | null
  description: string
  featured?: boolean
  action: string
  features: string[]
}

const planTiers: PlanTier[] = [
  { name: 'Free', eyebrow: 'START', monthly: 0, annual: 0, description: 'A serious starting point for everyday questions and focused work.', action: 'Start free', features: ['Standard access in rolling 5-hour windows', 'Essential research and image tools', 'Document and image understanding', 'Personal Projects and custom Agents', 'Files, voice and web access'] },
  { name: 'Plus', eyebrow: 'MOST POPULAR', monthly: 18, annual: 15, description: 'For people who use Mere X throughout the week to create and decide.', featured: true, action: 'Choose Plus', features: ['Expanded access in every 5-hour window', 'More research, image creation and editing', 'Create Word, Excel, PowerPoint and PDF files', 'Expanded Projects, Agents and context', 'Larger document uploads', 'Priority access at busy times'] },
  { name: 'Pro', eyebrow: 'POWER USERS', monthly: 44, annual: 38, description: 'For demanding research, technical work and high-output creative workflows.', action: 'Choose Pro', features: ['Highest individual 5-hour usage windows', 'Advanced research and visual workflows', 'Maximum document context and file size', 'Unlimited Projects and custom Agents', 'Fastest response queue', 'Early access to new capabilities'] },
  { name: 'Team', eyebrow: '2+ PEOPLE', monthly: 23, annual: 18, description: 'A private collaborative workspace with predictable cost per person.', action: 'Create a team', features: ['Expanded 5-hour access for every member', 'Shared documents, Projects and team Agents', 'Advanced research and image tools', 'Central billing, roles and usage controls', 'Workspace-level fair-use visibility', 'Team content excluded from product training'] },
  { name: 'Enterprise', eyebrow: 'CUSTOM', monthly: null, annual: null, description: 'Security, controls and support designed around a larger organization.', action: 'Contact sales', features: ['Flexible usage and volume pricing', 'SSO, SCIM and domain controls', 'Audit logs and custom retention', 'Data residency options', 'Priority support and service agreements', 'Custom legal and procurement terms'] },
]

const exportFormats: { id: ExportFormat; label: string; detail: string }[] = [
  { id: 'docx', label: 'Word', detail: '.docx' },
  { id: 'pptx', label: 'PowerPoint', detail: '.pptx' },
  { id: 'xlsx', label: 'Excel', detail: '.xlsx' },
  { id: 'pdf', label: 'PDF', detail: '.pdf' },
  { id: 'md', label: 'Markdown', detail: '.md' },
]

function detectOutputFormat(prompt: string, attachments: AttachmentData[] = []): ExportFormat | null {
  const normalized = prompt.toLowerCase()
  if (/\.pptx\b|powerpoint|slide deck|presentation|პრეზენტაცი/.test(normalized)) return 'pptx'
  if (/\.xlsx\b|excel|spreadsheet|workbook|ელექტრონულ ცხრილ|ექსელ/.test(normalized)) return 'xlsx'
  if (/\.pdf\b|pdf file|pdf document|პდფ|pdf-ად/.test(normalized)) return 'pdf'
  if (/\.docx\b|word document|word file|მაიკროსოფტ word|ვორდის|დოკუმენტად/.test(normalized)) return 'docx'
  if (/\.md\b|markdown file|მარკდაუნ/.test(normalized)) return 'md'
  if (/edit|rewrite|revise|update|fix|დააედით|შეცვალ|გადააკეთ|განაახლ|გაასწორ/.test(normalized)) {
    const extension = attachments.map(file => file.name.split('.').pop()?.toLowerCase()).find(value => ['docx', 'xlsx', 'pptx'].includes(value || ''))
    if (extension) return extension as ExportFormat
  }
  return null
}

function fileSizeLabel(size: number) {
  return size < 1024 * 1024 ? `${Math.max(1, Math.ceil(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`
}

async function requestExportFile(format: ExportFormat, title: string, content: string, signal?: AbortSignal): Promise<GeneratedFile> {
  const response = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ format, title, content }), signal })
  const result = await response.json() as { name?: string; mimeType?: string; data?: string; size?: number; error?: string }
  if (!response.ok || !result.data || !result.name || !result.mimeType) throw new Error(result.error || 'The file could not be created.')
  return { name: result.name, mimeType: result.mimeType, data: result.data, size: result.size || 0, format }
}

function generatedFileUrl(file: GeneratedFile) {
  return `data:${file.mimeType};base64,${file.data}`
}

type LegalRoute = 'privacy' | 'terms' | 'acceptable-use' | 'cookies'
type LegalSection = { title: string; paragraphs?: string[]; bullets?: string[] }

const legalDocuments: Record<LegalRoute, { eyebrow: string; title: string; summary: string; sections: LegalSection[] }> = {
  privacy: {
    eyebrow: 'LEGAL / PRIVACY',
    title: 'Privacy Policy',
    summary: 'This policy explains what Mere X collects, why it is used, how long it is kept, and the controls available to you.',
    sections: [
      { title: '1. Information you provide', bullets: ['Account details such as your name, email address and authentication information.', 'Prompts, files, images, voice input, project instructions, custom Agents and other content you choose to submit.', 'Billing and transaction records. Complete payment card details are handled by a payment processor and are not stored by Mere X.', 'Messages you send to support, sales or security teams.'] },
      { title: '2. Information collected automatically', bullets: ['Device, browser, language, approximate region, IP address and diagnostic information.', 'Feature usage, request timing, errors, security events and interactions needed to operate and improve the service.', 'Essential local storage and cookies used for sessions, preferences, fraud prevention and workspace continuity.'] },
      { title: '3. How information is used', bullets: ['Provide conversations, research, image creation, file analysis, projects, Agents and account services.', 'Secure the platform, prevent abuse, troubleshoot failures and enforce applicable policies.', 'Process subscriptions, measure usage, communicate service updates and respond to support requests.', 'Improve Mere X only when permitted by your settings and applicable law. Team and Enterprise content is excluded from product training by default.'] },
      { title: '4. Service providers and processing', paragraphs: ['Mere X uses contracted infrastructure, payment, analytics, security, search and AI service providers to deliver requested features. They may process content only for the contracted purpose and under confidentiality and data-protection obligations. Mere X does not sell your personal information or use conversation content for third-party advertising.'] },
      { title: '5. Retention and deletion', paragraphs: ['Account and workspace information is kept while your account is active and for a limited period afterward when required for security, disputes, legal obligations or backups. You can delete conversations, export workspace data and request account deletion. Some records may be retained where law requires it.'] },
      { title: '6. Your choices and rights', bullets: ['Access, correct, export or delete eligible personal information.', 'Turn memory and product-improvement controls on or off in Settings.', 'Object to or restrict certain processing where local law provides that right.', 'Withdraw consent without affecting processing that occurred before withdrawal.'] },
      { title: '7. Security, international transfers and children', paragraphs: ['Mere X applies safeguards appropriate to the service stage and works toward encryption, least-privilege access, monitoring and incident response in production. Data may be processed in countries other than yours using legally recognized transfer safeguards. Mere X is not intended for children under 13, or a higher minimum age where local law requires it.'] },
      { title: '8. Contact and changes', paragraphs: ['Questions or privacy requests can be sent to privacy@mere-x.app. Material changes will be announced in the service and the updated effective date will appear on this page.'] },
    ],
  },
  terms: {
    eyebrow: 'LEGAL / TERMS',
    title: 'Terms of Service',
    summary: 'These terms govern access to Mere X, subscriptions, content, acceptable use and the limits of an AI-assisted service.',
    sections: [
      { title: '1. Eligibility and accounts', paragraphs: ['You must be legally able to enter into these terms and meet the minimum age required in your location. You are responsible for accurate account information, protecting your credentials and activity performed through your account.'] },
      { title: '2. The service', paragraphs: ['Mere X provides AI-assisted chat, research, content creation, file tools, Projects, Library, Agents and related features. Features, limits and availability can evolve. Preview features may be changed or discontinued and may be less reliable than generally available features.'] },
      { title: '3. Your content', paragraphs: ['As between you and Mere X, you retain ownership of content you submit and, to the extent permitted by law, output generated for you. You grant Mere X the limited rights needed to host, process, transmit and secure content and to provide features you request. You are responsible for having the rights needed to submit content.'] },
      { title: '4. AI output and human review', bullets: ['Output may be inaccurate, incomplete, outdated, unsafe or unsuitable for your purpose.', 'Do not rely on Mere X as the sole basis for medical, legal, financial, employment, credit, safety-critical or other high-impact decisions.', 'Review outputs, sources and generated code before publishing, deploying or acting on them.', 'Similar outputs may be generated for different users.'] },
      { title: '5. Plans, usage and billing', paragraphs: ['Paid plans renew automatically until canceled. Prices, taxes, included usage and limits are shown before purchase. Annual plans are billed in advance. Upgrades may take effect immediately; downgrades and cancellations normally take effect at the end of the current billing period. Payments are non-refundable except where required by law or expressly stated at purchase. Optional overage must be enabled before usage beyond an included allowance can be charged.'] },
      { title: '6. Acceptable use and suspension', paragraphs: ['You must follow the Acceptable Use Policy and applicable law. Mere X may limit or suspend access when reasonably necessary to protect users, the service or third parties, investigate abuse, comply with law or address unpaid fees. We will provide notice where practical and legally permitted.'] },
      { title: '7. Third-party services', paragraphs: ['Connections, links, retrieved sources and external services may have separate terms and privacy practices. Mere X is not responsible for third-party content or services outside its control.'] },
      { title: '8. Disclaimers and liability', paragraphs: ['The service is provided on an “as available” basis to the extent permitted by law. Mere X does not guarantee uninterrupted service or that output will be accurate or unique. Liability limitations do not apply where prohibited by law and do not limit rights that cannot legally be waived.'] },
      { title: '9. Changes, termination and contact', paragraphs: ['You may stop using Mere X at any time. Material term changes will be announced before they take effect when required. Questions about these terms can be sent to legal@mere-x.app.'] },
    ],
  },
  'acceptable-use': {
    eyebrow: 'LEGAL / SAFETY',
    title: 'Acceptable Use Policy',
    summary: 'Mere X is designed for ambitious work, with clear limits where use could harm people, systems or trust.',
    sections: [
      { title: 'Use Mere X responsibly', paragraphs: ['You may use Mere X for lawful research, analysis, creativity, learning, software development and business workflows. You remain responsible for how prompts, tools and outputs are used.'] },
      { title: 'Prohibited activity', bullets: ['Child sexual abuse material, sexual exploitation, grooming or content that sexualizes minors.', 'Instructions or assistance intended to facilitate violence, terrorism, weapons misuse or serious physical harm.', 'Malware deployment, credential theft, destructive intrusion, evasion of security controls or unauthorized access.', 'Fraud, scams, impersonation, deceptive manipulation, spam or coordinated inauthentic behavior.', 'Doxxing, stalking, biometric identification without legal authority or unlawful collection of personal data.', 'Content that infringes intellectual-property rights or violates confidentiality obligations.', 'Automated high-impact decisions without legally required safeguards and meaningful human review.', 'Attempts to bypass safety systems, extract secrets, disrupt the service or resell access without permission.'] },
      { title: 'Sensitive domains', paragraphs: ['Educational, medical, legal, financial, employment and public-sector use may require additional review, disclosures, qualified professionals and compliance controls. Mere X output must not replace professional judgment where safety or rights are materially affected.'] },
      { title: 'Enforcement', paragraphs: ['Mere X may warn, rate-limit, remove content, restrict tools, suspend accounts or report activity when reasonably necessary. Context, intent, severity, history and applicable law are considered. Appeals can be sent to safety@mere-x.app.'] },
    ],
  },
  cookies: {
    eyebrow: 'LEGAL / COOKIES',
    title: 'Cookie & Storage Policy',
    summary: 'A clear explanation of browser storage, essential cookies and the choices that will be available in production.',
    sections: [
      { title: '1. Essential storage', paragraphs: ['Mere X uses essential cookies or comparable browser storage for authentication, security, preferences, active conversations and basic service continuity. These controls cannot be disabled inside the product when they are required for the service to work.'] },
      { title: '2. Current preview behavior', paragraphs: ['Mere X stores lightweight workspace data in the browser for continuity and synchronizes signed-in account workspaces to the application database. Clearing browser data removes the local copy; signed-in users can reload synchronized chats, Projects, Agents and preferences from their account.'] },
      { title: '3. Analytics and diagnostics', paragraphs: ['Privacy-conscious analytics may be used to understand performance, feature adoption and errors. Non-essential analytics will follow consent requirements in applicable regions. Mere X does not use cross-site advertising cookies.'] },
      { title: '4. Managing choices', paragraphs: ['You can manage cookies through browser controls and future consent settings. Blocking essential storage can prevent sign-in, saved preferences and other features from working correctly. Questions can be sent to privacy@mere-x.app.'] },
    ],
  },
}

function BrandGlyph() {
  return <span className="brand-symbol" aria-hidden="true">
    <img src={mereXEmblem} alt="" />
  </span>
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`} aria-label="Mere X">
      <BrandGlyph />
      {!compact && <span className="brand-name">Mere <b>X</b></span>}
    </div>
  )
}

function IconButton({ label, children, onClick, className = '' }: { label: string; children: ReactNode; onClick?: () => void; className?: string }) {
  return <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick}>{children}</button>
}

function Toggle({ active, onChange, label }: { active: boolean; onChange: () => void; label: string }) {
  return <button role="switch" aria-checked={active} aria-label={label} className={`toggle ${active ? 'active' : ''}`} onClick={onChange}><span /></button>
}

function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2400)
    return () => window.clearTimeout(timer)
  }, [onDone])
  return <div className="toast"><CheckCircle2 size={16} />{text}</div>
}

function Sidebar({ page, setPage, collapsed, setCollapsed, onSearch, onNewChat, onOpenChat, onOpenSettings, onOpenPublic, onSignOut, onSwitchAccount, conversations, activeConversationId, profile, plan, mobileOpen, setMobileOpen }: {
  page: Page; setPage: (page: Page) => void; collapsed: boolean; setCollapsed: (v: boolean) => void;
  onSearch: () => void; onNewChat: () => void; onOpenChat: (conversation: ConversationRecord) => void; conversations: ConversationRecord[]; activeConversationId: string | null;
  onOpenSettings: (tab: SettingsTab) => void; onOpenPublic: (route: PublicRoute) => void; onSignOut: () => void; onSwitchAccount: () => void; mobileOpen: boolean; setMobileOpen: (v: boolean) => void
  profile: UserProfile; plan: string
}) {
  const [profileOpen, setProfileOpen] = useState(false)
  const navigate = (target: Page) => { setPage(target); setMobileOpen(false) }
  const closeProfile = () => setProfileOpen(false)
  const openSettings = (tab: SettingsTab) => { closeProfile(); onOpenSettings(tab); setMobileOpen(false) }
  const openPublic = (route: PublicRoute) => { closeProfile(); onOpenPublic(route); setMobileOpen(false) }
  const nav = [
    { id: 'chat' as Page, icon: MessageCircle, label: 'Chat' },
    { id: 'projects' as Page, icon: Folder, label: 'Projects' },
    { id: 'library' as Page, icon: Library, label: 'Library' },
    { id: 'agents' as Page, icon: Bot, label: 'Agents' },
    { id: 'workflows' as Page, icon: Zap, label: 'Workflows' },
  ]
  return (
    <>
      {mobileOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-head">
          <BrandMark compact={collapsed} />
          <IconButton label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </IconButton>
        </div>
        <div className="sidebar-actions">
          <button className="new-chat" onClick={() => { onNewChat(); setMobileOpen(false) }}><span><Plus size={17} />{!collapsed && 'New chat'}</span>{!collapsed && <kbd>⌘ N</kbd>}</button>
          <button className="nav-row" onClick={onSearch}><Search size={17} />{!collapsed && <><span>Search</span><kbd>⌘ K</kbd></>}</button>
        </div>
        <nav className="primary-nav" aria-label="Primary navigation">
          {nav.map(({ id, icon: Icon, label }) => (
            <button key={id} className={`nav-row ${page === id ? 'active' : ''}`} onClick={() => navigate(id)} title={collapsed ? label : undefined}>
              <Icon size={17} /><span>{label}</span>{!collapsed && id === 'agents' && <span className="soon">BETA</span>}
            </button>
          ))}
        </nav>
        {!collapsed && <div className="history">
          <div className="section-label"><span>Recent</span></div>
          <div className="history-group"><p>Recent</p>
            {conversations.filter(conversation => !conversation.archived).slice(0, 12).map(conversation => <button key={conversation.id} className={page === 'chat' && activeConversationId === conversation.id ? 'selected' : ''} onClick={() => { onOpenChat(conversation); setMobileOpen(false) }}><span>{conversation.favorite ? '★ ' : ''}{conversation.title}</span><MoreHorizontal size={14} /></button>)}
          </div>
        </div>}
        <div className="sidebar-footer">
          {profileOpen && <button className="profile-menu-scrim" aria-label="Close account menu" onClick={closeProfile} />}
          {profileOpen && <div className="profile-menu" role="menu" aria-label="Account menu">
            <div className="profile-menu-cap"><span>MERE X / ACCOUNT</span><BrandGlyph /></div>
            <button className="profile-menu-head" role="menuitem" onClick={() => openSettings('account')}><Avatar profile={profile} className="menu-avatar" /><span><b>{profile.name}</b><small>{profile.email}</small></span><span className="profile-open-icon"><ArrowRight size={15} /></span></button>
            <button className="profile-plan-card" role="menuitem" onClick={() => openSettings('billing')}><span className="profile-plan-icon"><CreditCard size={18} /></span><span><small>CURRENT PLAN</small><b>Mere {plan.charAt(0).toUpperCase() + plan.slice(1)}</b><em>Rolling 5-hour access</em></span><ChevronRight size={16} /></button>
            <div className="profile-shortcuts">
              <button role="menuitem" onClick={() => openSettings('personalization')}><SlidersHorizontal size={17} /><span><b>Personalize</b><small>Memory & style</small></span></button>
              <button role="menuitem" onClick={() => openSettings('general')}><Settings size={17} /><span><b>Settings</b><small>Workspace controls</small></span></button>
            </div>
            <div className="profile-resources" aria-label="Resources">
              <button role="menuitem" onClick={() => openPublic('help')}><CircleHelp size={16} /><span>Help</span></button>
              <button role="menuitem" onClick={() => openPublic('release-notes')}><FileText size={16} /><span>Updates</span></button>
              <button role="menuitem" onClick={() => openPublic('download')}><Download size={16} /><span>Apps</span></button>
            </div>
            <div className="profile-resources" aria-label="Account">
              <button role="menuitem" onClick={() => { closeProfile(); onSwitchAccount() }}><Users size={16} /><span>Switch account</span></button>
            </div>
            <div className="profile-menu-foot"><div><button onClick={() => openPublic('terms')}>Terms</button><span /> <button onClick={() => openPublic('privacy')}>Privacy</button><span /> <button onClick={() => openSettings('keyboard')}>Shortcuts</button></div><button className="profile-logout" role="menuitem" onClick={() => { closeProfile(); onSignOut() }}><LogOut size={16} /><span>Log out</span></button></div>
          </div>}
          <button className={`account-row ${profileOpen ? 'active' : ''}`} onClick={() => setProfileOpen(!profileOpen)} title="Open account menu" aria-expanded={profileOpen}>
            <Avatar profile={profile} />
            {!collapsed && <span className="account-copy"><b>{profile.name}</b><small>Personal workspace</small></span>}
            {!collapsed && <ChevronRight size={16} className={profileOpen ? 'account-chevron open' : 'account-chevron'} />}
          </button>
        </div>
      </aside>
    </>
  )
}

function Topbar({ page, setMobileOpen, onShare, onInfo, onNotify }: { page: Page; setMobileOpen: (v: boolean) => void; onShare: () => void; onInfo: () => void; onNotify: (text: string) => void }) {
  const titles: Record<Page, string> = { chat: 'Mere Apex 4.0', search: 'Search', projects: 'Projects', library: 'Library', agents: 'Agents', workflows: 'Workflows', settings: 'Settings' }
  return <header className={`topbar ${page === 'chat' ? 'chat-topbar' : ''}`}>
    <div className="topbar-left">
      <IconButton label="Open menu" className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={19} /></IconButton>
      {page === 'chat' ? <div className="model-identity" aria-label="Active model"><BrandGlyph /><span>{titles[page]}</span><small>ACTIVE</small></div> : <h2>{titles[page]}</h2>}
    </div>
    <div className="topbar-actions">
      {page === 'chat' && <><span className="private-label"><Lock size={12} />Private</span><button className="soft-button" onClick={onShare}><Share2 size={15} />Share</button><IconButton label="Conversation details" onClick={onInfo}><Info size={18} /></IconButton></>}
      {page !== 'chat' && <IconButton label="Notifications" onClick={() => onNotify('You are all caught up')}><Bell size={18} /></IconButton>}
    </div>
  </header>
}

function Composer({ value, setValue, onSubmit, onStop, attachments, setAttachments, imageMode, setImageMode, onToast, onLiveVoice, reasoningPreference = 'Adaptive', voiceEnabled = true, disabled = false, focused = false }: {
  value: string
  setValue: (v: string) => void
  onSubmit: (options: SubmitOptions) => void
  onStop?: () => void
  attachments: AttachmentData[]
  setAttachments: Dispatch<SetStateAction<AttachmentData[]>>
  imageMode: boolean
  setImageMode: (value: boolean) => void
  onToast: (text: string) => void
  onLiveVoice?: () => void
  reasoningPreference?: string
  voiceEnabled?: boolean
  disabled?: boolean
  focused?: boolean
}) {
  const [toolsOpen, setToolsOpen] = useState(false)
  const [reasoning, setReasoning] = useState(reasoningPreference !== 'Off')
  const [web, setWeb] = useState(false)
  const [listening, setListening] = useState(false)
  const [documentFormat, setDocumentFormat] = useState<ExportFormat | null>(null)
  const [imageAspectRatio, setImageAspectRatio] = useState('1:1')
  const [imageSize, setImageSize] = useState('2K')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (focused) inputRef.current?.focus() }, [focused])
  useEffect(() => { setReasoning(reasoningPreference !== 'Off') }, [reasoningPreference])

  const submit = (e: FormEvent) => { e.preventDefault(); if (!disabled && value.trim()) { onSubmit({ reasoning, research: web, imageMode, outputFormat: documentFormat, imageAspectRatio, imageSize }); setDocumentFormat(null) } }
  const addFiles = async (files: FileList | null, imageSource = false) => {
    if (!files?.length) return
    const accepted: AttachmentData[] = []
    let totalSize = attachments.reduce((sum, file) => sum + file.size, 0)
    for (const file of Array.from(files).slice(0, 8 - attachments.length)) {
      if (file.size > 12 * 1024 * 1024) { onToast(`${file.name} is larger than 12 MB`); continue }
      if (totalSize + file.size > 24 * 1024 * 1024) { onToast('Attachments can use up to 24 MB per request'); break }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      accepted.push({ name: file.name, mimeType: file.type || 'application/octet-stream', data: dataUrl.split(',')[1] || '', size: file.size })
      totalSize += file.size
    }
    setAttachments((current) => [...current, ...accepted].slice(0, 8))
    if (imageSource && accepted.some(file => file.mimeType.startsWith('image/'))) { setImageMode(true); setDocumentFormat(null) }
    setToolsOpen(false)
  }
  const startVoice = () => {
    type Recognition = { lang: string; interimResults: boolean; onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void; onend: () => void; onerror: () => void; start: () => void }
    const RecognitionClass = (window as typeof window & { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition
    if (!RecognitionClass) { onToast('Voice input is not supported in this browser'); return }
    const recognition = new RecognitionClass()
    recognition.lang = navigator.language || 'en-US'
    recognition.interimResults = false
    recognition.onresult = (event) => setValue(`${value}${value ? ' ' : ''}${event.results[0][0].transcript}`)
    recognition.onend = () => setListening(false)
    recognition.onerror = () => { setListening(false); onToast('Voice input could not start') }
    setListening(true)
    recognition.start()
  }
  return <form className="composer" onSubmit={submit}>
    <input ref={fileInputRef} className="file-input" type="file" multiple accept="image/*,audio/*,video/*,.pdf,.txt,.md,.csv,.json,.js,.ts,.tsx,.py,.docx,.xlsx,.pptx,.rtf,.html,.xml" onChange={e => void addFiles(e.target.files)} />
    <input ref={imageInputRef} className="file-input" type="file" accept="image/*" onChange={e => void addFiles(e.target.files, true)} />
    {!!attachments.length && <div className="attachment-strip">{attachments.map((file, index) => <span key={`${file.name}-${index}`}><File size={13} /><b>{file.name}</b><small>{fileSizeLabel(file.size)}</small><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setAttachments(current => current.filter((_, i) => i !== index))}><X size={12} /></button></span>)}</div>}
    {documentFormat && <div className="output-mode-banner"><FileText size={15} /><span><b>Create a downloadable file</b><small>The response will include a finished file.</small></span><div>{exportFormats.map(format => <button type="button" key={format.id} className={documentFormat === format.id ? 'active' : ''} onClick={() => { setDocumentFormat(format.id); setImageMode(false) }}>{format.detail}</button>)}</div><IconButton label="Cancel file creation" onClick={() => setDocumentFormat(null)}><X size={13} /></IconButton></div>}
    {imageMode && <div className="image-mode-controls"><span><Image size={14} /><b>{attachments.some(file => file.mimeType.startsWith('image/')) ? 'Image edit' : 'Image studio'}</b></span><label>Frame<select aria-label="Image aspect ratio" value={imageAspectRatio} onChange={event => setImageAspectRatio(event.target.value)}><option value="1:1">Square</option><option value="16:9">Wide</option><option value="9:16">Portrait</option><option value="4:3">Classic</option><option value="3:2">Photo</option><option value="21:9">Cinema</option></select></label><label>Quality<select aria-label="Image quality" value={imageSize} onChange={event => setImageSize(event.target.value)}><option value="1K">Fast</option><option value="2K">High</option><option value="4K">Maximum</option></select></label></div>}
    <textarea ref={inputRef} rows={1} value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!disabled && value.trim()) { onSubmit({ reasoning, research: web, imageMode, outputFormat: documentFormat, imageAspectRatio, imageSize }); setDocumentFormat(null) } }
    }} placeholder={imageMode ? (attachments.some(file => file.mimeType.startsWith('image/')) ? 'Describe what you want to change in the image...' : 'Describe the image you want to create...') : documentFormat ? `Describe the ${documentFormat.toUpperCase()} file you want...` : 'Ask Mere X anything...'} aria-label="Message Mere X" />
    <div className="composer-bottom">
      <div className="composer-tools">
        <div className="attach-wrap">
          <IconButton label="Add attachment" onClick={() => setToolsOpen(!toolsOpen)} className={toolsOpen ? 'active' : ''}><Paperclip size={18} /></IconButton>
          {toolsOpen && <div className="pop-menu attach-menu">
            <button type="button" onClick={() => fileInputRef.current?.click()}><FileText size={17} /><span><b>Upload files</b><small>PDF, Office, images, audio or code</small></span></button>
            <button type="button" onClick={() => { setImageMode(true); setDocumentFormat(null); setToolsOpen(false); imageInputRef.current?.click() }}><Image size={17} /><span><b>Edit an image</b><small>Upload a photo and describe the change</small></span></button>
            <button type="button" onClick={() => { setDocumentFormat('docx'); setImageMode(false); setToolsOpen(false); inputRef.current?.focus() }}><FileText size={17} /><span><b>Create a document</b><small>Word, Excel, PowerPoint, PDF or Markdown</small></span></button>
            <button type="button" onClick={() => { setWeb(true); setToolsOpen(false); inputRef.current?.focus() }}><Link2 size={17} /><span><b>Research a link</b><small>Paste a URL into your message</small></span></button>
          </div>}
        </div>
        <button type="button" className={`tool-chip ${reasoning ? 'active' : ''}`} onClick={() => setReasoning(!reasoning)}><Sparkles size={15} />Think</button>
        <button type="button" className={`tool-chip ${web ? 'active' : ''}`} onClick={() => setWeb(!web)}><Globe2 size={15} />Research</button>
        <button type="button" className={`tool-chip ${imageMode ? 'active' : ''}`} onClick={() => { const nextMode = !imageMode; setImageMode(nextMode); if (nextMode) setDocumentFormat(null) }}><Image size={15} />Image</button>
        {documentFormat && <button type="button" className="tool-chip active" onClick={() => setDocumentFormat(null)}><FileText size={15} />{documentFormat.toUpperCase()}</button>}
      </div>
      <div className="composer-send">
        {voiceEnabled && <IconButton label="Live voice conversation" onClick={onLiveVoice}><Headphones size={18} /></IconButton>}
        {voiceEnabled && <IconButton label="Voice input" onClick={startVoice} className={listening ? 'listening' : ''}><Mic size={18} /></IconButton>}
        {disabled ? <button className="send-button stop-button" type="button" aria-label="Stop generating" onClick={onStop}><Square size={13} /></button> : <button className="send-button" type="submit" aria-label="Send message" disabled={!value.trim()}><ArrowUp size={18} /></button>}
      </div>
    </div>
  </form>
}

function EmptyChat({ value, setValue, onSubmit, attachments, setAttachments, imageMode, setImageMode, onToast, onLiveVoice, reasoningPreference, voiceEnabled, disabled }: {
  value: string
  setValue: (v: string) => void
  onSubmit: (options: SubmitOptions) => void
  attachments: AttachmentData[]
  setAttachments: Dispatch<SetStateAction<AttachmentData[]>>
  imageMode: boolean
  setImageMode: (value: boolean) => void
  onToast: (text: string) => void
  onLiveVoice?: () => void
  reasoningPreference: string
  voiceEnabled: boolean
  disabled: boolean
}) {
  return <div className="empty-chat">
    <div className="hero-copy">
      <div className="hero-mark"><BrandMark compact /></div>
      <p className="eyebrow">MERE APEX 4.0</p>
      <h1>What can we <span>solve</span> together?</h1>
      <p className="hero-sub">Think deeper, create faster, and move from question to outcome.</p>
    </div>
    <div className="hero-composer"><Composer value={value} setValue={setValue} onSubmit={onSubmit} attachments={attachments} setAttachments={setAttachments} imageMode={imageMode} setImageMode={setImageMode} onToast={onToast} onLiveVoice={onLiveVoice} reasoningPreference={reasoningPreference} voiceEnabled={voiceEnabled} disabled={disabled} focused /></div>
    <div className="starter-grid">
      {starterPrompts.map(({ label, detail, icon: Icon }) => <button key={label} onClick={() => { setValue(`${label}: `); setImageMode(label === 'Create an image') }}><Icon size={18} /><span><b>{label}</b><small>{detail}</small></span><ArrowRight size={15} /></button>)}
    </div>
    <p className="disclaimer">Mere X can make mistakes. Verify important information.</p>
  </div>
}

function ChatMessage({ message, onToast, onRegenerate }: { message: Message; onToast: (s: string) => void; onRegenerate?: () => void }) {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const [localFiles, setLocalFiles] = useState<GeneratedFile[]>([])
  if (message.role === 'user') return <div className="message user-message"><div className="user-stack">{!!message.attachments?.length && <div className="sent-files">{message.attachments.map(name => <span key={name}><File size={12} />{name}</span>)}</div>}<div className="user-bubble">{message.content}</div></div></div>
  const isDemo = message.content === 'mock'
  const availableFiles = [...(message.files || []), ...localFiles]
  const copyResponse = async () => { await navigator.clipboard.writeText(message.content); onToast('Response copied') }
  const exportResponse = async (format: ExportFormat) => {
    setExporting(format)
    try {
      const title = message.content.replace(/[#*_`]/g, '').split(/\r?\n/).find(Boolean)?.slice(0, 72) || 'Mere X document'
      const file = await requestExportFile(format, title, message.content)
      setLocalFiles(current => [...current.filter(item => item.format !== format), file])
      setExportOpen(false)
      onToast(`${file.name} is ready`)
    } catch (error) { onToast(error instanceof Error ? error.message : 'The file could not be created') }
    finally { setExporting(null) }
  }
  const readAloud = () => {
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(message.content))
    onToast('Reading response aloud')
  }
  return <div className="message assistant-message">
    <div className="assistant-icon"><BrandGlyph /></div>
    <div className="response-body">
      <div className="response-meta"><b>Mere Apex 4.0</b><span>NOW</span></div>
      {isDemo ? <>
        <p>I’ve mapped this into a clear starting point. The strongest approach is to begin with the core experience, then layer in power without adding visual noise.</p>
        <h3>A focused direction</h3>
        <p>Your product should feel immediate: one clear place to think, create, research, and turn ideas into finished work. The interface can stay calm while the capabilities remain deep.</p>
        <div className="insight-block"><span>01</span><div><b>Start with the user’s outcome</b><p>Design every flow backward from the moment the work becomes useful.</p></div></div>
        <div className="insight-block"><span>02</span><div><b>Keep intelligence contextual</b><p>Surface the right tools when they are relevant, not all at once.</p></div></div>
        <div className="code-card"><div className="code-head"><span><Code2 size={14} />product-principles.md</span><button onClick={() => { void navigator.clipboard.writeText('focus: outcome\ninterface: calm\ncapability: deep\ntrust: visible'); onToast('Copied to clipboard') }}><Copy size={14} />Copy</button></div><pre><code>{`focus: outcome\ninterface: calm\ncapability: deep\ntrust: visible`}</code></pre></div>
        <p>This gives Mere X a premium foundation that can grow into research, creation, collaboration, and advanced workflows without changing its core identity.</p>
      </> : <div className={`markdown-response ${message.error ? 'error-response' : ''}`}><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown></div>}
      {!!message.images?.length && <div className="generated-images">{message.images.map((src, index) => <figure key={index}><img src={src} alt={`Generated result ${index + 1}`} /><a href={src} download={`mere-x-${Date.now()}-${index + 1}.png`}><Download size={14} />Download</a></figure>)}</div>}
      {!!availableFiles.length && <div className="generated-files">{availableFiles.map(file => <a href={generatedFileUrl(file)} download={file.name} key={`${file.name}-${file.format}`}><span><FileText size={19} /></span><div><b>{file.name}</b><small>{file.format.toUpperCase()} · {fileSizeLabel(file.size)}</small></div><Download size={16} /></a>)}</div>}
      {!!message.sources?.length && <div className="live-sources"><div><Globe2 size={14} /><b>{message.sources.length} sources</b></div>{message.sources.map((source, index) => <a href={source.uri} target="_blank" rel="noreferrer" key={source.uri}><span>{String(index + 1).padStart(2, '0')}</span><b>{source.title}</b><ExternalLink size={13} /></a>)}</div>}
      <div className="message-actions">
        <IconButton label="Copy response" onClick={() => void copyResponse()}><Clipboard size={15} /></IconButton>
        <IconButton label="Good response" className={feedback === 'up' ? 'active' : ''} onClick={() => { setFeedback(feedback === 'up' ? null : 'up'); onToast('Feedback saved') }}><ThumbsUp size={15} /></IconButton>
        <IconButton label="Bad response" className={feedback === 'down' ? 'active' : ''} onClick={() => { setFeedback(feedback === 'down' ? null : 'down'); onToast('Feedback saved') }}><ThumbsDown size={15} /></IconButton>
        <IconButton label="Read aloud" onClick={readAloud}><Volume2 size={15} /></IconButton>
        <IconButton label="Regenerate" onClick={onRegenerate}><RotateCcw size={15} /></IconButton>
        <div className="response-export-wrap"><IconButton label="Export response" className={exportOpen ? 'active' : ''} onClick={() => setExportOpen(!exportOpen)}><Download size={15} /></IconButton>{exportOpen && <div className="response-export-menu">{exportFormats.map(format => <button type="button" key={format.id} disabled={Boolean(exporting)} onClick={() => void exportResponse(format.id)}><FileText size={15} /><span>{format.label}<small>{exporting === format.id ? 'Creating…' : format.detail}</small></span></button>)}</div>}</div>
      </div>
    </div>
  </div>
}

function ChatPage({ messages, setMessages, onToast, onLiveVoice, agent, project, preferences, voiceEnabled, onArtifact }: {
  messages: Message[]
  setMessages: Dispatch<SetStateAction<Message[]>>
  onToast: (s: string) => void
  onLiveVoice: () => void
  agent?: AgentRecord | null
  project?: ProjectRecord | null
  preferences: Preferences
  voiceEnabled: boolean
  onArtifact: (artifact: LibraryRecord) => void
}) {
  const [value, setValue] = useState('')
  const [thinking, setThinking] = useState(false)
  const [attachments, setAttachments] = useState<AttachmentData[]>([])
  const [imageMode, setImageMode] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<HTMLElement>(null)
  const scrollFrameRef = useRef<number | null>(null)
  useEffect(() => {
    const messagesNode = messagesRef.current
    if (!messagesNode) return
    if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current)
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      const scrollContainer = messagesNode.closest('.page-area') as HTMLElement | null
      if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight
      scrollFrameRef.current = null
    })
    return () => { if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current) }
  }, [messages, thinking])
  useEffect(() => {
    const messagesNode = messagesRef.current
    if (!messagesNode || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current)
      scrollFrameRef.current = window.requestAnimationFrame(() => {
        const scrollContainer = messagesNode.closest('.page-area') as HTMLElement | null
        if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight
        scrollFrameRef.current = null
      })
    })
    observer.observe(messagesNode)
    return () => observer.disconnect()
  }, [messages.length > 0])
  const submit = async ({ reasoning, research, imageMode: requestedImage, outputFormat, imageAspectRatio = '1:1', imageSize = '2K' }: SubmitOptions, promptOverride?: string, historyOverride?: Message[]) => {
    if (thinking) return
    const content = (promptOverride ?? value).trim(); if (!content) return
    const controller = new AbortController()
    abortRef.current = controller
    const responseId = Date.now() + 1
    const requestedFormat = requestedImage ? null : outputFormat || detectOutputFormat(content, promptOverride ? [] : attachments)
    const next = [...(historyOverride ?? messages), { id: Date.now(), role: 'user' as const, content, attachments: promptOverride ? undefined : attachments.map(file => file.name) }]
    setMessages(next); setThinking(true)
    const payloadAttachments = promptOverride ? [] : attachments.map(({ name, mimeType, data }) => ({ name, mimeType, data }))
    if (!promptOverride) { setValue(''); setAttachments([]); setImageMode(false) }
    try {
      if (requestedImage) {
        const response = await fetch('/api/image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: content, attachments: payloadAttachments, aspectRatio: imageAspectRatio, imageSize }), signal: controller.signal })
        const result = await response.json() as { text?: string; images?: string[]; error?: string; resetAt?: number }
        if (!response.ok) {
          const when = result.resetAt ? new Date(result.resetAt) : null
          const sameDay = when && when.toDateString() === new Date().toDateString()
          throw new Error(when ? `${result.error} Available again ${sameDay ? `at ${when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : `on ${when.toLocaleDateString()}`}.` : (result.error || 'Image generation failed'))
        }
        setMessages([...next, { id: responseId, role: 'assistant', content: result.text || (payloadAttachments.length ? 'Here is your edited image.' : 'Here is your generated image.'), images: result.images }])
        if (result.images?.[0]) onArtifact({ id: `artifact-${Date.now()}`, title: content.replace(/^Create an image:\s*/i, '').slice(0, 64) || 'Generated image', type: 'Image', date: 'Just now', preview: result.images[0], content })
        setThinking(false)
        return
      }
      const previousInteractionId = (historyOverride ?? messages).filter(message => message.role === 'assistant').at(-1)?.interactionId
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next.map(({ role, content: text }) => ({ role, content: text })), attachments: payloadAttachments, reasoning, research, outputFormat: requestedFormat, previousInteractionId, agent: agent ? { name: agent.name, instructions: agent.instructions } : undefined, project: project ? { name: project.name, description: project.description, knowledgeStore: project.knowledgeStore } : undefined, preferences: { about: preferences.about, responseStyle: preferences.responseStyle, language: preferences.language } }), signal: controller.signal })
      if (!response.ok || !response.body) {
        const result = await response.json().catch(() => ({})) as { error?: string }
        throw new Error(result.error || 'Mere X is unavailable right now.')
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''
      let sources: Source[] = []
      let interactionId = previousInteractionId
      const processLine = (line: string) => {
        if (!line.trim()) return
        const event = JSON.parse(line) as { type: string; text?: string; sources?: Source[]; error?: string; id?: string }
        if (event.type === 'error') throw new Error(event.error || 'Mere X could not complete the request.')
        if (event.type === 'text') fullText += event.text || ''
        if (event.type === 'sources') sources = event.sources || []
        if (event.type === 'interaction' && event.id) interactionId = event.id
        if (fullText) setMessages([...next, { id: responseId, role: 'assistant', content: fullText, sources, interactionId }])
      }
      while (true) {
        const { value: chunk, done } = await reader.read()
        buffer += decoder.decode(chunk || new Uint8Array(), { stream: !done })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) processLine(line)
        if (done) break
      }
      if (buffer.trim()) processLine(buffer)
      if (!fullText) throw new Error('Mere X returned an empty response. Please try again.')
      let files: GeneratedFile[] | undefined
      if (requestedFormat) {
        try {
          const title = content.replace(/[#*_`]/g, '').replace(/\.(docx|xlsx|pptx|pdf|md)\b/gi, '').slice(0, 72) || 'Mere X document'
          const file = await requestExportFile(requestedFormat, title, fullText, controller.signal)
          files = [file]
          onArtifact({ id: `artifact-${Date.now()}`, title: file.name.replace(/\.[^.]+$/, ''), type: 'Document', date: 'Just now', content: fullText })
        } catch (error) { onToast(error instanceof Error ? `Response ready · ${error.message}` : 'Response ready · file export failed') }
      }
      setThinking(false)
      setMessages([...next, { id: responseId, role: 'assistant', content: fullText, sources, files, interactionId }])
    } catch (error) {
      setThinking(false)
      if (controller.signal.aborted) return
      setMessages([...next, { id: responseId, role: 'assistant', content: error instanceof Error ? error.message : 'Mere X could not complete the request.', error: true }])
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }
  const regenerate = (messageIndex: number) => {
    let userIndex = messageIndex - 1
    while (userIndex >= 0 && messages[userIndex].role !== 'user') userIndex -= 1
    if (userIndex < 0) { onToast('No prompt found to regenerate'); return }
    void submit({ reasoning: true, research: Boolean(messages[messageIndex].sources?.length), imageMode: Boolean(messages[messageIndex].images?.length), outputFormat: messages[messageIndex].files?.[0]?.format }, messages[userIndex].content, messages.slice(0, userIndex))
  }
  if (!messages.length) return <EmptyChat value={value} setValue={setValue} onSubmit={submit} attachments={attachments} setAttachments={setAttachments} imageMode={imageMode} setImageMode={setImageMode} onToast={onToast} onLiveVoice={onLiveVoice} reasoningPreference={preferences.reasoning} voiceEnabled={voiceEnabled} disabled={thinking} />
  return <div className="chat-thread">
    <main className="messages" ref={messagesRef} aria-live="polite">
      {(agent || project) && <div className="context-banner">{agent ? <Bot size={15} /> : <Folder size={15} />}<span><b>{agent?.name || project?.name}</b><small>{agent ? 'Specialist instructions active' : project?.knowledgeStore ? 'Project knowledge and instructions active' : 'Project instructions active'}</small></span><Check size={14} /></div>}
      {messages.map((message, index) => <ChatMessage key={message.id} message={message} onToast={onToast} onRegenerate={message.role === 'assistant' ? () => regenerate(index) : undefined} />)}
      {thinking && <div className="thinking"><div className="assistant-icon"><BrandGlyph /></div><span>Thinking</span><i /><i /><i /></div>}
    </main>
    <div className="thread-composer"><Composer value={value} setValue={setValue} onSubmit={submit} onStop={() => { abortRef.current?.abort(); setThinking(false) }} attachments={attachments} setAttachments={setAttachments} imageMode={imageMode} setImageMode={setImageMode} onToast={onToast} onLiveVoice={onLiveVoice} reasoningPreference={preferences.reasoning} voiceEnabled={voiceEnabled} disabled={thinking} /><p>Mere X can make mistakes. Verify important information.</p></div>
  </div>
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function ProjectsPage({ projects, setProjects, onToast, onOpen }: {
  projects: ProjectRecord[]
  setProjects: Dispatch<SetStateAction<ProjectRecord[]>>
  onToast: (s: string) => void
  onOpen: (project: ProjectRecord) => void
}) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sortBy, setSortBy] = useState<'updated' | 'name'>('updated')
  const [indexingId, setIndexingId] = useState<string | null>(null)
  const shownProjects = useMemo(() => sortBy === 'name' ? [...projects].sort((a, b) => a.name.localeCompare(b.name)) : projects, [projects, sortBy])
  const createProject = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    const project: ProjectRecord = { id: `project-${Date.now()}`, name: name.trim(), description: description.trim() || 'A focused workspace for related conversations and files.', chatCount: 0, fileCount: 0, updated: 'Created just now' }
    setProjects(current => [project, ...current])
    setName(''); setDescription(''); setCreating(false); onToast('Project created')
  }
  const removeProject = (id: string, projectName: string) => {
    setProjects(current => current.filter(project => project.id !== id))
    onToast(`${projectName} deleted`)
  }
  const indexKnowledge = async (project: ProjectRecord, file: File | undefined) => {
    if (!file) return
    if (file.size > 100 * 1024 * 1024) { onToast(`${file.name} is larger than 100 MB`); return }
    setIndexingId(project.id)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file) })
      const response = await fetch('/api/knowledge/index', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project.id, projectName: project.name, name: file.name, mimeType: file.type || 'application/octet-stream', data: dataUrl.split(',')[1] || '' }) })
      const result = await response.json() as { storeName?: string; status?: string; error?: string }
      if (!response.ok || !result.storeName) throw new Error(result.error || 'The document could not be indexed.')
      setProjects(current => current.map(item => item.id === project.id ? { ...item, knowledgeStore: result.storeName, fileCount: item.fileCount + 1, updated: result.status === 'ready' ? 'Knowledge ready' : 'Knowledge processing' } : item))
      onToast(result.status === 'ready' ? `${file.name} added to project knowledge` : `${file.name} is being indexed`)
    } catch (error) { onToast(error instanceof Error ? error.message : 'Project knowledge could not be updated') }
    finally { setIndexingId(null) }
  }
  return <div className="page-shell">
    <PageHeading eyebrow="WORKSPACES" title="Projects" description="Keep long-running work, files, context and conversations together." action={<button className="primary-button" onClick={() => setCreating(true)}><Plus size={16} />New project</button>} />
    <div className="feature-banner"><div className="banner-mark"><FolderKanban size={23} /></div><div><span className="status-dot" />PROJECT MEMORY</div><h2>Your work remembers the full picture.</h2><p>Every chat and file in a project shares context, so Mere Apex 4.0 stays aligned from first thought to final output.</p><button onClick={() => onToast('Projects keep their instructions, chats and files in one shared context')}>Learn how projects work<ArrowRight size={15} /></button><div className="banner-grid" /></div>
    <div className="content-title"><h3>Your projects</h3><div><button className="filter-button" onClick={() => setSortBy(current => current === 'updated' ? 'name' : 'updated')}><Clock3 size={14} />{sortBy === 'updated' ? 'Last updated' : 'Name'}<ChevronDown size={14} /></button></div></div>
    <div className="project-grid">
      {shownProjects.map((project, index) => <div className="project-card-wrap" key={project.id}><button className="project-card" onClick={() => onOpen(project)}><div className="project-icon">{index % 3 === 0 ? <Sparkles size={21} /> : index % 3 === 1 ? <FolderKanban size={21} /> : <BookOpen size={21} />}</div><h3>{project.name}</h3><p>{project.chatCount} chats · {project.fileCount} files</p><span>{project.knowledgeStore ? 'KNOWLEDGE ACTIVE · ' : ''}{project.updated}</span><div className="project-arrow"><ArrowRight size={16} /></div></button><label className="project-knowledge-button" title="Add project knowledge"><Database size={14} /><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.json,.html,.xml,image/png,image/jpeg" disabled={indexingId === project.id} onChange={event => { void indexKnowledge(project, event.target.files?.[0]); event.target.value = '' }} /><span>{indexingId === project.id ? 'Indexing…' : 'Add knowledge'}</span></label><button className="project-menu-button" aria-label={`Delete ${project.name}`} title="Delete project" onClick={() => removeProject(project.id, project.name)}><Trash2 size={14} /></button></div>)}
      <button className="project-card add-project" onClick={() => setCreating(true)}><Plus size={22} /><h3>Create a project</h3><p>Bring chats, files and instructions together.</p></button>
    </div>
    {creating && <div className="modal-backdrop" onMouseDown={event => { if (event.currentTarget === event.target) setCreating(false) }}><form className="entity-modal" onSubmit={createProject}><div className="modal-head"><div><p className="eyebrow">NEW WORKSPACE</p><h2>Create a project</h2><p>Give related chats and files one shared context.</p></div><IconButton label="Close" onClick={() => setCreating(false)}><X size={18} /></IconButton></div><label><span>Project name</span><input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Product launch" /></label><label><span>Project instructions</span><textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="What is this project about? What should Mere X remember?" /></label><div className="entity-modal-actions"><button type="button" className="soft-button" onClick={() => setCreating(false)}>Cancel</button><button className="primary-button" disabled={!name.trim()}>Create project</button></div></form></div>}
  </div>
}

function LibraryPage({ items, setItems, onToast, onContinue }: { items: LibraryRecord[]; setItems: Dispatch<SetStateAction<LibraryRecord[]>>; onToast: (s: string) => void; onContinue: (item: LibraryRecord) => void }) {
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<LibraryRecord | null>(null)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const shown = items.filter(item => (filter === 'All' || item.type === filter) && item.title.toLowerCase().includes(query.toLowerCase()))
  const iconFor = (type: LibraryRecord['type']) => type === 'Code' ? FileCode2 : type === 'Image' ? Image : type === 'Canvas' ? LayoutGrid : FileText
  const exportLibrary = () => {
    const exportData = items.map(({ preview: _preview, ...item }) => item)
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'mere-x-library.json'; anchor.click(); URL.revokeObjectURL(url)
    onToast('Library exported')
  }
  const createDocument = (event: FormEvent) => {
    event.preventDefault(); if (!title.trim()) return
    setItems(current => [{ id: `library-${Date.now()}`, title: title.trim(), type: 'Document', date: 'Created just now', content: content.trim() || 'Start writing with Mere X.' }, ...current])
    setTitle(''); setContent(''); setCreating(false); onToast('Document saved to Library')
  }
  return <div className="page-shell">
    <PageHeading eyebrow="YOUR OUTPUTS" title="Library" description="Everything you create with Mere X, organized and ready to continue." action={<div className="heading-actions"><button className="soft-button" onClick={exportLibrary}><Download size={16} />Export</button><button className="primary-button" onClick={() => setCreating(true)}><Plus size={16} />New document</button></div>} />
    <div className="library-toolbar"><div className="segmented">{['All', 'Document', 'Code', 'Image'].map(item => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="inline-search"><Search size={16} /><input aria-label="Search library" placeholder="Search library" value={query} onChange={event => setQuery(event.target.value)} /></div></div>
    <div className="library-grid">
      {shown.map((item, index) => { const Icon = iconFor(item.type); return <article className="library-card" key={item.id}>
        <div className={`library-preview preview-${item.type.toLowerCase()}`}>
          {item.preview ? <img className="artifact-preview-image" src={item.preview} alt="" /> : item.type === 'Code' ? <><span className="code-line wide" /><span className="code-line" /><span className="code-line mid" /><span className="code-line tiny" /></> : item.type === 'Image' ? <div className="abstract-art"><i /><i /><i /></div> : <><span className="doc-kicker" /><span className="doc-title" /><span className="doc-line" /><span className="doc-line short" /><span className="doc-line" /><span className="doc-line mid" /></>}
          <button onClick={() => setSelected(item)} aria-label={`Open ${item.title}`}><ExternalLink size={16} /></button>
        </div>
        <div className="library-info"><span className="library-type"><Icon size={15} />{item.type}</span><h3>{item.title}</h3><p>{item.date}</p></div><IconButton label={`Delete ${item.title}`} onClick={() => { setItems(current => current.filter(record => record.id !== item.id)); onToast('Library item deleted') }}><Trash2 size={15} /></IconButton>
        {index === 0 && <span className="new-tag">NEW</span>}
      </article>})}
      {!shown.length && <div className="library-empty"><Search size={22} /><b>No library items found</b><span>Change the filter or create a new document.</span></div>}
    </div>
    {selected && <div className="modal-backdrop" onMouseDown={event => { if (event.currentTarget === event.target) setSelected(null) }}><div className="artifact-modal"><div className="modal-head"><div><p className="eyebrow">{selected.type.toUpperCase()}</p><h2>{selected.title}</h2><p>{selected.date}</p></div><IconButton label="Close" onClick={() => setSelected(null)}><X size={18} /></IconButton></div>{selected.preview ? <img src={selected.preview} alt={selected.title} /> : <pre>{selected.content}</pre>}<div className="entity-modal-actions">{selected.preview && <a className="soft-button" href={selected.preview} download={`${selected.title}.png`}><Download size={15} />Download</a>}<button className="primary-button" onClick={() => { setSelected(null); onContinue(selected) }}>Continue with Mere X<ArrowRight size={14} /></button></div></div></div>}
    {creating && <div className="modal-backdrop" onMouseDown={event => { if (event.currentTarget === event.target) setCreating(false) }}><form className="entity-modal" onSubmit={createDocument}><div className="modal-head"><div><p className="eyebrow">NEW OUTPUT</p><h2>Create a document</h2><p>Save a note or draft to your Mere X library.</p></div><IconButton label="Close" onClick={() => setCreating(false)}><X size={18} /></IconButton></div><label><span>Title</span><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Document title" /></label><label><span>Content</span><textarea value={content} onChange={event => setContent(event.target.value)} placeholder="Write or paste content..." /></label><div className="entity-modal-actions"><button type="button" className="soft-button" onClick={() => setCreating(false)}>Cancel</button><button className="primary-button" disabled={!title.trim()}>Save document</button></div></form></div>}
  </div>
}

type WorkflowKind = 'deep-research' | 'computer-workspace' | 'managed-agent' | 'video'

function encodePcm16(input: Float32Array, inputRate: number, outputRate = 16000) {
  const ratio = inputRate / outputRate
  const length = Math.max(1, Math.round(input.length / ratio))
  const bytes = new Uint8Array(length * 2)
  const view = new DataView(bytes.buffer)
  for (let index = 0; index < length; index += 1) {
    const start = Math.floor(index * ratio)
    const end = Math.min(input.length, Math.floor((index + 1) * ratio))
    let total = 0
    for (let source = start; source < end; source += 1) total += input[source]
    const sample = Math.max(-1, Math.min(1, total / Math.max(1, end - start)))
    view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
  }
  let binary = ''
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index])
  return window.btoa(binary)
}

function LiveVoiceOverlay({ authenticated, onClose, onSignIn }: { authenticated: boolean; onClose: () => void; onSignIn: () => void }) {
  const [state, setState] = useState<'idle' | 'connecting' | 'listening' | 'speaking' | 'error'>('idle')
  const [error, setError] = useState('')
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const sessionRef = useRef<Session | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const inputContextRef = useRef<AudioContext | null>(null)
  const outputContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>())
  const nextAudioTimeRef = useRef(0)

  const stopAudio = () => {
    sourcesRef.current.forEach(source => { try { source.stop() } catch { /* The source may already be stopped. */ } })
    sourcesRef.current.clear(); nextAudioTimeRef.current = 0
  }
  const playAudio = async (data: string) => {
    const context = outputContextRef.current || new AudioContext({ sampleRate: 24000 })
    outputContextRef.current = context
    if (context.state === 'suspended') await context.resume()
    const binary = window.atob(data)
    const samples = new Float32Array(Math.floor(binary.length / 2))
    for (let index = 0; index < samples.length; index += 1) {
      const low = binary.charCodeAt(index * 2); const high = binary.charCodeAt(index * 2 + 1)
      const value = (high << 8) | low
      samples[index] = (value > 32767 ? value - 65536 : value) / 32768
    }
    const buffer = context.createBuffer(1, samples.length, 24000)
    buffer.copyToChannel(samples, 0)
    const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination)
    const startAt = Math.max(context.currentTime + .025, nextAudioTimeRef.current)
    nextAudioTimeRef.current = startAt + buffer.duration
    sourcesRef.current.add(source); source.onended = () => sourcesRef.current.delete(source); source.start(startAt)
    setState('speaking')
  }
  const stop = () => {
    processorRef.current?.disconnect(); processorRef.current = null
    streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null
    try { sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true }); sessionRef.current?.close() } catch { /* The live socket may already be closed. */ }
    sessionRef.current = null; stopAudio()
    void inputContextRef.current?.close(); inputContextRef.current = null
    void outputContextRef.current?.close(); outputContextRef.current = null
    setState('idle')
  }
  useEffect(() => () => stop(), [])

  const start = async () => {
    if (!authenticated) { onClose(); onSignIn(); return }
    setState('connecting'); setError(''); setInputText(''); setOutputText('')
    try {
      const tokenResponse = await fetch('/api/live/token', { method: 'POST' })
      const tokenResult = await tokenResponse.json() as { token?: string; model?: string; error?: string }
      if (!tokenResponse.ok || !tokenResult.token || !tokenResult.model) throw new Error(tokenResult.error || 'Live voice could not start.')
      const { GoogleGenAI, Modality } = await import('@google/genai')
      const ai = new GoogleGenAI({ apiKey: tokenResult.token, httpOptions: { apiVersion: 'v1alpha' } })
      const session = await ai.live.connect({
        model: tokenResult.model,
        config: { responseModalities: [Modality.AUDIO], inputAudioTranscription: {}, outputAudioTranscription: {} },
        callbacks: {
          onopen: () => setState('listening'),
          onmessage: (message: LiveServerMessage) => {
            const content = message.serverContent
            if (content?.interrupted) stopAudio()
            if (content?.inputTranscription?.text) setInputText(content.inputTranscription.text)
            if (content?.outputTranscription?.text) setOutputText(current => `${current}${content.outputTranscription?.text || ''}`)
            for (const part of content?.modelTurn?.parts || []) if (part.inlineData?.data && part.inlineData.mimeType?.includes('audio')) void playAudio(part.inlineData.data)
            if (content?.turnComplete) setState('listening')
          },
          onerror: () => { setError('The live voice connection was interrupted.'); setState('error') },
          onclose: () => setState(current => current === 'error' ? current : 'idle'),
        },
      })
      sessionRef.current = session
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      streamRef.current = stream
      const context = new AudioContext(); inputContextRef.current = context
      const source = context.createMediaStreamSource(stream)
      const processor = context.createScriptProcessor(4096, 1, 1); processorRef.current = processor
      processor.onaudioprocess = event => {
        if (!sessionRef.current) return
        const data = encodePcm16(event.inputBuffer.getChannelData(0), context.sampleRate)
        sessionRef.current.sendRealtimeInput({ audio: { data, mimeType: 'audio/pcm;rate=16000' } })
      }
      source.connect(processor); processor.connect(context.destination); setState('listening')
    } catch (reason) {
      stop(); setError(reason instanceof Error ? reason.message : 'Live voice could not start.'); setState('error')
    }
  }

  return <div className="voice-overlay"><div className="voice-shell" role="dialog" aria-modal="true" aria-label="Live voice"><header><BrandMark /><IconButton label="Close live voice" onClick={() => { stop(); onClose() }}><X size={20} /></IconButton></header><main><div className={`voice-orb ${state}`}><span /><i /><i /><i /></div><p className="eyebrow">MERE APEX 4.0 / LIVE</p><h2>{state === 'connecting' ? 'Connecting…' : state === 'listening' ? 'I’m listening.' : state === 'speaking' ? 'Mere Apex is speaking.' : state === 'error' ? 'Connection paused.' : 'Talk naturally.'}</h2><p className="voice-description">A low-latency conversation that can hear interruptions and respond with voice.</p>{(inputText || outputText) && <div className="voice-transcript">{inputText && <p><span>YOU</span>{inputText}</p>}{outputText && <p><span>MERE APEX</span>{outputText}</p>}</div>}{error && <div className="voice-error"><CircleHelp size={16} />{error}</div>}</main><footer>{state === 'idle' || state === 'error' ? <button className="voice-start" onClick={() => void start()}><Mic size={18} />{authenticated ? 'Start conversation' : 'Sign in to start'}</button> : <button className="voice-end" onClick={stop}><Square size={14} />End conversation</button>}<span><Lock size={12} />Temporary protected session</span></footer></div></div>
}

// Which usage capability each workflow spends, so the interface gates on the
// same rule the server enforces instead of a second, drifting copy of it.
const workflowCapability: Record<WorkflowKind, string> = {
  'deep-research': 'deepResearch',
  'computer-workspace': 'computer',
  'managed-agent': 'agent',
  video: 'video',
}

function WorkflowsPage({ authenticated, plan, onSignIn, onUpgrade, onToast }: { authenticated: boolean; plan: string; onSignIn: () => void; onUpgrade: () => void; onToast: (text: string) => void }) {
  const [kind, setKind] = useState<WorkflowKind>('deep-research')
  const [capabilities, setCapabilities] = useState<Record<string, PlanCapability> | null>(null)
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [resolution, setResolution] = useState('720p')
  const [job, setJob] = useState<ManagedJob | null>(null)
  const [recentJobs, setRecentJobs] = useState<ManagedJob[]>([])
  const [submitting, setSubmitting] = useState(false)
  const workflows: { id: WorkflowKind; title: string; eyebrow: string; description: string; icon: typeof Zap; placeholder: string }[] = [
    { id: 'deep-research', title: 'Deep Research', eyebrow: 'REPORT', description: 'Investigate a complex topic across many sources and return a structured, cited report.', icon: Globe2, placeholder: 'Research the market, compare the strongest evidence and produce an executive report…' },
    { id: 'computer-workspace', title: 'Computer Workspace', eyebrow: 'SANDBOX', description: 'Complete a multi-step browser and computer task inside a protected remote workspace.', icon: Monitor, placeholder: 'Open the provided public resources, collect the relevant facts and organize the result…' },
    { id: 'managed-agent', title: 'Autonomous Agent', eyebrow: 'MULTI-STEP', description: 'Give Mere Apex an outcome and let it plan, execute and verify the full task.', icon: Bot, placeholder: 'Create a complete launch plan with research, risks, schedule and finished deliverables…' },
    { id: 'video', title: 'Video Studio', eyebrow: '8 SECONDS', description: 'Create a polished video clip with motion, sound and a cinematic visual direction.', icon: Video, placeholder: 'A monochrome architectural film, slow camera movement, soft natural light…' },
  ]
  const active = workflows.find(item => item.id === kind) || workflows[0]
  const activeStatus = job && !['completed', 'failed', 'cancelled'].includes(job.status)
  // Until the plan's capabilities are known, fall back to the tiers that have
  // never included the heavy workflows.
  const included = capabilities?.[workflowCapability[kind]]?.included
  const needsExpandedPlan = included === undefined ? kind !== 'deep-research' && ['guest', 'free'].includes(plan) : !included

  useEffect(() => {
    if (!authenticated) return
    const controller = new AbortController()
    void fetch('/api/jobs?limit=12', { signal: controller.signal }).then(async response => { if (response.ok) setRecentJobs((await response.json() as { jobs: ManagedJob[] }).jobs || []) }).catch(() => undefined)
    void fetch('/api/usage', { signal: controller.signal }).then(async response => { if (response.ok) setCapabilities((await response.json() as UsageSummary).capabilities || null) }).catch(() => undefined)
    return () => controller.abort()
  }, [authenticated, plan])

  useEffect(() => {
    if (!job?.id || !activeStatus) return
    const timer = window.setInterval(() => {
      void fetch(`/api/jobs/${encodeURIComponent(job.id)}`).then(async response => {
        const result = await response.json() as { job?: ManagedJob; error?: string }
        if (result.job) { setJob(result.job); setRecentJobs(current => [result.job!, ...current.filter(item => item.id !== result.job!.id)]) }
        if (!response.ok && result.error) onToast(result.error)
      }).catch(() => undefined)
    }, 3500)
    return () => window.clearInterval(timer)
  }, [job?.id, activeStatus, onToast])

  const run = async (event: FormEvent) => {
    event.preventDefault()
    if (!authenticated) { onSignIn(); return }
    if (needsExpandedPlan) { onUpgrade(); return }
    if (!prompt.trim() || submitting || activeStatus) return
    setSubmitting(true); setJob(null)
    const endpoint = kind === 'deep-research' ? '/api/research/deep' : kind === 'computer-workspace' ? '/api/tools/computer' : kind === 'managed-agent' ? '/api/agents/run' : '/api/video'
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt.trim(), aspectRatio, resolution }) })
      const result = await response.json() as { job?: ManagedJob; error?: string; code?: string; usage?: UsageSummary; resetAt?: number }
      if (result.usage?.capabilities) setCapabilities(result.usage.capabilities)
      if (response.status === 403 && result.code === 'plan-upgrade-required') {
        onToast(result.error || 'This workflow needs a larger plan.')
        onUpgrade()
        return
      }
      if (response.status === 429 && result.resetAt) {
        const when = new Date(result.resetAt)
        const sameDay = when.toDateString() === new Date().toDateString()
        throw new Error(`${result.error} Available again ${sameDay ? `at ${when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : `on ${when.toLocaleDateString()}`}.`)
      }
      if (!response.ok || !result.job) throw new Error(result.error || 'The workflow could not be started.')
      setJob(result.job); setRecentJobs(current => [result.job!, ...current.filter(item => item.id !== result.job!.id)]); onToast(`${active.title} started`)
    } catch (error) { onToast(error instanceof Error ? error.message : 'The workflow could not be started') }
    finally { setSubmitting(false) }
  }

  const statusLabel = job?.status === 'completed' ? 'Completed' : job?.status === 'failed' ? 'Needs attention' : job ? 'Mere Apex is working' : 'Ready'
  const ActiveIcon = active.icon
  return <div className="page-shell workflows-page">
    <PageHeading eyebrow="ADVANCED WORK" title="Workflows" description="Move from a single prompt to a researched, executed and verified outcome." />
    <div className="workflow-picker">{workflows.map(item => { const Icon = item.icon; return <button key={item.id} className={kind === item.id ? 'active' : ''} onClick={() => { if (!activeStatus) { setKind(item.id); setJob(null) } }}><span><Icon size={20} /></span><small>{item.eyebrow}</small><b>{item.title}</b><p>{item.description}</p></button> })}</div>
    <div className="workflow-stage">
      <form className="workflow-form" onSubmit={run}>
        <div className="workflow-form-head"><span><ActiveIcon size={21} /></span><div><small>{active.eyebrow}</small><h2>{active.title}</h2></div><em className={job?.status || 'ready'}><i />{statusLabel}</em></div>
        <label><span>Describe the finished outcome</span><textarea value={prompt} onChange={event => setPrompt(event.target.value)} placeholder={active.placeholder} disabled={Boolean(activeStatus)} /></label>
        {kind === 'video' && <div className="workflow-options"><label><span>Frame</span><select value={aspectRatio} onChange={event => setAspectRatio(event.target.value)}><option value="16:9">Landscape · 16:9</option><option value="9:16">Portrait · 9:16</option></select></label><label><span>Quality</span><select value={resolution} onChange={event => setResolution(event.target.value)}><option value="720p">Standard · 720p</option><option value="1080p">High · 1080p</option></select></label></div>}
        <div className="workflow-run-row"><p><ShieldCheck size={15} />Tasks run in an isolated Mere X workspace. Sensitive actions are never performed silently.</p><button className="primary-button" disabled={!needsExpandedPlan && (!prompt.trim() || submitting || Boolean(activeStatus))}>{needsExpandedPlan ? <><CreditCard size={15} />Compare plans</> : submitting || activeStatus ? <><RotateCcw className="spin" size={15} />Working…</> : <><Zap size={15} />Run workflow</>}</button></div>
      </form>
      <section className={`workflow-result ${job ? 'has-job' : ''}`}>
        {!job && <div className="workflow-result-empty"><BrandGlyph /><b>The finished work appears here.</b><p>You can leave this page while a task runs and return to its status from Workflows.</p></div>}
        {job && <><header><div><span>RUN / {job.id.slice(0, 8).toUpperCase()}</span><b>{statusLabel}</b></div><em>{job.status.toUpperCase()}</em></header>{activeStatus && <div className="workflow-progress"><span /><span /><span /><p>Planning, executing and checking the result…</p></div>}{job.error && <div className="workflow-error"><CircleHelp size={18} /><span><b>Workflow stopped</b><p>{job.error}</p></span></div>}{job.result?.text && <div className="workflow-output"><ReactMarkdown remarkPlugins={[remarkGfm]}>{job.result.text}</ReactMarkdown></div>}{job.result?.sources?.length ? <div className="workflow-sources"><b>Sources</b>{job.result.sources.map((source, index) => <a key={`${source.uri}-${index}`} href={source.uri} target="_blank" rel="noreferrer"><span>{index + 1}</span>{source.title}<ExternalLink size={13} /></a>)}</div> : null}{job.result?.file && <div className="workflow-video"><video controls preload="metadata" src={job.result.file.url} /><a className="primary-button" href={job.result.file.url} download={job.result.file.name}><Download size={15} />Download video</a></div>}{job.status === 'completed' && !job.result?.text && !job.result?.file && <div className="workflow-complete"><CheckCircle2 size={20} /><span><b>Workflow completed</b><p>The task finished successfully.</p></span></div>}</>}
      </section>
    </div>
    {!!recentJobs.length && <section className="workflow-history"><div className="content-title"><h3>Recent runs</h3><span className="content-meta">ACCOUNT WORKSPACE</span></div><div>{recentJobs.map(item => { const definition = workflows.find(workflow => workflow.id === item.type) || workflows[2]; const Icon = definition.icon; return <button key={item.id} className={job?.id === item.id ? 'active' : ''} onClick={() => { setKind((['deep-research', 'computer-workspace', 'managed-agent', 'video'].includes(item.type) ? item.type : 'managed-agent') as WorkflowKind); setPrompt(item.payload?.prompt || ''); setJob(item) }}><span><Icon size={16} /></span><div><b>{definition.title}</b><p>{item.payload?.prompt || 'Workflow run'}</p></div><em className={item.status}>{item.status}</em><ChevronRight size={15} /></button> })}</div></section>}
  </div>
}

function AgentsPage({ records, setRecords, onToast, onOpen }: {
  records: AgentRecord[]
  setRecords: Dispatch<SetStateAction<AgentRecord[]>>
  onToast: (s: string) => void
  onOpen: (agent: AgentRecord) => void
}) {
  const [building, setBuilding] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [instructions, setInstructions] = useState('')
  const [tag, setTag] = useState('Custom')
  const createAgent = (event: FormEvent) => {
    event.preventDefault(); if (!name.trim() || !instructions.trim()) return
    const record: AgentRecord = { id: `agent-${Date.now()}`, name: name.trim(), desc: desc.trim() || 'A custom Mere X specialist.', instructions: instructions.trim(), tag }
    setRecords(current => [...current, record]); setName(''); setDesc(''); setInstructions(''); setTag('Custom'); setBuilding(false); onToast('Agent created')
  }
  const iconFor = (record: AgentRecord) => record.tag === 'Research' ? Search : record.tag === 'Code' ? Code2 : record.tag === 'Writing' ? Pencil : SlidersHorizontal
  return <div className="page-shell agents-page">
    <PageHeading eyebrow="SPECIALISTS" title="Agents" description="Focused intelligence for repeatable work. Choose one or build your own." action={<button className="primary-button" onClick={() => setBuilding(true)}><Plus size={16} />Create agent</button>} />
    <div className="agent-hero"><div><span><WandSparkles size={15} />NEW WORKFLOW</span><h2>Build expertise once.<br />Use it whenever you need it.</h2><p>Give an agent a purpose, knowledge and clear instructions. It stays consistent across every task.</p><button className="inverted-button" onClick={() => setBuilding(true)}>Build your first agent<ArrowRight size={16} /></button></div><div className="agent-orbit"><span className="orbit-center"><BrandMark compact /></span><i><Search size={17} /></i><i><Code2 size={17} /></i><i><FileText size={17} /></i><i><SlidersHorizontal size={17} /></i></div></div>
    <div className="content-title"><h3>Available agents</h3><span className="content-meta">{records.length} ready</span></div>
    <div className="agent-grid">{records.map(record => { const Icon = iconFor(record); return <article className="agent-card" key={record.id}><div className="agent-card-head"><span><Icon size={20} /></span><em>{record.tag}</em></div><h3>{record.name}</h3><p>{record.desc}</p><div><span className="mini-model">A4</span><span className="agent-actions">{!record.builtIn && <button className="delete-agent" onClick={() => { setRecords(current => current.filter(agent => agent.id !== record.id)); onToast('Agent deleted') }} aria-label={`Delete ${record.name}`}><Trash2 size={13} /></button>}<button onClick={() => onOpen(record)}>Open<ArrowRight size={14} /></button></span></div></article>})}</div>
    {building && <div className="modal-backdrop" onMouseDown={event => { if (event.currentTarget === event.target) setBuilding(false) }}><form className="entity-modal agent-builder-modal" onSubmit={createAgent}><div className="modal-head"><div><p className="eyebrow">AGENT BUILDER</p><h2>Create a specialist</h2><p>These instructions are applied to every chat with this agent.</p></div><IconButton label="Close" onClick={() => setBuilding(false)}><X size={18} /></IconButton></div><div className="form-grid"><label><span>Name</span><input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Legal reviewer" /></label><label><span>Category</span><select value={tag} onChange={event => setTag(event.target.value)}><option>Custom</option><option>Research</option><option>Writing</option><option>Code</option><option>Analysis</option></select></label></div><label><span>Short description</span><input value={desc} onChange={event => setDesc(event.target.value)} placeholder="What does this agent help with?" /></label><label><span>Instructions</span><textarea className="large" value={instructions} onChange={event => setInstructions(event.target.value)} placeholder="Describe the role, process, output format, rules and areas of expertise..." /></label><div className="builder-note"><ShieldCheck size={15} /><span><b>Private by default</b><small>Your custom instructions stay in this workspace.</small></span></div><div className="entity-modal-actions"><button type="button" className="soft-button" onClick={() => setBuilding(false)}>Cancel</button><button className="primary-button" disabled={!name.trim() || !instructions.trim()}>Create agent</button></div></form></div>}
  </div>
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) { return <section className="settings-section"><h3>{title}</h3><div className="settings-card">{children}</div></section> }
function SettingRow({ icon, title, desc, children }: { icon: ReactNode; title: string; desc: string; children: ReactNode }) { return <div className="setting-row"><span className="setting-icon">{icon}</span><span className="setting-copy"><b>{title}</b><small>{desc}</small></span><div>{children}</div></div> }

function AccountProfileEditor({ profile, setProfile, user, onUserUpdated, onToast }: {
  profile: UserProfile
  setProfile: Dispatch<SetStateAction<UserProfile>>
  user?: AuthUser | null
  onUserUpdated?: (user: AuthUser) => void
  onToast: (text: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  const [saving, setSaving] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [emailChallengeId, setEmailChallengeId] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const photoInputRef = useRef<HTMLInputElement>(null)

  const applyUser = (updated: AuthUser) => {
    setProfile({ name: updated.name, email: updated.email, avatar: updated.avatar })
    onUserUpdated?.(updated)
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !email.trim() || saving) return
    setSaving(true)
    try {
      if (name.trim() !== profile.name) {
        const response = await fetch('/api/account', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) })
        const result = await response.json() as { user?: AuthUser; error?: string }
        if (!response.ok || !result.user) throw new Error(result.error || 'Profile could not be updated.')
        applyUser(result.user)
      }
      // Moving the account to a new address is what a password reset follows, so
      // the new address has to prove it is reachable before the account moves.
      if (email.trim().toLowerCase() !== profile.email.toLowerCase()) {
        const response = await fetch('/api/account/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }) })
        const result = await response.json() as { challengeId?: string; previewCode?: string; message?: string; error?: string }
        if (!response.ok || !result.challengeId) throw new Error(result.error || 'The email address could not be changed.')
        setEmailChallengeId(result.challengeId)
        setEmailCode(result.previewCode || '')
        onToast(result.message || 'We sent a confirmation code to the new address.')
        return
      }
      setEditing(false)
      onToast('Profile updated')
    } catch (error) { onToast(error instanceof Error ? error.message : 'Profile could not be updated') }
    finally { setSaving(false) }
  }

  const confirmEmail = async (event: FormEvent) => {
    event.preventDefault()
    if (emailCode.length !== 6 || saving) return
    setSaving(true)
    try {
      const response = await fetch('/api/account/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challengeId: emailChallengeId, code: emailCode }) })
      const result = await response.json() as { user?: AuthUser; error?: string }
      if (!response.ok || !result.user) throw new Error(result.error || 'The verification code is incorrect or expired.')
      applyUser(result.user)
      setEmailChallengeId('')
      setEmailCode('')
      setEditing(false)
      onToast('Email address updated')
    } catch (error) { onToast(error instanceof Error ? error.message : 'The email address could not be confirmed') }
    finally { setSaving(false) }
  }

  const choosePhoto = async (file: File | undefined) => {
    if (!file || photoBusy) return
    if (file.size > 6 * 1024 * 1024) { onToast('Profile photos can be up to 6 MB'); return }
    setPhotoBusy(true)
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '')
        reader.onerror = () => reject(new Error('The image could not be read.'))
        reader.readAsDataURL(file)
      })
      const response = await fetch('/api/account/avatar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mimeType: file.type, data }) })
      const result = await response.json() as { user?: AuthUser; error?: string }
      if (!response.ok || !result.user) throw new Error(result.error || 'The profile photo could not be saved.')
      applyUser(result.user)
      onToast('Profile photo updated')
    } catch (error) { onToast(error instanceof Error ? error.message : 'The profile photo could not be saved') }
    finally {
      setPhotoBusy(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  const removePhoto = async () => {
    if (photoBusy) return
    setPhotoBusy(true)
    try {
      const response = await fetch('/api/account/avatar', { method: 'DELETE' })
      const result = await response.json() as { user?: AuthUser; error?: string }
      if (!response.ok || !result.user) throw new Error(result.error || 'The profile photo could not be removed.')
      applyUser(result.user)
      onToast(result.user.avatar ? 'Using your Google profile photo' : 'Profile photo removed')
    } catch (error) { onToast(error instanceof Error ? error.message : 'The profile photo could not be removed') }
    finally { setPhotoBusy(false) }
  }

  return <>
    <div className="profile-row">
      <button type="button" className="avatar-edit" onClick={() => photoInputRef.current?.click()} disabled={photoBusy} aria-label="Change profile photo">
        <Avatar profile={profile} className="large" />
        <span className="avatar-edit-overlay"><Image size={15} /></span>
      </button>
      <div><b>{profile.name}</b><small>{profile.email}</small></div>
      <button className="soft-button" onClick={() => { setName(profile.name); setEmail(profile.email); setEmailChallengeId(''); setEmailCode(''); setEditing(!editing) }}>{editing ? 'Cancel' : 'Edit profile'}</button>
    </div>
    <input ref={photoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={event => void choosePhoto(event.target.files?.[0])} />
    <div className="profile-photo-actions">
      <button className="soft-button" disabled={photoBusy} onClick={() => photoInputRef.current?.click()}>{photoBusy ? 'Working…' : profile.avatar ? 'Change photo' : 'Upload a photo'}</button>
      {profile.avatar && <button className="settings-text-button" disabled={photoBusy} onClick={() => void removePhoto()}>Remove photo</button>}
      <span className="settings-inline-note">PNG, JPEG, WebP or GIF, up to 6 MB. Your photo is private to this account.</span>
    </div>
    {user && !user.hasPassword && <div className="settings-inline-note profile-provider-note"><ShieldCheck size={13} />This account signs in with Google. Add a password in Security and login if you also want to sign in with one.</div>}
    {editing && (emailChallengeId
      ? <form className="profile-edit-form" onSubmit={confirmEmail}>
          <label><span>Code sent to {email}</span><input className="verification-code-input" value={emailCode} onChange={event => setEmailCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" autoFocus /></label>
          <span className="settings-inline-note">Your account moves to this address once the code is confirmed.</span>
          <button className="primary-button" disabled={saving || emailCode.length !== 6}>{saving ? 'Confirming…' : 'Confirm email'}</button>
        </form>
      : <form className="profile-edit-form" onSubmit={save}>
          <label><span>Name</span><input value={name} onChange={event => setName(event.target.value)} autoComplete="name" /></label>
          <label><span>Email</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
          <button className="primary-button" disabled={saving || !name.trim() || !email.trim()}>{saving ? 'Saving…' : 'Save profile'}</button>
        </form>)}
  </>
}

type SettingsPageProps = {
  onToast: (text: string) => void
  compact: boolean
  setCompact: (value: boolean) => void
  preferences: Preferences
  setPreferences: Dispatch<SetStateAction<Preferences>>
  controls: SettingsControls
  setControls: Dispatch<SetStateAction<SettingsControls>>
  profile: UserProfile
  user?: AuthUser | null
  identities?: AuthIdentity[]
  onUserUpdated?: (user: AuthUser) => void
  setProfile: Dispatch<SetStateAction<UserProfile>>
  onDeleteChats: () => void
  onSignOut: () => void
  onOpenPricing: () => void
  onOpenHelp: () => void
  initialTab?: SettingsTab
  onClose?: () => void
  modal?: boolean
}

function BillingManagement({ user, onOpenPricing, onToast }: { user?: AuthUser | null; onOpenPricing: () => void; onToast: (text: string) => void }) {
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null)
  const [transactions, setTransactions] = useState<BillingTransaction[]>([])
  const [loading, setLoading] = useState(Boolean(user))
  const [cancelling, setCancelling] = useState(false)
  const load = async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    try {
      const [subscriptionResponse, historyResponse] = await Promise.all([fetch('/api/billing/subscription'), fetch('/api/billing/history')])
      const subscriptionResult = await subscriptionResponse.json() as { subscription?: BillingSubscription | null }
      const historyResult = await historyResponse.json() as { transactions?: BillingTransaction[] }
      if (subscriptionResponse.ok) setSubscription(subscriptionResult.subscription || null)
      if (historyResponse.ok) setTransactions(historyResult.transactions || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [user?.id])
  const cancel = async () => {
    if (!subscription || !window.confirm('Cancel automatic renewal? Your paid access remains available until the current billing period ends.')) return
    setCancelling(true)
    try {
      const response = await fetch('/api/billing/subscription/cancel', { method: 'POST' })
      const result = await response.json() as { subscription?: BillingSubscription; error?: string }
      if (!response.ok || !result.subscription) throw new Error(result.error || 'Membership could not be cancelled.')
      setSubscription(result.subscription); onToast('Automatic renewal cancelled')
    } catch (cause) { onToast(cause instanceof Error ? cause.message : 'Membership could not be cancelled') }
    finally { setCancelling(false) }
  }
  if (!user) return <SettingsSection title="Billing"><div className="billing-empty"><CreditCard size={19} /><div><b>Sign in to manage billing</b><p>Your membership and payment history are tied to your Mere X account.</p></div></div></SettingsSection>
  const renewal = subscription?.accessExpiresAt ? new Date(subscription.accessExpiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Pending confirmation'
  return <>
    <SettingsSection title="Membership">
      {loading ? <div className="billing-loading-row"><RotateCcw className="spin" size={16} />Loading membership…</div> : subscription ? <div className="membership-manage">
        <div className="membership-manage-head"><span><CreditCard size={18} /></span><div><b>Mere {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}</b><small>{subscription.billingCycle === 'annual' ? 'Annual billing' : 'Monthly billing'}{subscription.quantity > 1 ? ` · ${subscription.quantity} seats` : ''}</small></div><em className={`membership-status ${subscription.cancelAtPeriodEnd ? 'ending' : ''}`}>{subscription.cancelAtPeriodEnd ? 'ENDS THIS PERIOD' : subscription.status}</em></div>
        <div className="membership-date"><Clock3 size={16} /><span><b>{subscription.cancelAtPeriodEnd ? 'Access available through' : 'Next renewal'}</b><small>{renewal}</small></span></div>
        <div className="membership-actions"><button className="soft-button" onClick={onOpenPricing}>View plans</button>{['ACTIVE', 'APPROVED'].includes(subscription.status) && !subscription.cancelAtPeriodEnd && <button className="billing-cancel-button" disabled={cancelling} onClick={() => void cancel()}>{cancelling ? 'Cancelling…' : 'Cancel renewal'}</button>}</div>
      </div> : <div className="billing-empty"><CreditCard size={19} /><div><b>No paid membership</b><p>Choose Plus, Pro or Team to expand Mere Apex access.</p></div><button className="soft-button" onClick={onOpenPricing}>Compare plans</button></div>}
    </SettingsSection>
    <SettingsSection title="Payment history">
      {transactions.length ? <div className="billing-history-list">{transactions.map(transaction => <div key={transaction.id}><span><b>{transaction.type.replaceAll('.', ' ').toLowerCase()}</b><small>{new Date(transaction.createdAt).toLocaleDateString()}</small></span><span><strong>{transaction.amount === null ? '—' : `${transaction.currency || 'USD'} ${transaction.amount.toFixed(2)}`}</strong><em>{transaction.status}</em></span></div>)}</div> : <div className="billing-history-empty"><ShieldCheck size={18} /><span><b>No completed charges yet</b><small>Confirmed payment events and refunds will appear here.</small></span></div>}
    </SettingsSection>
  </>
}

function SettingsPage({ onToast, compact, setCompact, preferences, setPreferences, controls, setControls, profile, user, identities = [], onUserUpdated, setProfile, onDeleteChats, onSignOut, onOpenPricing, onOpenHelp, initialTab = 'general', onClose, modal = false }: SettingsPageProps) {
  const [tab, setTab] = useState<SettingsTab>(initialTab)
  const [query, setQuery] = useState('')
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [storage, setStorage] = useState<AccountStorage | null>(null)
  const [sessions, setSessions] = useState<AccountSession[]>([])
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [passwordChallengeId, setPasswordChallengeId] = useState('')
  const [passwordCode, setPasswordCode] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteEmail, setDeleteEmail] = useState('')
  // A Google-created account has no password its owner knows, so it confirms
  // sensitive actions differently.
  const passwordAccount = user ? user.hasPassword : true
  const [accountBusy, setAccountBusy] = useState(false)
  useEffect(() => setTab(initialTab), [initialTab])
  useEffect(() => {
    const controller = new AbortController()
    void fetch('/api/usage', { signal: controller.signal }).then(async response => { if (response.ok) setUsage(await response.json() as UsageSummary) }).catch(() => undefined)
    return () => controller.abort()
  }, [user?.id, tab])
  useEffect(() => {
    if (!user || !['cloud', 'storage'].includes(tab)) return
    const controller = new AbortController()
    void fetch('/api/account/storage', { signal: controller.signal }).then(async response => { if (response.ok) setStorage(await response.json() as AccountStorage) }).catch(() => undefined)
    return () => controller.abort()
  }, [user?.id, tab])
  useEffect(() => {
    if (!user || tab !== 'security') return
    void fetch('/api/account/sessions').then(async response => { if (response.ok) setSessions((await response.json() as { sessions: AccountSession[] }).sessions || []) }).catch(() => undefined)
  }, [user?.id, tab])
  const updatePreference = (key: keyof Preferences, value: string | boolean) => setPreferences(current => ({ ...current, [key]: value }))
  const updateControl = (key: keyof SettingsControls, value: boolean) => setControls(current => ({ ...defaultSettingsControls, ...current, [key]: value }))
  const storageBytes = storage?.totalBytes || 0
  const storageLabel = storageBytes < 1024 ? `${storageBytes} B used` : storageBytes < 1024 * 1024 ? `${(storageBytes / 1024).toFixed(1)} KB used` : `${(storageBytes / 1024 / 1024).toFixed(1)} MB used`
  const playVoicePreview = () => {
    if (!('speechSynthesis' in window)) { onToast('Voice playback is not supported by this browser'); return }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance('Mere Apex is ready when you are.')
    utterance.lang = preferences.language === 'ქართული' ? 'ka-GE' : 'en-US'
    window.speechSynthesis.speak(utterance)
    onToast('Playing voice preview')
  }
  const refreshStorage = async () => {
    try {
      const response = await fetch('/api/account/storage')
      if (!response.ok) throw new Error()
      setStorage(await response.json() as AccountStorage)
      onToast('Account storage refreshed')
    } catch { onToast('Account storage could not be refreshed') }
  }
  const exportData = async () => {
    try {
      const response = await fetch('/api/account/export')
      if (!response.ok) throw new Error()
      const url = URL.createObjectURL(await response.blob())
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'mere-x-account-data.json'; anchor.click(); URL.revokeObjectURL(url); onToast('Account data exported from Mere X storage')
    } catch { onToast('Account data could not be exported') }
  }
  const updatePassword = async (event: FormEvent) => {
    event.preventDefault(); if (passwordChallengeId ? passwordCode.length !== 6 : (passwordAccount && !currentPassword) || nextPassword.length < 8) return
    setAccountBusy(true)
    try {
      const body = passwordChallengeId ? { challengeId: passwordChallengeId, code: passwordCode } : { currentPassword: passwordAccount ? currentPassword : '', password: nextPassword }
      const response = await fetch('/api/account/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const result = await response.json() as { challengeId?: string; previewCode?: string; message?: string; error?: string }
      if (!response.ok) throw new Error(result.error || 'Password could not be changed.')
      if (response.status === 202 && result.challengeId) {
        setPasswordChallengeId(result.challengeId); setPasswordCode(result.previewCode || ''); onToast(result.message || 'Confirmation code sent'); return
      }
      setCurrentPassword(''); setNextPassword(''); setPasswordChallengeId(''); setPasswordCode('')
      if (user) onUserUpdated?.({ ...user, hasPassword: true })
      onToast(passwordAccount ? 'Password changed and other sessions signed out' : 'Password created and other sessions signed out')
    } catch (error) { onToast(error instanceof Error ? error.message : 'Password could not be changed') }
    finally { setAccountBusy(false) }
  }
  const revokeOtherSessions = async () => {
    setAccountBusy(true)
    try {
      const response = await fetch('/api/account/sessions', { method: 'DELETE' })
      const result = await response.json() as { revoked?: number; error?: string }
      if (!response.ok) throw new Error(result.error || 'Sessions could not be revoked.')
      setSessions(current => current.filter(session => session.current)); onToast(`${result.revoked || 0} other sessions signed out`)
    } catch (error) { onToast(error instanceof Error ? error.message : 'Sessions could not be revoked') }
    finally { setAccountBusy(false) }
  }
  const removeAccount = async (event: FormEvent) => {
    event.preventDefault()
    if (!(passwordAccount ? deletePassword : deleteEmail.trim()) || !window.confirm('Permanently delete your Mere X account, workspace and stored files? This cannot be undone.')) return
    setAccountBusy(true)
    try {
      const response = await fetch('/api/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(passwordAccount ? { password: deletePassword } : { confirmEmail: deleteEmail.trim() }) })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'Account could not be deleted.')
      onSignOut()
    } catch (error) { onToast(error instanceof Error ? error.message : 'Account could not be deleted') }
    finally { setAccountBusy(false) }
  }
  const groups: { label?: string; items: { id: SettingsTab; icon: typeof Settings; label: string }[] }[] = [
    { items: [{ id: 'general', icon: Settings, label: 'General' }, { id: 'notifications', icon: Bell, label: 'Notifications' }, { id: 'personalization', icon: Sparkles, label: 'Personalization' }, { id: 'plugins', icon: Link2, label: 'Connections' }, { id: 'voice', icon: Headphones, label: 'Voice' }, { id: 'billing', icon: Zap, label: 'Billing' }] },
    { label: 'DATA & CONTROL', items: [{ id: 'data', icon: Archive, label: 'Data controls' }, { id: 'cloud', icon: Globe2, label: 'Cloud sync' }, { id: 'storage', icon: Library, label: 'Storage' }, { id: 'safety', icon: ShieldCheck, label: 'Safety' }, { id: 'security', icon: Lock, label: 'Security and login' }] },
    { label: 'ACCOUNT', items: [{ id: 'account', icon: User, label: 'Account' }, { id: 'keyboard', icon: Command, label: 'Keyboard shortcuts' }] },
  ]
  const normalizedQuery = query.trim().toLowerCase()
  const planLabel = usage?.label || (user?.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) : 'Preview')
  const resetLabel = usage?.window?.resetAt ? new Date(usage.window.resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Automatic'
  const windowLabel = usage?.state === 'paused' ? 'Refresh pending' : usage?.state === 'limited' ? 'Nearing limit' : usage?.state === 'active' ? 'In active use' : 'Available'
  const toolsLabel = usage?.tools?.state === 'paused' ? 'Refresh pending' : usage?.tools?.state === 'limited' ? 'Limited' : 'Available'

  const content = (() => {
    if (tab === 'general') return <><PageHeading title="General" description="Control the look, language and default behavior of Mere X." /><SettingsSection title="Appearance"><SettingRow icon={<Moon size={17} />} title="Theme" desc="Mere X uses its focused monochrome interface"><span className="connected-state"><Check size={13} />Mere Dark</span></SettingRow><SettingRow icon={<Languages size={17} />} title="Response language" desc="The preferred language for Mere X responses"><select aria-label="Language" value={preferences.language} onChange={event => updatePreference('language', event.target.value)}><option>English</option><option>ქართული</option></select></SettingRow><SettingRow icon={<PanelLeftClose size={17} />} title="Compact sidebar" desc="Use a narrower navigation layout"><Toggle label="Compact sidebar" active={compact} onChange={() => setCompact(!compact)} /></SettingRow></SettingsSection><SettingsSection title="Responses"><SettingRow icon={<Sparkles size={17} />} title="Default reasoning" desc="Choose how deeply Mere Apex works by default"><select aria-label="Default reasoning" value={preferences.reasoning} onChange={event => updatePreference('reasoning', event.target.value)}><option>Adaptive</option><option>Always on</option><option>Off</option></select></SettingRow></SettingsSection></>
    if (tab === 'notifications') return <><PageHeading title="Notifications" description="Choose which Mere X activity can reach you." /><SettingsSection title="In-app"><SettingRow icon={<Bell size={17} />} title="Product notifications" desc="Updates for completed work and important activity"><Toggle label="Product notifications" active={controls.notifications ?? true} onChange={() => updateControl('notifications', !(controls.notifications ?? true))} /></SettingRow><SettingRow icon={<MessageCircle size={17} />} title="Email summaries" desc="A concise summary of important workspace activity"><Toggle label="Email summaries" active={controls.email ?? false} onChange={() => updateControl('email', !(controls.email ?? false))} /></SettingRow></SettingsSection></>
    if (tab === 'personalization') return <><PageHeading title="Personalization" description="Shape how Mere X understands you and responds." /><SettingsSection title="Memory"><SettingRow icon={<BookOpen size={17} />} title="Reference saved memories" desc="Use details you explicitly ask Mere X to remember"><Toggle label="Reference saved memories" active={preferences.memory} onChange={() => updatePreference('memory', !preferences.memory)} /></SettingRow></SettingsSection><SettingsSection title="Custom instructions"><label className="instruction-label">What should Mere X know about you?</label><textarea className="instruction-box" value={preferences.about} onChange={event => updatePreference('about', event.target.value)} placeholder="Your role, goals and working context..." /><label className="instruction-label">How should Mere X respond?</label><textarea className="instruction-box" value={preferences.responseStyle} onChange={event => updatePreference('responseStyle', event.target.value)} placeholder="Tone, structure and level of detail..." /><button className="primary-button" onClick={() => onToast('Personalization saved and active')}>Save changes</button></SettingsSection></>
    if (tab === 'plugins') return <><PageHeading title="Connections" description="Bring approved tools and knowledge into your Mere X workflow." /><SettingsSection title="Available connections"><SettingRow icon={<Code2 size={17} />} title="Code repositories" desc="Repository access with scoped permissions"><button className="soft-button" onClick={() => onToast('Connection credentials are required before this source can be enabled')}>Configure</button></SettingRow><SettingRow icon={<FileText size={17} />} title="Cloud documents" desc="Connect document storage with secure delegated access"><button className="soft-button" onClick={() => onToast('Connection credentials are required before this source can be enabled')}>Configure</button></SettingRow><SettingRow icon={<Globe2 size={17} />} title="Web research" desc="Research public pages with sources"><span className="connected-state"><Check size={13} />Active</span></SettingRow></SettingsSection></>
    if (tab === 'voice') return <><PageHeading title="Voice" description="Configure listening, spoken responses and accessibility." /><SettingsSection title="Voice experience"><SettingRow icon={<Mic size={17} />} title="Voice input" desc="Dictate prompts from the composer"><Toggle label="Voice input" active={controls.voiceInput ?? true} onChange={() => updateControl('voiceInput', !(controls.voiceInput ?? true))} /></SettingRow><SettingRow icon={<Volume2 size={17} />} title="Response voice" desc="Voice used when reading answers aloud"><select aria-label="Voice" value={preferences.voice} onChange={event => updatePreference('voice', event.target.value)}><option>Nova</option><option>Atlas</option></select></SettingRow><SettingRow icon={<Headphones size={17} />} title="Test voice" desc="Play a short preview with your current selection"><button className="soft-button" onClick={playVoicePreview}>Play preview</button></SettingRow></SettingsSection></>
    if (tab === 'billing') return <><PageHeading title="Plan & billing" description="Manage your plan, usage, renewal and payment history." /><div className="billing-hero"><div><span>CURRENT PLAN</span><h2>Mere {planLabel}</h2><p>Mere Apex 4.0 access with adaptive usage that refreshes throughout the day.</p></div><button className="primary-button" onClick={onOpenPricing}>Compare plans<Sparkles size={15} /></button></div><SettingsSection title="Current usage window"><SettingRow icon={<Clock3 size={17} />} title="Rolling 5-hour window" desc={`Next rolling refresh is visible at ${resetLabel}`}><span className="usage-value">{windowLabel}</span></SettingRow><SettingRow icon={<Globe2 size={17} />} title="Advanced tools" desc="Research, image, agent, computer and video work use the protected tool allowance"><span className="usage-value">{toolsLabel}</span></SettingRow><SettingRow icon={<FileText size={17} />} title="File workflows" desc="Analyze files and create downloadable Office or PDF documents"><span className="usage-value">Included</span></SettingRow></SettingsSection><BillingManagement user={user} onOpenPricing={onOpenPricing} onToast={onToast} /></>
    if (tab === 'data') return <><PageHeading title="Data controls" description="Control conversation history, exports and product improvement." /><SettingsSection title="Privacy"><SettingRow icon={<ShieldCheck size={17} />} title="Improve Mere X for everyone" desc="Allow de-identified conversations to improve the platform"><Toggle label="Improve Mere X" active={preferences.training} onChange={() => updatePreference('training', !preferences.training)} /></SettingRow><SettingRow icon={<Clock3 size={17} />} title="Chat history" desc="Save new conversations in your history"><Toggle label="Chat history" active={controls.chatHistory ?? true} onChange={() => updateControl('chatHistory', !(controls.chatHistory ?? true))} /></SettingRow></SettingsSection><SettingsSection title="Your data"><button className="danger-row" onClick={exportData}><span><Download size={17} /><span><b>Export workspace data</b><small>Download your conversations and preferences</small></span></span><ChevronRight size={15} /></button><button className="danger-row" onClick={() => { if (window.confirm('Delete every saved conversation? This cannot be undone.')) onDeleteChats() }}><span><Trash2 size={17} /><span><b>Delete all chats</b><small>Permanently clear conversation history</small></span></span><ChevronRight size={15} /></button></SettingsSection></>
    if (tab === 'cloud') return <><PageHeading title="Cloud sync" description="Keep your private Mere X workspace consistent across devices." /><SettingsSection title="Synchronization"><SettingRow icon={<Database size={17} />} title="Account database" desc="Projects, chats, agents and preferences are stored under your unique account ID"><span className="connected-state"><Check size={13} />Active</span></SettingRow><SettingRow icon={<RotateCcw size={17} />} title="Cross-device sync" desc="Opening Mere X on another signed-in device loads the same account workspace"><span className="connected-state"><Check size={13} />Active</span></SettingRow></SettingsSection></>
    if (tab === 'storage') return <><PageHeading title="Storage" description="Review the durable storage assigned to this account." /><div className="storage-meter"><div><span>ACCOUNT STORAGE</span><b>{storage ? storageLabel : 'Loading…'}</b></div><i><span style={{ width: `${Math.min(100, Math.max(2, storageBytes / 50000))}%` }} /></i><p>No chats, projects, agents or preferences are stored in browser local storage. Workspace data and files are isolated by your account ID in the Mere X database.</p></div><SettingsSection title="Account usage"><SettingRow icon={<FileText size={17} />} title="Stored files" desc="Files available only to this signed-in account"><span className="usage-value">{storage?.files ?? '—'}</span></SettingRow><SettingRow icon={<Zap size={17} />} title="Saved workflow runs" desc="Agent, research, computer and video runs tied to this account"><span className="usage-value">{storage?.jobs ?? '—'}</span></SettingRow><SettingRow icon={<Database size={17} />} title="Project knowledge stores" desc="Private knowledge indexes mapped to this account"><span className="usage-value">{storage?.knowledgeStores ?? '—'}</span></SettingRow><button className="manage-button" onClick={() => void refreshStorage()}>Refresh storage<ChevronRight size={15} /></button></SettingsSection></>
    if (tab === 'safety') return <><PageHeading title="Safety" description="Set safeguards for generated and researched content." /><SettingsSection title="Content"><SettingRow icon={<ShieldCheck size={17} />} title="Enhanced safety" desc="Apply stricter safeguards to sensitive topics"><Toggle label="Enhanced safety" active={controls.safeMode ?? true} onChange={() => updateControl('safeMode', !(controls.safeMode ?? true))} /></SettingRow><SettingRow icon={<CircleHelp size={17} />} title="Safety guidance" desc="Read Mere X help and responsible-use guidance"><button className="soft-button" onClick={onOpenHelp}>Open guide</button></SettingRow></SettingsSection></>
    if (tab === 'security') return <><PageHeading title="Security and login" description="Protect your account and review active access." /><SettingsSection title={passwordAccount ? 'Password' : 'Create a password'}><form className="security-form" onSubmit={updatePassword}>{passwordChallengeId ? <><label><span>Email confirmation code</span><input className="verification-code-input" value={passwordCode} onChange={event => setPasswordCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" autoFocus /></label><span className="settings-inline-note">Enter the 6-digit code sent to your account email.</span></> : <>{passwordAccount ? <label><span>Current password</span><input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" /></label> : <span className="settings-inline-note">This account signs in with Google. Choose a password to also sign in with your email address; we confirm it with a code sent to {profile.email || 'your account email'}.</span>}<label><span>{passwordAccount ? 'New password' : 'Password'}</span><input type="password" value={nextPassword} onChange={event => setNextPassword(event.target.value)} autoComplete="new-password" placeholder="At least 8 characters" /></label></>}<button className="soft-button" disabled={accountBusy || (passwordChallengeId ? passwordCode.length !== 6 : (passwordAccount && !currentPassword) || nextPassword.length < 8)}>{passwordChallengeId ? (passwordAccount ? 'Confirm password change' : 'Confirm new password') : 'Send confirmation code'}</button>{passwordChallengeId && <button type="button" className="settings-text-button" onClick={() => { setPasswordChallengeId(''); setPasswordCode('') }}>Cancel</button>}</form></SettingsSection><SettingsSection title="Connected sign-in"><SettingRow icon={<ShieldCheck size={17} />} title="Google" desc={identities.find(identity => identity.provider === 'google')?.email || 'Not connected to this account'}><span className={identities.some(identity => identity.provider === 'google') ? 'connected-state' : 'feature-status'}>{identities.some(identity => identity.provider === 'google') ? <><Check size={13} />Connected</> : 'NOT CONNECTED'}</span></SettingRow></SettingsSection><SettingsSection title="Sessions">{sessions.map(session => <div className="session-row" key={session.id}><span className="device-icon"><Square size={15} /></span><span><b>{session.current ? 'This browser' : 'Signed-in browser'}</b><small>Started {new Date(session.createdAt).toLocaleDateString()} · Expires {new Date(session.expiresAt).toLocaleDateString()}</small></span><em>{session.current ? 'THIS DEVICE' : 'ACTIVE'}</em></div>)}{!sessions.length && <span className="settings-inline-note">{user ? 'Loading active sessions…' : 'Sign in to manage sessions.'}</span>}{user && <button className="manage-button" disabled={accountBusy || sessions.filter(session => !session.current).length === 0} onClick={() => void revokeOtherSessions()}>Sign out of all other devices<ChevronRight size={15} /></button>}</SettingsSection><SettingsSection title="Additional protection"><SettingRow icon={<ShieldCheck size={17} />} title="Two-step verification" desc="Requires verified message delivery before it can protect sign-in"><span className="feature-status">DEPLOYMENT SETUP</span></SettingRow><SettingRow icon={<Lock size={17} />} title="Passkey" desc="Device-bound passwordless sign-in is prepared for a production domain"><span className="feature-status">DEPLOYMENT SETUP</span></SettingRow></SettingsSection></>
    if (tab === 'account') return <><PageHeading title="Account" description="Manage your profile, workspace identity and access." /><SettingsSection title="Profile"><AccountProfileEditor profile={profile} setProfile={setProfile} user={user} onUserUpdated={onUserUpdated} onToast={onToast} /></SettingsSection><SettingsSection title="Plan"><div className="plan-card"><div><span>PERSONAL</span><h3>Mere {planLabel}</h3><p>Mere Apex 4.0 and workspace tools with rolling 5-hour usage windows.</p></div><button className="soft-button" onClick={() => setTab('billing')}>Manage plan</button></div></SettingsSection><SettingsSection title="Delete account"><form className="delete-account-form" onSubmit={removeAccount}><div><b>Permanently delete this account</b><p>Your synchronized workspace, sessions and stored files will be removed. Shared links may remain without your identity until they expire.</p></div>{passwordAccount ? <label><span>Confirm with your password</span><input type="password" value={deletePassword} onChange={event => setDeletePassword(event.target.value)} autoComplete="current-password" /></label> : <label><span>Type {profile.email || 'your account email'} to confirm</span><input type="email" value={deleteEmail} onChange={event => setDeleteEmail(event.target.value)} autoComplete="off" placeholder={profile.email} /></label>}<button disabled={accountBusy || !(passwordAccount ? deletePassword : deleteEmail.trim())}>Delete account</button></form></SettingsSection><button className="logout-button" onClick={onSignOut}><LogOut size={16} />Log out</button></>
    return <><PageHeading title="Keyboard shortcuts" description="Move faster through chats, search and workspace controls." /><SettingsSection title="Navigation"><div className="shortcut-row"><span>New chat</span><kbd>Ctrl</kbd><b>+</b><kbd>N</kbd></div><div className="shortcut-row"><span>Search everything</span><kbd>Ctrl</kbd><b>+</b><kbd>K</kbd></div><div className="shortcut-row"><span>Close menu or modal</span><kbd>Esc</kbd></div></SettingsSection><SettingsSection title="Composer"><div className="shortcut-row"><span>Send message</span><kbd>Enter</kbd></div><div className="shortcut-row"><span>New line</span><kbd>Shift</kbd><b>+</b><kbd>Enter</kbd></div></SettingsSection></>
  })()

  const shell = <div className={`settings-shell ${modal ? 'settings-modal-shell' : ''}`} role={modal ? 'dialog' : undefined} aria-modal={modal || undefined} aria-label="Settings">
    <aside className="settings-nav"><div className="settings-nav-head">{modal && <IconButton label="Close settings" onClick={onClose}><X size={20} /></IconButton>}<b>Settings</b></div><div className="settings-search"><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search settings" aria-label="Search settings" /></div><nav>{groups.map((group, groupIndex) => { const items = group.items.filter(item => !normalizedQuery || item.label.toLowerCase().includes(normalizedQuery)); if (!items.length) return null; return <div className="settings-nav-group" key={group.label || groupIndex}>{group.label && <p>{group.label}</p>}{items.map(({ id, icon: Icon, label }) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={16} /><span>{label}</span><ChevronRight size={14} /></button>)}</div> })}</nav></aside>
    <div className="settings-content">{content}</div>
  </div>
  if (!modal) return shell
  return <div className="settings-overlay" onMouseDown={event => { if (event.currentTarget === event.target) onClose?.() }}>{shell}</div>
}

function SearchModal({ items, onClose, onSelect }: { items: SearchRecord[]; onClose: () => void; onSelect: (item: SearchRecord) => void }) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => items.filter(item => item.title.toLowerCase().includes(query.toLowerCase())), [items, query])
  return <div className="modal-backdrop" onMouseDown={e => { if (e.currentTarget === e.target) onClose() }}>
    <div className="command-modal" role="dialog" aria-modal="true" aria-label="Search chats">
      <div className="command-input"><Search size={19} /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search chats and projects..." /><kbd>ESC</kbd></div>
      <div className="command-results"><p>{query ? 'RESULTS' : 'RECENT'}</p>{results.slice(0, 8).map((item, i) => <button key={`${item.kind}-${item.id}`} onClick={() => onSelect(item)}><span className="result-icon">{item.kind === 'Project' ? <Folder size={16} /> : item.kind === 'Library' ? <Library size={16} /> : item.kind === 'Agent' ? <Bot size={16} /> : i % 2 ? <MessageCircle size={16} /> : <Clock3 size={16} />}</span><span><b>{item.title}</b><small>{item.kind}{item.kind === 'Conversation' ? ' · Mere Apex 4.0' : ''}</small></span><ArrowRight size={14} /></button>)}{!results.length && <div className="empty-results"><Search size={22} /><b>No results found</b><span>Try a different search term.</span></div>}</div>
      <div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd>Navigate</span><span><kbd>↵</kbd>Open</span><span><kbd>esc</kbd>Close</span></div>
    </div>
  </div>
}

function ShareModal({ messages, onClose, onToast }: { messages: Message[]; onClose: () => void; onToast: (s: string) => void }) {
  const [publicLink, setPublicLink] = useState(false)
  const [sharing, setSharing] = useState(false)
  const share = async () => {
    setSharing(true)
    try {
      const title = messages.find(message => message.role === 'user')?.content.slice(0, 70) || 'Shared Mere X conversation'
      const response = await fetch('/api/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, messages }) })
      const result = await response.json() as { id?: string; error?: string }
      if (!response.ok || !result.id) throw new Error(result.error || 'Could not create a share link.')
      const url = `${window.location.origin}${window.location.pathname}#/shared/${result.id}`
      await navigator.clipboard.writeText(url)
      onToast('View-only share link copied')
      onClose()
    } catch (error) { onToast(error instanceof Error ? error.message : 'Could not create a share link') }
    finally { setSharing(false) }
  }
  return <div className="modal-backdrop" onMouseDown={e => { if (e.currentTarget === e.target) onClose() }}><div className="share-modal" role="dialog" aria-modal="true" aria-label="Share conversation"><div className="modal-head"><div><h2>Share conversation</h2><p>Control who can view this chat.</p></div><IconButton label="Close" onClick={onClose}><X size={18} /></IconButton></div><div className="share-preview"><div><MessageCircle size={17} /><span><b>{messages.find(message => message.role === 'user')?.content.slice(0, 45) || 'New conversation'}</b><small>{messages.length} messages · Mere Apex 4.0</small></span></div><CheckCircle2 size={17} /></div><div className="share-row"><span><b>Anyone with the link</b><small>View-only access. Your name stays private.</small></span><Toggle label="Public link" active={publicLink} onChange={() => setPublicLink(!publicLink)} /></div><button className="primary-button full" disabled={!publicLink || sharing || !messages.length} onClick={() => void share()}><Link2 size={16} />{sharing ? 'Creating link...' : 'Copy link'}</button></div></div>
}

function SharedConversationPage({ shareId, navigate }: { shareId: string; navigate: (route: PublicRoute) => void }) {
  const [shared, setShared] = useState<{ title: string; messages: Message[] } | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    void fetch(`/api/share/${encodeURIComponent(shareId)}`).then(async response => {
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Shared conversation unavailable.')
      setShared(result)
    }).catch(reason => setError(reason instanceof Error ? reason.message : 'Shared conversation unavailable.'))
  }, [shareId])
  return <div className="shared-page"><header><BrandMark /><div><span><Lock size={12} />View-only</span><button className="primary-button" onClick={() => navigate('signup')}>Start your own chat<ArrowRight size={14} /></button></div></header><main><p className="eyebrow">SHARED CONVERSATION</p><h1>{shared?.title || (error ? 'Link unavailable' : 'Loading conversation...')}</h1>{error && <div className="shared-error"><CircleHelp size={20} /><p>{error}</p></div>}{shared?.messages.map(message => <ChatMessage key={message.id} message={message} onToast={() => undefined} />)}</main></div>
}

function InfoPanel({ title, favorite, onClose, onFavorite, onMove, onArchive, onDelete }: { title: string; favorite: boolean; onClose: () => void; onFavorite: () => void; onMove: () => void; onArchive: () => void; onDelete: () => void }) {
  return <aside className="info-panel"><div className="panel-head"><h3>Chat details</h3><IconButton label="Close details" onClick={onClose}><X size={18} /></IconButton></div><div className="panel-section"><p>TITLE</p><div className="editable-title">{title}<Pencil size={14} /></div></div><div className="panel-section"><p>MODEL</p><div className="model-detail"><span className="model-orb" /><span><b>Mere Apex 4.0</b><small>Advanced reasoning and tools</small></span><Check size={15} /></div></div><div className="panel-section"><p>CONVERSATION</p><button onClick={onFavorite}><Star size={16} fill={favorite ? 'currentColor' : 'none'} />{favorite ? 'Remove from favorites' : 'Add to favorites'}</button><button onClick={onMove}><Folder size={16} />Move to project</button><button onClick={onArchive}><Archive size={16} />Archive chat</button><button className="danger" onClick={onDelete}><Trash2 size={16} />Delete chat</button></div><div className="panel-note"><Lock size={14} /><span><b>Private conversation</b><small>Only you can access this chat.</small></span></div></aside>
}

function PublicHeader({ navigate, current, user }: { navigate: (route: PublicRoute) => void; current: PublicRoute; user?: AuthUser | null }) {
  const links: { route: PublicRoute; label: string }[] = [{ route: 'apex', label: 'Mere Apex' }, { route: 'pricing', label: 'Pricing' }, { route: 'security', label: 'Security' }, { route: 'help', label: 'Help' }]
  return <header className="public-header">
    <button className="public-brand" onClick={() => navigate('landing')}><BrandMark /></button>
    <nav aria-label="Public navigation">{links.map(link => <button key={link.route} className={current === link.route ? 'active' : ''} onClick={() => navigate(link.route)}>{link.label}</button>)}</nav>
    <div>{user ? <button className="public-account-return" onClick={() => navigate('app')} aria-label="Return to your Mere X workspace"><Avatar profile={user} /><span><b>{user.name}</b><small>Mere {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}</small></span><ArrowRight size={15} /></button> : <><button className="public-signin" onClick={() => navigate('signin')}>Sign in</button><button className="landing-cta" onClick={() => navigate('signup')}>Get started<ArrowRight size={14} /></button></>}</div>
  </header>
}

function PublicFooter({ navigate }: { navigate: (route: PublicRoute) => void }) {
  const groups: { title: string; links: { route: PublicRoute; label: string }[] }[] = [
    { title: 'PRODUCT', links: [{ route: 'apex', label: 'Mere Apex 4.0' }, { route: 'pricing', label: 'Pricing' }, { route: 'download', label: 'Download' }, { route: 'release-notes', label: 'Release notes' }, { route: 'status', label: 'Status' }] },
    { title: 'SUPPORT', links: [{ route: 'help', label: 'Help center' }, { route: 'security', label: 'Security' }, { route: 'acceptable-use', label: 'Safety & use' }] },
    { title: 'LEGAL', links: [{ route: 'privacy', label: 'Privacy' }, { route: 'terms', label: 'Terms' }, { route: 'cookies', label: 'Cookies' }] },
  ]
  return <footer className="public-footer"><div className="public-footer-brand"><BrandMark /><p>One model. Every kind of work.</p><span>© 2026 Mere X</span></div>{groups.map(group => <div className="public-footer-group" key={group.title}><b>{group.title}</b>{group.links.map(link => <button key={link.route} onClick={() => navigate(link.route)}>{link.label}</button>)}</div>)}</footer>
}

function PublicShell({ navigate, current, children, className = '', user }: { navigate: (route: PublicRoute) => void; current: PublicRoute; children: ReactNode; className?: string; user?: AuthUser | null }) {
  useEffect(() => { window.scrollTo(0, 0) }, [current])
  return <div className={`public-page ${className}`}><PublicHeader navigate={navigate} current={current} user={user} /><main className="public-main">{children}</main><PublicFooter navigate={navigate} /></div>
}

type PaymentConfig = { enabled: boolean; clientId?: string; environment: 'sandbox' | 'production'; currency: string; methods: string[] }

function EmbeddedSubscriptionCheckout({ plan, annual, quantity, onSuccess }: { plan: PlanTier; annual: boolean; quantity: number; onSuccess: (user: AuthUser, subscription: BillingSubscription) => void }) {
  const [state, setState] = useState<'ready' | 'creating' | 'confirming' | 'success'>('ready')
  const [error, setError] = useState('')
  const attemptId = useRef(globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`)
  const subscriptionId = useRef('')
  const createSubscription = async () => {
    setState('creating'); setError('')
    const response = await fetch('/api/billing/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: plan.name.toLowerCase(), annual, quantity, requestId: attemptId.current }),
    })
    const result = await response.json() as { subscriptionId?: string; error?: string }
    if (!response.ok || !result.subscriptionId) {
      setState('ready')
      throw new Error(result.error || 'Secure checkout is unavailable.')
    }
    subscriptionId.current = result.subscriptionId
    return { subscriptionId: result.subscriptionId }
  }
  const confirm = async (approvedId?: string) => {
    const id = approvedId || subscriptionId.current
    if (!id) throw new Error('Payment approval could not be verified.')
    setState('confirming'); setError('')
    const response = await fetch(`/api/billing/subscriptions/${encodeURIComponent(id)}/confirm`, { method: 'POST' })
    const result = await response.json() as { user?: AuthUser; subscription?: BillingSubscription; error?: string }
    if (!response.ok || !result.user || !result.subscription) throw new Error(result.error || 'Payment confirmation is still pending.')
    setState('success')
    onSuccess(result.user, result.subscription)
  }
  const session = usePayPalSubscriptionPaymentSession({
    createSubscription,
    onApprove: async data => {
      try {
        await confirm(data.subscriptionId)
      } catch (cause) {
        setState('ready')
        setError(cause instanceof Error ? cause.message : 'Payment confirmation failed.')
      }
    },
    onCancel: () => {
      setState('ready')
      setError('Checkout was cancelled. Nothing was charged.')
    },
    onError: () => {
      setState('ready')
      setError('The payment could not be completed. Try another payment method.')
    },
    presentationMode: 'modal',
  })
  useEffect(() => {
    if (!session.error) return
    setState('ready')
    setError('The secure payment window could not be opened. Please try again.')
  }, [session.error])
  if (state === 'success') return <div className="payment-success"><span><Check size={28} /></span><h3>Membership activated</h3><p>Your payment is confirmed and Mere {plan.name} is now active.</p></div>
  return <div className="embedded-payment-method">
    <div className="payment-method-head"><div><b>Pay securely</b><span>PayPal account or eligible debit and credit cards</span></div><ShieldCheck size={20} /></div>
    <div className="accepted-cards" aria-label="Accepted payment methods"><span>PayPal</span><span>VISA</span><span>Mastercard</span><span>AMEX</span></div>
    <button
      type="button"
      className="payment-primary-action"
      disabled={state !== 'ready' || session.isPending || Boolean(session.error)}
      aria-busy={state !== 'ready' || session.isPending}
      onClick={() => { void session.handleClick().catch(() => { setState('ready'); setError('The secure payment window could not be opened. Please try again.') }) }}
    >
      <Lock size={16} />Continue to secure approval<ArrowRight size={16} />
    </button>
    {state !== 'ready' && <div className="payment-progress"><RotateCcw className="spin" size={16} />{state === 'confirming' ? 'Confirming membership…' : 'Preparing secure checkout…'}</div>}
    {error && <div className="payment-inline-error" role="alert"><Info size={15} />{error}</div>}
    <p className="payment-security-note"><Lock size={14} />Card details are entered in encrypted hosted fields and are never stored by Mere X.</p>
  </div>
}

function PaymentModal({ plan, annual, onClose, onCompleted }: { plan: PlanTier; annual: boolean; onClose: () => void; onCompleted: (user: AuthUser, subscription: BillingSubscription) => void }) {
  const [config, setConfig] = useState<PaymentConfig | null>(null)
  const [configError, setConfigError] = useState('')
  const [quantity, setQuantity] = useState(plan.name === 'Team' ? 2 : 1)
  useEffect(() => {
    const controller = new AbortController()
    void fetch('/api/billing/config', { signal: controller.signal }).then(async response => {
      const result = await response.json() as PaymentConfig & { error?: string }
      if (!response.ok || !result.enabled || !result.clientId) throw new Error(result.error || 'Secure checkout is unavailable.')
      setConfig(result)
    }).catch(cause => { if (!controller.signal.aborted) setConfigError(cause instanceof Error ? cause.message : 'Secure checkout is unavailable.') })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])
  const perUnit = annual ? (plan.annual || 0) * 12 : (plan.monthly || 0)
  const total = perUnit * quantity
  return <div className="payment-modal-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-title">
      <button className="payment-close" aria-label="Close checkout" onClick={onClose}><X size={19} /></button>
      <div className="payment-summary">
        <div className="payment-brand"><BrandMark /><span>SECURE MEMBERSHIP</span></div>
        <p className="payment-kicker">YOUR SELECTION</p>
        <h2 id="payment-title">Mere {plan.name}</h2>
        <p>{plan.description}</p>
        {plan.name === 'Team' && <label className="seat-selector"><span>Team seats</span><div><button type="button" onClick={() => setQuantity(value => Math.max(2, value - 1))}>−</button><b>{quantity}</b><button type="button" onClick={() => setQuantity(value => Math.min(250, value + 1))}>+</button></div></label>}
        <div className="payment-total"><span>{annual ? 'Annual billing' : 'Monthly billing'}</span><strong>${total.toFixed(2)}</strong><small>{config?.currency || 'USD'} · {annual ? 'charged once per year' : 'charged every month'}{plan.name === 'Team' ? ` · ${quantity} seats` : ''}</small></div>
        <ul className="payment-terms"><li><Check size={14} />Immediate access after confirmed approval</li><li><Check size={14} />Renews automatically until cancelled</li><li><Check size={14} />Manage cancellation in Mere X settings</li></ul>
      </div>
      <div className="payment-checkout">
        <p className="payment-kicker">PAYMENT</p><h3>Complete checkout</h3><p className="payment-checkout-copy">Approval opens as a secure layer over this page. You stay inside Mere X throughout checkout and confirmation.</p>
        {!config && !configError && <div className="payment-loading"><RotateCcw className="spin" size={18} />Loading secure payment methods…</div>}
        {configError && <div className="payment-unavailable" role="status">
          <span><Info size={18} /></span>
          <div>
            <b>Checkout is not available yet</b>
            <p>{configError}</p>
            <p>Nothing has been charged. Your current plan is unchanged.</p>
          </div>
          <button type="button" className="soft-button" onClick={onClose}>Close</button>
        </div>}
        {config?.clientId && <PayPalProvider clientId={config.clientId} environment={config.environment} components={['paypal-subscriptions']} pageType="checkout"><EmbeddedSubscriptionCheckout plan={plan} annual={annual} quantity={quantity} onSuccess={onCompleted} /></PayPalProvider>}
        {config?.clientId && <p className="payment-consent">By continuing, you authorize recurring charges according to the cycle shown and agree to the Mere X Terms and Privacy Policy.</p>}
      </div>
    </section>
  </div>
}

function PricingPage({ navigate, user, onUserUpdated }: { navigate: (route: PublicRoute) => void; user?: AuthUser | null; onUserUpdated: (user: AuthUser) => void }) {
  const [annual, setAnnual] = useState(true)
  const [notice, setNotice] = useState('')
  const [checkoutPlan, setCheckoutPlan] = useState<PlanTier | null>(null)
  const comparison = [
    ['Mere Apex 4.0', 'Included', 'Included', 'Included', 'Included'],
    ['5-hour access', 'Standard', 'Expanded', 'Highest', 'Expanded / member'],
    ['Deep Research', 'Essential', 'Expanded', 'Highest', 'Expanded'],
    ['Image creation & editing', 'Essential', 'Expanded', 'Highest', 'Expanded'],
    ['Office & PDF workflows', 'Core', 'Extended', 'Maximum', 'Shared'],
    ['Projects', 'Personal', 'Expanded', 'Unlimited', 'Shared'],
    ['Custom Agents', 'Personal', 'Expanded', 'Unlimited', 'Team Agents'],
    ['Priority queue', '—', 'Included', 'Highest', 'Included'],
    ['Admin & roles', '—', '—', '—', 'Included'],
  ]
  const choose = async (plan: PlanTier) => {
    if (plan.name === 'Enterprise') { navigate('help'); return }
    if (!user) { navigate('signup'); return }
    if (plan.name === 'Free') { navigate('app'); return }
    setNotice(''); setCheckoutPlan(plan)
  }
  return <PublicShell navigate={navigate} current="pricing" className="pricing-page" user={user}>
    <section className="public-hero pricing-hero"><p className="landing-kicker">PLANS BUILT TO STAY SUSTAINABLE</p><h1>More capability.<br /><em>Less markup.</em></h1><p>Simple plans with clear limits, one powerful model and no surprise usage charges. Upgrade, downgrade or cancel when you need to.</p><div className="billing-toggle"><button className={!annual ? 'active' : ''} onClick={() => setAnnual(false)}>Monthly</button><button className={annual ? 'active' : ''} onClick={() => setAnnual(true)}>Annual <span>Save up to 22%</span></button></div></section>
    {notice && <div className="pricing-action-notice"><Info size={16} />{notice}</div>}
    <section className="pricing-grid">{planTiers.map(plan => { const price = annual ? plan.annual : plan.monthly; const current = user?.plan === plan.name.toLowerCase(); return <article className={`pricing-card ${plan.featured ? 'featured' : ''}`} key={plan.name}>{plan.featured && <span className="pricing-ribbon">RECOMMENDED</span>}<p>{plan.eyebrow}</p><h2>{plan.name}</h2><div className="plan-price">{price === null ? <strong>Custom</strong> : <><strong>${price}</strong><span>{price === 0 ? 'forever' : plan.name === 'Team' ? '/ seat / month' : '/ month'}</span></>}</div><small>{price && annual ? `$${price * 12}${plan.name === 'Team' ? ' per seat' : ''} billed annually` : price ? 'Billed monthly' : 'No credit card required'}</small><p className="plan-description">{plan.description}</p><button disabled={current} className={plan.featured ? 'primary-button' : 'soft-button'} onClick={() => void choose(plan)}>{current ? 'Current plan' : plan.action}<ArrowRight size={15} /></button><ul>{plan.features.map(feature => <li key={feature}><Check size={15} />{feature}</li>)}</ul></article> })}</section>
    <section className="pricing-note"><Clock3 size={19} /><div><b>Usage refreshes throughout the day.</b><p>Core access runs in rolling 5-hour windows. The amount available adapts to task complexity, file size and demand; advanced tools also use daily fair-use protection. Mere X shows reset timing before access pauses.</p></div></section>
    <section className="comparison-section"><div className="public-section-head"><p className="landing-kicker">COMPARE</p><h2>Know exactly what is included.</h2></div><div className="comparison-scroll"><table><thead><tr><th>Capability</th><th>Free</th><th>Plus</th><th>Pro</th><th>Team</th></tr></thead><tbody>{comparison.map(row => <tr key={row[0]}>{row.map((cell, index) => index === 0 ? <th key={cell}>{cell}</th> : <td key={`${row[0]}-column-${index}`}>{cell === 'Included' ? <CheckCircle2 size={16} /> : cell}</td>)}</tr>)}</tbody></table></div></section>
    <section className="public-faq"><div className="public-section-head"><p className="landing-kicker">QUESTIONS</p><h2>Billing without ambiguity.</h2></div><div>{[
      ['How do the 5-hour windows work?', 'Your active allowance refreshes on a rolling five-hour cycle. Short questions use less capacity than long-context research, large files, image work or complex generation.'],
      ['Why is there no fixed message number?', 'Workloads differ dramatically. An adaptive window is clearer in practice than promising a message count that changes with context length, tools and file complexity.'],
      ['Can I cancel or change plans?', 'Yes. Upgrades take effect immediately. Downgrades and cancellations take effect at the end of the current billing period.'],
      ['What happens when I reach a limit?', 'Mere X shows the next refresh time. Paid accounts can wait for the rolling window, upgrade, or explicitly enable additional usage when that option becomes available.'],
      ['Is Team content used for training?', 'No. Team and Enterprise workspace content is excluded from product training by default.'],
    ].map(([question, answer]) => <details key={question}><summary>{question}<Plus size={16} /></summary><p>{answer}</p></details>)}</div></section>
    <section className="public-cta"><p className="landing-kicker">START CLEARLY</p><h2>Choose the plan that fits the work.</h2><p>Begin free. Upgrade only when Mere X becomes part of your real workflow.</p><button className="landing-cta large" onClick={() => navigate('signup')}>Create your account<ArrowRight size={16} /></button></section>
    {checkoutPlan && <PaymentModal plan={checkoutPlan} annual={annual} onClose={() => setCheckoutPlan(null)} onCompleted={(updatedUser) => { onUserUpdated(updatedUser); setNotice(`Mere ${checkoutPlan.name} is active. Payment confirmation is complete.`) }} />}
  </PublicShell>
}

function LegalPage({ route, navigate }: { route: LegalRoute; navigate: (route: PublicRoute) => void }) {
  const document = legalDocuments[route]
  return <PublicShell navigate={navigate} current={route} className="legal-page"><header className="document-hero"><p className="landing-kicker">{document.eyebrow}</p><h1>{document.title}</h1><p>{document.summary}</p><div><span>Effective August 20, 2026</span><span>Version 1.0</span></div></header><div className="document-layout"><aside><b>ON THIS PAGE</b>{document.sections.map(section => <a key={section.title} href={`#${section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{section.title}</a>)}<button onClick={() => navigate('help')}><CircleHelp size={15} />Need help?</button></aside><article>{document.sections.map(section => <section id={section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')} key={section.title}><h2>{section.title}</h2>{section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}</section>)}<div className="document-contact"><Mail size={19} /><div><b>Questions about this document?</b><p>Contact legal@mere-x.app or visit the Help center.</p></div></div></article></div></PublicShell>
}

function SecurityPage({ navigate }: { navigate: (route: PublicRoute) => void }) {
  const controls = [
    { icon: Lock, title: 'Credentials stay server-side', text: 'Protected credentials are read from server environment variables and are never embedded in the browser bundle.', state: 'CURRENT' },
    { icon: Database, title: 'Account workspace storage', text: 'Signed-in chats, Projects, Agents and preferences are persisted in the application database with owner-scoped access.', state: 'CURRENT' },
    { icon: ShieldCheck, title: 'Session protection', text: 'Passwords use memory-hard hashing, sessions use HttpOnly cookies and protected routes enforce account ownership.', state: 'CURRENT' },
    { icon: Users, title: 'Account access controls', text: 'Email/password accounts and session management are active. Passkeys, MFA and organizational roles remain launch controls.', state: 'IN PROGRESS' },
    { icon: Server, title: 'Abuse and usage protection', text: 'Request throttling, rolling usage windows, file limits and isolated workflow execution are active in the application layer.', state: 'CURRENT' },
    { icon: FileText, title: 'Independent assurance', text: 'Compliance claims will only be published after the relevant controls have been implemented and independently assessed.', state: 'COMMITMENT' },
  ]
  return <PublicShell navigate={navigate} current="security" className="security-page"><section className="public-hero"><p className="landing-kicker">SECURITY AT MERE X</p><h1>Trust is a system,<br /><em>not a slogan.</em></h1><p>A transparent view of the safeguards active today and the controls still required for a public production launch.</p></section><section className="security-disclosure"><Info size={19} /><div><b>Development disclosure</b><p>Authentication, durable account sync, signed billing events and usage protection are active. Production TLS, managed backups, verified email delivery, payment credentials and independent compliance assurance still depend on deployment configuration.</p></div></section><section className="security-grid">{controls.map(({ icon: Icon, title, text, state }) => <article key={title}><span><Icon size={20} /></span><em>{state}</em><h2>{title}</h2><p>{text}</p></article>)}</section><section className="security-principles"><div className="public-section-head"><p className="landing-kicker">DESIGN PRINCIPLES</p><h2>How production security will be evaluated.</h2></div><ol><li><span>01</span><div><b>Least privilege</b><p>People and services receive only the access required for their task.</p></div></li><li><span>02</span><div><b>Data minimization</b><p>Collect less, retain for defined periods and make deletion understandable.</p></div></li><li><span>03</span><div><b>Layered defenses</b><p>Authentication, authorization, rate limits, monitoring and recovery work together.</p></div></li><li><span>04</span><div><b>Honest assurance</b><p>No certification or encryption claim is published before it is actually true.</p></div></li></ol></section><section className="public-cta"><p className="landing-kicker">REPORT A CONCERN</p><h2>Security feedback is welcome.</h2><p>Send responsible vulnerability reports to security@mere-x.app. A formal disclosure program will be published before production launch.</p><button className="landing-secondary" onClick={() => navigate('help')}>Contact support<ArrowRight size={15} /></button></section></PublicShell>
}

function HelpPage({ navigate }: { navigate: (route: PublicRoute) => void }) {
  const [query, setQuery] = useState('')
  const articles = [
    ['Getting started', 'Create an account, begin a chat and understand the Mere Apex workspace.', 'signup'],
    ['Plans and usage', 'Compare allowances, billing cycles, upgrades and cancellations.', 'pricing'],
    ['Projects and Library', 'Keep chats, files and finished outputs organized with shared context.', 'landing'],
    ['Agents', 'Create focused specialists with reusable instructions and expertise.', 'landing'],
    ['Privacy and data', 'Review storage, exports, deletion, memory and product-improvement controls.', 'privacy'],
    ['Safety and security', 'Understand safeguards, account protection and responsible use.', 'security'],
  ].filter(article => `${article[0]} ${article[1]}`.toLowerCase().includes(query.toLowerCase()))
  return <PublicShell navigate={navigate} current="help" className="help-page"><section className="help-hero"><p className="landing-kicker">MERE X HELP CENTER</p><h1>What do you need?</h1><div className="help-search"><Search size={20} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search setup, billing, privacy, Projects..." autoFocus /></div></section><section className="help-grid">{articles.map(([title, text, route]) => <button key={title} onClick={() => navigate(route as PublicRoute)}><span><LifeBuoy size={19} /></span><h2>{title}</h2><p>{text}</p><ArrowRight size={16} /></button>)}</section><section className="help-contact"><div><p className="landing-kicker">STILL NEED HELP?</p><h2>Talk to the right team.</h2><p>General support: support@mere-x.app<br />Privacy: privacy@mere-x.app<br />Security: security@mere-x.app</p></div><button className="landing-secondary" onClick={() => window.location.href = 'mailto:support@mere-x.app'}><Mail size={16} />Email support</button></section></PublicShell>
}

function StatusPage({ navigate }: { navigate: (route: PublicRoute) => void }) {
  const [apiState, setApiState] = useState<'checking' | 'operational' | 'degraded'>('checking')
  const [checkedAt, setCheckedAt] = useState('')
  useEffect(() => { const controller = new AbortController(); fetch('/api/health', { signal: controller.signal }).then(response => { setApiState(response.ok ? 'operational' : 'degraded'); setCheckedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) }).catch(() => { setApiState('degraded'); setCheckedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) }); return () => controller.abort() }, [])
  const components = [{ name: 'Web application', state: 'operational' }, { name: 'Mere Apex conversations', state: apiState }, { name: 'Research and Workflows', state: apiState }, { name: 'Image, voice and video', state: apiState }, { name: 'Account workspace storage', state: apiState }]
  return <PublicShell navigate={navigate} current="status" className="status-page"><section className="status-hero"><span className={`status-orb ${apiState}`} /><p className="landing-kicker">LIVE PREVIEW STATUS</p><h1>{apiState === 'checking' ? 'Checking systems…' : apiState === 'operational' ? 'All checked systems operational.' : 'Some systems are degraded.'}</h1><p>This page checks the local Mere X API health endpoint. Production incident history and external monitoring will be added with deployment.</p></section><section className="status-card"><header><b>Components</b><span>{checkedAt ? `Checked ${checkedAt}` : 'Checking now'}</span></header>{components.map(component => <div key={component.name}><span>{component.name}</span><b className={component.state}><i />{component.state === 'checking' ? 'Checking' : component.state === 'operational' ? 'Operational' : 'Degraded'}</b></div>)}</section><section className="status-history"><div className="public-section-head"><p className="landing-kicker">INCIDENT HISTORY</p><h2>No recorded production incidents.</h2></div><p>Mere X is currently a development preview. A public incident timeline will begin when production monitoring is enabled.</p></section></PublicShell>
}

function ReleaseNotesPage({ navigate }: { navigate: (route: PublicRoute) => void }) {
  const releases = [
    { version: 'Preview 0.6', date: 'August 21, 2026', title: 'A more expressive Mere X', items: ['Rebuilt monochrome landing experience with responsive motion and a live product workflow preview', 'Dedicated Mere Apex 4.0 documentation with eleven complete capability guides', 'Reworked chat surface with cleaner message hierarchy, softer composer and fewer visual dividers', 'Documentation search, keyboard shortcut and active section navigation', 'Responsive desktop and mobile layouts with reduced-motion accessibility'] },
    { version: 'Preview 0.5', date: 'August 21, 2026', title: 'From chat to complete workflows', items: ['Stateful Mere Apex conversations with combined research and code tools', 'Deep Research, protected computer workspace, autonomous agents and persistent workflow history', 'Live Voice with temporary browser credentials', 'Video Studio and 1K, 2K and 4K image controls', 'Account sync, durable files and shares, rolling usage controls and account security'] },
    { version: 'Preview 0.4', date: 'August 20, 2026', title: 'A complete workspace foundation', items: ['Unified readable typography across desktop and mobile', 'Direct image editing from the composer', 'Office and PDF analysis with downloadable Word, Excel, PowerPoint, PDF and Markdown output', 'Rolling 5-hour plan windows with adaptive fair-use language', 'Projects, Library, custom Agents and complete public product pages'] },
    { version: 'Preview 0.3', date: 'August 18, 2026', title: 'Context that stays connected', items: ['Project and Agent context in conversations', 'Persistent local chat history and search', 'Share links and Library continuation flows'] },
  ]
  return <PublicShell navigate={navigate} current="release-notes" className="release-page"><section className="public-hero"><p className="landing-kicker">RELEASE NOTES</p><h1>Mere X is taking shape.</h1><p>A transparent record of the product foundation, improvements and changes.</p></section><section className="release-list">{releases.map(release => <article key={release.version}><aside><span>{release.version}</span><small>{release.date}</small></aside><div><h2>{release.title}</h2><ul>{release.items.map(item => <li key={item}><Check size={15} />{item}</li>)}</ul></div></article>)}</section></PublicShell>
}

function DownloadPage({ navigate }: { navigate: (route: PublicRoute) => void }) {
  const platforms = [{ name: 'Web', detail: 'Available now in your browser', state: 'OPEN', icon: Globe2 }, { name: 'Windows', detail: 'Desktop application', state: 'COMING SOON', icon: Square }, { name: 'macOS', detail: 'Desktop application', state: 'COMING SOON', icon: Square }, { name: 'iOS & Android', detail: 'Mobile applications', state: 'PLANNED', icon: Square }]
  return <PublicShell navigate={navigate} current="download" className="download-page"><section className="public-hero"><p className="landing-kicker">MERE X EVERYWHERE</p><h1>Your workspace,<br /><em>wherever you think.</em></h1><p>The web application is available in this preview. Native apps will be released only when secure account sync and update delivery are ready.</p></section><section className="download-grid">{platforms.map(({ name, detail, state, icon: Icon }) => <article key={name}><span><Icon size={22} /></span><em>{state}</em><h2>{name}</h2><p>{detail}</p>{state === 'OPEN' ? <button className="primary-button" onClick={() => navigate('app')}>Open Mere X<ArrowRight size={15} /></button> : <button className="soft-button" onClick={() => navigate('signup')}>Join the waitlist</button>}</article>)}</section></PublicShell>
}

function ApexDocsPage({ navigate }: { navigate: (route: PublicRoute) => void }) {
  const [query, setQuery] = useState('')
  const [activeSection, setActiveSection] = useState('overview')
  const searchRef = useRef<HTMLInputElement>(null)
  const sections = [
    { id: 'overview', label: 'Overview', icon: Sparkles, title: 'One intelligence, one continuous workspace.', summary: 'Mere Apex 4.0 is the intelligence layer across Mere X. It selects the right working mode for the request without asking you to manage a model list.', points: ['Understands long, multi-part instructions and keeps the objective in view', 'Moves between writing, reasoning, research, code and creation in one conversation', 'Uses available tools only when they materially improve the result', 'Explains uncertainty and separates sourced findings from its own analysis'] },
    { id: 'reasoning', label: 'Reasoning', icon: SlidersHorizontal, title: 'Reasoning that adapts to the work.', summary: 'Adaptive reasoning gives quick requests a direct response and gives complex requests more time to plan, compare, calculate and verify.', points: ['Use Adaptive for everyday work and mixed conversations', 'Use Always on for strategy, difficult analysis, code architecture and complex decisions', 'Ask for assumptions, tradeoffs or a verification pass when accuracy matters', 'A response can be revised in place without losing the thread context'] },
    { id: 'research', label: 'Research', icon: Globe2, title: 'Research with a visible evidence trail.', summary: 'Mere Apex can search current information, inspect relevant pages and synthesize findings into a clear answer with sources.', points: ['Research mode is best for current, niche or source-sensitive questions', 'Deep Research handles wider investigations as a managed background workflow', 'Source links stay attached to the answer so important claims can be checked', 'Ask for a brief, comparison table, timeline or decision memo as the final format'] },
    { id: 'files', label: 'Files & documents', icon: FileText, title: 'Read, transform and create real deliverables.', summary: 'Add documents, spreadsheets, presentations, PDFs, images, audio, video or code directly to a conversation.', points: ['Analyze and compare multiple uploaded files in the same request', 'Extract decisions, tables, risks, action items and structured data', 'Create downloadable Word, Excel, PowerPoint, PDF and Markdown deliverables', 'Project knowledge keeps selected reference files available across related chats'] },
    { id: 'media', label: 'Image & video', icon: Image, title: 'A visual studio inside the conversation.', summary: 'Create new visuals, edit an uploaded image and turn a creative direction into a generated video without leaving the workspace.', points: ['Choose portrait, landscape, square and cinematic aspect ratios', 'Generate image output at 1K, 2K or 4K where available', 'Describe exact edits while preserving the parts of an image that should remain unchanged', 'Video Studio supports horizontal or vertical scenes with audio and downloadable output'] },
    { id: 'voice', label: 'Live Voice', icon: Mic, title: 'A conversation that can keep pace.', summary: 'Live Voice provides a low-latency spoken session with interruption handling and an on-screen transcript.', points: ['Start from the microphone control in a chat', 'Interrupt naturally when you want to change direction', 'Temporary protected credentials are used for each live session', 'Dictation remains available when you only want speech-to-text input'] },
    { id: 'projects', label: 'Projects & memory', icon: FolderKanban, title: 'Context organized around the outcome.', summary: 'Projects combine instructions, conversations and reference files into a persistent working context.', points: ['Keep a launch, client, study or product initiative separate', 'Add project-specific instructions for tone, audience and constraints', 'Index source files into project knowledge for grounded answers', 'Continue related artifacts from Library without rebuilding context'] },
    { id: 'agents', label: 'Agents & computer', icon: Bot, title: 'Delegate complete multi-step outcomes.', summary: 'Custom Agents carry a reusable role and set of instructions. Managed workflows can plan, research and complete longer tasks.', points: ['Create focused agents for research, writing, engineering or analysis', 'Autonomous Agent plans and verifies multi-stage work', 'Computer Workspace handles protected browser-style tasks in a managed workflow', 'Recent workflow history keeps results, sources and generated files available'] },
    { id: 'limits', label: 'Access & limits', icon: Clock3, title: 'Adaptive access that refreshes throughout the day.', summary: 'Core use runs in rolling five-hour windows. Capacity adapts to task size so a short answer and a long research workflow are not treated as identical work.', points: ['The current window state and next refresh are visible in Plan & billing', 'Advanced research, image, agent, computer and video work uses a protected tool allowance', 'Higher plans expand access and workflow priority', 'Mere X warns before access pauses; there are no surprise usage charges'] },
    { id: 'trust', label: 'Privacy & safety', icon: ShieldCheck, title: 'Control and transparency are product features.', summary: 'Account controls, protected sessions, content boundaries and explicit sharing are built into the platform experience.', points: ['Conversations are private unless you deliberately create a share link', 'You can review active sessions, change your password and remove account data', 'Training preference, memory and chat history controls live in Settings', 'Important decisions should still be reviewed by a qualified human'] },
    { id: 'prompting', label: 'Get better results', icon: WandSparkles, title: 'Give the outcome, context and finish line.', summary: 'Mere Apex works best when it knows what success looks like. A useful prompt does not need special syntax.', points: ['State the outcome: what should exist when the work is finished?', 'Add context: audience, source material, current state and constraints', 'Define quality: tone, depth, format and what must be verified', 'Iterate directly: keep what works and name the exact change you want'] },
  ]
  const normalizedQuery = query.trim().toLowerCase()
  const visibleSections = sections.filter(section => !normalizedQuery || `${section.label} ${section.title} ${section.summary} ${section.points.join(' ')}`.toLowerCase().includes(normalizedQuery))
  const jumpTo = (id: string) => {
    setActiveSection(id)
    if (normalizedQuery) setQuery('')
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => document.getElementById(`apex-doc-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })))
  }
  useEffect(() => {
    const keyHandler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', keyHandler)
    return () => window.removeEventListener('keydown', keyHandler)
  }, [])
  useEffect(() => {
    const root = document.querySelector('.apex-docs-page')
    const articles = sections.map(section => document.getElementById(`apex-doc-${section.id}`)).filter((article): article is HTMLElement => Boolean(article))
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) setActiveSection(entry.target.id.replace('apex-doc-', '')) }), { root, rootMargin: '-20% 0px -65%', threshold: 0 })
    articles.forEach(article => observer.observe(article))
    return () => observer.disconnect()
  }, [normalizedQuery])
  return <PublicShell navigate={navigate} current="apex" className="apex-docs-page">
    <section className="apex-doc-hero">
      <div className="apex-doc-grid" />
      <div className="apex-doc-orb" aria-hidden="true"><i /><i /><span><BrandMark compact /></span><b /></div>
      <div className="apex-doc-hero-copy"><div className="landing-status"><span />MERE APEX 4.0 / DOCUMENTATION</div><h1>One model.<br /><em>Every kind of work.</em></h1><p>The complete guide to reasoning, research, files, media, projects, agents, voice and the controls behind Mere X.</p><div className="hero-actions"><button className="landing-cta large" onClick={() => navigate('app')}>Open Mere Apex<ArrowRight size={16} /></button><button className="landing-secondary" onClick={() => jumpTo('overview')}>Read the guide<ArrowRight size={15} /></button></div></div>
      <div className="apex-doc-facts"><div><span>MODEL</span><b>Mere Apex 4.0</b></div><div><span>MODES</span><b>Adaptive by design</b></div><div><span>WORKSPACE</span><b>Text to finished files</b></div></div>
    </section>
    <section className="apex-doc-layout">
      <aside className="apex-doc-nav"><div><p>DOCUMENTATION</p>{sections.map(section => <button className={activeSection === section.id ? 'active' : ''} key={section.id} onClick={() => jumpTo(section.id)}><section.icon size={15} /><span>{section.label}</span></button>)}</div><div className="apex-doc-nav-note"><span className="status-dot" /><div><b>4.0 is active</b><small>One model across Mere X</small></div></div></aside>
      <div className="apex-doc-content">
        <div className="apex-doc-search"><Search size={17} /><input ref={searchRef} aria-label="Search Mere Apex documentation" placeholder="Search the documentation" value={query} onChange={event => setQuery(event.target.value)} />{query && <button aria-label="Clear documentation search" onClick={() => setQuery('')}><X size={15} /></button>}<kbd>⌘ K</kbd></div>
        <section className="apex-quickstart"><div><p className="landing-kicker">QUICK START</p><h2>Ask naturally.<br />Add context when it matters.</h2></div><ol><li><span>01</span><div><b>Start with an outcome</b><p>Describe the result you want, not a sequence of buttons.</p></div></li><li><span>02</span><div><b>Attach the source material</b><p>Add files or turn on research when the work needs evidence.</p></div></li><li><span>03</span><div><b>Refine in the same thread</b><p>Mere Apex keeps the conversation context connected.</p></div></li></ol></section>
        {visibleSections.map((section, index) => {
          const Icon = section.icon
          return <article className="apex-doc-article" id={`apex-doc-${section.id}`} key={section.id}><header><span>{String(index + 1).padStart(2, '0')}</span><div className="apex-doc-icon"><Icon size={20} /></div><div><p>{section.label.toUpperCase()}</p><h2>{section.title}</h2></div></header><p className="apex-doc-summary">{section.summary}</p><ul>{section.points.map(point => <li key={point}><CheckCircle2 size={16} /><span>{point}</span></li>)}</ul></article>
        })}
        {!visibleSections.length && <div className="apex-doc-empty"><Search size={24} /><h2>No matching documentation.</h2><p>Try a broader term such as files, research, voice or limits.</p><button className="landing-secondary" onClick={() => setQuery('')}>Clear search</button></div>}
        <section className="apex-doc-faq"><div><p className="landing-kicker">COMMON QUESTIONS</p><h2>What to know<br />before you begin.</h2></div><div>{[
          ['Do I need to choose a model?', 'No. Mere Apex 4.0 is the single intelligence across Mere X and adapts its working mode to the request.'],
          ['Can it work with my documents?', 'Yes. Add common documents, spreadsheets, presentations, PDFs, images, audio, video or code and describe the result you want.'],
          ['Can I verify research?', 'Yes. Research responses can include source links beside the findings they support.'],
          ['Does it remember every chat?', 'Only the context available in the active conversation or project, subject to your memory and history controls.'],
        ].map(([question, answer]) => <details key={question}><summary>{question}<Plus size={16} /></summary><p>{answer}</p></details>)}</div></section>
        <section className="apex-doc-cta"><span><BrandMark compact /></span><div><p className="landing-kicker">READY WHEN YOU ARE</p><h2>Bring Mere Apex real work.</h2><p>Start with a question, a file or a complete outcome.</p></div><button className="landing-cta large" onClick={() => navigate('app')}>Start a conversation<ArrowRight size={16} /></button></section>
      </div>
    </section>
  </PublicShell>
}

function LandingPage({ navigate }: { navigate: (route: PublicRoute) => void }) {
  const pageRef = useRef<HTMLDivElement>(null)
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => {
    const page = pageRef.current
    if (!page) return
    const targets = Array.from(page.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { targets.forEach(target => target.classList.add('is-visible')); return }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { (entry.target as HTMLElement).classList.add('is-visible'); observer.unobserve(entry.target) } }), { root: page, threshold: .12 })
    targets.forEach(target => observer.observe(target))
    return () => observer.disconnect()
  }, [])
  return <div className="landing-page landing-page-v2" ref={pageRef}>
    <nav className="landing-nav">
      <button className="landing-brand" onClick={() => pageRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}><BrandMark /></button>
      <div className="landing-links"><button onClick={() => scrollTo('capabilities')}>Capabilities</button><button onClick={() => navigate('apex')}>Mere Apex</button><button onClick={() => navigate('pricing')}>Pricing</button><button onClick={() => navigate('security')}>Security</button></div>
      <div className="landing-auth"><button className="landing-signin" onClick={() => navigate('signin')}>Sign in</button><button className="landing-cta" onClick={() => navigate('signup')}>Get started<ArrowRight size={14} /></button></div>
    </nav>

    <main>
      <section className="landing-hero landing-hero-v2" onPointerMove={event => { const box = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty('--pointer-x', `${event.clientX - box.left}px`); event.currentTarget.style.setProperty('--pointer-y', `${event.clientY - box.top}px`) }}>
        <div className="landing-hero-grid" /><div className="hero-pointer-light" /><div className="hero-noise" />
        <div className="hero-signal" aria-hidden="true"><i /><i /><i /><div><span><BrandMark compact /></span></div><b className="signal-node one" /><b className="signal-node two" /><b className="signal-node three" /></div>
        <div className="landing-status hero-enter"><span />MERE APEX 4.0 · AVAILABLE NOW</div>
        <h1 className="hero-enter hero-enter-2">Make the complex<br /><em>feel inevitable.</em></h1>
        <p className="hero-enter hero-enter-3">A single intelligence for the distance between an ambitious idea and finished, exceptional work.</p>
        <div className="hero-actions hero-enter hero-enter-4"><button className="landing-cta large" onClick={() => navigate('signup')}>Start creating<ArrowRight size={16} /></button><button className="landing-secondary" onClick={() => navigate('apex')}>Explore Mere Apex 4.0<ArrowRight size={15} /></button></div>
        <div className="hero-float-card float-research"><Globe2 size={15} /><span><b>Deep research</b><small>Sources connected</small></span><Check size={13} /></div>
        <div className="hero-float-card float-files"><FileText size={15} /><span><b>Final brief.docx</b><small>Ready to download</small></span><ArrowUp size={13} /></div>
        <div className="landing-product-frame product-frame-v2 hero-enter hero-enter-5">
          <div className="frame-top"><div><span /><span /><span /></div><BrandMark /><span>mere-x.app</span><div><Lock size={12} />Private</div></div>
          <div className="frame-body">
            <aside><BrandMark compact /><span className="frame-active"><Plus size={14} />New chat</span>{[MessageCircle, Search, Folder, Library, Bot].map((Icon, i) => <span key={i}><Icon size={14} /><i /></span>)}</aside>
            <div className="frame-chat"><div className="frame-model"><BrandGlyph />Mere Apex 4.0<span>ACTIVE</span></div><div className="frame-workspace"><div className="frame-thread"><div className="frame-user-message">Turn these scattered findings into a launch decision.</div><div className="frame-apex-response"><span><BrandGlyph /></span><div><b>Mere Apex 4.0</b><p>I compared the evidence, resolved the conflicting signals and built a clear recommendation.</p><div className="frame-result"><span><CheckCircle2 size={14} />DECISION BRIEF</span><strong>Launch with a focused two-market pilot.</strong><div><i /><i /><i /></div></div><div className="frame-citations"><span>8 sources</span><span>3 files</span><span>Verified</span></div></div></div><div className="frame-composer frame-composer-live"><span>Ask a follow-up...</span><div><Paperclip size={15} /><Sparkles size={14} /><Globe2 size={14} /><b><ArrowUp size={14} /></b></div></div></div><aside className="frame-context"><p>WORKING CONTEXT</p><div><span>01</span><b>Market evidence</b><Check size={13} /></div><div><span>02</span><b>Product constraints</b><Check size={13} /></div><div className="active"><span>03</span><b>Decision synthesis</b><i /></div><section><span>CONFIDENCE</span><strong>High</strong><div><i /></div></section></aside></div></div>
          </div>
        </div>
        <div className="scroll-cue"><span>SCROLL TO EXPLORE</span><ArrowRight size={13} /></div>
      </section>

      <section className="landing-motion-rail" aria-label="Mere X capabilities"><div>{['REASON', 'RESEARCH', 'CREATE', 'ANALYZE', 'BUILD', 'SEE', 'LISTEN', 'DELIVER', 'REASON', 'RESEARCH', 'CREATE', 'ANALYZE', 'BUILD', 'SEE', 'LISTEN', 'DELIVER'].map((item, index) => <span key={`${item}-${index}`}>{item}<i /></span>)}</div></section>

      <section className="landing-statement landing-statement-v2" data-reveal>
        <p className="landing-kicker">01 / THE MODEL</p>
        <div><h2>One model.<br /><em>No weak mode.</em></h2><p>Mere Apex 4.0 brings reasoning, creation, research and analysis into one coherent intelligence. It understands the work, chooses the right tools and stays with the full outcome.</p><button className="landing-text-link" onClick={() => navigate('apex')}>Read the complete documentation<ArrowRight size={15} /></button></div>
        <div className="statement-metric"><strong>4.0</strong><span>ONE CONTINUOUS<br />INTELLIGENCE</span><i /></div>
      </section>

      <section className="capabilities-section capabilities-v2" id="capabilities" data-reveal>
        <div className="landing-section-head"><p className="landing-kicker">02 / CAPABILITY SYSTEM</p><h2>Serious range.<br />One clear surface.</h2><p>The platform changes shape around your work while the experience stays focused.</p></div>
        <div className="capability-bento">
          <article className="capability-card capability-card-featured"><div className="capability-card-head"><span>01 / REASONING</span><Sparkles size={20} /></div><h3>Think beyond the obvious answer.</h3><p>Break down difficult questions, test alternatives and keep the final recommendation connected to evidence.</p><div className="reasoning-visual"><span>UNDERSTAND</span><span>COMPARE</span><span>VERIFY</span><strong><BrandGlyph /></strong><i /><i /></div></article>
          <article className="capability-card"><div className="capability-card-head"><span>02 / RESEARCH</span><Globe2 size={19} /></div><h3>Find signal in the noise.</h3><p>Current research, cited sources and deep investigations that end in a useful decision.</p><div className="research-lines"><i /><i /><i /><i /></div></article>
          <article className="capability-card"><div className="capability-card-head"><span>03 / FILES</span><FileText size={19} /></div><h3>From raw file to final deliverable.</h3><p>Analyze source material and create documents, sheets, decks and PDFs you can actually use.</p><div className="file-stack"><span>PDF</span><span>DOCX</span><span>XLSX</span></div></article>
          <article className="capability-card capability-card-wide"><div><div className="capability-card-head"><span>04 / CREATE</span><WandSparkles size={19} /></div><h3>Words, images, voice and video — one creative thread.</h3><p>Keep the brief, references, iterations and final output together from first direction to export.</p></div><div className="media-wave"><span /><i /><i /><i /><i /><i /></div></article>
          <article className="capability-card"><div className="capability-card-head"><span>05 / ACT</span><Bot size={19} /></div><h3>Delegate the whole outcome.</h3><p>Agents, computer workflows and persistent projects for work that needs more than one step.</p><div className="agent-steps"><span><Check size={12} />Plan</span><span><Check size={12} />Execute</span><span><i />Verify</span></div></article>
        </div>
      </section>

      <section className="landing-use-section" data-reveal>
        <div className="landing-use-copy"><p className="landing-kicker">03 / FROM THOUGHT TO OUTPUT</p><h2>Bring the messy middle.</h2><p>Loose notes. Conflicting research. A half-built spreadsheet. A rough image. Mere Apex turns the unfinished parts into a connected working process.</p><button className="landing-secondary" onClick={() => navigate('apex')}>See everything Mere Apex can do<ArrowRight size={15} /></button></div>
        <div className="landing-use-flow"><div><span>INPUT</span><article><FileText size={17} /><b>Research notes</b><small>12 pages</small></article><article><Image size={17} /><b>Visual references</b><small>6 images</small></article><article><MessageCircle size={17} /><b>Your direction</b><small>1 outcome</small></article></div><span className="flow-connector"><i /></span><div className="flow-apex"><span><BrandMark compact /></span><b>Mere Apex 4.0</b><small>Reasoning · tools · context</small></div><span className="flow-connector"><i /></span><div><span>OUTPUT</span><article className="flow-output"><CheckCircle2 size={17} /><b>Launch decision</b><small>Verified & ready</small></article></div></div>
      </section>

      <section className="principles-section" id="principles" data-reveal>
        <div className="principle-visual"><div className="principle-orbit"><span><BrandMark compact /></span><i /><i /><i /></div><div className="orbit-label orbit-label-one">CONTEXT</div><div className="orbit-label orbit-label-two">CONTROL</div></div>
        <div className="principle-copy"><p className="landing-kicker">04 / PRINCIPLES</p><h2>Power should feel<br /><em>quiet.</em></h2><p>Advanced intelligence should make work clearer, not more complicated. Mere X is designed around focus, control and trust.</p><ul><li><span>01</span><b>Context stays connected</b><Check size={14} /></li><li><span>02</span><b>You control your work</b><Check size={14} /></li><li><span>03</span><b>Capability without clutter</b><Check size={14} /></li></ul></div>
      </section>

      <section className="landing-final landing-final-v2" data-reveal>
        <div className="final-rings" aria-hidden="true"><i /><i /><i /></div><span className="final-mark"><BrandMark compact /></span><p className="landing-kicker">START WITH MERE X</p><h2>Your best work<br />is still <em>ahead.</em></h2><p>Enter a calmer, more capable way to think and create.</p><div className="hero-actions"><button className="landing-cta large" onClick={() => navigate('signup')}>Create your account<ArrowRight size={16} /></button><button className="landing-secondary" onClick={() => navigate('apex')}>Explore Mere Apex</button></div>
      </section>
    </main>
    <PublicFooter navigate={navigate} />
  </div>
}

function GoogleAuthButton({ mode, onAuthenticated, onNotice }: { mode: 'signin' | 'signup'; onAuthenticated: (user: AuthUser) => void; onNotice: (message: string) => void }) {
  // Sign-in for the account this browser chooses, not the one it used last.
  const containerRef = useRef<HTMLDivElement>(null)
  const [clientId, setClientId] = useState('')
  // The parent re-renders on every keystroke. Holding the callbacks in refs keeps
  // Google Identity Services initialised exactly once, so a click can never land
  // on a button that was torn down and rebuilt mid-flight.
  const authenticatedRef = useRef(onAuthenticated)
  const noticeRef = useRef(onNotice)
  authenticatedRef.current = onAuthenticated
  noticeRef.current = onNotice

  useEffect(() => {
    const controller = new AbortController()
    void fetch('/api/auth/config', { signal: controller.signal }).then(async response => {
      const result = await response.json() as { googleClientId?: string | null }
      if (response.ok && result.googleClientId) setClientId(result.googleClientId)
    }).catch(() => undefined)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    const submitCredential = async ({ credential }: GoogleCredentialResponse) => {
      if (!credential) return noticeRef.current('Google did not return a sign-in credential.')
      noticeRef.current('Verifying your Google account…')
      try {
        const response = await fetch('/api/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }) })
        const result = await response.json() as { user?: AuthUser; error?: string }
        if (!response.ok || !result.user) throw new Error(result.error || 'Google sign-in failed.')
        // Do not let Google silently reuse this choice next time: the account
        // picker must appear again so a shared device cannot sign the next
        // person into the account that was used before.
        forgetGoogleAccountChoice()
        authenticatedRef.current(result.user)
      } catch (error) { noticeRef.current(error instanceof Error ? error.message : 'Google sign-in failed.') }
    }
    const render = () => {
      const googleIdentity = (window as unknown as { google?: GoogleIdentityApi }).google
      if (cancelled || !googleIdentity || !containerRef.current) return
      googleIdentity.accounts.id.initialize({
        client_id: clientId,
        callback: (response: GoogleCredentialResponse) => void submitCredential(response),
        ux_mode: 'popup',
        // Never resume the previously approved account without asking.
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
      })
      googleIdentity.accounts.id.disableAutoSelect()
      containerRef.current.replaceChildren()
      const width = Math.max(240, Math.min(400, Math.floor(containerRef.current.clientWidth || 380)))
      googleIdentity.accounts.id.renderButton(containerRef.current, { type: 'standard', theme: 'filled_black', size: 'large', text: mode === 'signup' ? 'signup_with' : 'signin_with', shape: 'rectangular', logo_alignment: 'left', width, locale: 'en' })
    }
    let script = document.querySelector<HTMLScriptElement>('script[data-mere-google-identity]')
    if ((window as unknown as { google?: GoogleIdentityApi }).google) render()
    else {
      if (!script) {
        script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client?hl=en'
        script.async = true
        script.dataset.mereGoogleIdentity = 'true'
        script.addEventListener('error', () => noticeRef.current('Google sign-in could not be loaded. Check your connection and try again.'), { once: true })
        document.head.appendChild(script)
      }
      script.addEventListener('load', render, { once: true })
    }
    // Re-measure the official button when the layout changes, without rebuilding
    // it on every render.
    let resizeTimer = 0
    const onResize = () => { window.clearTimeout(resizeTimer); resizeTimer = window.setTimeout(render, 180) }
    window.addEventListener('resize', onResize)
    const listeningScript = script
    return () => {
      cancelled = true
      window.clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
      listeningScript?.removeEventListener('load', render)
    }
  }, [clientId, mode])

  if (!clientId) return null
  return <div className="google-auth-section"><div className="google-auth-button" ref={containerRef} /></div>
}

function AuthPage({ mode, navigate, onAuthenticated }: { mode: 'signin' | 'signup'; navigate: (route: PublicRoute) => void; onAuthenticated: (user: AuthUser, identities?: AuthIdentity[]) => void }) {
  const isSignUp = mode === 'signup'
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [challengeId, setChallengeId] = useState('')
  const [code, setCode] = useState('')
  const passwordValid = !isSignUp || password.length >= 8
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSignUp && challengeId && code.length !== 6) return
    if (!challengeId && (!email || !password || !passwordValid || (isSignUp && !name))) return
    setSubmitting(true)
    setAuthNotice('')
    try {
      const body = isSignUp && challengeId ? { challengeId, code } : { email, password, name, remember }
      const response = await fetch(`/api/auth/${isSignUp ? 'signup' : 'signin'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const result = await response.json() as { user?: AuthUser; challengeId?: string; message?: string; previewCode?: string; error?: string }
      if (isSignUp && response.status === 202 && result.challengeId) {
        setChallengeId(result.challengeId)
        setCode(result.previewCode || '')
        setAuthNotice(result.message || 'Verification code sent.')
        return
      }
      if (!response.ok || !result.user) throw new Error(result.error || 'Authentication failed.')
      onAuthenticated(result.user)
      navigate('app')
    } catch (error) { setAuthNotice(error instanceof Error ? error.message : 'Authentication failed.') }
    finally { setSubmitting(false) }
  }
  const forgotPassword = async () => {
    if (!email) { setAuthNotice('Enter your email address first.'); return }
    setSubmitting(true)
    try {
      const response = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const result = await response.json() as { challengeId?: string; message?: string; error?: string; previewCode?: string }
      if (!response.ok || !result.challengeId) throw new Error(result.error || 'Reset instructions could not be prepared.')
      sessionStorage.setItem('mere-x-password-reset', JSON.stringify({ challengeId: result.challengeId, email, previewCode: result.previewCode || '' }))
      navigate('reset-password')
    } catch { setAuthNotice('Reset instructions could not be prepared.') }
    finally { setSubmitting(false) }
  }
  return <div className="auth-page">
    <section className="auth-visual">
      <button className="auth-logo" onClick={() => navigate('landing')}><BrandMark /></button>
      <div className="auth-quote"><span className="auth-glyph"><BrandMark compact /></span><p className="landing-kicker">MERE APEX 4.0</p><h2>“The space between<br />a thought and its<br /><em>full potential.</em>”</h2><div><i /><span>Intelligence, refined.</span></div></div>
      <div className="auth-grid" />
      <p className="auth-foot">MERE X · 2026</p>
    </section>
    <section className="auth-form-side">
      <button className="auth-back" onClick={() => navigate('landing')}><ArrowLeft size={15} />Back to home</button>
      <div className="auth-form-wrap">
        <div className="auth-mobile-logo"><BrandMark /></div>
        <p className="landing-kicker">{isSignUp ? challengeId ? 'VERIFY YOUR EMAIL' : 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}</p>
        <h1>{isSignUp ? challengeId ? 'Check your inbox.' : 'Begin with Mere X.' : 'Sign in to Mere X.'}</h1>
        <p>{isSignUp ? challengeId ? `Enter the 6-digit code sent to ${email}.` : 'Your workspace for deeper thinking and better work.' : 'Continue to your conversations, projects and library.'}</p>
        {!challengeId && <><GoogleAuthButton mode={mode} onAuthenticated={user => { onAuthenticated(user, [{ provider: 'google', email: user.email, createdAt: Date.now() }]); navigate('app') }} onNotice={setAuthNotice} /><div className="auth-divider"><span>OR CONTINUE WITH EMAIL</span></div></>}
        <form onSubmit={event => void submit(event)}>
          {isSignUp && challengeId ? <label><span>Verification code</span><input className="verification-code-input" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" inputMode="numeric" autoComplete="one-time-code" autoFocus /></label> : <>
            {isSignUp && <label><span>Name</span><input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoComplete="name" /></label>}
            <label><span>Email address</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" /></label>
            <label><span>Password</span><div className="password-input"><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={isSignUp ? 'At least 8 characters' : 'Enter your password'} autoComplete={isSignUp ? 'new-password' : 'current-password'} /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
            {!isSignUp && <div className="auth-options"><label className="check-label"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} /><span>Remember me</span></label><button type="button" onClick={() => void forgotPassword()}>Forgot password?</button></div>}
            {isSignUp && <label className="check-label terms-check"><input type="checkbox" required /><span>I agree to the <button type="button" className="auth-legal-link" onClick={() => navigate('terms')}>Terms</button> and <button type="button" className="auth-legal-link" onClick={() => navigate('privacy')}>Privacy Policy</button>.</span></label>}
          </>}
          {authNotice && <div className="auth-notice" role="status"><Mail size={14} />{authNotice}</div>}
          <button className="auth-submit" type="submit" disabled={submitting || (challengeId ? code.length !== 6 : !email || !password || !passwordValid || (isSignUp && !name))}>{submitting ? 'Please wait…' : isSignUp ? challengeId ? 'Verify and create account' : 'Send verification code' : 'Sign in'}<ArrowRight size={15} /></button>
        </form>
        {isSignUp && challengeId ? <p className="auth-switch">Wrong email? <button onClick={() => { setChallengeId(''); setCode(''); setAuthNotice('') }}>Go back</button></p> : <p className="auth-switch">{isSignUp ? 'Already have an account?' : 'New to Mere X?'} <button onClick={() => navigate(isSignUp ? 'signin' : 'signup')}>{isSignUp ? 'Sign in' : 'Create an account'}</button></p>}
      </div>
      <div className="auth-side-foot"><span>Protected by Mere X Security</span><span>English<ChevronDown size={12} /></span></div>
    </section>
  </div>
}

function ResetPasswordPage({ navigate }: { navigate: (route: PublicRoute) => void }) {
  const initial = (() => {
    try { return JSON.parse(sessionStorage.getItem('mere-x-password-reset') || '{}') as { challengeId?: string; email?: string; previewCode?: string } }
    catch { return {} }
  })()
  const [challengeId, setChallengeId] = useState(initial.challengeId || '')
  const [email, setEmail] = useState(initial.email || '')
  const [code, setCode] = useState(initial.previewCode || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true); setNotice('')
    try {
      if (!challengeId) {
        const response = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
        const result = await response.json() as { challengeId?: string; message?: string; previewCode?: string; error?: string }
        if (!response.ok || !result.challengeId) throw new Error(result.error || 'Reset code could not be sent.')
        setChallengeId(result.challengeId); setCode(result.previewCode || ''); setNotice(result.message || 'Reset code sent.')
        sessionStorage.setItem('mere-x-password-reset', JSON.stringify({ challengeId: result.challengeId, email, previewCode: result.previewCode || '' }))
      } else {
        if (code.length !== 6 || password.length < 8 || password !== confirmPassword) return
        const response = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challengeId, code, password }) })
        const result = await response.json() as { error?: string }
        if (!response.ok) throw new Error(result.error || 'Password could not be reset.')
        sessionStorage.removeItem('mere-x-password-reset')
        setNotice('Password updated. You can now sign in.'); window.setTimeout(() => navigate('signin'), 900)
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Password could not be reset.') }
    finally { setSubmitting(false) }
  }
  return <div className="auth-page reset-auth-page"><section className="auth-visual"><button className="auth-logo" onClick={() => navigate('landing')}><BrandMark /></button><div className="auth-quote"><span className="auth-glyph"><Lock size={24} /></span><p className="landing-kicker">ACCOUNT RECOVERY</p><h2>A secure return<br />to your <em>workspace.</em></h2></div><div className="auth-grid" /></section><section className="auth-form-side"><button className="auth-back" onClick={() => navigate('signin')}><ArrowLeft size={15} />Back to sign in</button><div className="auth-form-wrap"><span className="auth-mobile-logo"><BrandMark /></span><p className="landing-kicker">MERE X SECURITY</p><h1>{challengeId ? 'Enter your reset code.' : 'Reset your password.'}</h1><p>{challengeId ? `Use the 6-digit code sent to ${email}, then choose a new password.` : 'Enter your account email and we will send a one-time code.'}</p><form onSubmit={submit}>{challengeId ? <><label><span>Reset code</span><input className="verification-code-input" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" autoFocus /></label><label><span>New password</span><input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" /></label><label><span>Confirm password</span><input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" /></label></> : <label><span>Email address</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" placeholder="name@example.com" autoFocus /></label>}{notice && <div className="auth-notice" role="status"><Info size={14} />{notice}</div>}<button className="auth-submit" disabled={submitting || (challengeId ? code.length !== 6 || password.length < 8 || password !== confirmPassword : !email)}>{submitting ? 'Please wait…' : challengeId ? 'Update password' : 'Send reset code'}<ArrowRight size={15} /></button></form>{challengeId && <p className="auth-switch">Need another code? <button onClick={() => { setChallengeId(''); setCode(''); setNotice(''); sessionStorage.removeItem('mere-x-password-reset') }}>Request again</button></p>}</div></section></div>
}

export default function App() {
  const getPublicRoute = (): PublicRoute => {
    const hash = window.location.hash.replace('#/', '')
    if (hash.startsWith('shared/')) return 'shared'
    if (hash === 'signin' || hash === 'signup') return hash
    if (hash.startsWith('reset-password')) return 'reset-password'
    if (!hash || hash === 'landing') return 'landing'
    if (publicPageRoutes.includes(hash as PublicRoute)) return hash as PublicRoute
    return 'app'
  }
  const [publicRoute, setPublicRoute] = useState<PublicRoute>(getPublicRoute)
  const [page, setPage] = useState<Page>(() => {
    const route = window.location.hash.replace('#/', '') as Page
    return ['projects', 'library', 'agents', 'workflows', 'settings'].includes(route) ? route : 'chat'
  })
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [liveVoiceOpen, setLiveVoiceOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('general')
  const [toast, setToast] = useState('')
  const [projects, setProjects] = useState<ProjectRecord[]>(defaultProjects)
  const [library, setLibrary] = useState<LibraryRecord[]>(defaultLibrary)
  const [agentRecords, setAgentRecords] = useState<AgentRecord[]>(defaultAgents)
  const [conversations, setConversations] = useState<ConversationRecord[]>(defaultConversations)
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)
  const [settingsControls, setSettingsControls] = useState<SettingsControls>(defaultSettingsControls)
  const [profile, setProfile] = useState<UserProfile>(defaultUserProfile)
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(null)
  const [identities, setIdentities] = useState<AuthIdentity[]>([])
  const [sessionResolved, setSessionResolved] = useState(false)
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false)
  const [workspaceError, setWorkspaceError] = useState('')
  const workspaceVersionRef = useRef(0)
  // The account the loaded snapshot belongs to. Nothing is written back until a
  // load for the signed-in account has completed, which is what keeps one
  // account's work from being saved into another.
  const workspaceOwnerRef = useRef<string | null>(null)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [activeAgent, setActiveAgent] = useState<AgentRecord | null>(null)
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null)
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    // Remove legacy browser-persisted workspace records from earlier previews.
    // Account content is now loaded exclusively from authenticated database APIs.
    for (const key of Object.keys(localStorage)) if (key.startsWith('mere-x-')) localStorage.removeItem(key)
  }, [])

  const readSession = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch('/api/auth/session', { signal })
    if (!response.ok) throw new Error('Session unavailable')
    return await response.json() as { authenticated?: boolean; user?: AuthUser; identities?: AuthIdentity[] }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void readSession(controller.signal).then(result => {
      if (result.authenticated && result.user) {
        setSessionUser(result.user)
        setIdentities(result.identities || [])
      } else setWorkspaceLoaded(true)
    }).catch(() => {
      if (controller.signal.aborted) return
      setWorkspaceError('Mere X could not verify this browser session.')
    }).finally(() => { if (!controller.signal.aborted) setSessionResolved(true) })
    return () => controller.abort()
  }, [readSession])

  // The signed-in account can change without this tab knowing: another tab signs
  // in, a session expires, someone signs out on a shared device. Re-check when
  // this tab comes back so what is on screen always belongs to the account that
  // is actually signed in.
  useEffect(() => {
    const revalidate = () => {
      if (document.visibilityState !== 'visible') return
      void readSession().then(result => {
        const nextUser = result.authenticated && result.user ? result.user : null
        setIdentities(result.identities || [])
        setSessionUser(current => {
          if (!current && !nextUser) return current
          if (current && nextUser && current.id === nextUser.id) {
            const unchanged = current.name === nextUser.name && current.email === nextUser.email
              && current.plan === nextUser.plan && current.avatar === nextUser.avatar && current.hasPassword === nextUser.hasPassword
            return unchanged ? current : nextUser
          }
          // A different account (or none at all) owns this browser now. Stop
          // synchronizing immediately so nothing is written to the wrong account.
          workspaceOwnerRef.current = null
          workspaceVersionRef.current = 0
          setWorkspaceLoaded(!nextUser)
          return nextUser
        })
      }).catch(() => undefined)
    }
    document.addEventListener('visibilitychange', revalidate)
    window.addEventListener('focus', revalidate)
    return () => {
      document.removeEventListener('visibilitychange', revalidate)
      window.removeEventListener('focus', revalidate)
    }
  }, [readSession])

  useEffect(() => {
    if (!sessionUser) return
    const accountId = sessionUser.id
    const controller = new AbortController()
    workspaceOwnerRef.current = null
    workspaceVersionRef.current = 0
    setWorkspaceLoaded(false)
    setWorkspaceError('')
    setProjects([])
    setLibrary([])
    setAgentRecords(defaultAgents)
    setConversations([])
    setPreferences(defaultPreferences)
    setSettingsControls(defaultSettingsControls)
    setMessages([])
    setActiveConversationId(null)
    setActiveAgent(null)
    setActiveProject(null)
    setProfile({ name: sessionUser.name, email: sessionUser.email, avatar: sessionUser.avatar })
    void fetch('/api/workspace', { signal: controller.signal }).then(async response => {
      if (response.status === 401) throw new Error('This browser is no longer signed in.')
      if (!response.ok) throw new Error('Workspace sync is unavailable.')
      const result = await response.json() as { version: number; data: WorkspaceSnapshot; userId?: string }
      // Refuse content that arrived for a different account than this render is
      // for: the request raced a sign-in and belongs to nobody here.
      if (result.userId && result.userId !== accountId) throw new Error('The signed-in account changed. Reload Mere X to continue.')
      workspaceVersionRef.current = result.version
      workspaceOwnerRef.current = accountId
      const data = result.data || {}
      setProjects(Array.isArray(data.projects) ? data.projects : [])
      setLibrary(Array.isArray(data.library) ? data.library : [])
      setAgentRecords(Array.isArray(data.agents) ? data.agents : defaultAgents)
      setConversations(Array.isArray(data.conversations) ? data.conversations : [])
      setPreferences({ ...defaultPreferences, ...(data.preferences || {}) })
      setSettingsControls({ ...defaultSettingsControls, ...(data.settingsControls || {}) })
      setMessages(Array.isArray(data.thread) ? data.thread : [])
      setActiveConversationId(typeof data.activeConversationId === 'string' ? data.activeConversationId : null)
      setWorkspaceLoaded(true)
    }).catch(error => {
      if (controller.signal.aborted) return
      setWorkspaceError(error instanceof Error ? error.message : 'Workspace sync is unavailable.')
    })
    return () => controller.abort()
  }, [sessionUser?.id])

  useEffect(() => {
    if (!sessionUser || !workspaceLoaded) return
    const accountId = sessionUser.id
    // Only ever write a snapshot that was actually loaded for this account.
    if (workspaceOwnerRef.current !== accountId) return
    const timer = window.setTimeout(() => {
      const lightweightMessages = (records: Message[]) => records.map(({ images: _images, files: _files, ...message }) => message)
      const snapshot: WorkspaceSnapshot = {
        projects,
        library: library.map(({ preview: _preview, ...item }) => item),
        agents: agentRecords,
        conversations: conversations.map(record => ({ ...record, messages: lightweightMessages(record.messages) })),
        preferences,
        settingsControls,
        thread: settingsControls.chatHistory ?? true ? lightweightMessages(messages) : [],
        activeConversationId: settingsControls.chatHistory ?? true ? activeConversationId : null,
      }
      void fetch('/api/workspace', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // The account the snapshot belongs to travels with it, so the server can
        // refuse the write outright if this browser has moved to another account.
        body: JSON.stringify({ version: workspaceVersionRef.current, userId: accountId, data: snapshot }),
      }).then(async response => {
        if (workspaceOwnerRef.current !== accountId) return
        const result = await response.json().catch(() => ({})) as { version?: number; code?: string }
        if (response.ok && typeof result.version === 'number') { workspaceVersionRef.current = result.version; return }
        if (response.status === 401) {
          workspaceOwnerRef.current = null
          setSessionUser(null)
          setWorkspaceLoaded(true)
          return
        }
        if (response.status === 409 && result.code === 'account-changed') {
          // Another account is signed in now. Stop writing and let this tab
          // reload onto whoever actually owns the session.
          workspaceOwnerRef.current = null
          setWorkspaceError('The signed-in account changed in another tab. Reload Mere X to continue.')
          setWorkspaceLoaded(false)
          return
        }
        if (response.status === 409 && typeof result.version === 'number') workspaceVersionRef.current = result.version
      }).catch(() => undefined)
    }, 900)
    return () => window.clearTimeout(timer)
  }, [sessionUser?.id, workspaceLoaded, projects, library, agentRecords, conversations, preferences, settingsControls, messages, activeConversationId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true) }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); setPublicRoute('app'); setPage('chat'); setMessages([]); setActiveConversationId(null); setActiveAgent(null); setActiveProject(null); window.location.hash = '/app' }
      if (e.key === 'Escape') { setSearchOpen(false); setShareOpen(false); setInfoOpen(false); setSettingsOpen(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!messages.length || !(settingsControls.chatHistory ?? true)) return
    const conversationId = activeConversationId || `chat-${Date.now()}`
    if (!activeConversationId) {
      setActiveConversationId(conversationId)
    }
    const firstUserMessage = messages.find(message => message.role === 'user')
    const title = (firstUserMessage?.content || activeAgent?.name || activeProject?.name || 'New conversation').replace(/[#*_`]/g, '').slice(0, 52)
    const persistentMessages = messages.map(({ images: _images, files: _files, ...message }) => message)
    setConversations(current => {
      const previous = current.find(record => record.id === conversationId)
      return [{ id: conversationId, title, messages: persistentMessages, updated: 'Active now', favorite: previous?.favorite, archived: previous?.archived }, ...current.filter(record => record.id !== conversationId)].slice(0, 50)
    })
  }, [messages, activeConversationId, activeAgent?.name, activeProject?.name, setConversations, settingsControls.chatHistory])

  useEffect(() => {
    if (!sessionResolved) return
    if (!sessionUser && publicRoute === 'app') {
      setPublicRoute('signin')
      window.location.hash = '/signin'
    } else if (sessionUser && (publicRoute === 'signin' || publicRoute === 'signup')) {
      setPublicRoute('app')
      window.location.hash = '/app'
    }
  }, [sessionResolved, sessionUser?.id, publicRoute])

  useEffect(() => {
    const syncRoute = () => {
      const rawRoute = window.location.hash.replace('#/', '')
      setSearchOpen(false); setShareOpen(false); setInfoOpen(false); setSettingsOpen(false); setMobileOpen(false)
      setPublicRoute(rawRoute.startsWith('shared/') ? 'shared' : rawRoute.startsWith('reset-password') ? 'reset-password' : rawRoute === 'signin' || rawRoute === 'signup' ? rawRoute : (!rawRoute || rawRoute === 'landing' ? 'landing' : publicPageRoutes.includes(rawRoute as PublicRoute) ? rawRoute as PublicRoute : 'app'))
      const route = rawRoute as Page
      setPage(['projects', 'library', 'agents', 'workflows', 'settings'].includes(route) ? route : 'chat')
    }
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

  const notify = (text: string) => setToast(text)
  const authenticated = (user: AuthUser, providers: AuthIdentity[] = []) => {
    workspaceOwnerRef.current = null
    workspaceVersionRef.current = 0
    setIdentities(providers)
    setProjects([])
    setLibrary([])
    setAgentRecords(defaultAgents)
    setConversations([])
    setPreferences(defaultPreferences)
    setSettingsControls(defaultSettingsControls)
    setMessages([])
    setActiveConversationId(null)
    setActiveAgent(null)
    setActiveProject(null)
    setSessionUser(user)
    setSessionResolved(true)
    setWorkspaceLoaded(false)
    setWorkspaceError('')
    setProfile({ name: user.name, email: user.email, avatar: user.avatar })
    // Password sign-in does not know which providers are linked; ask the server.
    if (!providers.length) void readSession().then(result => setIdentities(result.identities || [])).catch(() => undefined)
  }
  const signOut = (destination: PublicRoute = 'landing') => {
    // Release the remembered Google account before the session goes away, so the
    // next sign-in on this device asks which account to use.
    forgetGoogleAccountChoice()
    workspaceOwnerRef.current = null
    workspaceVersionRef.current = 0
    void fetch('/api/auth/signout', { method: 'POST' }).finally(() => {
      setSessionUser(null)
      setIdentities([])
      setProjects([])
      setLibrary([])
      setAgentRecords(defaultAgents)
      setConversations([])
      setPreferences(defaultPreferences)
      setSettingsControls(defaultSettingsControls)
      setMessages([])
      setActiveConversationId(null)
      setActiveAgent(null)
      setActiveProject(null)
      setProfile(defaultUserProfile)
      setWorkspaceLoaded(true)
      try { sessionStorage.removeItem('mere-x-password-reset') } catch { /* Private browsing can block session storage. */ }
      navigatePublic(destination)
    })
  }
  const openSettings = (tab: SettingsTab = 'general') => { setSearchOpen(false); setShareOpen(false); setInfoOpen(false); setSettingsTab(tab); setSettingsOpen(true) }
  const navigatePublic = (target: PublicRoute) => {
    setSearchOpen(false); setShareOpen(false); setInfoOpen(false); setSettingsOpen(false); setMobileOpen(false)
    setPublicRoute(target)
    window.location.hash = target === 'landing' ? '/' : `/${target}`
  }
  const navigate = (target: Page) => {
    setSearchOpen(false); setShareOpen(false); setInfoOpen(false); setSettingsOpen(false); setMobileOpen(false)
    setPublicRoute('app')
    setPage(target)
    window.location.hash = target === 'chat' ? '/app' : `/${target}`
  }
  const newChat = () => { setMessages([]); setActiveConversationId(null); setActiveAgent(null); setActiveProject(null); navigate('chat'); setInfoOpen(false) }
  const openChat = (conversation: ConversationRecord) => {
    setActiveAgent(null)
    setActiveProject(null)
    setActiveConversationId(conversation.id)
    navigate('chat')
    setMessages(conversation.messages)
  }
  const openProject = (project: ProjectRecord) => {
    setActiveConversationId(null)
    setActiveProject(project)
    setActiveAgent(null)
    setProjects(current => current.map(record => record.id === project.id ? { ...record, chatCount: record.chatCount + 1, updated: 'Active now' } : record))
    setMessages([{ id: Date.now(), role: 'assistant', content: `**${project.name} is active.**\n\nI will use this project's instructions and context for the conversation. What would you like to work on?` }])
    navigate('chat')
  }
  const openAgent = (agent: AgentRecord) => {
    setActiveConversationId(null)
    setActiveAgent(agent)
    setActiveProject(null)
    setMessages([{ id: Date.now(), role: 'assistant', content: `**${agent.name} is ready.**\n\n${agent.desc} What should we work on?` }])
    navigate('chat')
  }
  const addArtifact = (artifact: LibraryRecord) => {
    setLibrary(current => [artifact, ...current.filter(item => item.id !== artifact.id)])
  }
  const continueArtifact = (artifact: LibraryRecord) => {
    setActiveAgent(null); setActiveProject(null); setActiveConversationId(null)
    setMessages([{ id: Date.now(), role: 'assistant', content: `**${artifact.title} loaded from Library.**\n\n${artifact.content || 'The saved visual is ready for a new direction.'}`, images: artifact.preview ? [artifact.preview] : undefined }])
    navigate('chat'); notify('Library item loaded into chat')
  }
  const searchRecords = useMemo<SearchRecord[]>(() => [
    ...conversations.map(record => ({ id: record.id, title: record.title, kind: 'Conversation' as const })),
    ...projects.map(record => ({ id: record.id, title: record.name, kind: 'Project' as const })),
    ...library.map(record => ({ id: record.id, title: record.title, kind: 'Library' as const })),
    ...agentRecords.map(record => ({ id: record.id, title: record.name, kind: 'Agent' as const })),
  ], [conversations, projects, library, agentRecords])
  const selectSearchResult = (result: SearchRecord) => {
    setSearchOpen(false)
    if (result.kind === 'Conversation') {
      const conversation = conversations.find(record => record.id === result.id)
      if (conversation) openChat(conversation)
      return
    }
    if (result.kind === 'Project') {
      const project = projects.find(record => record.id === result.id)
      if (project) openProject(project)
      return
    }
    if (result.kind === 'Agent') {
      const agent = agentRecords.find(record => record.id === result.id)
      if (agent) openAgent(agent)
      return
    }
    navigate('library')
  }
  const activeConversation = conversations.find(record => record.id === activeConversationId)
  const conversationTitle = activeConversation?.title || messages.find(message => message.role === 'user')?.content.slice(0, 52) || activeAgent?.name || activeProject?.name || 'New conversation'
  const deleteCurrentConversation = () => {
    if (activeConversationId) setConversations(current => current.filter(record => record.id !== activeConversationId))
    newChat(); notify('Conversation deleted')
  }
  const archiveCurrentConversation = () => {
    if (activeConversationId) setConversations(current => current.map(record => record.id === activeConversationId ? { ...record, archived: true } : record))
    setInfoOpen(false); notify('Conversation archived')
  }
  const toggleFavoriteConversation = () => {
    if (activeConversationId) setConversations(current => current.map(record => record.id === activeConversationId ? { ...record, favorite: !record.favorite } : record))
    notify(activeConversation?.favorite ? 'Removed from favorites' : 'Added to favorites')
  }
  const deleteAllChats = () => {
    setMessages([]); setActiveConversationId(null); setConversations([]); notify('All conversations deleted')
  }
  if (publicRoute === 'app' && !sessionResolved) return <div className="workspace-gate"><BrandMark /><span className="workspace-gate-pulse" /><h1>Securing your session</h1><p>Connecting to your private Mere X workspace…</p></div>
  if (publicRoute === 'app' && !sessionUser) return <AuthPage mode="signin" navigate={navigatePublic} onAuthenticated={authenticated} />
  if (publicRoute === 'app' && !workspaceLoaded) return <div className="workspace-gate"><BrandMark /><span className="workspace-gate-pulse" /><h1>{workspaceError ? 'Workspace unavailable' : 'Loading your workspace'}</h1><p>{workspaceError || 'Reading this account’s private data from Mere X storage…'}</p>{workspaceError && <button className="primary-button" onClick={() => window.location.reload()}>Try again<RotateCcw size={15} /></button>}</div>
  if (publicRoute === 'landing') return <LandingPage navigate={navigatePublic} />
  if (publicRoute === 'signin' || publicRoute === 'signup') return <AuthPage mode={publicRoute} navigate={navigatePublic} onAuthenticated={authenticated} />
  if (publicRoute === 'reset-password') return <ResetPasswordPage navigate={navigatePublic} />
  if (publicRoute === 'shared') return <SharedConversationPage shareId={window.location.hash.replace('#/shared/', '')} navigate={navigatePublic} />
  if (publicRoute === 'apex') return <ApexDocsPage navigate={navigatePublic} />
  if (publicRoute === 'pricing') return <PricingPage navigate={navigatePublic} user={sessionUser} onUserUpdated={user => { setSessionUser(user); setProfile({ name: user.name, email: user.email, avatar: user.avatar }) }} />
  if (publicRoute === 'privacy' || publicRoute === 'terms' || publicRoute === 'acceptable-use' || publicRoute === 'cookies') return <LegalPage route={publicRoute} navigate={navigatePublic} />
  if (publicRoute === 'security') return <SecurityPage navigate={navigatePublic} />
  if (publicRoute === 'help') return <HelpPage navigate={navigatePublic} />
  if (publicRoute === 'status') return <StatusPage navigate={navigatePublic} />
  if (publicRoute === 'release-notes') return <ReleaseNotesPage navigate={navigatePublic} />
  if (publicRoute === 'download') return <DownloadPage navigate={navigatePublic} />
  return <div className="app">
    <Sidebar page={page} setPage={navigate} collapsed={collapsed} setCollapsed={setCollapsed} onSearch={() => setSearchOpen(true)} onNewChat={newChat} onOpenChat={openChat} onOpenSettings={openSettings} onOpenPublic={navigatePublic} onSignOut={() => signOut()} onSwitchAccount={() => signOut('signin')} conversations={conversations} activeConversationId={activeConversationId} profile={profile} plan={sessionUser?.plan || 'free'} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
    <div className="main-area">
      <Topbar page={page} setMobileOpen={setMobileOpen} onShare={() => setShareOpen(true)} onInfo={() => setInfoOpen(!infoOpen)} onNotify={notify} />
      <div className="page-area">
        {page === 'chat' && <ChatPage messages={messages} setMessages={setMessages} onToast={notify} onLiveVoice={() => setLiveVoiceOpen(true)} agent={activeAgent} project={activeProject} preferences={preferences} voiceEnabled={settingsControls.voiceInput ?? true} onArtifact={addArtifact} />}
        {page === 'projects' && <ProjectsPage projects={projects} setProjects={setProjects} onToast={notify} onOpen={openProject} />}
        {page === 'library' && <LibraryPage items={library} setItems={setLibrary} onToast={notify} onContinue={continueArtifact} />}
        {page === 'agents' && <AgentsPage records={agentRecords} setRecords={setAgentRecords} onToast={notify} onOpen={openAgent} />}
        {page === 'workflows' && <WorkflowsPage authenticated={Boolean(sessionUser)} plan={sessionUser?.plan || 'guest'} onSignIn={() => navigatePublic('signin')} onUpgrade={() => navigatePublic('pricing')} onToast={notify} />}
        {page === 'settings' && <SettingsPage onToast={notify} compact={collapsed} setCompact={setCollapsed} preferences={preferences} setPreferences={setPreferences} controls={settingsControls} setControls={setSettingsControls} profile={profile} user={sessionUser} identities={identities} onUserUpdated={setSessionUser} setProfile={setProfile} onDeleteChats={deleteAllChats} onSignOut={() => signOut()} onOpenPricing={() => navigatePublic('pricing')} onOpenHelp={() => navigatePublic('help')} />}
      </div>
    </div>
    {infoOpen && <InfoPanel title={conversationTitle} favorite={Boolean(activeConversation?.favorite)} onClose={() => setInfoOpen(false)} onFavorite={toggleFavoriteConversation} onMove={() => { setInfoOpen(false); navigate('projects') }} onArchive={archiveCurrentConversation} onDelete={deleteCurrentConversation} />}
    {settingsOpen && <SettingsPage modal initialTab={settingsTab} onClose={() => setSettingsOpen(false)} onToast={notify} compact={collapsed} setCompact={setCollapsed} preferences={preferences} setPreferences={setPreferences} controls={settingsControls} setControls={setSettingsControls} profile={profile} user={sessionUser} identities={identities} onUserUpdated={setSessionUser} setProfile={setProfile} onDeleteChats={deleteAllChats} onSignOut={() => signOut()} onOpenPricing={() => navigatePublic('pricing')} onOpenHelp={() => navigatePublic('help')} />}
    {searchOpen && <SearchModal items={searchRecords} onClose={() => setSearchOpen(false)} onSelect={selectSearchResult} />}
    {shareOpen && <ShareModal messages={messages} onClose={() => setShareOpen(false)} onToast={notify} />}
    {liveVoiceOpen && <LiveVoiceOverlay authenticated={Boolean(sessionUser)} onClose={() => setLiveVoiceOpen(false)} onSignIn={() => navigatePublic('signin')} />}
    {toast && <Toast text={toast} onDone={() => setToast('')} />}
  </div>
}
