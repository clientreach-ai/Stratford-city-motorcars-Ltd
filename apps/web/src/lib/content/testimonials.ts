export interface Testimonial {
  id: string;
  name: string;
  initials: string;
  content: string;
  rating: number;
  /** What the customer dealt with us for — used as a small label. */
  type: "Purchase" | "Finance" | "Part-Exchange";
  verified: boolean;
}

/**
 * Transcribed verbatim from the dealership's own `/api/testimonials` endpoint
 * on 10 September 2026. Nothing here is written or embellished by us.
 *
 * Worth raising with the client: these are held in their own database rather
 * than sourced from a review platform. Connecting Google Business Profile or
 * Trustpilot would let the site show independently verifiable ratings, which
 * carries far more weight with buyers than self-hosted quotes.
 */
export const testimonials: Testimonial[] = [
  {
    id: "testimonial-002",
    name: "Michael Thompson",
    initials: "MT",
    content:
      "Found the perfect Mercedes at a price that surprised me. The team were straightforward, no pressure at all. The car was prepared immaculately and the handover was seamless. Genuinely one of the best car buying experiences I have had.",
    rating: 5,
    type: "Purchase",
    verified: true,
  },
  {
    id: "testimonial-006",
    name: "James Mitchell",
    initials: "JM",
    content:
      "Bought a stunning Rolls-Royce and the whole process was first class. Excellent knowledge of the cars, fair and transparent pricing, and real attention to detail on presentation. Will be back when it is time for my next one.",
    rating: 5,
    type: "Purchase",
    verified: true,
  },
  {
    id: "testimonial-003",
    name: "Rachel Phillips",
    initials: "RP",
    content:
      "Fantastic finance options made my dream car affordable. The team was transparent about all costs and made the whole process stress-free. No hidden fees and excellent customer service throughout.",
    rating: 5,
    type: "Finance",
    verified: true,
  },
  {
    id: "testimonial-004",
    name: "David Chen",
    initials: "DC",
    content:
      "Excellent part-exchange valuation and quick turnaround. They gave me a fair price for my old car and helped me find the perfect replacement. Professional and trustworthy service.",
    rating: 5,
    type: "Part-Exchange",
    verified: true,
  },
  {
    id: "testimonial-001",
    name: "Sarah Johnson",
    initials: "SJ",
    content:
      "Smooth purchase process, honest pricing, and excellent service. The team at Stratford City Motorcars made buying my BMW 3 Series completely stress-free. Highly recommend for anyone looking for quality used cars.",
    rating: 5,
    type: "Purchase",
    verified: true,
  },
  {
    id: "testimonial-005",
    name: "Emma Wilson",
    initials: "EW",
    content:
      "Outstanding customer service from start to finish. The showroom is impressive and the staff are knowledgeable without being pushy. Found exactly what I was looking for at a great price.",
    rating: 5,
    type: "Purchase",
    verified: true,
  },
];
