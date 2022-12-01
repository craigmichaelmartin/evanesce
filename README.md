# [Evanesce](https://github.com/craigmichaelmartin/evanesce)

## Installation

```bash
npm install --save evanesce
```

## What is Evanesce?

Evanesce is a tool to provide Static Route Generation (SRG) by disappearing your web framework for opt-in routes and building the HTML for a route in the background when a dependency of the route changes. The built HTML is passed to a specified callback where you can push it to the edges.

## How does it work?

Evanesce provides a Router (which mirrors your web framework router) and Signals (based on what you specify, and are used to define the dependecies of a route). Evanesce manages re-building routes in the background when a depedency signal of them is triggered.

For example:

```typescript
// We specify the signals we will use
const signalKeys = ['customerServiceReviews'];

// We specify the callback function for when a route is rebuilt
const onRouteRebuild = ({ signal, route, html }) => {
  /* push html to edge */
};

// Create our express app and route
export const app = express();
export const router = express.Router();

// Pass all these to evanesce, and receive our evanesce router and signals
const { evanesceRouter, signals } = create({
  app,
  router,
  signalKeys,
  onRouteRebuild
});

// Rather than using an express router
// router.get('/', renderHomePage);

// We use the evanesce router
evanesceRouter.get('/', renderHomePage, [signals.customerServiceReviews]);

// Later, when we are saving a customer service review, we trigger the
// customer service review signal.
signals.customerServiceReviews.rebuildDependencies();
```

### Basic Signals

When specifying the signal keys, we can pass a string name for a signal. This will ensure a signal exists with this name.

```typescript
// We specify a signal we will use
const signalKeys = ['customerServiceReviews'];
```

A route can depend on a signal and rebuild whenever the signal is triggered.

```typescript
// A route depending on a basic signal.
// This route will rebuild when the signal is triggered.
evanesceRouter.get('/', renderHomePage, [signals.customerServiceReviews]);
```

### Nested Signals

In addition to basic signals, there are also nested signals. When specifying the signal keys, we can pass an object instead of a string.

```typescript
// We specify a nested signal we will use
const signalKeys = [
  {
    key: 'reviews',
    keys: ['fibityFoo', 'bibityBar']
  }
];
```

The key is the base signal name, and the keys are nested signal names. A route can depend on a base signal or a specific nested signal. If a route depends on the base trigger, it will rebuild when any nested signals are triggered, or if the base signal is triggered. If a route depends on a specific nested signal, it will rebuild when the specific nested signal is triggered, or if the base signal is triggered.

```typescript
// A route depending on a base signal.
// This route will rebuild when any nested signals are triggered,
// or if the base signal is triggered.
evanesceRouter.get('/', renderHomePage, [signals.reviews]);

// A route depending on a specifc nested signal.
// This route will rebuild when this specific nested signal is triggered,
// or if the base signal is triggered.
evanesceRouter.get('/', renderHomePage, [signals.reviews.nested.fibityFoo]);
```

### Route Variations

Many times routes include dynamic route parameters. `evanesceRouter` accepts a fourth parameter to specify variations to use for these routes.

For example:

```typescript
// A route can specify a variations array to enumerate all the supported
// route variations.
// This route specifies two route variations with dependencies on the
// reviews signal:
// - `/product/fibity-foo` which depends on `signals.reviews`
// - `/product/bibity-bar` which depends on `signals.reviews`
// [NOTE: Keep reading to see how to improve this example.]
evanesceRouter.get(
  '/product/:slug',
  renderProductPage,
  [signals.reviews],
  [{ slug: 'fibity-foo' }, { slug: 'bibity-bar' }]
);
```

This enumerates a route for `/product/fibity-foo` and `/product-bibity-bar`. Notice though that while we are enumerating all the supported route variations, each route variation has a dependency on the base `signals.reviews`. This isn't ideal, as each route variation route really only depends on the reviews of that product, not all reviews. As the code is written, whenever a review of any product is triggered, all the product pages will rebuild.

We can do better.

### Route Dependencies

The dependency array we use to define a route's dependency on signals can accept an array not just of signals (as we have seen), but also of functions which return signals. This function is called for each route variation with that variation's object.

```typescript
// A route's depedency array can be of signals, or of functions which return
// signals.
// This route specifies two route variations each with its own depependencies:
// - `/product/fibity-foo` which depends on `signals.reviews.nested.fibityFoo`
// - `/product/bibity-bar` which depends on `signals.reviews.nested.bibityBar`
evanesceRouter.get(
  '/product/:slug',
  renderProductPage,
  [(variation) => signals.reviews.nested[variation.value]],
  [
    { value: 'fibityFoo', slug: 'fibity-foo' },
    { value: 'fibityFoo', slug: 'bibity-bar' }
  ]
);
```

