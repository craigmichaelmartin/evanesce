import { evanesceExpress } from '../../../src/';
import { app, router } from './app';
import { db } from './db';

const onRouteRebuild = ({
  route,
  html
}: {
  route: string;
  html: string;
}): void => {
  void route;
  void html;
  // push html to edge
};

const products = db.many(`SELECT * from product`);
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

export const { evanesceRouter, signals } = evanesceExpress({
  app,
  router,
  signalKeys,
  onRouteRebuild
});
