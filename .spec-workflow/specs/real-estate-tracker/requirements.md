# Requirements Document

## Introduction

The "re-state" project is a real estate tracking agent designed to help users research and track potential house purchases in Italy. The system enables users to create research projects, scrape and analyze property listings from Italian real estate websites (idealista.it and immobiliare.it), manage ad status throughout the buying process, and leverage AI to analyze and compare properties.

This project serves a dual purpose:
1. Provide practical house-hunting workflow management
2. Demonstrate technical capabilities using Restate for durable execution and Vercel AI SDK for intelligent content processing

The value to users includes:
- Centralized tracking of all property searches in one place
- Automated extraction of property details from listings
- Status management throughout the buying journey (to call, to visit, sent offer, bought, rejected)
- AI-powered analysis and comparison of properties
- Historical record of all questions and insights

## Alignment with Product Vision

This feature demonstrates Restate's durable execution capabilities in a real-world application while showcasing integration with modern AI tooling (Vercel AI SDK). The stateful Virtual Object pattern is ideal for managing research sessions with their associated ads and questions, providing a clear example of how Restate handles complex stateful workflows.

## Requirements

### Requirement 1: Research Creation and Configuration

**User Story:** As a house hunter, I want to create a named research project with search criteria, so that I can organize my property search efforts.

#### Acceptance Criteria

1. WHEN the user starts a new research THEN the system SHALL prompt for a research name (which becomes the Virtual Object key)
2. WHEN the research name is provided THEN the system SHALL create a new research Virtual Object in Restate
3. WHEN the research is created THEN the system SHALL allow the user to define text-based search criteria/description
4. WHEN criteria are defined THEN the system SHALL store them in the research Virtual Object state
5. IF a research with the same name already exists THEN the system SHALL load the existing research instead of creating a new one

### Requirement 2: Property Listing Scraping and Processing

**User Story:** As a house hunter, I want to submit property listing URLs from Italian real estate sites, so that the system can automatically extract and store property details.

#### Acceptance Criteria

1. WHEN the user submits a property listing URL THEN the system SHALL identify whether it's from idealista.it or immobiliare.it
2. IF the URL is from idealista.it THEN the system SHALL use the idealista-specific Vercel AI SDK tool to scrape and process the page
3. IF the URL is from immobiliare.it THEN the system SHALL use the immobiliare-specific Vercel AI SDK tool to scrape and process the page
4. WHEN scraping is complete THEN the system SHALL convert the raw content into a well-defined property data model
5. WHEN conversion is successful THEN the system SHALL add the property ad to the research Virtual Object state
6. WHEN processing fails THEN the system SHALL return a clear error message to the user
7. WHEN an ad is saved THEN the system SHALL assign it a default status of "to call"

### Requirement 3: Property Listing Management and Viewing

**User Story:** As a house hunter, I want to view all tracked properties in a table format with their current status, so that I can see my pipeline at a glance.

#### Acceptance Criteria

1. WHEN the user opens the research page THEN the system SHALL display all saved property ads in a tabular format
2. WHEN displaying ads THEN the system SHALL show key property details in columns (address, price, size, etc.)
3. WHEN displaying ads THEN the system SHALL show the current status for each ad
4. WHEN the user views the table THEN the system SHALL support filtering by status
5. WHEN the user views the table THEN the system SHALL support ordering/sorting by status and other key fields

### Requirement 4: Status Management

**User Story:** As a house hunter, I want to update the status of property listings as I progress through the buying process, so that I can track my pipeline.

#### Acceptance Criteria

1. WHEN the user changes an ad's status THEN the system SHALL support these status values: "to reach out", "visit appointment taken", "sent the offer", "bought", "rejected"
2. WHEN status is changed THEN the system SHALL update the ad in the research Virtual Object state
3. WHEN status update is successful THEN the system SHALL reflect the change immediately in the UI

### Requirement 5: Manual Notes for Property Listings

**User Story:** As a house hunter, I want to add manual notes to property listings after scraping, so that I can track additional details and context for better analysis.

#### Acceptance Criteria

1. WHEN viewing a property ad THEN the system SHALL display a notes field for that ad
2. WHEN the user adds or updates notes THEN the system SHALL accept free-form text input
3. WHEN notes are saved THEN the system SHALL update the ad in the research Virtual Object state
4. WHEN notes exist for an ad THEN the system SHALL display them in the ad details
5. WHEN the user asks AI questions THEN the system SHALL include ad notes in the context sent to the LLM
6. WHEN notes are empty THEN the system SHALL display an empty state prompting the user to add notes

