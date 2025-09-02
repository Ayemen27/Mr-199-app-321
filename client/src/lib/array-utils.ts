/**
 * دوال الحماية للمصفوفات لمنع أخطاء .find() و .map()
 */

/**
 * بحث آمن في المصفوفة مع حماية من الأخطاء
 */
export function safeFind<T>(array: T[] | undefined | null, predicate: (item: T) => boolean): T | undefined {
  if (!Array.isArray(array)) return undefined;
  return array.find(predicate);
}

/**
 * تحويل آمن للمصفوفة مع حماية من الأخطاء
 */
export function safeMap<T, U>(array: T[] | undefined | null, mapper: (item: T, index: number) => U): U[] {
  if (!Array.isArray(array)) return [];
  return array.map(mapper);
}

/**
 * تصفية آمنة للمصفوفة مع حماية من الأخطاء
 */
export function safeFilter<T>(array: T[] | undefined | null, predicate: (item: T) => boolean): T[] {
  if (!Array.isArray(array)) return [];
  return array.filter(predicate);
}

/**
 * التأكد من أن القيمة مصفوفة صالحة
 */
export function ensureArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * التحقق من صحة المصفوفة وأنها تحتوي على عناصر
 */
export function isValidArray<T>(value: any): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * تحويل القيمة إلى مصفوفة آمنة مع ضمان الطول
 */
export function safeArray<T>(value: T[] | T | undefined | null): T[] {
  if (Array.isArray(value)) return value;
  if (value !== undefined && value !== null) return [value];
  return [];
}