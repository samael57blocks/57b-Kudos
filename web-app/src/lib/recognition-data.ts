export type BadgeCategory =
  | "Innovation"
  | "Leadership"
  | "Teamwork"
  | "Excellence"
  | "Mentorship"
  | "Impact"
  | "Creativity"
  | "Reliability";

export interface Recognition {
  id: string;
  badgeCategory: BadgeCategory;
  title: string;
  description: string;
  recipientName: string;
  recipientRole: string;
  recipientDepartment: string;
  givenBy: string;
  givenByRole: string;
  message: string;
  date: string;
}

export const BADGE_CONFIG: Record<
  BadgeCategory,
  { color: string; lightColor: string; icon: string; description: string }
> = {
  Innovation: {
    color: "#3B82F6",
    lightColor: "#EFF6FF",
    icon: "✦",
    description: "Innovation Pioneer",
  },
  Leadership: {
    color: "#8B5CF6",
    lightColor: "#F5F3FF",
    icon: "◆",
    description: "Awarded for inspiring and guiding others",
  },
  Teamwork: {
    color: "#10B981",
    lightColor: "#ECFDF5",
    icon: "⬡",
    description: "Awarded for exceptional collaboration",
  },
  Excellence: {
    color: "#F59E0B",
    lightColor: "#FFFBEB",
    icon: "★",
    description: "Awarded for outstanding quality of work",
  },
  Mentorship: {
    color: "#EF4444",
    lightColor: "#FEF2F2",
    icon: "♥",
    description: "Awarded for nurturing talent and growth",
  },
  Impact: {
    color: "#06B6D4",
    lightColor: "#ECFEFF",
    icon: "◉",
    description: "Awarded for creating meaningful results",
  },
  Creativity: {
    color: "#EC4899",
    lightColor: "#FDF2F8",
    icon: "✿",
    description: "Awarded for imaginative problem-solving",
  },
  Reliability: {
    color: "#6B7280",
    lightColor: "#F9FAFB",
    icon: "⬟",
    description: "Awarded for consistent dependability",
  },
};

export const SAMPLE_RECOGNITIONS: Recognition[] = [
  {
    id: "1",
    badgeCategory: "Innovation",
    title: "Innovation Pioneer",
    description: "Launched an AI-powered onboarding tool that cut ramp time by 40%.",
    recipientName: "Sophia Chen",
    recipientRole: "Senior Product Manager",
    recipientDepartment: "Product",
    givenBy: "Marcus Lee",
    givenByRole: "VP of Product",
    message:
      "Sophia challenged every assumption in our onboarding process and emerged with a solution none of us had imagined. Her willingness to experiment and iterate rapidly is exactly the culture we want to cultivate.",
    date: "2025-06-10",
  },
  {
    id: "2",
    badgeCategory: "Leadership",
    title: "Compass Award",
    description: "Guided the engineering team through a critical infrastructure migration.",
    recipientName: "James Okafor",
    recipientRole: "Engineering Lead",
    recipientDepartment: "Engineering",
    givenBy: "Elena Vasquez",
    givenByRole: "CTO",
    message:
      "James kept the entire team aligned, calm, and motivated through six weeks of a complex zero-downtime migration. His clear communication and steady presence were the backbone of our success.",
    date: "2025-05-22",
  },
  {
    id: "3",
    badgeCategory: "Teamwork",
    title: "Bridge Builder",
    description: "Created cross-functional rituals that unified three disconnected teams.",
    recipientName: "Aisha Patel",
    recipientRole: "Scrum Master",
    recipientDepartment: "Operations",
    givenBy: "Tom Reynolds",
    givenByRole: "Director of Operations",
    message:
      "Aisha saw the friction between design, engineering, and data early on and built bridges before it became a crisis. The weekly syncs she created have become indispensable.",
    date: "2025-05-05",
  },
  {
    id: "4",
    badgeCategory: "Excellence",
    title: "Gold Standard",
    description: "Delivered a flawless enterprise demo that closed a $2M deal.",
    recipientName: "Carlos Mendoza",
    recipientRole: "Solutions Engineer",
    recipientDepartment: "Sales",
    givenBy: "Rachel Kim",
    givenByRole: "Head of Sales",
    message:
      "Carlos spent three weeks perfecting every edge case scenario the client could throw at us. The demo was not just technically impressive — it was a masterpiece of storytelling.",
    date: "2025-04-18",
  },
  {
    id: "5",
    badgeCategory: "Mentorship",
    title: "Guiding Light",
    description: "Mentored four junior developers who each earned promotions this cycle.",
    recipientName: "Priya Nair",
    recipientRole: "Staff Software Engineer",
    recipientDepartment: "Engineering",
    givenBy: "Elena Vasquez",
    givenByRole: "CTO",
    message:
      "Priya's patience and generosity with her time have directly accelerated the growth of four incredible engineers. She leads by example and lifts everyone around her.",
    date: "2025-04-02",
  },
  {
    id: "6",
    badgeCategory: "Impact",
    title: "North Star",
    description: "Reduced customer churn by 18% through a proactive health-score system.",
    recipientName: "David Osei",
    recipientRole: "Customer Success Manager",
    recipientDepartment: "Customer Success",
    givenBy: "Sandra Bloom",
    givenByRole: "VP of Customer Success",
    message:
      "David built something that didn't exist before: a living signal for customer health that the entire CS team now relies on. The business impact has been substantial and lasting.",
    date: "2025-03-14",
  },
  {
    id: "7",
    badgeCategory: "Creativity",
    title: "Creative Spark",
    description: "Redesigned the brand identity system in under two weeks.",
    recipientName: "Lena Fischer",
    recipientRole: "Senior Designer",
    recipientDepartment: "Design",
    givenBy: "Oliver Grant",
    givenByRole: "Head of Design",
    message:
      "Lena turned a tight deadline into an advantage. The new brand system she created is cohesive, bold, and effortlessly scalable. It represents us better than anything we've had before.",
    date: "2025-02-28",
  },
  {
    id: "8",
    badgeCategory: "Reliability",
    title: "Steady Hand",
    description: "Maintained 99.98% uptime across all production services for a full quarter.",
    recipientName: "Mohammed Al-Rashid",
    recipientRole: "Site Reliability Engineer",
    recipientDepartment: "Infrastructure",
    givenBy: "Elena Vasquez",
    givenByRole: "CTO",
    message:
      "Mo is the quiet force that keeps everything running. His meticulous attention to monitoring, alerting, and runbooks means our customers sleep well — and so do we.",
    date: "2025-02-10",
  },
];