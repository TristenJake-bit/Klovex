// Texas-specific checklist tasks
// Texas uses TREC forms, has unique option period, and different disclosure requirements

export const txSharedTasks = [
  { phase: 'Contract Received', task: 'Review TREC 1-4 Family Residential Contract for completeness', responsible: 'TC', days_from_acceptance: 1, category: 'Contract Review', required: true },
  { phase: 'Contract Received', task: 'Verify all pages initialed and dated correctly', responsible: 'TC', days_from_acceptance: 1, category: 'Contract Review', required: true },
  { phase: 'Contract Received', task: 'Calculate option period, financing, and closing deadlines', responsible: 'TC', days_from_acceptance: 1, category: 'Deadlines', required: true },
  { phase: 'Contract Received', task: 'Send executed contract to title company to open escrow', responsible: 'TC', days_from_acceptance: 1, category: 'Escrow', required: true },
  { phase: 'Contract Received', task: 'Confirm option fee delivered to seller within 3 days', responsible: 'TC', days_from_acceptance: 3, category: 'Finance', required: true },
  { phase: 'Contract Received', task: 'Confirm earnest money deposited with title company within 3 days', responsible: 'TC', days_from_acceptance: 3, category: 'Finance', required: true },
  { phase: 'Contract Received', task: 'Send Transaction Welcome Letter to all parties', responsible: 'TC', days_from_acceptance: 1, category: 'Communication', required: true },
  { phase: 'Contract Received', task: 'Confirm lender has copy of executed contract', responsible: 'TC', days_from_acceptance: 2, category: 'Finance', required: true },
  { phase: 'Disclosures', task: 'Seller Disclosure Notice (TAR/TREC) delivered to buyer', responsible: 'Listing Agent', days_from_acceptance: 5, category: 'TX Required Disclosure', required: true },
  { phase: 'Disclosures', task: 'Lead-Based Paint Disclosure (if pre-1978)', responsible: 'Listing Agent', days_from_acceptance: 5, category: 'Federal Required', required: false },
  { phase: 'Disclosures', task: 'MUD/PID/Water District Notice (if applicable)', responsible: 'Listing Agent', days_from_acceptance: 5, category: 'TX Required Disclosure', required: false },
  { phase: 'Disclosures', task: 'HOA addendum and resale certificate (if applicable)', responsible: 'TC', days_from_acceptance: 5, category: 'HOA', required: false },
  { phase: 'Disclosures', task: 'Survey — existing or new survey ordered', responsible: 'TC', days_from_acceptance: 7, category: 'TX Required', required: true },
  { phase: 'Inspections', task: 'Schedule home inspection within option period', responsible: 'Buyer Agent', days_from_acceptance: 2, category: 'Inspection', required: true },
  { phase: 'Inspections', task: 'Home inspection completed', responsible: 'Buyer', days_from_acceptance: 7, category: 'Inspection', required: true },
  { phase: 'Inspections', task: 'WDI (termite) inspection ordered', responsible: 'TC', days_from_acceptance: 3, category: 'Inspection', required: true },
  { phase: 'Inspections', task: 'Review inspection report — negotiate repairs via TREC Amendment', responsible: 'Buyer Agent', days_from_acceptance: 8, category: 'Inspection', required: true },
  { phase: 'Inspections', task: 'Option period expires — buyer commits or terminates', responsible: 'Buyer', days_from_acceptance: 10, category: 'Contingency', required: true },
  { phase: 'Title', task: 'Title commitment received from title company', responsible: 'TC', days_from_acceptance: 10, category: 'Title', required: true },
  { phase: 'Title', task: 'Review title commitment for exceptions and requirements', responsible: 'TC', days_from_acceptance: 12, category: 'Title', required: true },
  { phase: 'Title', task: 'Title objection deadline — buyer to object or accept', responsible: 'Buyer Agent', days_from_acceptance: 15, category: 'Title', required: true },
  { phase: 'Title', task: 'Survey received and reviewed', responsible: 'TC', days_from_acceptance: 15, category: 'Title', required: true },
  { phase: 'Pre-Closing', task: 'Confirm all contingencies resolved', responsible: 'TC', days_from_acceptance: 22, category: 'Contingency', required: true },
  { phase: 'Pre-Closing', task: 'Closing Disclosure issued to buyer — 3 business day waiting period', responsible: 'Lender', days_from_acceptance: -5, category: 'Finance', required: true },
  { phase: 'Pre-Closing', task: 'Confirm homeowners insurance bound and sent to lender', responsible: 'Buyer', days_from_acceptance: -5, category: 'Insurance', required: true },
  { phase: 'Pre-Closing', task: 'Confirm wire instructions with title company', responsible: 'TC', days_from_acceptance: -3, category: 'Finance', required: true },
  { phase: 'Pre-Closing', task: 'Schedule closing with title company', responsible: 'TC', days_from_acceptance: -3, category: 'Signing', required: true },
  { phase: 'Pre-Closing', task: 'Final walkthrough completed', responsible: 'Buyer Agent', days_from_acceptance: -1, category: 'Inspection', required: true },
  { phase: 'Closing', task: 'Buyer and seller sign closing documents at title company', responsible: 'TC', days_from_acceptance: 0, category: 'Signing', required: true },
  { phase: 'Closing', task: 'Confirm loan funded', responsible: 'TC', days_from_acceptance: 0, category: 'Finance', required: true },
  { phase: 'Closing', task: 'Deed recorded with county clerk', responsible: 'TC', days_from_acceptance: 0, category: 'Title', required: true },
  { phase: 'Closing', task: 'Keys transferred to buyer', responsible: 'Listing Agent', days_from_acceptance: 0, category: 'Possession', required: true },
  { phase: 'Closing', task: 'Send closing confirmation to all parties', responsible: 'TC', days_from_acceptance: 0, category: 'Communication', required: true },
  { phase: 'Post-Closing', task: 'Upload final Settlement Statement', responsible: 'TC', days_from_acceptance: 1, category: 'Documents', required: true },
  { phase: 'Post-Closing', task: 'Confirm all documents in file', responsible: 'TC', days_from_acceptance: 3, category: 'Documents', required: true },
  { phase: 'Post-Closing', task: 'Submit file to broker for review', responsible: 'TC', days_from_acceptance: 3, category: 'Compliance', required: true },
]