## Practical Example

Lets start with a basic express app.

```typescript
/* ------- factories/app.ts --------------------------------------- */
// ✅ Just a regular express app
import express from 'express';
export const app = express();
export const router = express.Router();
```

Lets configure Evanesce.

```typescript
/* ------- factories/evanesce.ts ---------------------------------- */
// 🔵 Configure evanesce and export the router and signals
import { create } from 'evanesce';
import { app, router } from '../app';

const products = someDataAccessMethodThatReturns([
  { id: '1', slug: 'fibity-foo', label: 'Fibity Foo', quantity: 1 },
  { id: '2', slug: 'bibity-bar', label: 'Bibity Bar', quantity: 2 }
]);
const signalKeys = [
  'customerServiceReviews',
  {
    key: 'reviews',
    keys: products.map((product: { id: string }) => product.id)
  },
  {
    key: 'products',
    keys: products.map((product: { id: string }) => product.id)
  }
];
const onRouteRebuild = ({ signal, route, html }) => {
  // push html to edge
};
export const { evanesceRouter, signals } = create({
  app,
  router,
  signalKeys,
  onRouteRebuild
});
```

We are creating three signals by passing in three signalKeys. The first (`customerServiceReviews`) is specifying a basic signal, and the second two (`reviews` and `products`) are defining nested signals. The signals created from this (which we end up exporting in the last line of this file) may trigger builds of routes that depend on them by calling the `rebuildDependencies`. We'll see below how a route lists a signal as a dependency, and on how we call `rebuildDependencies` on a signal to trigger rebuilds for routes which depend on it. In the case of nested signals, we can use the top-level signal exactly like a basic signal, but can also have a route depend on, and later trigger, a specific nested signal. We can see that for the `reviews` and `products` signals, each have nested signals for each product id.

Lets now look at our server setting up our routes.

```typescript
/* ------- server.ts ---------------------------------------------- */
import { app, router } from './factories/app';
import { evanesceRouter, signals } from './factories/evanesce';
import { renderHomePage } from './controllers/pages/home';
import { createCustomerServiceReview } from './controllers/rest/customer-service-review';

// Disappearing Routes
// 🔵 Use evanesce router instead of express router and list dependencies
// router.get('/', renderHomePage);
evanesceRouter.get('/', renderHomePage, [
  signals.customerServiceReviews,
  signals.products
]);
// 🔵 Use evanesce router instead of express router, list dependencies,
// and provide variations array for expected params values.
// router.get('/product/:slug', renderProductPage);
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
router.post(
  '/rest/customer-service-review',
  ensureLoggedInUser,
  createCustomerServiceReview
);
router.post('/rest/review', ensureLoggedInUser, createReview);
router.put('/rest/webhook/product', ensurePartnerApiKey, updateProduct);

app.use('/', router);
app.listen(3000, () => console.log('listening'));
```

We have opted two routes into SRG with evanesce: the `/` route and the `/product/:slug` route.

