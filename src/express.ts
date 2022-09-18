import {
  Application,
  Router,
  Request as ExpressRequest,
  Response as ExpressResponse
} from 'express';
import { buildSignals, SignalKey, SignalsOrFunctions } from './core';
import { promisify } from 'util';

// export type ExpressRender = Promisify<Application["render"]>;
export type ExpressRender = (
  template: string,
  data: { [key: string]: any }
) => Promise<string>;

export interface Response {
  render: ExpressRender;
}

export interface Request {
  params: {
    [key: string]: any;
  };
}

export const evanesceExpress = ({
  app,
  router,
  signalKeys,
  onRouteRebuild
}: {
  app: Application;
  router: Router;
  signalKeys: Array<SignalKey>;
  onRouteRebuild: ({ route, html }: { route: string; html: string }) => void;
}) => {
  const promisifiedApplicationRender = promisify(app.render.bind(app));
  const { signals, addToSignalsRebuildTargets } = buildSignals({
    signalKeys,
    onRouteRebuild,
    render: promisifiedApplicationRender
  });
  return {
    signals,
    evanesceRouter: {
      get: (
        _route: string,
        controller: (request: Request, response: Response) => Promise<string>,
        rebuildOnSignals: SignalsOrFunctions,
        paramsList?: Array<{ [key: string]: any }>
      ) => {
        (paramsList || [{}]).forEach((params) => {
          rebuildOnSignals.forEach((_rebuildOnSignal) => {
            if (!_rebuildOnSignal) {
              throw new Error(
                "Signal listed as dependency which doesn't exist"
              );
            }
            const rebuildOnSignal =
              typeof _rebuildOnSignal === 'function'
                ? _rebuildOnSignal(params)
                : _rebuildOnSignal;
            const route = _route
              .split('/')
              .map((x) => (x.startsWith(':') ? params[x.substring(1)] : x))
              .join('/');
            if (rebuildOnSignal.parent) {
              addToSignalsRebuildTargets(
                [rebuildOnSignal.parent.key, rebuildOnSignal.key],
                { controller, route, params: { params } }
              );
            } else {
              addToSignalsRebuildTargets([rebuildOnSignal.key], {
                controller,
                route,
                params: { params }
              });
            }
          });
        });
        return router.get(
          _route,
          async (req: ExpressRequest, res: ExpressResponse) => {
            const html = await controller(
              { params: req.params },
              { render: promisifiedApplicationRender }
            );
            res.send(html);
          }
        );
      }
    }
  };
};
