import { site } from "../site";

/**
 * Privacy, terms and cookie content, transcribed from the dealership's existing
 * published policies on 10 September 2026. Wording is theirs.
 *
 * Two notes for the client before this goes live:
 *  - Their published policies carry no company registration number, registered
 *    office or ICO registration number. UK trading law generally requires the
 *    first two on a company website; add them to `site.compliance`.
 *  - The policies were last dated September 2024 and should be re-reviewed.
 */

export type Block =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "definitions"; items: { term: string; detail: string }[] }
  | { type: "subheading"; text: string };

export interface LegalSection {
  heading: string;
  blocks: Block[];
}

export interface LegalDocument {
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
}

const contactBlocks: Block[] = [
  {
    type: "definitions",
    items: [
      { term: "Data controller", detail: site.name },
      { term: "Address", detail: site.address.full },
      { term: "Email", detail: site.email },
      { term: "Phone", detail: site.phone.display },
      { term: "Hours", detail: "Mon–Sat 9am–6pm, Sun 10am–4pm" },
    ],
  },
];

export const privacyPolicy: LegalDocument = {
  title: "Privacy Policy",
  intro: "How we collect, use and protect your personal information.",
  updated: "September 2024",
  sections: [
    {
      heading: "Who we are",
      blocks: [
        {
          type: "p",
          text: `${site.name} is an independent car dealership based in Stratford, London. We are committed to protecting your privacy and handling your personal data in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.`,
        },
        ...contactBlocks,
      ],
    },
    {
      heading: "Information we collect",
      blocks: [
        { type: "subheading", text: "Information you provide" },
        {
          type: "list",
          items: [
            "Name, email address and phone number when you contact us",
            "Vehicle preferences and requirements",
            "Financial information for finance applications",
            "Vehicle details for part-exchange valuations",
            "Documentation for identity verification and compliance",
          ],
        },
        { type: "subheading", text: "Information we collect automatically" },
        {
          type: "list",
          items: [
            "Website usage data through cookies and analytics",
            "IP address and browser information",
            "Pages visited and time spent on our website",
            "Referral sources and search terms used",
          ],
        },
      ],
    },
    {
      heading: "How we use your information",
      blocks: [
        { type: "subheading", text: "Primary purposes" },
        {
          type: "list",
          items: [
            "Respond to your enquiries and provide requested services",
            "Process vehicle sales, hire bookings and finance applications",
            "Conduct part-exchange valuations and negotiations",
            "Arrange vehicle viewings and test drives",
            "Complete legal and regulatory requirements for vehicle sales",
          ],
        },
        { type: "subheading", text: "Secondary purposes, with your consent" },
        {
          type: "list",
          items: [
            "Send information about new arrivals and special offers",
            "Provide updates on services and business developments",
            "Improve our website and services based on usage patterns",
            "Conduct customer satisfaction surveys",
          ],
        },
      ],
    },
    {
      heading: "Legal basis for processing",
      blocks: [
        {
          type: "definitions",
          items: [
            {
              term: "Contract",
              detail: "To fulfil our obligations when you purchase or hire a vehicle",
            },
            {
              term: "Legitimate interest",
              detail: "To respond to enquiries and improve our services",
            },
            {
              term: "Legal obligation",
              detail:
                "To comply with automotive industry regulations and tax requirements",
            },
            {
              term: "Consent",
              detail: "For marketing communications and website analytics",
            },
          ],
        },
      ],
    },
    {
      heading: "Sharing your information",
      blocks: [
        {
          type: "p",
          text: "We may share your information with trusted third parties in the following circumstances:",
        },
        {
          type: "definitions",
          items: [
            {
              term: "Finance partners",
              detail: "FCA-regulated lenders for finance applications",
            },
            {
              term: "Insurance providers",
              detail: "For vehicle insurance quotes and policies",
            },
            {
              term: "DVLA and regulatory bodies",
              detail: "For vehicle registration and compliance",
            },
            {
              term: "Service providers",
              detail: "Website hosting, payment processing and communication tools",
            },
            {
              term: "Legal requirements",
              detail: "When required by law or court order",
            },
          ],
        },
        {
          type: "p",
          text: "We never sell your personal data to third parties for marketing purposes.",
        },
      ],
    },
    {
      heading: "Data security",
      blocks: [
        {
          type: "list",
          items: [
            "Encrypted data transmission using SSL/TLS protocols",
            "Secure data storage with access controls and authentication",
            "Regular security assessments and updates",
            "Staff training on data protection and privacy",
            "Incident response procedures for data breaches",
          ],
        },
      ],
    },
    {
      heading: "How long we keep it",
      blocks: [
        {
          type: "definitions",
          items: [
            { term: "Sales records", detail: "7 years for tax and legal compliance" },
            { term: "Finance applications", detail: "6 years from application date" },
            {
              term: "Marketing consent",
              detail: "Until withdrawn, or 3 years of inactivity",
            },
            { term: "Website analytics", detail: "26 months from collection" },
            { term: "General enquiries", detail: "2 years from last contact" },
          ],
        },
      ],
    },
    {
      heading: "Your rights",
      blocks: [
        { type: "p", text: "Under UK GDPR you have the following rights:" },
        {
          type: "definitions",
          items: [
            { term: "Access", detail: "Request a copy of your personal data" },
            { term: "Rectification", detail: "Correct inaccurate information" },
            { term: "Erasure", detail: "Request deletion of your data" },
            { term: "Portability", detail: "Transfer data in a structured format" },
            { term: "Restriction", detail: "Limit how we process your data" },
            { term: "Objection", detail: "Object to processing for marketing" },
          ],
        },
        {
          type: "p",
          text: `To exercise any of these rights, contact us at ${site.email} or ${site.phone.display}. We will respond within one month.`,
        },
      ],
    },
    {
      heading: "Cookies and analytics",
      blocks: [
        {
          type: "p",
          text: "Our website uses cookies to improve your experience and help us understand how the site is used. Full detail is set out in our Cookie Policy.",
        },
      ],
    },
    {
      heading: "Updates to this policy",
      blocks: [
        {
          type: "p",
          text: "We may update this privacy policy from time to time to reflect changes in our practices or applicable laws. When we make significant changes we will notify existing customers by email where required, and display a notice on our website highlighting the changes.",
        },
      ],
    },
    { heading: "Contact us", blocks: contactBlocks },
  ],
};

