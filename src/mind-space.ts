const evanesceExpress: any = {};
const signals: any = {};
const renderHomePage: any = {};
const renderProductPage: any = {};

// ============================================================================
// Setup Evanesce
// ============================================================================

const products = [{ value: 'fibityfoo', slug: 'fibity-foo', inventory: 1 }];
const signalKeys = [
  {
    key: 'reviews',
    keys: products.map((product: { value: string }) => product.value)
  },
  {
    key: 'inventory',
    keys: products.map((product: { value: string }) => product.value)
  }
];

const evanesce: any = evanesceExpress({ signalKeys });

// ============================================================================
// Setup Routes
// ============================================================================

evanesce.get('/', renderHomePage, [signals.reviews]);
evanesce.get(
  '/product/:slug',
  renderProductPage,
  ({ value }: any) => [signals.inventory[value], signals.reviews[value]],
  products
);

// ============================================================================
// Triggers
// ============================================================================

signals.reviews.fibityfoo.rebuildDependencies();
signals.reviews.rebuildDependencies();
signals.inventory.fibityfoo.rebuildDependencies();
signals.inventory.rebuildDependencies();

// ============================================================================
// What signals would look like
// ============================================================================

// Decided that children should trigger parents and not duplicate their list
// This takes less memory, and I have already decided on the first-class
// support of hierarchy with the api that got me here, so accept hierarchy.

signals.reviews.signalRebuilds = [{ fn: renderHomePage, route: '/' }];
signals.reviews.fibityfoo.signalRebuilds = [
  { fn: renderProductPage, route: '/product/fibity-foo' }
  // Should it include the list of the parent as well:
  // {fn: renderHomePage, route: '/'},
  // or should it then trigger the parent and let the parent be responsible for it?
];
signals.inventory.signalRebuilds = [];
signals.inventory.fibityfoo.signalRebuilds = [
  { fn: renderProductPage, route: '/product/fibity-foo' }
  // Should it include the list of the parent as well
  // or should it then trigger the parent and let the parent be responsible for it?
];
