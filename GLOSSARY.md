# Glossary (ubiquitous language)

This is the shared vocabulary of the project. The same words are used in the code, the API, the UI, the tests and the documentation, so that everyone means the same thing. If a word means something different somewhere, or a synonym creeps in, fix it there rather than adding a second word here.

The project is a single bounded context: **the recolour workflow**, from a ticket being created to its results being approved.

## The work

| Term | Meaning | Dansk | Avoid |
|---|---|---|---|
| **Recolour** | Changing the colour of a garment in its product photos, optionally giving it a print. | omfarvning | recolor, edit, retouch (retouching is what the partner does) |
| **Bestseller (BS)** | The brand that orders recolours. Its staff are the users of the app. | Bestseller | client, customer |
| **Partner** | An external retouching company that performs the recolour for a ticket. The partner does the work; Bestseller creates and approves. In the app a partner user can log in and sees only its own tickets. | partner | vendor, supplier, agency |
| **Guideline** | The instruction text that comes with a ticket. Stored verbatim on the ticket. | guideline | brief, instructions |
| **Clipping path** | A vector outline stored in an image file that cuts the garment out from its background. Every recoloured image must keep the original clipping path, and only one. | beskæringssti | mask, outline, cutout |
| **Pantone** | A standardised colour system where every colour has a fixed name and number. The brief gives names only, so names are what we store. | Pantone | RGB, hex (we hold no codes) |
| **Colour** | One of the named Pantone colours in the colour list: Granita, Fuchsia Fedora, Night Sky, Hedge Green, Navy Blazer. | farve | shade, colorway |
| **AOP** (all-over print) | An operation that gives the fabric a pattern over its whole surface. Shown as a checkbox in the form. Without AOP the variant is a single solid colour. | all-over print | print job, patterned |
| **Pattern** | A named print used by AOP variants: Block Libre, Dots (Cloud Dancer). | mønster | print, design |

## Tickets and files

| Term | Meaning | Dansk | Avoid |
|---|---|---|---|
| **Ticket** | One recolour request for one garment. It holds the files, the variants and the status, and it is **the unit of status and approval**. In effect it is a work order placed with a partner, so the system is closer to an order system than a support-ticket system, but the brief's word *ticket* is kept. | ticket / sag | order, case, task, job |
| **Article number** | Identifies the garment, e.g. `15377522`. Field `articleNo`. | artikelnummer | style number, SKU |
| **Reference number** | The second number in the file names, e.g. `5081887`. Its exact meaning is not given in the brief, so it is stored as an opaque value. Field `reference`. | referencenummer | order number |
| **Photo** | A single image file. | foto | picture, image (except in *reference image* and *result image*) |
| **Photo ID** | The file name without extension, e.g. `15377522_5081887_007`. It identifies one photo. | foto-ID | file ID |
| **Slot** | A place on a ticket for one file. A ticket has four: Front, Back, Style and Reference. Which slots are required follows from the operations. | plads | field, attachment |
| **Front / Back view** | The source photos ending in `_001` and `_002`. | forside / bagside | |
| **Style view** | The source photo ending in `_007`, a detail shot of the fabric. Not to be confused with the "style" in the brief's form field, see below. | style-billede (detalje) | detail photo |
| **Reference image** | The fourth file on a ticket, showing how the pattern should look, e.g. `Block Libre`. Required when a variant is AOP. | referencebillede | pattern file, sample |
| **Source photo** | An original photo (Front, Back or Style) that is to be recoloured. | originalbillede | input image |
| **Variant** | One requested version of the garment, made of one or more combined operations. A ticket has one or more. Ticket 2 has three. | variant / version | version, colourway, option |
| **Operation** | One building block of a variant: `RECOLOUR`, `AOP` or `RESIZE`. A variant combines the operations it needs, e.g. recolour and AOP. | operation / behandling | step, action, task |
| **Result image** | The partner's recoloured file for one variant and one view (Front, Back or Style). Three per variant and round. | resultatbillede | output, deliverable |
| **Round** | One cycle of sending a ticket to the partner and receiving the results. A rejected ticket that is sent again starts a new round. | runde | iteration, revision, version |

