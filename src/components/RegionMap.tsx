import { useEffect, useState, useMemo } from 'react';
import { geoNaturalEarth1, geoPath, geoGraticule10 } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { AZURE_REGIONS } from '@/config/azureRegions';

interface RegionMapProps {
  region: string;
}

const WIDTH = 800;
const HEIGHT = 450;

export default function RegionMap({ region }: RegionMapProps) {
  const [worldData, setWorldData] = useState<GeoJSON.FeatureCollection | null>(null);

  const regionInfo = AZURE_REGIONS[region];

  useEffect(() => {
    fetch('/data/world-110m.json')
      .then(r => r.json())
      .then((topo: Topology) => {
        const countries = feature(
          topo,
          topo.objects.countries as GeometryCollection
        ) as GeoJSON.FeatureCollection;
        setWorldData(countries);
      })
      .catch(() => {});
  }, []);

  const { paths, graticule, point } = useMemo(() => {
    if (!worldData || !regionInfo) return { paths: [], graticule: '', point: null };

    const projection = geoNaturalEarth1()
      .center([regionInfo.longitude, regionInfo.latitude])
      .scale(600)
      .translate([WIDTH / 2, HEIGHT / 2]);

    const pathGen = geoPath(projection);

    const countryPaths = worldData.features.map((f, i) => ({
      key: i,
      d: pathGen(f) || '',
    }));

    const graticulePath = pathGen(geoGraticule10()) || '';

    const projected = projection([regionInfo.longitude, regionInfo.latitude]);

    return {
      paths: countryPaths,
      graticule: graticulePath,
      point: projected ? { x: projected[0], y: projected[1] } : null,
    };
  }, [worldData, regionInfo]);

  if (!regionInfo) return null;

  return (
    <div className="mt-6">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Region
      </p>
      <div className="overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          aria-label={`Map showing ${regionInfo.displayName} region`}
          role="img"
        >
          {/* Background */}
          <rect width={WIDTH} height={HEIGHT} className="fill-slate-100 dark:fill-slate-800" />

          {/* Graticule */}
          {graticule && (
            <path
              d={graticule}
              fill="none"
              className="stroke-slate-200 dark:stroke-slate-700"
              strokeWidth={0.4}
            />
          )}

          {/* Country shapes */}
          {paths.map(p => (
            <path
              key={p.key}
              d={p.d}
              className="fill-slate-300 stroke-slate-100 dark:fill-slate-600 dark:stroke-slate-800"
              strokeWidth={0.5}
            />
          ))}

          {/* Location pin */}
          {point && (
            <>
              <circle cx={point.x} cy={point.y} r={12} className="fill-sky-500/20" />
              <circle cx={point.x} cy={point.y} r={6} className="fill-sky-500" />
              <circle cx={point.x} cy={point.y} r={3} className="fill-white" />
            </>
          )}
        </svg>

        {/* Footer with region name + coordinates */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {regionInfo.city}
          </span>
          <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
            {regionInfo.latitude.toFixed(4)}°, {regionInfo.longitude.toFixed(4)}°
          </span>
        </div>
      </div>
    </div>
  );
}
