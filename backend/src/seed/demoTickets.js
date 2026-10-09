// The four tickets from the case (Ticket 1-4), as input for the createTicket use case.
// Guideline texts are copied from the Guideline.rtf files (formatting removed).
// The `file` paths point into the recolour-case folder, which is not part of this repository.

const CLIPPING_PATH_LINE =
  'Please be aware to keep clipping path for all pictures (but only 1 clipping path)';

function guideline(lines) {
  return ['Can you please make:', '', CLIPPING_PATH_LINE, '', ...lines].join('\n');
}

function files(ticketNo, articleNo, reference, referenceImage) {
  const source = (suffix) => ({
    photoId: `${articleNo}_${reference}_${suffix}`,
    file: `recolour-case/Ticket ${ticketNo}/${articleNo}_${reference}_${suffix}.jpg`,
  });

  return {
    FRONT: source('001'),
    BACK: source('002'),
    STYLE: source('007'),
    REFERENCE: {
      photoId: referenceImage,
      file: `recolour-case/Ticket ${ticketNo}/${referenceImage}.jpg`,
    },
  };
}

const solid = (colourId) => ({ operations: [{ type: 'RECOLOUR', colourId }] });

const printed = (colourId, patternId, notes) => ({
  operations: [
    { type: 'RECOLOUR', colourId },
    { type: 'AOP', patternId },
  ],
  notes,
});

export const demoTickets = [
  {
    articleNo: '15377489',
    reference: '5081878',
    priority: 'NORMAL',
    partnerId: 'partner-pixelworks',
    guidelineText: guideline([
      '15377489_001+002 +007 please make pantone color: Granita -solid',
      '15377489_001+002 +007 please make pantone color: Fuchsia Fedora, AOP Block Libre (as attached: Block Libre)',
    ]),
    variants: [solid('granita'), printed('fuchsia-fedora', 'block-libre')],
    files: files(1, '15377489', '5081878', 'Block Libre'),
  },
  {
    articleNo: '15377486',
    reference: '5078866',
    priority: 'HIGH',
    partnerId: 'partner-pixelworks',
    guidelineText: guideline([
      '15377486_001+002 +007 please make pantone color: Night Sky, AOP White Dots (as attached: DOTS CLOUD DANCER -but night sky, not black)',
      '15377486_001+002 +007 please make pantone color: Hedge Green -solid',
      '15377486_001+002 +007 please make pantone color: Navy Blazer-solid',
    ]),
    variants: [
      printed('night-sky', 'dots-cloud-dancer', 'Night Sky, not black'),
      solid('hedge-green'),
      solid('navy-blazer'),
    ],
    files: files(2, '15377486', '5078866', 'DOTS CLOUD DANCER'),
  },
  {
    articleNo: '15377488',
    reference: '5078869',
    priority: 'NORMAL',
    partnerId: 'partner-clipmaster',
    guidelineText: guideline([
      '15377488_001+002 +007 please make pantone color: Hedge Green -solid',
      '15377488_001+002 +007 please make pantone color: Navy Blazer-solid',
      '15377488_001+002 +007 please make pantone color: Night Sky, AOP White Dots (as attached: DOTS CLOUD DANCER -but night sky, not black)',
    ]),
    variants: [
      solid('hedge-green'),
      solid('navy-blazer'),
      printed('night-sky', 'dots-cloud-dancer', 'Night Sky, not black'),
    ],
    files: files(3, '15377488', '5078869', 'DOTS CLOUD DANCER'),
  },
  {
    articleNo: '15377522',
    reference: '5081887',
    priority: 'LOW',
    partnerId: 'partner-clipmaster',
    guidelineText: guideline([
      '15377522_001+002 +007 please make pantone color: Granita -solid',
      '15377522_001+002 +007 please make pantone color: Fuchsia Fedora, AOP Block Libre (as attached: Block Libre)',
    ]),
    variants: [solid('granita'), printed('fuchsia-fedora', 'block-libre')],
    files: files(4, '15377522', '5081887', 'Block Libre'),
  },
];

// Creates the demo tickets through the real use case, so they are validated
// and audited like any other ticket. The first Operator is the creator.
export async function seedDemoTickets(container, { creatorId = 'user-maria' } = {}) {
  for (const input of demoTickets) {
    await container.useCases.createTicket(input, creatorId);
  }
}
