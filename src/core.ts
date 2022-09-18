export type SignalKeyString = string;
export interface SignalKeyObject {
  key: SignalKeyString;
  keys: Array<SignalKeyString>;
}
export type SignalKey = SignalKeyString | SignalKeyObject;

export interface Signal {
  key: SignalKeyString;
  [key: SignalKeyString]: any | (() => Promise<void>);
  rebuildDependencies: () => Promise<void>;
  parent?: Signal;
  children?: SignalsList; // eslint-disable-line no-use-before-define
}
export type SignalsList = Array<Signal>;

export type SignalOrFunction = Signal | ((obj: any) => Signal);
export type SignalsOrFunctions = Array<SignalOrFunction>;

export interface SignalRebuildTargets {
  rebuildTargets: Array<any>;
  [key: SignalKeyString]: SignalRebuildTargets | undefined | Array<any>;
}
export interface SignalsRebuildTargets {
  [key: SignalKeyString]: SignalRebuildTargets;
}

export interface Signals {
  [key: SignalKeyString]: Signal;
}

export const access = (obj: any, path: Array<any>) => {
  let index = 0;
  let length = path.length;

  while (obj != null && index < length) {
    obj = obj[path[index++]];
  }
  return index && index === length ? obj : void 0;
};

export const buildSignals = <Render>({
  signalKeys,
  onRouteRebuild,
  render
}: {
  signalKeys: Array<SignalKey>;
  onRouteRebuild: ({ route, html }: { route: string; html: string }) => void;
  render: Render;
}) => {
  const signalsRebuildTargets: SignalsRebuildTargets = signalKeys.reduce(
    (accum: SignalsRebuildTargets, signalKey: SignalKey) => {
      if (typeof signalKey !== 'string') {
        accum[signalKey.key] = {
          rebuildTargets: []
        };
        for (const key of signalKey.keys) {
          accum[signalKey.key][key] = {
            rebuildTargets: []
          };
        }
      } else {
        accum[signalKey] = {
          rebuildTargets: []
        };
      }
      return accum as SignalsRebuildTargets;
    },
    {} as SignalsRebuildTargets
  );
  const signals: Signals = signalKeys.reduce((accum: Signals, signalKey) => {
    if (typeof signalKey !== 'string') {
      const parent: any = {};
      const children = signalKey.keys.map((key) => {
        const child = {
          key: key,
          [key]: key,
          rebuildDependencies: async ({ skip }: { skip?: boolean } = {}) => {
            for (const { controller, params, route } of access(
              signalsRebuildTargets,
              [signalKey.key, key]
            ).rebuildTargets) {
              const html = await controller(params, { render });
              await onRouteRebuild({
                route,
                html
              });
            }
            if (!skip) {
              await parent.rebuildDependencies({ skip: true });
            }
          },
          parent
        };
        return child;
      });
      parent.key = signalKey.key;
      parent[signalKey.key] = signalKey.key;
      parent.children = children;
      parent.nested = {};
      children.forEach((child) => (parent.nested[child.key] = child));
      parent.rebuildDependencies = async ({
        skip
      }: { skip?: boolean } = {}) => {
        for (const { controller, params, route } of signalsRebuildTargets[
          signalKey.key
        ].rebuildTargets) {
          const html = await controller(params, { render });
          await onRouteRebuild({
            route,
            html
          });
        }
        if (!skip) {
          for (const child of parent.children) {
            await child.rebuildDependencies({ skip: true });
          }
        }
      };
      accum[signalKey.key] = parent;
    } else {
      accum[signalKey] = {
        key: signalKey,
        [signalKey]: signalKey,
        rebuildDependencies: async () => {
          for (const { controller, params, route } of signalsRebuildTargets[
            signalKey
          ].rebuildTargets) {
            const html = await controller(params, { render });
            await onRouteRebuild({
              route,
              html
            });
          }
        }
      };
    }
    return accum;
  }, {});
  const addToSignalsRebuildTargets = (
    signalKeys: Array<SignalKeyString>,
    { controller, route, params }: any
  ) =>
    access(signalsRebuildTargets, signalKeys).rebuildTargets.push({
      controller,
      route,
      params
    });
  return { signals, addToSignalsRebuildTargets };
};
