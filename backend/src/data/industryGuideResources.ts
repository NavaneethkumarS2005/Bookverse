export interface IIndustryGuideResource {
  id: string;
  title: string;
  category: 'ISBN' | 'COPYRIGHT' | 'SUBMISSIONS' | 'ORGANIZATIONS' | 'STANDARDS';
  description: string;
  sourceUrl: string;
  organization: string;
  region: string;
  verifiedAt: string;
  keyTopics: string[];
}

export const VERIFIED_INDUSTRY_RESOURCES: IIndustryGuideResource[] = [
  // ISBN Resources
  {
    id: 'isbn-bowker-us',
    title: 'Bowker Identifier Services (Official U.S. ISBN Agency)',
    category: 'ISBN',
    description: 'The official agency for assigning International Standard Book Numbers (ISBNs) to publishers and self-published authors in the United States. Provides official barcode generation, SANs, and title registration.',
    sourceUrl: 'https://www.myidentifiers.com',
    organization: 'R.R. Bowker LLC',
    region: 'United States',
    verifiedAt: '2026-03-15T00:00:00.000Z',
    keyTopics: ['ISBN Registration', 'Barcodes', 'Book Metadata', 'Publisher Prefixes']
  },
  {
    id: 'isbn-raja-rammohun-roy',
    title: 'Raja Rammohun Roy National Agency for ISBN (India)',
    category: 'ISBN',
    description: 'The statutory agency under the Ministry of Education, Government of India, responsible for the allocation and issuance of ISBN numbers to authors and publishers across India without fee.',
    sourceUrl: 'https://isbn.gov.in',
    organization: 'Department of Higher Education, Ministry of Education, Govt. of India',
    region: 'India',
    verifiedAt: '2026-03-15T00:00:00.000Z',
    keyTopics: ['Indian ISBN Portal', 'Author Registration', 'Statutory Allotment', 'Publisher Allotment']
  },
  {
    id: 'isbn-international',
    title: 'International ISBN Agency',
    category: 'ISBN',
    description: 'The global authority appointed by ISO to oversee the international administration and standardized specification of the 13-digit ISBN identifier system in over 200 countries.',
    sourceUrl: 'https://www.isbn-international.org',
    organization: 'International ISBN Agency',
    region: 'Global',
    verifiedAt: '2026-03-15T00:00:00.000Z',
    keyTopics: ['ISO 2108 Standards', 'Global Directory of Publishers', 'National Agency Contacts']
  },

  // Copyright & Legal Protection
  {
    id: 'copyright-us-office',
    title: 'U.S. Copyright Office Electronic Registration System (eCO)',
    category: 'COPYRIGHT',
    description: 'Official federal office of the Library of Congress for registering statutory copyright for published and unpublished literary works, managing mandatory deposit requirements, and maintaining legal copyright records.',
    sourceUrl: 'https://www.copyright.gov',
    organization: 'United States Copyright Office',
    region: 'United States',
    verifiedAt: '2026-03-15T00:00:00.000Z',
    keyTopics: ['eCO Portal', 'Literary Work Copyright', 'Statutory Damages Protection', 'Public Catalog']
  },
  {
    id: 'copyright-india-office',
    title: 'Copyright Office of India',
    category: 'COPYRIGHT',
    description: 'Statutory body established under Section 9 of the Copyright Act, 1957 (Department for Promotion of Industry and Internal Trade) for copyright registration, search of entries, and rights enforcement in India.',
    sourceUrl: 'https://copyright.gov.in',
    organization: 'DPIIT, Ministry of Commerce and Industry, Govt. of India',
    region: 'India',
    verifiedAt: '2026-03-15T00:00:00.000Z',
    keyTopics: ['Indian Copyright Act 1957', 'E-filing Portal', 'Literary Works', 'Status Tracking']
  },
  {
    id: 'copyright-wipo',
    title: 'World Intellectual Property Organization (WIPO) — Berne Convention',
    category: 'COPYRIGHT',
    description: 'United Nations specialized agency guiding global intellectual property treaties, including the Berne Convention for the Protection of Literary and Artistic Works, ensuring automatic copyright protection across 180+ member states.',
    sourceUrl: 'https://www.wipo.int',
    organization: 'World Intellectual Property Organization (UN)',
    region: 'Global',
    verifiedAt: '2026-03-15T00:00:00.000Z',
    keyTopics: ['Berne Convention', 'International Copyright', 'Digital Single Market Treaties']
  },

  // Publisher Submissions & Guidelines
  {
    id: 'submission-prh',
    title: 'Penguin Random House — Author Submission & Literary Agent Guidelines',
    category: 'SUBMISSIONS',
    description: 'Official submission directory explaining representation requirements, imprints policies (Knopf, Viking, Crown, Vintage), and literary agency procedures for manuscript consideration.',
    sourceUrl: 'https://www.penguinrandomhouse.com',
    organization: 'Penguin Random House LLC',
    region: 'Global',
    verifiedAt: '2026-03-15T00:00:00.000Z',
    keyTopics: ['Manuscript Submissions', 'Literary Agents', 'Imprints Directory', 'First-Time Authors']
  },
  {
    id: 'submission-harpercollins',
    title: 'HarperCollins Publishers — Manuscript Guidelines & Open Imprints',
    category: 'SUBMISSIONS',
    description: 'Verified guidelines for manuscript preparation, open reading periods, digital-first lines (Heartdrum, Harper Impulse), and query letters for fiction and non-fiction proposals.',
    sourceUrl: 'https://www.harpercollins.com',
    organization: 'HarperCollins Publishers',
    region: 'Global',
    verifiedAt: '2026-03-15T00:00:00.000Z',
    keyTopics: ['Query Letters', 'Book Proposals', 'Direct Submissions', 'Editorial Process']
  },
  {
    id: 'submission-bloomsbury',
    title: 'Bloomsbury Publishing — Author Portal & Academic Proposals',
    category: 'SUBMISSIONS',
    description: 'Official publisher guide outlining manuscript submission criteria for Bloomsbury Academic, Trade Non-fiction, Bloomsbury Children’s, and special interest editorial boards.',
    sourceUrl: 'https://www.bloomsbury.com',
    organization: 'Bloomsbury Publishing Plc',
    region: 'Global',
    verifiedAt: '2026-03-15T00:00:00.000Z',
    keyTopics: ['Academic Proposals', 'Peer Review Standards', 'Trade Fiction Policies', 'Sample Chapters']
  },

  // Author & Publishing Organizations
  {
    id: 'org-authors-guild',
    title: 'The Authors Guild (United States)',
    category: 'ORGANIZATIONS',
    description: 'America’s oldest and largest professional organization for published writers, offering contract reviews, legal advocacy, fair publishing practices, and copyright education.',
    sourceUrl: 'https://authorsguild.org',
    organization: 'The Authors Guild',
    region: 'United States',
    verifiedAt: '2026-03-15T00:00:00.000Z',
    keyTopics: ['Model Publishing Contracts', 'Author Advocacy', 'Legal Advice', 'Royalty Auditing']
  },
  {
    id: 'org-society-of-authors',
    title: 'The Society of Authors (United Kingdom)',
    category: 'ORGANIZATIONS',
    description: 'The UK trade union for more than 12,000 writers, illustrators, and literary translators at all stages of their careers, protecting rights and advising on fair publishing agreements.',
    sourceUrl: 'https://www2.societyofauthors.org',
    organization: 'The Society of Authors',
    region: 'United Kingdom',
    verifiedAt: '2026-03-15T00:00:00.000Z',
    keyTopics: ['Contract Vetting', 'Professional Rates', 'Prizes & Grants', 'Self-Publishing Guidance']
  },
  {
    id: 'org-ipa-publishers',
    title: 'International Publishers Association (IPA)',
    category: 'ORGANIZATIONS',
    description: 'The world’s largest federation of national, regional, and specialized book publisher associations, representing book and journal publishing industry interests globally.',
    sourceUrl: 'https://www.internationalpublishers.org',
    organization: 'International Publishers Association',
    region: 'Global',
    verifiedAt: '2026-03-15T00:00:00.000Z',
    keyTopics: ['Freedom to Publish', 'Global Publishing Statistics', 'Educational Publishing', 'Copyright Defence']
  },

  // Industry Standards & Cataloging
  {
    id: 'standards-bisg',
    title: 'Book Industry Study Group (BISG) — Subject Codes & Standards',
    category: 'STANDARDS',
    description: 'The leading U.S. trade association for the book supply chain, standardizing BISAC Subject Headings, ONIX for Books metadata schemas, and supply-chain efficiency practices.',
    sourceUrl: 'https://bisg.org',
    organization: 'Book Industry Study Group',
    region: 'United States',
    verifiedAt: '2026-03-15T00:00:00.000Z',
    keyTopics: ['BISAC Subject Codes', 'ONIX for Books', 'Metadata Best Practices', 'Supply Chain Standards']
  },
  {
    id: 'standards-loc-cip',
    title: 'Library of Congress Cataloging in Publication (CIP) Program',
    category: 'STANDARDS',
    description: 'Pre-publication cataloging data program provided by the Library of Congress to participating publishers, ensuring standardized bibliographic records in international library systems.',
    sourceUrl: 'https://www.loc.gov/publish/cip/',
    organization: 'Library of Congress',
    region: 'United States',
    verifiedAt: '2026-03-15T00:00:00.000Z',
    keyTopics: ['CIP Data Block', 'LCCN Assignment', 'Library Distribution', 'Bibliographic Control']
  }
];