### Requirement 6: AI-Powered Property Analysis

**User Story:** As a house hunter, I want to ask questions about my tracked properties to get AI-powered analysis and comparisons, so that I can make informed decisions.

#### Acceptance Criteria

1. WHEN the user opens the research page THEN the system SHALL display a "ask a question" interface on the side
2. WHEN the user asks a question THEN the system SHALL send the question along with all research ads to an LLM for analysis
3. WHEN processing the question THEN the system SHALL NOT re-scrape any property pages
4. WHEN the LLM responds THEN the system SHALL display the answer to the user
5. WHEN a question is answered THEN the system SHALL store both the question and answer in the research Virtual Object state
6. WHEN the user views the research page THEN the system SHALL display all historical questions and answers for inspection
7. WHEN displaying questions THEN the system SHALL maintain chronological order

### Requirement 7: Backend Architecture with Restate

**User Story:** As a developer, I want the research data managed through Restate Virtual Objects, so that I benefit from durable execution and stateful workflow management.

#### Acceptance Criteria

1. WHEN implementing the backend THEN the system SHALL use a Restate Virtual Object for each research
2. WHEN creating a Virtual Object THEN the system SHALL use the research name as the key
3. WHEN storing research data THEN the Virtual Object SHALL contain: search criteria/description, array of scraped ads with their status, array of asked questions with answers
4. WHEN the UI makes requests THEN the system SHALL use Next.js API routes that call Restate using the Restate ingress client
5. WHEN calling Restate THEN the system SHALL use the `@restatedev/restate-sdk-clients` package

### Requirement 8: Frontend Integration with Next.js

**User Story:** As a developer, I want a simple Next.js frontend that communicates with the Restate backend, so that users can interact with the system.

#### Acceptance Criteria

1. WHEN implementing the UI THEN the system SHALL use Next.js as the framework
2. WHEN the UI needs backend data THEN the system SHALL call Next.js API routes (not directly to Restate)
3. WHEN API routes are called THEN they SHALL use the Restate ingress client to communicate with Virtual Objects
4. WHEN designing the UI THEN the system SHALL prioritize functionality over visual design (keep it simple)
5. WHEN displaying data THEN the system SHALL use standard HTML tables and forms

## Non-Functional Requirements

### Code Architecture and Modularity

- **Single Responsibility Principle**: Each file should have a single, well-defined purpose
  - Separate Restate Virtual Object definition from scraping logic
  - Separate Next.js API routes by concern (research management, ad processing, question handling)
  - Separate scraping tools per website (idealista.it, immobiliare.it)
- **Modular Design**: Components, utilities, and services should be isolated and reusable
  - Vercel AI SDK tools should be defined in separate modules per website
  - Data models should be defined in shared types
  - Restate client initialization should be centralized
- **Dependency Management**: Minimize interdependencies between modules
  - Frontend should only know about API route contracts, not Restate
  - Scraping tools should be independently testable
- **Clear Interfaces**: Define clean contracts between components and layers
  - Type definitions for research data model
  - Type definitions for property ad data model
  - Type definitions for question/answer pairs
  - API route request/response types

### Performance

- Property scraping should complete within 30 seconds per URL
- Research page should load all ads within 2 seconds for up to 100 properties
- AI question answering should respond within 10 seconds for typical queries
- Table filtering and sorting should be instantaneous (client-side operations)

### Security

- API routes must validate all user inputs
- URL submissions must be validated to only accept idealista.it and immobiliare.it domains
- Restate Virtual Object keys (research names) should be sanitized to prevent injection attacks
- No sensitive user data should be logged

### Reliability

- Restate ensures durable execution - if scraping fails mid-process, it should retry automatically
- Failed scraping attempts should not block the entire research workflow
- Users should be able to continue working with partial data if some ads fail to process
- Historical questions and answers must be persisted reliably

### Usability

- Research creation should require minimal input (name + optional criteria)
- Property URL submission should be a single input field with clear feedback
- Status changes should be quick (dropdown or button-based)
- The question interface should clearly separate historical Q&A from the new question input
- Error messages should be clear and actionable
