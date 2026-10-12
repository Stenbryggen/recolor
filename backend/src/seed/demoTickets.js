import { readFile } from 'node:fs/promises';
import path from 'node:path';

// The four tickets from the case (Ticket 1-4), as input for the createTicket use case.
// Guideline texts are copied from the Guideline.rtf files (formatting removed).
// `files` says where each photo is in the recolour-case folder, which is not part of this repository.
// If that folder is not found, a tiny placeholder image is used instead of the photo.

const CLIPPING_PATH_LINE =
  'Please be aware to keep clipping path for all pictures (but only 1 clipping path)';

function guideline(lines) {
  return ['Can you please make:', '', CLIPPING_PATH_LINE, '', ...lines].join('\n');
}

function files(ticketNo, articleNo, reference, referenceImage) {
  const folder = `Ticket ${ticketNo}`;
  const source = (suffix) => `${folder}/${articleNo}_${reference}_${suffix}.jpg`;

  return {
    FRONT: source('001'),
    BACK: source('002'),
    STYLE: source('007'),
    REFERENCE: `${folder}/${referenceImage}.jpg`,
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

// A 1x1 pixel PNG.
const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

// The photo from the case folder, or the placeholder if the folder or the photo is missing.
async function uploadFor(relativePath, caseDir) {
  const fileName = path.basename(relativePath);

  if (caseDir) {
    try {
      const buffer = await readFile(path.join(caseDir, relativePath));
      return { originalName: fileName, mimeType: 'image/jpeg', buffer };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  const photoId = fileName.slice(0, fileName.lastIndexOf('.'));
  return { originalName: `${photoId}.png`, mimeType: 'image/png', buffer: PLACEHOLDER_PNG };
}

// Creates the demo tickets through the real use case, so they are validated
// and audited like any other ticket. The first Operator is the creator.
export async function seedDemoTickets(container, { creatorId = 'user-maria', caseDir } = {}) {
  const creator = await container.repositories.users.get(creatorId);

  for (const { files: paths, ...data } of demoTickets) {
    const uploads = {};
    for (const [slot, relativePath] of Object.entries(paths)) {
      uploads[slot] = await uploadFor(relativePath, caseDir);
    }
    await container.useCases.createTicket(data, uploads, creator);
  }
}
