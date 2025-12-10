interface Entitlements {
  maxMessagesPerDay: number;
}

/**
 * User entitlements
 *
 * Model selection is abstracted - all users use the same model
 * Entitlements only control rate limits
 */
export const userEntitlements: Entitlements = {
  maxMessagesPerDay: 100,
};
