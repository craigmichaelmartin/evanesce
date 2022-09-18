import express from 'express';
import { evanesceExpress } from './index';

const setup = () => {
  const onRouteRebuild = jest.fn();
  const products = [
    { id: '1', slug: 'fibity-foo', label: 'Fibity Foo', quantity: 1 },
    { id: '2', slug: 'bibity-bar', label: 'Bibity Bar', quantity: 2 }
  ];
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

  const app = express();
  const router: any = {
    get: jest.fn()
  };
  const { evanesceRouter, signals } = evanesceExpress({
    app,
    router,
    signalKeys,
    onRouteRebuild
  });

  const homePageController = jest.fn((_req: any, _res: any) => {
    return 'home page html';
  });
  const productPageController = jest.fn((req: any, _res: any) => {
    return `product page html for ${
      products.find((p) => p.slug === req.params.slug)!.label
    }`;
  });
  evanesceRouter.get('/', homePageController as any, [
    signals.customerServiceReviews,
    signals.products
  ]);
  evanesceRouter.get(
    '/product/:slug',
    productPageController as any,
    [
      (product) => signals.products.nested[product.id],
      (product) => signals.reviews.nested[product.id]
    ],
    products
  );
  return {
    products,
    signals,
    router,
    homePageController,
    productPageController,
    onRouteRebuild
  };
};