## Workflow

| Term | Meaning | Dansk | Avoid |
|---|---|---|---|
| **Status** | Where a ticket is in the flow: `PENDING`, `SENT`, `IN_PROGRESS`, `COMPLETED`, `APPROVED`, `REJECTED`. | status | state, stage |
| **Pending** | Created, not yet sent to the partner. | afventer | new, draft |
| **Sent** | Sent to the partner, no receipt yet. | sendt | submitted |
| **In progress** | The partner has confirmed receipt and is working on it. | i gang | working |
| **Completed** | The partner has delivered all results. The ticket now awaits approval. | færdig (afventer godkendelse) | done, delivered |
| **Approved** | A Manager accepted the whole ticket. Its results now appear in the Approved Library. | godkendt | accepted, signed off |
| **Rejected** | A Manager sent the ticket back with a reason. It returns to the queue and can be sent again. | afvist | declined, failed |
| **Send** | An Operator hands a ticket to its partner. Starts a round. | send | dispatch, submit |
| **Receipt** | The partner's confirmation that it has received a ticket. Shown in the Partner Overview. | kvittering | ack, response |
| **Approve** | A Manager accepts the **whole ticket**, not individual variants. | godkend | accept, sign off |
| **Reject** | A Manager sends the whole ticket back with a reason saying what to correct. | afvis | decline, deny |
| **Ticket queue** | The list of tickets with status and filters, shown in the UI. | ticket-kø | backlog, inbox |
| **Approved Library** | The list of the partners' final, approved results: the result images of the latest round of every approved ticket, each referring back to its ticket. Computed from approved tickets, not a separate store. Called "Approved Photos" in the brief. | godkendt-bibliotek | archive, gallery |
| **Priority** | How urgent a ticket is: `LOW`, `NORMAL`, `HIGH`. | prioritet | urgency, severity |
| **Audit event** | A record of one change to a ticket: what changed, who did it and when. Together they form the ticket's audit log. | ændringslog | log entry, history item |
| **Seed data** | Data the app starts with, here the four tickets from the case, so the app is not empty the first time it runs. | startdata | mock, fixtures (those are for tests) |
| **KPI** | A number on the dashboard, e.g. tickets pending, tickets awaiting approval. | KPI | metric, stat |

## People

| Term | Meaning | Dansk |
|---|---|---|
| **Operator** | Creates tickets and sends them to partners. | operatør |
| **Manager** | Approves or rejects tickets. | manager / leder |
| **Partner user** | Works on the tickets assigned to its partner: acknowledges receipt, uploads result images and delivers. Sees only its own tickets. | partnerbruger |

There is no login. The acting user is chosen in the UI and sent with every request; the role comes from that user, and the backend enforces what each role may do.

## Words that are easy to mix up

| Word | Where it collides | How we use it |
|---|---|---|
| **Style** | The brief's form field "style" means the requested look. Our *Style view* is a photo. | The requested look is the **variant** (colour, optionally a pattern). "Style" is only used for the `_007` photo. |
| **Reference** | *Reference number* (`5081887`) and *reference image* (the print file). | Always say which. In the data model the field is `reference` (the number) and the slot is `REFERENCE` (the image). |
| **Queue** | The *ticket queue* the users see, and the technical *job queue* that simulates the partner. | "Queue" alone means the ticket queue. The technical one is always called the **job queue**. |
| **Job** | A *queue job* in the job queue. | "Job" is only used for the job queue's work items, never for a ticket. |
| **Version** | A variant, a round, or an API version. | Say **variant** for a version of the garment, **round** for a delivery cycle, and **v1** only for the API. |

## Using the language

- The names in this glossary are the names in the code: `Ticket`, `Variant`, `Colour`, `Pattern`, `ResultImage`, `Round`. The Approved Library is a list of approved results, not a type of its own. Do not introduce `Order`, `Version` or `Item` for them.
- API paths, field names and UI labels follow the same words.
- When a new concept appears, add it here first.
