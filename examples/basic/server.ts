import { app, router } from './factories/app';
import { evanesceRouter, signals } from './factories/evanesce';
import { renderHomePage } from './controllers/pages/home';
import { createCustomerServiceReview } from './controllers/rest/customer-service-review';

// Disappearing Routes
evanesceRouter.get('/', renderHomePage, [signals.customerServiceReviews]);

// Standard Routes
router.post('/rest/customer-service-review', createCustomerServiceReview);

app.use('/', router);
app.listen(3000, () => console.log('listening at localhost:3000'));
