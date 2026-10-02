// Founder HQ dashboard — all content lives here as typed consts.
// ponytail: static content file (same pattern as changelog + the old dashboard).
// Edit these values to update the page; wire to Supabase + an admin editor later
// if live updating is wanted. Numbers seeded from Shubham's reference — correct freely.

export const profile = {
  name: "Shubham Datarkar",
  roles: ["Founder", "Builder", "Marketer", "Designer"],
  bio: "Building small-business software, digital products and experiments from India.",
  location: "Bhopal, India",
  avatarUrl: "", // optional: /images/... — falls back to a monogram when empty
  socials: [
    { label: "X / Twitter", href: "https://x.com/shubhamdatarkar", icon: "twitter" },
    { label: "LinkedIn", href: "https://linkedin.com/in/shubhamdatarkar", icon: "linkedin" },
    { label: "GitHub", href: "https://github.com/", icon: "github" },
    { label: "YouTube", href: "https://youtube.com/", icon: "youtube" },
    { label: "Website", href: "https://shubhamdatarkar.com", icon: "link" },
  ],
} as const;

// Top stat strip
export const headlineStats = [
  { value: "3", label: "Companies built", icon: "building" },
  { value: "12", label: "Products shipped", icon: "package" },
  { value: "40+", label: "Websites launched", icon: "monitor" },
  { value: "147", label: "Things shipped", icon: "rocket" },
  { value: "10", label: "Years building", icon: "calendar" },
] as const;

// Currently
export const currently = [
  { label: "Building", value: "Book A Sloth", icon: "hammer" },
  { label: "Reading", value: "Atomic Habits", icon: "book" },
  { label: "Learning", value: "AI & Distribution", icon: "graduation" },
  { label: "Listening to", value: "Indie / Lo-Fi", icon: "music" },
  { label: "Watching", value: "The Bear", icon: "tv" },
  { label: "Thinking about", value: "Small business software", icon: "brain" },
  { label: "Exploring", value: "New product ideas", icon: "compass" },
] as const;

export const currentlyNote = "Turn repeated work into reusable software.";

// Life at a glance
export const lifeStats = [
  { value: "31", label: "Age", icon: "cake" },
  { value: "India", label: "Based in", icon: "pin" },
  { value: "24", label: "Projects this year", icon: "zap" },
  { value: "18", label: "Books read", icon: "book" },
  { value: "182", label: "Days exercised", icon: "dumbbell" },
  { value: "412", label: "Cups of coffee", icon: "coffee" },
  { value: "5", label: "Countries visited", icon: "globe" },
  { value: "18,420", label: "Km travelled", icon: "plane" },
  { value: "236", label: "Ideas captured", icon: "lightbulb" },
] as const;

// What I'm building
export const building = [
  {
    name: "Book A Sloth",
    status: "LIVE",
    blurb: "Appointment infrastructure for small businesses.",
    stats: [
      { value: "2.3K", label: "Businesses" },
      { value: "28K", label: "Bookings" },
    ],
    spark: [30, 42, 48, 55, 63, 71, 80, 100],
    href: "https://bookasloth.com",
  },
  {
    name: "Marketing Bug",
    status: "BUILDING",
    blurb: "Marketing knowledge + newsletter.",
    stats: [{ value: "1.8K", label: "Subscribers" }],
    spark: [20, 28, 35, 44, 52, 66, 78, 92],
    href: "/community",
  },
  {
    name: "SERP Sutra",
    status: "EXPERIMENT",
    blurb: "SEO & AI visibility tools.",
    stats: [{ value: "6", label: "Tools" }],
    spark: [12, 18, 24, 33, 41, 50, 62, 75],
    href: "/tools",
  },
] as const;

// Business snapshot
export const business = {
  stats: [
    { value: "3", label: "Businesses" },
    { value: "12", label: "Products" },
    { value: "14.2K", label: "Customers" },
    { value: "68K", label: "Bookings" },
    { value: "6", label: "Team members" },
  ],
  growthLabel: "Revenue Growth (Index)",
  growthDelta: "+132%",
  growthRange: "2024 → 2026",
  // monthly index points, Jan 2024 → now
  growth: [
    40, 42, 44, 43, 47, 50, 52, 55, 54, 58, 61, 64, 63, 67, 70, 74, 72, 78,
    82, 86, 90, 95, 101, 108, 112, 118, 126, 132,
  ],
} as const;

// Where my time goes (donut) — values are percentages, should sum to 100
export const timeSplit = [
  { label: "Building", value: 38, color: "#ff4800" },
  { label: "Marketing", value: 21, color: "#2563eb" },
  { label: "Learning", value: 14, color: "#2f9e44" },
  { label: "Meetings", value: 9, color: "#e8590c" },
  { label: "Family", value: 10, color: "#845ef7" },
  { label: "Everything else", value: 8, color: "#868e96" },
] as const;

// Yearly goals & progress
export const yearProgress = {
  year: 2026,
  percent: 82,
  groups: [
    {
      title: "Business",
      items: [
        { text: "Launch Book A Sloth", done: true },
        { text: "Grow digital products", done: true },
        { text: "Reach 50K users", done: false },
      ],
    },
    {
      title: "Building",
      items: [
        { text: "Ship 20 products", done: true },
        { text: "Improve SEO systems", done: true },
        { text: "Automate more work", done: false },
      ],
    },
    {
      title: "Personal",
      items: [
        { text: "Read 12 books", done: true },
        { text: "Travel to 3 new places", done: false },
        { text: "Hit fitness goal", done: false },
      ],
    },
    {
      title: "Learning",
      items: [
        { text: "Master AI workflows", done: true },
        { text: "Complete a new course", done: false },
        { text: "Write and publish more", done: false },
      ],
    },
  ],
} as const;

// Things shipped
export const shipped = {
  total: "147",
  breakdown: [
    { label: "Websites", value: "40+", bar: 100, color: "#ff4800" },
    { label: "Features", value: "60+", bar: 95, color: "#2563eb" },
    { label: "Products", value: "12", bar: 32, color: "#2f9e44" },
    { label: "Campaigns", value: "18", bar: 46, color: "#e64980" },
    { label: "Experiments", value: "17", bar: 44, color: "#845ef7" },
  ],
} as const;

// Recent experiments
export const experiments = [
  { name: "Local SEO content loop", status: "Running", started: "Sep 2026", result: "+32% traffic" },
  { name: "Web template generator", status: "Testing", started: "Aug 2026", result: "+18% signups" },
  { name: "Newsletter growth", status: "Running", started: "Aug 2026", result: "+420 subs" },
  { name: "New product idea", status: "Killed", started: "Jul 2026", result: "Learned a lot" },
] as const;

// Personal journey timeline
export const journey = [
  { year: "2016", text: "Started first company (IIT Madras)", color: "#ff4800" },
  { year: "2019", text: "Company acquired", color: "#2563eb" },
  { year: "2022", text: "Moved back to Bhopal", color: "#2f9e44" },
  { year: "2024", text: "Started new build mode", color: "#e64980" },
  { year: "2026", text: "Founded Timewheel Internet Pvt. Ltd.", color: "#845ef7" },
] as const;

// Current focus / next 90 days
export const focus = [
  "Build Book A Sloth",
  "Grow digital products",
  "Improve SEO systems",
  "Ship more experiments",
] as const;
