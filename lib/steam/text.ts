/**
 * Steam échappe les crochets littéraux (`\[ General ]`) pour qu'ils ne soient
 * pas lus comme du BBCode. À l'affichage et avant traduction, on veut les
 * crochets seuls — sinon la protection BBCode mange `[…]` et laisse un `\`.
 */
export function unescapeSteamBrackets(text: string): string {
  return text.replace(/\\([\[\]])/g, "$1");
}
