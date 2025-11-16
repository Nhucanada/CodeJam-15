/**
 * Glass icon SVG generators with customizable colors
 * Each function returns an SVG string that can be used in the DOM
 */

export interface GlassIconProps {
  liquidColor?: string;
  glassColor?: string;
  width?: number;
  height?: number;
}

/**
 * Creates a Cocktail glass SVG
 */
export function createCocktailIcon({
  liquidColor = '#CC2739',
  glassColor = '#514E51',
  width = 64,
  height = 64,
}: GlassIconProps = {}): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M43 29V26H21V29L21.0001 33V40H32H43V33V29Z" fill="${liquidColor}"/>
<path d="M43 40H21L21.0001 45H43V40Z" fill="${glassColor}"/>
<path d="M29 45H35V50H29V45Z" fill="${glassColor}"/>
<path d="M36 50H42V56H36V50Z" fill="${glassColor}"/>
<path d="M28 50H36V56H28V50Z" fill="${glassColor}"/>
<path d="M22 50H28V56H22V50Z" fill="${glassColor}"/>
</svg>`;
}

/**
 * Creates a Highball glass SVG
 */
export function createHighballIcon({
  liquidColor = '#CC2739',
  glassColor = '#514E51',
  width = 64,
  height = 64,
}: GlassIconProps = {}): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M42 24.9286V17H22V24.9286V35.5H24.8571V54H32H39.1429V35.5H42V24.9286Z" fill="${liquidColor}"/>
<path d="M33.4 50H30.6H25V54H39V50H33.4Z" fill="${glassColor}"/>
</svg>`;
}

/**
 * Creates a Hurricane glass SVG
 */
export function createHurricaneIcon({
  liquidColor = '#CC2739',
  glassColor = '#514E51',
  width = 64,
  height = 64,
}: GlassIconProps = {}): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M28 45H36V50H28V45Z" fill="${glassColor}"/>
<path d="M36 50H41V56H36V50Z" fill="${glassColor}"/>
<path d="M28 50H36V56H28V50Z" fill="${glassColor}"/>
<path d="M23 50H28V56H23V50Z" fill="${glassColor}"/>
<path d="M22 37.0714V45H42V37.0714V26.5H39.1429L39.1429 12H32H24.8571V26.5H22L22 37.0714Z" fill="${liquidColor}"/>
</svg>`;
}

/**
 * Creates a Margarita glass SVG
 */
export function createMargaritaIcon({
  liquidColor = '#CC2739',
  glassColor = '#514E51',
  width = 64,
  height = 64,
}: GlassIconProps = {}): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M54 14V22H50V26H14V22H10V14H54Z" fill="${glassColor}"/>
<path d="M34 52V22H30V52H22V56H42V52H34Z" fill="${glassColor}"/>
<path d="M50 22V26H46H42V30V34H22V30V26H18H14V22H50Z" fill="${liquidColor}"/>
</svg>`;
}

/**
 * Creates a Martini glass SVG
 */
export function createMartiniIcon({
  liquidColor = '#CC2739',
  glassColor = '#514E51',
  width = 64,
  height = 64,
}: GlassIconProps = {}): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M54 14V22H50V26H14V22H10V14H54Z" fill="${glassColor}"/>
<path d="M34 52V22H30V52H22V56H42V52H34Z" fill="${glassColor}"/>
<path d="M50 22V26H46V30H42V34H22V30H18V26H14V22H50Z" fill="${liquidColor}"/>
</svg>`;
}

/**
 * Creates a Pint glass SVG
 */
export function createPintIcon({
  liquidColor = '#CC2739',
  glassColor = '#514E51',
  width = 64,
  height = 64,
}: GlassIconProps = {}): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M45.1515 19.8615V11H18V19.8615V31.6769H21.8788V52.3538H31.5758H41.2727V31.6769H45.1515V19.8615Z" fill="${liquidColor}"/>
<path d="M33.5151 48.4153H29.6364H21.8788V52.3537H41.2727V48.4153H33.5151Z" fill="${glassColor}"/>
</svg>`;
}

/**
 * Creates a Rocks glass SVG
 */
export function createRocksIcon({
  liquidColor = '#CC2739',
  glassColor = '#514E51',
  width = 64,
  height = 64,
}: GlassIconProps = {}): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M42 34.9286V30H22V34.9286L22.0001 41.5V53H32H42V41.5V34.9286Z" fill="${glassColor}"/>
<path d="M42 33.8571V30H22V33.8571L22.0001 39V48H32H42V39V33.8571Z" fill="${liquidColor}"/>
</svg>`;
}

/**
 * Creates a Seidel (beer mug) SVG
 */
export function createSeidelIcon({
  liquidColor = '#CC2739',
  glassColor = '#514E51',
  width = 64,
  height = 64,
}: GlassIconProps = {}): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M43.1235 15H21L21.0001 45.0247H43.1235V15Z" fill="${liquidColor}"/>
<path d="M24.1605 45.0247V48.1852H39.963V45.0247H24.1605Z" fill="${glassColor}"/>
<path d="M43.1235 22.1111V25.2716H52.6049V22.1111H43.1235Z" fill="${glassColor}"/>
<path d="M43.1235 34.7531V37.9136H52.6049V34.7531H43.1235Z" fill="${glassColor}"/>
<path d="M49.4444 34.7531H52.6049V22.1111H49.4444V34.7531Z" fill="${glassColor}"/>
</svg>`;
}

/**
 * Creates a Shot glass SVG
 */
export function createShotIcon({
  liquidColor = '#CC2739',
  glassColor = '#514E51',
  width = 64,
  height = 64,
}: GlassIconProps = {}): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M37 38.4286V35H27V38.4286L27 43V51H32H37V43V38.4286Z" fill="${glassColor}"/>
<path d="M37 37.5714V35H27V37.5714L27 41V47H32H37V41V37.5714Z" fill="${liquidColor}"/>
</svg>`;
}

/**
 * Creates a Zombie glass SVG
 */
export function createZombieIcon({
  liquidColor = '#CC2739',
  glassColor = '#514E51',
  width = 64,
  height = 64,
}: GlassIconProps = {}): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M42.0001 20V11H22V20L22.0001 32V53H32.0001H42.0001V32V20Z" fill="${glassColor}"/>
<path d="M42 19.1429V11H22V19.1429L22.0001 30V49H32H42V30V19.1429Z" fill="${liquidColor}"/>
</svg>`;
}

/**
 * Helper to create an HTMLElement from an SVG string
 */
export function svgStringToElement(svgString: string): SVGSVGElement {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  return doc.documentElement as unknown as SVGSVGElement;
}

/**
 * Map of glass names to their icon generator functions
 */
export const glassIconGenerators = {
  cocktail: createCocktailIcon,
  highball: createHighballIcon,
  hurricane: createHurricaneIcon,
  margarita: createMargaritaIcon,
  martini: createMartiniIcon,
  pint: createPintIcon,
  rocks: createRocksIcon,
  seidel: createSeidelIcon,
  shot: createShotIcon,
  zombie: createZombieIcon,
} as const;

export type GlassIconName = keyof typeof glassIconGenerators;