describe('Usage test / end-to-end test / integration test)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('express router handling', () => {
    test('configured (used for dev usage)', () => {
      const { router } = setup();
      expect(router.get.mock.calls.length).toBe(2);
      expect(router.get.mock.calls[0][0]).toEqual('/');
      expect(router.get.mock.calls[1][0]).toEqual('/product/:slug');
    });

    test('home page request', async () => {
      const { router, homePageController } = setup();
      let homePageControllerRouteCallback = router.get.mock.calls[0][1];
      let reqMock = { params: {} };
      let resMock = { send: jest.fn() };
      await homePageControllerRouteCallback(reqMock, resMock);
      expect(homePageController.mock.calls[0][0]).toEqual(reqMock);
      expect(Object.keys(homePageController.mock.calls[0][1]).length).toEqual(
        1
      );
      expect(homePageController.mock.calls[0][1].render.name).toEqual(
        'bound render'
      );
      expect(resMock.send.mock.calls[0][0]).toEqual('home page html');
    });

    test('Fibity Foo product page request', async () => {
      const { router, productPageController } = setup();
      let productPageControllerRouteCallback = router.get.mock.calls[1][1];
      let reqMock = { params: { slug: 'fibity-foo' } };
      let resMock = { send: jest.fn() };
      await productPageControllerRouteCallback(reqMock, resMock);
      expect(productPageController.mock.calls[0][0]).toEqual(reqMock);
      expect(
        Object.keys(productPageController.mock.calls[0][1]).length
      ).toEqual(1);
      expect(productPageController.mock.calls[0][1].render.name).toEqual(
        'bound render'
      );
      expect(resMock.send.mock.calls[0][0]).toEqual(
        'product page html for Fibity Foo'
      );
    });

    test('Bibity Bar product page request', async () => {
      const { router, productPageController } = setup();
      let productPageControllerRouteCallback = router.get.mock.calls[1][1];
      let reqMock = { params: { slug: 'bibity-bar' } };
      let resMock = { send: jest.fn() };
      await productPageControllerRouteCallback(reqMock, resMock);
      expect(productPageController.mock.calls[0][0]).toEqual(reqMock);
      expect(
        Object.keys(productPageController.mock.calls[0][1]).length
      ).toEqual(1);
      expect(productPageController.mock.calls[0][1].render.name).toEqual(
        'bound render'
      );
      expect(resMock.send.mock.calls[0][0]).toEqual(
        'product page html for Bibity Bar'
      );
    });
  });

  describe('customerServiceReview signal', () => {
    test('triggering build', async () => {
      const { signals, homePageController, onRouteRebuild } = setup();
      await signals.customerServiceReviews.rebuildDependencies();

      expect(homePageController.mock.calls[0][0]).toEqual({ params: {} });
      expect(Object.keys(homePageController.mock.calls[0][1]).length).toEqual(
        1
      );
      expect(homePageController.mock.calls[0][1].render.name).toEqual(
        'bound render'
      );

      expect(onRouteRebuild.mock.calls.length).toBe(1);
      expect(onRouteRebuild.mock.calls[0][0]).toEqual({
        route: '/',
        html: 'home page html'
      });
    });
  });

  describe('reviews signal', () => {
    test('triggering build', async () => {
      const {
        signals,
        homePageController,
        productPageController,
        onRouteRebuild
      } = setup();
      await signals.reviews.rebuildDependencies();

      expect(homePageController.mock.calls.length).toBe(0);

      expect(productPageController.mock.calls.length).toBe(2);
      expect(productPageController.mock.calls[0][0]).toMatchObject({
        params: { slug: 'fibity-foo' }
      });
      expect(
        Object.keys(productPageController.mock.calls[0][1]).length
      ).toEqual(1);
      expect(productPageController.mock.calls[0][1].render.name).toEqual(
        'bound render'
      );
      expect(productPageController.mock.calls[1][0]).toMatchObject({
        params: { slug: 'bibity-bar' }
      });
      expect(
        Object.keys(productPageController.mock.calls[1][1]).length
      ).toEqual(1);
      expect(productPageController.mock.calls[1][1].render.name).toEqual(
        'bound render'
      );

      expect(onRouteRebuild.mock.calls.length).toBe(2);
      expect(onRouteRebuild.mock.calls[0][0]).toEqual({
        route: '/product/fibity-foo',
        html: 'product page html for Fibity Foo'
      });
      expect(onRouteRebuild.mock.calls[1][0]).toEqual({
        route: '/product/bibity-bar',
        html: 'product page html for Bibity Bar'
      });
    });

    test('Fibity Foo product signal triggering build', async () => {
      const {
        products,
        signals,
        homePageController,
        productPageController,
        onRouteRebuild
      } = setup();
      await signals.reviews.nested[products[0].id].rebuildDependencies();

      expect(homePageController.mock.calls.length).toBe(0);

      expect(productPageController.mock.calls.length).toBe(1);
      expect(productPageController.mock.calls[0][0]).toMatchObject({
        params: { slug: 'fibity-foo' }
      });
      expect(
        Object.keys(productPageController.mock.calls[0][1]).length
      ).toEqual(1);
      expect(productPageController.mock.calls[0][1].render.name).toEqual(
        'bound render'
      );

      expect(onRouteRebuild.mock.calls.length).toBe(1);
      expect(onRouteRebuild.mock.calls[0][0]).toEqual({
        route: '/product/fibity-foo',
        html: 'product page html for Fibity Foo'
      });
    });

    test('Bibity Bar signal triggering build', async () => {
      const {
        products,
        signals,
        homePageController,
        productPageController,
        onRouteRebuild
      } = setup();
      await signals.reviews.nested[products[1].id].rebuildDependencies();

      expect(homePageController.mock.calls.length).toBe(0);

      expect(productPageController.mock.calls.length).toBe(1);
      expect(productPageController.mock.calls[0][0]).toMatchObject({
        params: { slug: 'bibity-bar' }
      });
      expect(
        Object.keys(productPageController.mock.calls[0][1]).length
      ).toEqual(1);
      expect(productPageController.mock.calls[0][1].render.name).toEqual(
        'bound render'
      );

      expect(onRouteRebuild.mock.calls.length).toBe(1);
      expect(onRouteRebuild.mock.calls[0][0]).toEqual({
        route: '/product/bibity-bar',
        html: 'product page html for Bibity Bar'
      });
    });
  });

  describe('products signal', () => {
    test('triggering build', async () => {
      const {
        signals,
        homePageController,
        productPageController,
        onRouteRebuild
      } = setup();
      await signals.products.rebuildDependencies();

      expect(homePageController.mock.calls.length).toBe(1);
      expect(homePageController.mock.calls[0][0]).toMatchObject({ params: {} });
      expect(Object.keys(homePageController.mock.calls[0][1]).length).toEqual(
        1
      );
      expect(homePageController.mock.calls[0][1].render.name).toEqual(
        'bound render'
      );

      expect(productPageController.mock.calls.length).toBe(2);
      expect(productPageController.mock.calls[0][0]).toMatchObject({
        params: { slug: 'fibity-foo' }
      });
      expect(
        Object.keys(productPageController.mock.calls[0][1]).length
      ).toEqual(1);
      expect(productPageController.mock.calls[0][1].render.name).toEqual(
        'bound render'
      );
      expect(productPageController.mock.calls[1][0]).toMatchObject({
        params: { slug: 'bibity-bar' }
      });
      expect(
        Object.keys(productPageController.mock.calls[1][1]).length
      ).toEqual(1);
      expect(productPageController.mock.calls[1][1].render.name).toEqual(
        'bound render'
      );

      expect(onRouteRebuild.mock.calls.length).toBe(3);
      expect(onRouteRebuild.mock.calls[0][0]).toEqual({
        route: '/',
        html: 'home page html'
      });
      expect(onRouteRebuild.mock.calls[1][0]).toEqual({
        route: '/product/fibity-foo',
        html: 'product page html for Fibity Foo'
      });
      expect(onRouteRebuild.mock.calls[2][0]).toEqual({
        route: '/product/bibity-bar',
        html: 'product page html for Bibity Bar'
      });
    });

    test('Fibity Foo product signal triggering build', async () => {
      const {
        products,
        signals,
        homePageController,
        productPageController,
        onRouteRebuild
      } = setup();
      await signals.products.nested[products[0].id].rebuildDependencies();

      expect(homePageController.mock.calls.length).toBe(1);
      expect(homePageController.mock.calls[0][0]).toMatchObject({ params: {} });
      expect(Object.keys(homePageController.mock.calls[0][1]).length).toEqual(
        1
      );
      expect(homePageController.mock.calls[0][1].render.name).toEqual(
        'bound render'
      );

      expect(productPageController.mock.calls.length).toBe(1);
      expect(productPageController.mock.calls[0][0]).toMatchObject({
        params: { slug: 'fibity-foo' }
      });
      expect(
        Object.keys(productPageController.mock.calls[0][1]).length
      ).toEqual(1);
      expect(productPageController.mock.calls[0][1].render.name).toEqual(
        'bound render'
      );

      expect(onRouteRebuild.mock.calls.length).toBe(2);
      expect(onRouteRebuild.mock.calls[0][0]).toEqual({
        route: '/product/fibity-foo',
        html: 'product page html for Fibity Foo'
      });
      expect(onRouteRebuild.mock.calls[1][0]).toEqual({
        route: '/',
        html: 'home page html'
      });
    });

    test('Bibity Bar signal triggering build', async () => {
      const {
        products,
        signals,
        homePageController,
        productPageController,
        onRouteRebuild
      } = setup();
      await signals.products.nested[products[1].id].rebuildDependencies();

      expect(homePageController.mock.calls.length).toBe(1);
      expect(homePageController.mock.calls[0][0]).toMatchObject({ params: {} });
      expect(Object.keys(homePageController.mock.calls[0][1]).length).toEqual(
        1
      );
      expect(homePageController.mock.calls[0][1].render.name).toEqual(
        'bound render'
      );

      expect(productPageController.mock.calls.length).toBe(1);
      expect(productPageController.mock.calls[0][0]).toMatchObject({
        params: { slug: 'bibity-bar' }
      });
      expect(
        Object.keys(productPageController.mock.calls[0][1]).length
      ).toEqual(1);
      expect(productPageController.mock.calls[0][1].render.name).toEqual(
        'bound render'
      );

      expect(onRouteRebuild.mock.calls.length).toBe(2);
      expect(onRouteRebuild.mock.calls[0][0]).toEqual({
        route: '/product/bibity-bar',
        html: 'product page html for Bibity Bar'
      });
      expect(onRouteRebuild.mock.calls[1][0]).toEqual({
        route: '/',
        html: 'home page html'
      });
    });
  });
});
