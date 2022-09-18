import { evanesceExpress } from '../../../src/';
import { app, router } from './app';

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
const signalKeys = ['customerServiceReviews'];
export const { evanesceRouter, signals } = evanesceExpress({
  app,
  router,
  signalKeys,
  onRouteRebuild
});
