import { InjectionToken, makeStateKey, StateKey } from '@angular/core';
import { Roba } from '../data-models/model/roba';

/**
 * Injection token used during SSR to provide pre-fetched product data to Angular.
 * Default factory returns null so client-side code can inject it without extra guards.
 */
export const SSR_PRODUCT_DATA = new InjectionToken<Roba | null>('SSR_PRODUCT_DATA', {
  factory: () => null,
});

/**
 * TransferState key that mirrors the SSR-provided product payload so the
 * browser can hydrate without issuing another API call.
 */
export const SSR_PRODUCT_STATE_KEY: StateKey<Roba | null> = makeStateKey<Roba | null>('SSR_PRODUCT_DATA');