export const txSellerTasks = [
  { phase: 'Contract Received', task: 'Change MLS status to Pending', responsible: 'Listing Agent', days_from_acceptance: 1, category: 'MLS', required: true },
  { phase: 'Disclosures', task: 'Ensure Seller Disclosure Notice is complete and accurate', responsible: 'Listing Agent', days_from_acceptance: 3, category: 'TX Required Disclosure', required: true },
  { phase: 'Pre-Closing', task: 'Order home warranty if per contract', responsible: 'TC', days_from_acceptance: -5, category: 'Admin', required: true },
]

export const txBuyerTasks = [
  { phase: 'Contract Received', task: 'Send Buyer Welcome Letter with escrow info', responsible: 'TC', days_from_acceptance: 1, category: 'Communication', required: true },
  { phase: 'Contract Received', task: 'Instructions to buyer on earnest money deposit', responsible: 'TC', days_from_acceptance: 1, category: 'Finance', required: true },
  { phase: 'Loan & Appraisal', task: 'Confirm buyer submitted loan application', responsible: 'TC', days_from_acceptance: 3, category: 'Finance', required: true },
  { phase: 'Loan & Appraisal', task: 'Appraisal ordered by lender', responsible: 'Lender', days_from_acceptance: 7, category: 'Appraisal', required: true },
  { phase: 'Loan & Appraisal', task: 'Appraisal completed and reviewed', responsible: 'TC', days_from_acceptance: 14, category: 'Appraisal', required: true },
  { phase: 'Loan & Appraisal', task: 'Loan conditional approval received', responsible: 'Lender', days_from_acceptance: 14, category: 'Finance', required: true },
  { phase: 'Loan & Appraisal', task: 'Final loan approval (clear to close)', responsible: 'Lender', days_from_acceptance: 21, category: 'Finance', required: true },
  { phase: 'Pre-Closing', task: 'Have buyer set up utilities', responsible: 'TC', days_from_acceptance: -7, category: 'Communication', required: true },
]
