import { app, router } from './factories/app';
import { db } from './factories/db';
import { evanesceRouter, signals } from './factories/evanesce';
import { renderHomePage } from './controllers/pages/home';
import { renderProductPage } from './controllers/pages/product';
import { createCustomerServiceReview } from './controllers/rest/customer-service-review';
import { adjustProductInventory } from './controllers/rest/product';

const products = db.many(`SELECT * from product`);

// Disappearing Routes
evanesceRouter.get('/', renderHomePage, [signals.customerServiceReviews]);
evanesceRouter.get(
  '/product/:slug',
  renderProductPage,
  [
    (product) => signals.products.nested[product.id],
    (product) => signals.reviews.nested[product.id]
  ],
  products
);

// Standard Routes
router.post('/rest/customer-service-review', createCustomerServiceReview);
router.post('/rest/webhook/product-inventory', adjustProductInventory);

app.use('/', router);
app.listen(3000, () => console.log('listening at localhost:3000'));