export const termsDocument: LegalDocument = {
  title: "Terms & Conditions",
  intro: "Terms and conditions for vehicle sales, hire, finance and part exchange.",
  updated: "September 2024",
  sections: [
    {
      heading: "General",
      blocks: [
        {
          type: "p",
          text: "By engaging our services for vehicle sales, hire, finance or part exchange, you agree to be bound by these Terms. If you do not agree with any part of these terms, please do not use our services.",
        },
        {
          type: "p",
          text: "We reserve the right to modify these Terms at any time. Changes are effective immediately on posting to our website. Continued use of our services constitutes acceptance of the modified Terms.",
        },
      ],
    },
    {
      heading: "Vehicle sales",
      blocks: [
        { type: "subheading", text: "Condition and description" },
        {
          type: "list",
          items: [
            "All vehicles are sold as described and are subject to a comprehensive inspection",
            "Mileage, age and condition are stated in good faith based on available information",
            "All vehicles come with HPI clear certification where applicable",
            "Any known faults or issues will be disclosed prior to sale",
          ],
        },
        { type: "subheading", text: "Pricing and payment" },
        {
          type: "list",
          items: [
            "All prices include VAT where applicable",
            "Prices are subject to change without notice until a deposit is paid",
            `A deposit of ${site.reservationDeposit} is required to reserve a vehicle`,
            "Full payment is required before collection",
            "We accept cash, bank transfer, and debit and credit cards",
          ],
        },
        { type: "subheading", text: "Warranty" },
        {
          type: "list",
          items: [
            "AA warranty options are available up to 12 months",
            "Warranty terms and coverage vary by vehicle age and value",
            "Claims must be made directly with the warranty provider",
            "Warranty does not cover wear and tear items or damage after sale",
          ],
        },
      ],
    },
    {
      heading: "Vehicle hire",
      blocks: [
        { type: "subheading", text: "Requirements" },
        {
          type: "list",
          items: [
            "Minimum age 21 years, or 25 and over for premium vehicles",
            "Valid UK or EU driving licence required, held for a minimum of 2 years",
            "Security deposit required at the time of collection",
            "Additional drivers must be declared and meet the age requirements",
          ],
        },
        { type: "subheading", text: "Rates and charges" },
        {
          type: "list",
          items: [
            "Daily rates include comprehensive insurance and breakdown cover",
            "Mileage allowance as specified in the rental agreement",
            "Excess mileage charged at £0.15 per mile",
            "Fuel policy is full to full — return with the same fuel level",
            "Late return charges apply after the grace period",
          ],
        },
        { type: "subheading", text: "Use and restrictions" },
        {
          type: "list",
          items: [
            "Use within UK mainland only unless specifically agreed",
            "No smoking in any hire vehicle",
            "No pets unless a pet-friendly vehicle has been approved",
            "Commercial use prohibited unless under a commercial rental agreement",
            "Racing, rallying and off-road use are strictly prohibited",
          ],
        },
      ],
    },
    {
      heading: "Finance",
      blocks: [
        {
          type: "list",
          items: [
            "We act as a credit broker, not a direct lender",
            "All finance is subject to status and approval by FCA-regulated lenders",
            "Applications require proof of income and identity verification",
            "Credit checks will be performed as part of the application process",
            "Interest rates and terms are determined by the finance provider",
            "Early settlement options are available, subject to charges",
            "Insurance requirements apply throughout the finance term",
            "Vehicle ownership remains with the lender until the final payment",
          ],
        },
      ],
    },
    {
      heading: "Part exchange",
      blocks: [
        {
          type: "p",
          text: "Part-exchange valuations are estimates based on the information provided and are subject to physical inspection.",
        },
        {
          type: "list",
          items: [
            "Final valuation is confirmed only after physical inspection",
            "The vehicle must have a valid MOT and be roadworthy",
            "Outstanding finance must be disclosed and settled",
            "Part-exchange value is applied as a deposit toward the new vehicle purchase",
            "We reserve the right to refuse a part-exchange vehicle",
          ],
        },
      ],
    },
    {
      heading: "Liability and insurance",
      blocks: [
        {
          type: "list",
          items: [
            "Liability is limited to the value of the goods or services provided",
            "We accept no liability for consequential or indirect losses",
            "Professional indemnity insurance is in place for business operations",
            "Your consumer rights under UK law remain unaffected",
            "Customers are responsible for their own insurance arrangements",
            "Hire vehicles include comprehensive insurance with an excess",
            "Any damage must be reported immediately",
            "Customers are liable for damage beyond normal wear and tear",
          ],
        },
      ],
    },
    {
      heading: "Cancellation and returns",
      blocks: [
        { type: "subheading", text: "Vehicle sales" },
        {
          type: "list",
          items: [
            "Deposits are non-refundable except in exceptional circumstances",
            "Consumer rights apply under the Consumer Rights Act 2015",
            "Returns are accepted if the vehicle is significantly different from its description",
            "30-day return period for fault rectification under warranty",
          ],
        },
        { type: "subheading", text: "Vehicle hire" },
        {
          type: "list",
          items: [
            "Free cancellation up to 24 hours before the rental start",
            "50% charge for cancellations within 24 hours",
            "No refund for early returns unless the vehicle is at fault",
            "An alternative vehicle is provided if the original is unavailable",
          ],
        },
      ],
    },
    {
      heading: "Complaints and disputes",
      blocks: [
        {
          type: "list",
          items: [
            "Contact us directly to discuss the issue",
            "Submit a formal written complaint if a resolution is not reached",
            "Internal review within 14 days of a written complaint",
            "External mediation or ombudsman services if required",
          ],
        },
        {
          type: "p",
          text: "These Terms are governed by English law and disputes are subject to the jurisdiction of the English courts. Alternative dispute resolution is preferred where possible.",
        },
      ],
    },
    { heading: "Contact", blocks: contactBlocks },
  ],
};

