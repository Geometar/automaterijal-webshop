export class StringUtils {
  /**
   * Converts any string into a URL-friendly slug.
   * Examples:
   *  - "MAZIVA - OBRADA METALA" -> "maziva-obrada-metala"
   *  - "Filteri (putnički)" -> "filteri-putnicki"
   */
  static slugify(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')                   // razbije dijakritike
      .replace(/[\u0300-\u036f]/g, '')    // ukloni dijakritike
      .replace(/[^a-z0-9\s-]/g, '')       // zadrži samo slova, brojeve i razmake/crtice
      .replace(/\s+/g, '-')               // space -> "-"
      .replace(/-+/g, '-')                // višestruke crtice -> jedna
      .replace(/^-|-$/g, '');             // trimuje crtice sa krajeva
  }

  /**
   * Reverses slug back to normal text (optional helper).
   * Example:
   *  - "maziva-obrada-metala" -> "Maziva obrada metala"
   */
  static deslugify(slug: string): string {
    return slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}