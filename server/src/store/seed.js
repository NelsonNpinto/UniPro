// Prices are integer minor units (paise). The last product intentionally has a
// single unit so the concurrent-checkout test has a last-unit contention case.
export const seedProducts = [
  { name: 'USB-C Charging Cable', unitPriceMinor: 49900, availableInventory: 120 },
  { name: 'Wireless Mouse', unitPriceMinor: 129900, availableInventory: 40 },
  { name: 'Mechanical Keyboard', unitPriceMinor: 549900, availableInventory: 15 },
  { name: 'Aluminium Laptop Stand', unitPriceMinor: 219900, availableInventory: 25 },
  { name: '27-inch 4K Monitor', unitPriceMinor: 1899900, availableInventory: 8 },
  { name: 'Limited Edition Dock', unitPriceMinor: 999900, availableInventory: 1 },
];
