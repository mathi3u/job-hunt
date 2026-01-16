// ============================================================================
// ENUMS (matching database)
// ============================================================================

export type OpportunityStatus =
  | 'identified'
  | 'researching'
  | 'preparing'
  | 'applied'
  | 'interviewing'
  | 'offer'
  | 'closed_won'
  | 'closed_lost'
  | 'on_hold'

export type OpportunitySource =
  | 'job_board'
  | 'company_website'
  | 'referral'
  | 'recruiter_outreach'
  | 'networking'
  | 'career_fair'
  | 'cold_outreach'

export type InterviewStage =
  | 'applied'
  | 'screening'
  | 'phone_interview'
  | 'technical'
  | 'onsite'
  | 'final_round'
  | 'reference_check'
  | 'offer'
  | 'negotiation'

export type ProcessOutcome =
  | 'in_progress'
  | 'advanced'
  | 'offer_extended'
  | 'offer_accepted'
  | 'offer_declined'
  | 'rejected'
  | 'withdrawn'
  | 'ghosted'
  | 'on_hold'

export type InterviewType =
  | 'recruiter_screen'
  | 'hiring_manager'
  | 'technical'
  | 'behavioral'
  | 'system_design'
  | 'case_study'
  | 'panel'
  | 'presentation'
  | 'culture_fit'
  | 'executive'

export type CommType =
  | 'email_sent'
  | 'email_received'
  | 'call'
  | 'linkedin_message'
  | 'referral_intro'
  | 'follow_up'

export type DocType = 'cv' | 'cover_letter' | 'other'

// ============================================================================
// ENTITIES
// ============================================================================

export interface Company {
  id: string
  name: string
  website: string | null
  linkedin_url: string | null
  industry: string | null
  company_size: string | null
  funding_stage: string | null
  headquarters: string | null
  description: string | null
  culture_notes: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  company_id: string | null
  name: string
  role: string | null
  email: string | null
  phone: string | null
  linkedin_url: string | null
  relationship: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Opportunity {
  id: string
  company_id: string | null
  title: string | null
  status: OpportunityStatus
  source: OpportunitySource | null
  source_detail: string | null
  priority: number
  fit_score: number | null
  fit_notes: string | null
  identified_date: string | null
  target_apply_date: string | null
  resume_url: string | null
  cover_letter_url: string | null
  working_doc_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface JobPosting {
  id: string
  opportunity_id: string | null
  company_id: string | null
  role: string
  url: string | null
  portal: string | null
  posted_date: string | null
  deadline_date: string | null
  captured_at: string | null
  tldr: string | null
  responsibilities: string | null
  skills_requirements: string | null
  recruitment_process: string | null
  salary_range: string | null
  experience_level: string | null
  key_skills: string[] | null
  red_flags: string | null
  location: string | null
  remote_policy: string | null
  job_content: string | null
  created_at: string
  updated_at: string
}

export interface InterviewProcess {
  id: string
  opportunity_id: string
  posting_id: string | null
  stage: InterviewStage
  outcome: ProcessOutcome
  started_at: string | null
  ended_at: string | null
  expected_stages: string | null
  expected_timeline: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Interview {
  id: string
  process_id: string
  contact_id: string | null
  scheduled_at: string | null
  duration_minutes: number
  location: string | null
  calendar_link: string | null
  interview_type: InterviewType | null
  round: number | null
  prep_notes: string | null
  questions_to_ask: string | null
  topics_to_review: string | null
  completed: boolean
  went_well: boolean | null
  feedback: string | null
  follow_up_sent: boolean
  created_at: string
  updated_at: string
}

export interface Communication {
  id: string
  opportunity_id: string | null
  contact_id: string | null
  interview_id: string | null
  comm_type: CommType
  occurred_at: string
  subject: string | null
  content: string | null
  requires_response: boolean
  response_due_date: string | null
  responded: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CVDocument {
  id: string
  name: string
  description: string | null
  file_path: string
  file_type: string | null
  file_size: number | null
  doc_type: DocType
  is_default: boolean
  created_at: string
  updated_at: string
}

// ============================================================================
// JOINED/VIEW TYPES
// ============================================================================

// Pipeline overview (from view)
export interface PipelineItem {
  opportunity_id: string
  title: string | null
  status: OpportunityStatus
  priority: number
  source: OpportunitySource | null
  company_name: string | null
  industry: string | null
  posting_role: string | null
  posted_date: string | null
  salary_range: string | null
  interview_stage: InterviewStage | null
  interview_outcome: ProcessOutcome | null
  interview_count: number
  next_interview: string | null
  comm_count: number
  created_at: string
}

// Opportunity with related data for detail view
export interface OpportunityWithDetails extends Opportunity {
  company: Company | null
  job_posting: JobPosting | null
  interview_process: InterviewProcess | null
  interviews: Interview[]
  communications: Communication[]
}

// Upcoming interview (from view)
export interface UpcomingInterview {
  interview_id: string
  scheduled_at: string
  interview_type: InterviewType | null
  duration_minutes: number
  location: string | null
  prep_notes: string | null
  interviewer_name: string | null
  interviewer_role: string | null
  company_name: string | null
  opportunity_title: string | null
  stage: InterviewStage
}

// Follow-up needed (from view)
export interface FollowUpNeeded {
  comm_id: string
  comm_type: CommType
  subject: string | null
  response_due_date: string | null
  contact_name: string | null
  company_name: string | null
  opportunity_title: string | null
}

// ============================================================================
// UI HELPERS
// ============================================================================

export const STATUS_LABELS: Record<OpportunityStatus, string> = {
  identified: 'Identified',
  researching: 'Researching',
  preparing: 'Preparing',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  closed_won: 'Accepted',
  closed_lost: 'Closed',
  on_hold: 'On Hold',
}

export const STATUS_COLORS: Record<OpportunityStatus, string> = {
  identified: 'bg-gray-100 text-gray-800',
  researching: 'bg-blue-100 text-blue-800',
  preparing: 'bg-yellow-100 text-yellow-800',
  applied: 'bg-purple-100 text-purple-800',
  interviewing: 'bg-indigo-100 text-indigo-800',
  offer: 'bg-green-100 text-green-800',
  closed_won: 'bg-emerald-100 text-emerald-800',
  closed_lost: 'bg-red-100 text-red-800',
  on_hold: 'bg-orange-100 text-orange-800',
}

export const SOURCE_LABELS: Record<OpportunitySource, string> = {
  job_board: 'Job Board',
  company_website: 'Company Website',
  referral: 'Referral',
  recruiter_outreach: 'Recruiter',
  networking: 'Networking',
  career_fair: 'Career Fair',
  cold_outreach: 'Cold Outreach',
}

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  recruiter_screen: 'Recruiter Screen',
  hiring_manager: 'Hiring Manager',
  technical: 'Technical',
  behavioral: 'Behavioral',
  system_design: 'System Design',
  case_study: 'Case Study',
  panel: 'Panel',
  presentation: 'Presentation',
  culture_fit: 'Culture Fit',
  executive: 'Executive',
}

export const STAGE_LABELS: Record<InterviewStage, string> = {
  applied: 'Applied',
  screening: 'Screening',
  phone_interview: 'Phone Interview',
  technical: 'Technical',
  onsite: 'Onsite',
  final_round: 'Final Round',
  reference_check: 'References',
  offer: 'Offer',
  negotiation: 'Negotiation',
}

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  cv: 'CV / Resume',
  cover_letter: 'Cover Letter',
  other: 'Other',
}

