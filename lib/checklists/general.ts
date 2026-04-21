// General US checklist — used for states without a specific checklist
// Covers universal real estate transaction steps without state-specific disclosures

export const generalSharedTasks = [
  { phase: 'Contract Received', task: 'Review purchase agreement for completeness and all signatures', responsible: 'TC', days_from_acceptance: 1, category: 'Contract Review', required: true },
  { phase: 'Contract Received', task: 'Verify all pages initialed and dated correctly', responsible: 'TC', days_from_acceptance: 1, category: 'Contract Review', required: true },
  { phase: 'Contract Received', task: 'Calculate all contingency and closing deadlines', responsible: 'TC', days_from_acceptance: 1, category: 'Deadlines', required: true },
  { phase: 'Contract Received', task: 'Send executed contract to title company/escrow to open file', responsible: 'TC', days_from_acceptance: 1, category: 'Escrow', required: true },
  { phase: 'Contract Received', task: 'Confirm earnest money deposit delivered per contract terms', responsible: 'TC', days_from_acceptance: 3, category: 'Finance', required: true },
  { phase: 'Contract Received', task: 'Send Transaction Welcome Letter to all parties', responsible: 'TC', days_from_acceptance: 1, category: 'Communication', required: true },
  { phase: 'Contract Received', task: 'Confirm lender has copy of executed contract', responsible: 'TC', days_from_acceptance: 2, category: 'Finance', required: true },
  { phase: 'Disclosures', task: 'Seller property disclosure delivered to buyer', responsible: 'Listing Agent', days_from_acceptance: 5, category: 'Required Disclosure', required: true },
  { phase: 'Disclosures', task: 'Lead-Based Paint Disclosure (if pre-1978)', responsible: 'Listing Agent', days_from_acceptance: 5, category: 'Federal Required', required: false },
  { phase: 'Disclosures', task: 'HOA documents delivered (if applicable)', responsible: 'Listing Agent', days_from_acceptance: 7, category: 'HOA', required: false },
  { phase: 'Disclosures', task: 'Send preliminary title report to all parties', responsible: 'TC', days_from_acceptance: 7, category: 'Title', required: true },
  { phase: 'Inspections', task: 'Schedule home inspection within contingency period', responsible: 'Buyer Agent', days_from_acceptance: 3, category: 'Inspection', required: true },
  { phase: 'Inspections', task: 'Home inspection completed', responsible: 'Buyer', days_from_acceptance: 10, category: 'Inspection', required: true },
  { phase: 'Inspections', task: 'Pest/termite inspection ordered', responsible: 'TC', days_from_acceptance: 3, category: 'Inspection', required: true },
  { phase: 'Inspections', task: 'Review inspection report — negotiate repairs if needed', responsible: 'Buyer Agent', days_from_acceptance: 12, category: 'Inspection', required: true },
  { phase: 'Inspections', task: 'Inspection contingency resolved', responsible: 'Buyer Agent', days_from_acceptance: 15, category: 'Contingency', required: true },
  { phase: 'Title', task: 'Title search/commitment ordered', responsible: 'TC', days_from_acceptance: 3, category: 'Title', required: true },
  { phase: 'Title', task: 'Title commitment received and reviewed', responsible: 'TC', days_from_acceptance: 10, category: 'Title', required: true },
  { phase: 'Title', task: 'Confirm no unexpected liens or encumbrances', responsible: 'TC', days_from_acceptance: 10, category: 'Title', required: true },
  { phase: 'Title', task: 'Title issues resolved', responsible: 'TC', days_from_acceptance: 15, category: 'Title', required: true },
  { phase: 'Pre-Closing', task: 'All contingencies resolved in writing', responsible: 'TC', days_from_acceptance: 22, category: 'Contingency', required: true },
  { phase: 'Pre-Closing', task: 'Closing Disclosure issued — 3 business day review', responsible: 'Lender', days_from_acceptance: -5, category: 'Finance', required: true },
  { phase: 'Pre-Closing', task: 'Confirm homeowners insurance bound', responsible: 'Buyer', days_from_acceptance: -5, category: 'Insurance', required: true },
  { phase: 'Pre-Closing', task: 'Confirm wire instructions with title/escrow company', responsible: 'TC', days_from_acceptance: -3, category: 'Finance', required: true },
  { phase: 'Pre-Closing', task: 'Schedule closing signing', responsible: 'TC', days_from_acceptance: -3, category: 'Signing', required: true },
  { phase: 'Pre-Closing', task: 'Final walkthrough completed', responsible: 'Buyer Agent', days_from_acceptance: -1, category: 'Inspection', required: true },
  { phase: 'Closing', task: 'Closing documents signed', responsible: 'TC', days_from_acceptance: 0, category: 'Signing', required: true },
  { phase: 'Closing', task: 'Confirm loan funded', responsible: 'TC', days_from_acceptance: 0, category: 'Finance', required: true },
  { phase: 'Closing', task: 'Deed recorded', responsible: 'TC', days_from_acceptance: 0, category: 'Title', required: true },
  { phase: 'Closing', task: 'Keys transferred to buyer', responsible: 'Listing Agent', days_from_acceptance: 0, category: 'Possession', required: true },
  { phase: 'Closing', task: 'Send closing confirmation to all parties', responsible: 'TC', days_from_acceptance: 0, category: 'Communication', required: true },
  { phase: 'Post-Closing', task: 'Upload final Settlement Statement', responsible: 'TC', days_from_acceptance: 1, category: 'Documents', required: true },
  { phase: 'Post-Closing', task: 'Confirm all documents in file', responsible: 'TC', days_from_acceptance: 3, category: 'Documents', required: true },
  { phase: 'Post-Closing', task: 'Submit file to broker for review', responsible: 'TC', days_from_acceptance: 3, category: 'Compliance', required: true },
]

export const generalSellerTasks = [
  { phase: 'Contract Received', task: 'Change MLS status to Pending', responsible: 'Listing Agent', days_from_acceptance: 1, category: 'MLS', required: true },
  { phase: 'Disclosures', task: 'Ensure property disclosure is complete and accurate', responsible: 'Listing Agent', days_from_acceptance: 3, category: 'Required Disclosure', required: true },
]

export const generalBuyerTasks = [
  { phase: 'Contract Received', task: 'Send Buyer Welcome Letter with escrow info', responsible: 'TC', days_from_acceptance: 1, category: 'Communication', required: true },
  { phase: 'Contract Received', task: 'Instructions to buyer on earnest money deposit', responsible: 'TC', days_from_acceptance: 1, category: 'Finance', required: true },
  { phase: 'Loan & Appraisal', task: 'Confirm buyer submitted loan application', responsible: 'TC', days_from_acceptance: 3, category: 'Finance', required: true },
  { phase: 'Loan & Appraisal', task: 'Appraisal ordered by lender', responsible: 'Lender', days_from_acceptance: 7, category: 'Appraisal', required: true },
  { phase: 'Loan & Appraisal', task: 'Appraisal completed and reviewed', responsible: 'TC', days_from_acceptance: 14, category: 'Appraisal', required: true },
  { phase: 'Loan & Appraisal', task: 'Final loan approval (clear to close)', responsible: 'Lender', days_from_acceptance: 21, category: 'Finance', required: true },
  { phase: 'Pre-Closing', task: 'Have buyer set up utilities', responsible: 'TC', days_from_acceptance: -7, category: 'Communication', required: true },
]
