import { getColorScheme, getMediaType } from "./media";
import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  applyHelper,
  mask,
  waitFor,
  getWaitFailureExplanations,
} from "./stabilization";

const ArgosGlobal = {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  applyHelper,
  mask,
  waitFor,
  getWaitFailureExplanations,
  getColorScheme: () => getColorScheme(),
  getMediaType: () => getMediaType(),
};

(window as any).__ARGOS__ = ArgosGlobal;

export type ArgosGlobal = typeof ArgosGlobal;
