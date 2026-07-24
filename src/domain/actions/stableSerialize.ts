export function stableSerialize(value: unknown): string {
  const active = new Set<object>();

  function encode(current: unknown): string {
    if (current === null) return 'null';
    if (current === undefined) return 'undefined';
    if (typeof current === 'string') return `string:${JSON.stringify(current)}`;
    if (typeof current === 'boolean') return current ? 'boolean:true' : 'boolean:false';
    if (typeof current === 'number') {
      if (!Number.isFinite(current)) throw new TypeError('Cannot serialize a non-finite number.');
      return `number:${Object.is(current, -0) ? '-0' : String(current)}`;
    }
    if (typeof current === 'bigint') return `bigint:${current.toString()}`;
    if (typeof current === 'function') throw new TypeError('Cannot serialize a function.');
    if (typeof current === 'symbol') throw new TypeError('Cannot serialize a symbol.');
    if (active.has(current)) throw new TypeError('Cannot serialize a cyclic value.');

    active.add(current);
    try {
      if (Array.isArray(current)) return `array:[${current.map((item) => encode(item)).join(',')}]`;
      const prototype = Object.getPrototypeOf(current);
      if (prototype !== Object.prototype && prototype !== null) throw new TypeError('Cannot serialize a non-plain object.');
      const entries = Object.keys(current as Record<string, unknown>)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${encode((current as Record<string, unknown>)[key])}`);
      return `object:{${entries.join(',')}}`;
    } finally {
      active.delete(current);
    }
  }

  return encode(value);
}
