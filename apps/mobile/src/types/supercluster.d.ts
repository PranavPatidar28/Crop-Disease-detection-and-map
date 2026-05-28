/**
 * Minimal type declaration for `supercluster` (8.x). The community types
 * package didn't resolve cleanly under our pnpm setup, so we inline what we use.
 *
 * Source: https://github.com/mapbox/supercluster
 */
declare module 'supercluster' {
  namespace Supercluster {
    interface PointFeature<P> {
      type: 'Feature';
      properties: P;
      geometry: { type: 'Point'; coordinates: [number, number] };
      id?: number | string;
    }

    interface ClusterProps {
      cluster: true;
      cluster_id: number;
      point_count: number;
      point_count_abbreviated: string | number;
    }

    type ClusterFeature<C> = PointFeature<C & ClusterProps>;

    interface Options<P, C> {
      minZoom?: number;
      maxZoom?: number;
      minPoints?: number;
      radius?: number;
      extent?: number;
      nodeSize?: number;
      log?: boolean;
      generateId?: boolean;
      map?: (props: P) => C;
      reduce?: (accumulated: C, props: C) => void;
    }
  }

  class Supercluster<P = Record<string, unknown>, C = Record<string, unknown>> {
    constructor(options?: Supercluster.Options<P, C>);
    load(points: Supercluster.PointFeature<P>[]): this;
    getClusters(
      bbox: [number, number, number, number],
      zoom: number,
    ): (Supercluster.PointFeature<P> | Supercluster.ClusterFeature<C>)[];
    getChildren(
      clusterId: number,
    ): (Supercluster.PointFeature<P> | Supercluster.ClusterFeature<C>)[];
    getLeaves(
      clusterId: number,
      limit?: number,
      offset?: number,
    ): Supercluster.PointFeature<P>[];
    getTile(z: number, x: number, y: number): { features: unknown[] } | null;
    getClusterExpansionZoom(clusterId: number): number;
  }

  export = Supercluster;
}
