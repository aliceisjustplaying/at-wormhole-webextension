export class BidirectionalMap<K1, K2> {
  private forwardMap = new Map<K1, K2>();
  private reverseMap = new Map<K2, K1>();

  set(k1: K1, k2: K2): void {
    const existingK2 = this.forwardMap.get(k1);
    const existingK1 = this.reverseMap.get(k2);

    if (existingK2 !== undefined) {
      this.reverseMap.delete(existingK2);
    }

    if (existingK1 !== undefined) {
      this.forwardMap.delete(existingK1);
    }

    this.forwardMap.set(k1, k2);
    this.reverseMap.set(k2, k1);
  }

  getByFirst(k1: K1): K2 | undefined {
    return this.forwardMap.get(k1);
  }

  getBySecond(k2: K2): K1 | undefined {
    return this.reverseMap.get(k2);
  }

  delete(k1: K1, k2: K2): boolean {
    const currentK2 = this.forwardMap.get(k1);
    const currentK1 = this.reverseMap.get(k2);

    if (currentK2 === k2 && currentK1 === k1) {
      this.forwardMap.delete(k1);
      this.reverseMap.delete(k2);
      return true;
    }

    return false;
  }

  clear(): void {
    this.forwardMap.clear();
    this.reverseMap.clear();
  }

  get size(): number {
    return this.forwardMap.size;
  }
}
