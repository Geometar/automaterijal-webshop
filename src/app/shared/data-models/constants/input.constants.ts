// For more regex values see - https://regex101.com/
export const REGEX_ALPHANUMERIC = '[a-zA-Z0-9- ]*';

export const REGEX_POSITIVE_INTEGER = '^[0-9]+$';

/**
 *
 * EMAIL ADDRESS REGEX
 * Accepted: "john.doe@email.com", "norman@conti.de"
 * Invalid: "john.doe@", "norman.conti.de"
 *
 */

export const EMAIL_ADDRESS =
	"^[a-zA-Z]+[a-zA-Z0-9_#'\\?`\\.{}-]*@[a-zA-Z]+[a-zA-Z0-9-]+(\\.[a-zA-Z0-9-]+)*(\\.[A-Za-z]{2,})$";

/**
 *
 *  STREET ADDRESS REGEX
 * 	Accepted: "1 Reitwallstraße", "Reitwallstraße 1", "1 Reitwall-straße", "reitwall'straße", "1 reitwall-straße-", "reitwall'straße'", "1 ", "Reitwallstraße/Reitwallstraße"
 *	Invalid: " Reitwallstraße 1", "1 Reitwallstraße;".
 */

export const STREET_ADDRESS = "^[a-zA-Z0-9]+(?:[\\s'-/a-zA-Z0-9]+)*$";

/**
 *
 * FAX NUMBER REGEX
 * Accepted: "447-870563", "80056 3216890", "447-3216890", "447 3216890"
 * Invalid: "447870563", "80056 32190", "67 9034821"
 */
export const FAX_NUMBER = '^[0-9]{3,5}[-\\s][0-9]{6,7}';

/**
 *
 * COMPLETE BARCODE REGEX
 * Accepted: Digit of length 10 to 12
 * Invalid: Any other value
 */
export const BARCODE_REGEX = '^\\d{10}$|^\\d{12}$';

/**
 *
 * BARCODE WITHOUT PREFIX REGEX
 * Accepted: Digits of length 7 to 9
 * Invalid: Any other value
 */
export const BARCODE_WITHOUT_PREFIX_REGEX = '^\\d{7}$|^\\d{9}$';

/**
 * MAX_9DIGITS_2DECIMALS REGEX
 * Used for price and quantity inputs, in Purchase Order Items table
 * Accepted: up to 9 digits, with up to 2 optional decimal values
 */
export const MAX_9DIGITS_2DECIMALS = /^\d{1,9}(\.\d{1,2})?$/;