export const cookiePolicy: LegalDocument = {
  title: "Cookie Policy",
  intro: "How we use cookies, and how you can control them.",
  updated: "September 2024",
  sections: [
    {
      heading: "What are cookies?",
      blocks: [
        {
          type: "p",
          text: "Cookies are small text files placed on your device when you visit a website. They are widely used to make websites work more efficiently and to provide information to website owners.",
        },
      ],
    },
    {
      heading: "How we use cookies",
      blocks: [
        { type: "subheading", text: "Essential cookies" },
        {
          type: "p",
          text: "Strictly necessary to provide the services you have requested — security, network management and accessibility.",
        },
        {
          type: "list",
          items: [
            "Session management and security",
            "Form submission and enquiry processing",
            "Accessibility settings and preferences",
            "Load balancing and website performance",
          ],
        },
        { type: "subheading", text: "Analytics cookies" },
        {
          type: "p",
          text: "Help us understand how visitors interact with our website so we can improve it.",
        },
        {
          type: "list",
          items: [
            "Pages visited and time spent on site",
            "Traffic sources and user journeys",
            "Device and browser information",
            "Geographic location at city or region level only",
          ],
        },
        { type: "subheading", text: "Marketing cookies" },
        {
          type: "p",
          text: "Used to track visitors across websites, display relevant advertisements, and measure the effectiveness of advertising campaigns.",
        },
      ],
    },
    {
      heading: "Managing cookies",
      blocks: [
        {
          type: "p",
          text: "You can control and delete cookies through your browser settings — in Chrome and Edge under Settings, in Firefox under Options, and in Safari under Preferences.",
        },
        { type: "subheading", text: "If you disable cookies" },
        {
          type: "definitions",
          items: [
            { term: "Essential cookies", detail: "The website may not function properly" },
            {
              term: "Analytics cookies",
              detail: "We can't improve our services based on usage data",
            },
            {
              term: "Marketing cookies",
              detail: "You may see less relevant advertisements",
            },
          ],
        },
      ],
    },
    { heading: "Contact us about cookies", blocks: contactBlocks },
  ],
};
