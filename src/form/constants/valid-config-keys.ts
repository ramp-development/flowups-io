import type { AttributeConfig } from '../types';

/**
 * Valid attribute config keys
 */
export const VALID_CONFIG_KEYS: (keyof AttributeConfig)[] = [
  'element',
  'id',
  'cardtitle',
  'settitle',
  'grouptitle',
  'behavior',
  'transition',
  'transitionduration',
  'validateon',
  'allowinvalid',
  'errordisplay',
  'ariaannounce',
  'focusonchange',
  'showif',
  'hideif',
  'textcontent',
  'stylewidth',
  'errorfor',
  'autoinit',
  'persist',
];
