import { describe, expect, it } from 'vitest';
import { checkUpload, contentTypeOf, photoIdFrom } from '../../src/application/uploads.js';
import { PNG } from '../helpers.js';

describe('photoIdFrom', () => {
  it('removes the extension', () => {
    expect(photoIdFrom('15377522_5081887_007.jpg')).toBe('15377522_5081887_007');
    expect(photoIdFrom('Block Libre.jpg')).toBe('Block Libre');
  });

  it('removes folders, and only the last extension', () => {
    expect(photoIdFrom('C:\\photos\\front.final.JPG')).toBe('front.final');
    expect(photoIdFrom('a/b/front.png')).toBe('front');
  });

  it('keeps a name without extension as it is', () => {
    expect(photoIdFrom('front')).toBe('front');
  });
});

describe('checkUpload', () => {
  const upload = (originalName, mimeType) => ({ originalName, mimeType, buffer: PNG });

  it('returns the extension of a JPEG or PNG, and counts jpeg as jpg', () => {
    expect(checkUpload('FRONT', upload('a.jpg', 'image/jpeg'))).toBe('jpg');
    expect(checkUpload('FRONT', upload('a.JPEG', 'image/jpeg'))).toBe('jpg');
    expect(checkUpload('FRONT', upload('a.png', 'image/png'))).toBe('png');
  });

  it('refuses other types and files without an extension', () => {
    expect(() => checkUpload('FRONT', upload('a.gif', 'image/gif'))).toThrow('must be a JPEG or PNG image');
    expect(() => checkUpload('FRONT', upload('a', 'image/png'))).toThrow('must be a JPEG or PNG image');
  });
});

describe('contentTypeOf', () => {
  it('gives the MIME type from the file key', () => {
    expect(contentTypeOf('ticket-1/front.jpg')).toBe('image/jpeg');
    expect(contentTypeOf('ticket-1/front.png')).toBe('image/png');
    expect(contentTypeOf('ticket-1/front')).toBe('application/octet-stream');
  });
});