The `/` route depends on the `customerServiceReviews` signal, as well as the products signal. We can imagine this home page showing the products (hence the dependency), as well as including some general customer service reviews of the brand above the footer (hence that dependency). Whenever `signals.customerServiceReviews.rebuildDependencies` is called, this route will rebuild. Similarly, whenever `signals.products.rebuildDependencies` (or any specific nested signal like `signals.products.nested['1'].rebuildDependencies` is triggered, this route will rebuild.

The `/product/:slug` route is more advanced. The route includes a URL parameter, and so to specify all the url paths to build we provide a fourth value to the evanesce router: a variations array. This array is a list of the products, each product object containing a key matching the parameter in the route. Given our example of two products, we will establish routes for `/product/fibity-foo` and `/product/bibity-bar`.

This variations array is used in a second and related way. Notice that our dependency array for the route now has dependency functions. A dependency function is evaluated with the variation object for that specific variation. This means the `/product/fibity-foo` route has a dependency on `signals.products.nested['1']` and `signals.products.nested['1']`, while the `bibity-bar` route has a dependency on `signals.products.nested['2']` and `signals.reviews.nested['2']`. Each variation route has their own specific dependencies.

Let turn to the page controllers, which are uneffected by the page using express routing or SRG with evanesce (see further down for cases where this wouldn't be true).

```typescript
/* ------- controllers/pages/home.ts ------------------------------ */
// ✅ No change here
import {db} from '../../factories/db';
export const renderHomePage = (req, res) => {
  const customerServiceReviews = await db.any(`SELECT * from c_s_review`);
  const products = await db.any(`SELECT * from product`);
  res.render('home.html', {customerServiceReviews, products});
});

/* ------- controllers/pages/product.ts --------------------------- */
// ✅ No change here
import {db} from '../../factories/db';
export const renderHomePage = (req, res) => {
  const slug = req.params.slug;
  const product = await db.any(`SELECT * from product where slug = $(slug)`, {slug});
  const reviews = await db.any(`SELECT * from review where productId = $(productId)`, {productId: product.id});
  res.render('home.html', {product, reviews});
});
```

Lets now look at the rest API controllers. The only change here will be to trigger signals corresponding to data that is changing. Probably actual controller code would be thinner and call into a data access layer where data is updated. If so, triggering signals would be within that data access layer.

```typescript
/* ------- controllers/rest/customer-service-review.ts ------------ */
import { db } from '../../factories/db';
import { signals } from '../../factories/evanesce';

export const createCustomerServiceReview = (req, res) => {
  const customerServiceReview = await db.one(
    `INSERT into customer_service_review (content) values ($(content)) RETURNING *`,
    { content: req.body.content }
  );
  // 🔵 Trigger the customerServiceReviews signal
  signals.customerServiceReviews.rebuildDependencies();
  return res.json(customerServiceReview);
};

/* ------- controllers/rest/review.ts ----------------------------- */
import { db } from '../../factories/db';
import { signals } from '../../factories/evanesce';

export const createReview = (req, res) => {
  const { content, productId } = req.body;
  const review = await db.one(
    `INSERT into review (content, productId) values ($(content), $(productId)) RETURNING *`,
    { content, productId }
  );
  // 🔵 Trigger the reviews signal for this specific productId
  signals.reviews.nested[productId].rebuildDependencies();
  return res.json(review);
};

/* ------- controllers/rest/product.ts ---------------------------- */
import { db } from '../../factories/db';
import { signals } from '../../factories/evanesce';

export const updateProduct = (req, res) => {
  const { id, quanity } = req.body;
  const product = await db.one(
    `UPDATE product set inventory = $(quanity) where id = $(id) returning *`,
    { id, quanity }
  );
  // 🔵 Trigger the products signal for this specific productId
  signals.products.nested[id].rebuildDependencies();
  return res.json(product);
};
```

And that's it! We've created our evanesce signals and router in `factories/evanesce`. We opted-in two routes, passing along the variations for those route params, and configuring their specific dependencies. And finally we triggered those signals when corresonding data changed.

## Comparision with SSR

Evanesce works alongside traditional web frameworks using traditional server side rendering (SSR) to inject opt-in, per-route dynamic static generation. It contrasts with SSR in these ways:

- **Build trigger**: Evanesce builds HTML on _data change_ so it is always ready for user requests. Traditional web frameworks using SSR build HTML on _user request_ (while the user is waiting).
- **State at edges**: Evanesce orchestrates _pushing_ the route's state to the edges when a dependency of the route changes. By definition the most up-to-date HTML (the state of the sytem) is always at the edge. Traditional web frameworks using SSR have state centralized in the data source and _pull_ it JIT when constructing the page state.

## Comparison with CDN caching

SSR using an `s-max-age` and `stale-while-revalidate` CDN caching strategy, (similiar to Incremental Static Site Generation) is among the best strategies for delivering content quickly to users.

Evanesce shares this goal, but operates under a different paradigm. With Evanesce, a CDN is a pushed-to performance layer, not a cache-based pulling layer.

It contrasts with SSR using CDN caching in these ways:

- **Build trigger**: Evanesce builds and _pushes_ HTML on _data change_ so it is always ready for user requests. CDN caching with `stale-while-revalidate` serves potentially inaccurate data while pulling for newly built HTML _after_ a user request for the next user, out-of-band and uninformed of data changing.
- **State at edges**: Evanesce orchestrates _pushing_ the route's state to the edges when a dependency of the route changes. By definition the most up-to-date HTML (the state of the sytem) is always at the edge. CDN caching with `state-while-revalidate` cache layers _pull_ to potentially invalidate and retreive new page state. By definition the caching mechanism has the state divorced from the source.

### An emoji story example

Lets take an example product page. We’ll use some emojis to tell the story.

➡️ = Request comes in\
😄 = Fast response which contains accurate data\
🥱 = Slow response which contains accurage data\
😨 = Fast response but contains inaccurage data\
⚒️ = HTML being built\
⏰ = Our `s-max-age` has passed\
💰 = A purchase occurs\
⭐ = A review for the product occurs

First let start with Server Side Rendering (SSR) using an `s-max-age` of 1 and `stale-while-revalidate` CDN caching strategy. This is very similar to the Incremental Static Site Generation strategy (and for this example, identical).

➡️⚒️🥱\
➡️😄⏰⚒️\
➡️😄⏰⚒️\
💰\
➡️😨⏰⚒️\
➡️😄⏰⚒️\
⭐\
➡️😨⏰⚒️\
➡️😄⏰⚒️\
➡️😄⏰⚒️\
💰\
➡️😨⏰⚒️

With this approach, we build more often than we need to, and still end up showing inaccurate content some of the time. Any pull-based approach offers solutions that are (by definition) out-of-band, arbitrary, an un-informed.

Lets take a look at the same sequence but using Evanesce

⚒️\
➡️😄\
➡️😄\
➡️😄\
💰⚒️\
➡️😄\
➡️😄\
⭐⚒️\
➡️😄\
➡️😄\
➡️😄\
➡️😄\
💰⚒️\
➡️😄

With Evanesce, builds happen only and _exactly_ when they need to. There are are less builds and computational costs, and everyone receives accurate data every time. Evanesce uses an informed push-based paradigm, rather than an out-of-band pull paradigm.

With Evanesce, a CDN is a pushed-to performance layer, not a cache-based pulling layer.

#### What about if we purged instead?

What if - to avoid showing inaccurate data - we purged the cache when data changes? Indeed, purging is “pushed” based and so can be in-band and informed. However, why limit the pushed data to be just a message to purge the CDN? Why not send the newly built HTML and so also avoid a slow next request?

Here is the purge (push-based) story, with a new emoji for purging (💥).

➡️⚒️🥱\
➡️😄⏰⚒️\
➡️😄⏰⚒️\
💰💥\
➡️🥱⏰⚒️\
➡️😄⏰⚒️\
⭐💥\
➡️🥱⏰⚒️\
➡️😄⏰⚒️\
➡️😄⏰⚒️\
💰💥\
➡️🥱⏰⚒️

We’ve traded the inaccurate data 😨 for slow data 🥱.

But why not

⚒️\
➡️😄\
➡️😄\
➡️😄\
💰⚒️\
➡️😄\
➡️😄\
⭐⚒️\
➡️😄\
➡️😄\
➡️😄\
➡️😄\
💰⚒️\
➡️😄

#### Summary

| SSR    | SSR w/ CDN caching | SSR w/ CDN caching w/ Purging | Evanesce |
| ------ | ------------------ | ----------------------------- | -------- |
|        |                    |                               | ⚒️       |
| ➡️⚒️🥱 | ➡️⚒️🥱             | ➡️⚒️🥱                        | ➡️😄     |
| ➡️⚒️🥱 | ➡️😄⏰⚒️           | ➡️😄⏰⚒️                      | ➡️😄     |
| ➡️⚒️🥱 | ➡️😄⏰⚒️           | ➡️😄⏰⚒️                      | ➡️😄     |
| 💰     | 💰                 | 💰                            | 💰⚒️     |
| ➡️⚒️🥱 | ➡️😨⏰⚒️           | ➡️🥱⏰⚒️                      | ➡️😄     |
| ➡️⚒️🥱 | ➡️😄⏰⚒️           | ➡️😄⏰⚒️                      | ➡️😄     |
| ⭐     | ⭐                 | ⭐                            | ⭐⚒️     |
| ➡️⚒️🥱 | ➡️😨⏰⚒️           | ➡️🥱⏰⚒️                      | ➡️😄     |
| ➡️⚒️🥱 | ➡️😄⏰⚒️           | ➡️😄⏰⚒️                      | ➡️😄     |
| ➡️⚒️🥱 | ➡️😄⏰⚒️           | ➡️😄⏰⚒️                      | ➡️😄     |
| 💰     | 💰                 | 💰                            | 💰⚒️     |
| ➡️⚒️🥱 | ➡️😨⏰⚒️           | ➡️🥱⏰⚒️                      | ➡️😄     |

_This emoji story was inspired by Ryan Florence's [CDN Caching, Static Site Generation, and Server Side Rendering](https://www.youtube.com/watch?v=bfLFHp7Sbkg) video, which is well worth the watch!_

## Ways to think about Evanesce

**Evanesce is optimized for reads not writes.**

Traditional web frameworks exist within a model optimized for "writes". Any system can write data to the persistence mechanisms at any time. Writes are easy and fast. But this is because "reads" are expensive: for every request the web framework must receive it, fetch data from persistence mechanism, and serialize the data into templates.

Evanesce is a web framework built on a different paradigm optimized for "reads". Evanesce orchestrates capturing the dependencies of routes, and pushing the page's built HTML to the edge. In development mode, Evanesce is like any other framework where pages are built just in time. But in production mode, the framework disappears into the background: building HTML based on updates to data dependencies and pushing it to the live edges, where production configuration ensures these edges serve this content, and are kept up to date by Evanesce.

## FAQ

### Can nested signals be used the same as regular signals?

Yes. Lets say we have specify a nested signal:

```typescript
const signalKeys = [
  {
    key: 'products',
    keys: ['foo', 'bar']
  }
];
const { signals } = create({ app, router, signalKeys, onRouteRebuild });
```

We can both subscribe to, and trigger the base signal:

```typescript
// This will cause a rebuild of the route if the base signal
// `signals.products.rebuildDependencies` is triggered, or when any nested
// signal is triggered (eg `signals.products.foo.rebuildDependencies`).
evanesceRouter.get('/', renderHomePage, signals.products);

// This will cause a rebuild of the route when the nested signal for product
// foo is triggered: `signals.products.foo.rebuildDependencies`, or if the
// base is triggered (`signals.products.rebuildDependencies`).
evanesceRouter.get('/', renderHomePage, signals.products.foo);

// This will rebuild routes with a dependency on products or any nested product
signals.products.rebuildDependencies();

// This will rebuild routes with a dependency on the nested foo product, or
// on the base product.
signals.products.foo.rebuildDependencies();
```

### When does Evanesce usage make the most sense?

Evanesce makes the most sense when:

- performance is key. Evanesce ensures the latest HTML is always pre-built at the edges.
- reads out-number writes. Imagine a basic ecommerce product page. Lets say the product page updates when the product inventory changes or when a product review is submitted. A good product page might hae a 5% conversion rate, and a 10% review rate post purchase. This means the number of "reads" of the page are an order of magnitude larger than the number of times that page is re-written (from a purchase or review). Apart from performance motivations, there is also cost motivation to write on update, and not on request.

These two factors form a spectrum for when evanesce usage makes the most sense. If a page's most important metric is performance, and the reads out-number the writes, it is an easy call to use evanesce. Similarly the opposite, to not use it. Left to your judgement are discerning the tradeoffs when performance is important, but the writes far out-way the reads. Apart from much more computation costs (pages are written many times in-between user requests) working against the decision to opt in this route, there is also the probable increasted signal complexity - perhaps it is one signal that is triggering all the re-renders, but often times the "writes" far out-number the "reads" is that there are many signals contributing (eg, a dashboard page).

### When would I not want to use Evanesce?

Evanesce makes tradeoffs which would not be ideal for a route which:

- has data changes far in excess of user requests for a page which doesn't have a high priority on perforance. If the data changes significantly more than there are user requests, a lot of extra work would be done compared to building HTML on user requests.
- depends on data to a persistence mechanism which happen out of scope of Evanesce running on the web server. Evanesce rebuilds HTML based on dependency signals being triggered, and if updates to a route's dependencies are out-of-band there is no way to trigger that signal. For example, if you pull data written from third parties updated on their platforms; or if you ssh into a database server and making updates to data a route depends on; etc.
- needs to read data from the request object (headers, cookies, url parameters, etc), or set data on the response object (cookies, etc). Since these routes are pre-rendered on dependency change and not user request, router controllers do not receive a request and response objects.

### What should `onRouteBuild` actually do?

What to do with the built HTML pages is up to you, and its worth noting these built HTML pages provided in realtime _allow_ you to disappear your traditional web framework, but technically the web framework route is alawys available. Evanesce hands these pages to you in realtime, to push to CDN edges, or place them in a configured directory for your reverse proxy to serve directly, etc. This means the live "routes" are always available (in development and production), but you would have production configuration where these routes are handled earlier in the request lifecycle (CDN, reverse proxy) before getting to the live request handler for the route.

### Is it production ready?

Evanesce was extracted out of the Kujo codebase, where a much older (2018) and less generalized version is in production now at [www.kujo.com](https://www.kujo.com) - powering the marketing pages. In Kujo's case, the `onRouteBuild` builds the html into files in a directory which nginx is configured to serve for the opted-in routes.

## Meta Misc

Change "depends on" to "subscribed to" everywhere? Subscribed seems more natural for a signal which triggers, but the notion of a dependency array is now a familiar pattern with react hooks, and the API is more like this than RxJS.
